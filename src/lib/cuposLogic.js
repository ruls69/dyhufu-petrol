// ============================================================================
// DyHuFu Petrol — Lógica de Cupos (Business Logic)
// ============================================================================
// Módulo que encapsula todas las consultas a Supabase y los cálculos
// matemáticos del sistema de cupos dinámicos.
//
// SEPARADO del componente de UI para mantener el código limpio y testeable.
//
// Flujo de consultas asíncronas:
//   1. buscarClientePorPlaca()  → SELECT en tabla `cliente` filtrando por placa
//   2. obtenerParametrosEmpresa() → SELECT en tabla `empresa` (primer registro)
//   3. calcularConsumo28Dias()  → SELECT SUM en tabla `venta` con filtro de fecha
//   4. calcularCupoDinamico()   → Orquesta las 3 anteriores y aplica la fórmula:
//        · Cliente existente: cupo = Ps × factor_holgura
//        · Cliente nuevo:     cupo = cupo_base_nuevo
//   5. obtenerTanquesDisponibles() → SELECT en tabla `tanque` con stock > 0
//   6. registrarVenta()        → INSERT en tabla `venta`
//   7. registrarClienteNuevo() → Llama RPC `registrar_cliente_por_placa`
// ============================================================================

import { supabase } from "../lib/supabaseClient";

/**
 * Busca un cliente por placa en la tabla `cliente`.
 * @returns {{ data: object|null, error: string|null }}
 */
export async function buscarClientePorPlaca(placa) {
  const placaNorm = placa.toUpperCase().trim();

  const { data, error } = await supabase
    .from("cliente")
    .select("id, placa, nombre_titular, tipo_vehiculo, estado, es_nuevo, empresa_id")
    .eq("placa", placaNorm)
    .maybeSingle();

  if (error) {
    return { data: null, error: `Error al buscar cliente: ${error.message}` };
  }

  return { data, error: null };
}

/**
 * Obtiene los parámetros globales de la empresa (primer registro).
 * @returns {{ data: object|null, error: string|null }}
 */
export async function obtenerParametrosEmpresa() {
  const { data, error } = await supabase
    .from("empresa")
    .select("id, nombre, factor_holgura, cupo_base_nuevo")
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: `Error al obtener parámetros: ${error.message}` };
  }

  return { data, error: null };
}

/**
 * Suma los litros comprados por un cliente en los últimos 28 días.
 * Usa un filtro de fecha directamente en la query de Supabase.
 * @returns {{ totalLitros: number, error: string|null }}
 */
export async function calcularConsumo28Dias(clienteId) {
  const hace28Dias = new Date();
  hace28Dias.setDate(hace28Dias.getDate() - 28);
  const fechaLimite = hace28Dias.toISOString();

  const { data, error } = await supabase
    .from("venta")
    .select("litros")
    .eq("cliente_id", clienteId)
    .gte("fecha", fechaLimite);

  if (error) {
    return { totalLitros: 0, error: `Error al consultar historial: ${error.message}` };
  }

  const totalLitros = (data || []).reduce(
    (sum, row) => sum + parseFloat(row.litros),
    0
  );

  return { totalLitros, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULOS MATEMÁTICOS PUROS (sin I/O)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el Promedio Semanal (Ps).
 * Ps = totalLitros28Dias / 4
 */
export function calcularPs(totalLitros28Dias) {
  return Math.round((totalLitros28Dias / 4) * 100) / 100;
}

/**
 * Determina el cupo máximo permitido para una compra.
 * - Cliente con historial: Ps × factor_holgura
 * - Cliente nuevo (sin historial o Ps = 0): cupo_base_nuevo
 */
export function determinarCupo(ps, factorHolgura, cupoBaseNuevo, esNuevo) {
  if (esNuevo || ps === 0) {
    return parseFloat(cupoBaseNuevo);
  }
  return Math.round(ps * parseFloat(factorHolgura) * 100) / 100;
}

/**
 * Valida si una cantidad solicitada excede el cupo permitido.
 * @returns {{ valido: boolean, excedente: number }}
 */
export function validarCantidad(litrosSolicitados, cupoMaximo) {
  const solicitado = parseFloat(litrosSolicitados) || 0;
  const cupo = parseFloat(cupoMaximo) || 0;

  if (solicitado <= 0) {
    return { valido: false, excedente: 0, razon: "cantidad_invalida" };
  }

  if (solicitado > cupo) {
    return {
      valido: false,
      excedente: Math.round((solicitado - cupo) * 100) / 100,
      razon: "excede_cupo",
    };
  }

  return { valido: true, excedente: 0, razon: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN ORQUESTADORA: Calcula el cupo completo de un cliente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orquesta todas las consultas y cálculos para determinar el cupo
 * de un cliente dado su placa.
 *
 * @returns {{ cliente, empresa, totalLitros28d, ps, cupoMaximo, esNuevo, error }}
 */
export async function calcularCupoDinamico(placa) {
  // 1. Obtener parámetros de empresa
  const { data: empresa, error: errEmpresa } = await obtenerParametrosEmpresa();
  if (errEmpresa) return { error: errEmpresa };

  // 2. Buscar cliente por placa
  const { data: cliente, error: errCliente } = await buscarClientePorPlaca(placa);
  if (errCliente) return { error: errCliente };

  // 3. Si no existe el cliente → es nuevo
  if (!cliente) {
    return {
      cliente: null,
      empresa,
      totalLitros28d: 0,
      ps: 0,
      cupoMaximo: parseFloat(empresa.cupo_base_nuevo),
      esNuevo: true,
      error: null,
    };
  }

  // 4. Verificar estado del cliente
  if (cliente.estado === "Suspendido") {
    return { error: `El cliente con placa ${placa} se encuentra SUSPENDIDO.` };
  }

  // 5. Calcular consumo de 28 días
  const { totalLitros, error: errConsumo } = await calcularConsumo28Dias(cliente.id);
  if (errConsumo) return { error: errConsumo };

  // 6. Calcular Ps y cupo
  const ps = calcularPs(totalLitros);
  const cupoMaximo = determinarCupo(
    ps,
    empresa.factor_holgura,
    empresa.cupo_base_nuevo,
    cliente.es_nuevo
  );

  return {
    cliente,
    empresa,
    totalLitros28d: totalLitros,
    ps,
    cupoMaximo,
    esNuevo: cliente.es_nuevo,
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER TANQUES DISPONIBLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los tanques con stock disponible (stock_actual > stock_minimo).
 */
export async function obtenerTanquesDisponibles() {
  const { data, error } = await supabase
    .from("tanque")
    .select("id, identificador, tipo, capacidad_maxima, stock_minimo, stock_actual")
    .gt("stock_actual", 0)
    .order("tipo")
    .order("identificador");

  if (error) {
    return { data: [], error: `Error al obtener tanques: ${error.message}` };
  }

  return { data: data || [], error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAR VENTA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra una venta en Supabase. Si el cliente no existe,
 * primero lo registra automáticamente usando la función RPC.
 *
 * @returns {{ data: object|null, error: string|null }}
 */
export async function registrarVenta({
  placa,
  clienteId,
  tanqueId,
  litros,
  precioUnitario,
  cupoAlMomento,
  empresaId,
  esClienteNuevo,
  metodoPago,
}) {
  let finalClienteId = clienteId;

  // 1. Buscar turno activo
  const { data: turnoActivo, error: errTurno } = await supabase
    .from("turno_caja")
    .select("id")
    .eq("estado", "Abierto")
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errTurno) {
    return { data: null, error: "Error al validar el turno de caja." };
  }
  if (!turnoActivo) {
    return { data: null, error: "No hay un turno de caja abierto. Debes abrir un turno para vender." };
  }

  // 2. Si es cliente nuevo, registrarlo primero vía RPC
  if (esClienteNuevo && !clienteId) {
    const { data: nuevoId, error: errRpc } = await supabase.rpc(
      "registrar_cliente_por_placa",
      {
        p_placa: placa.toUpperCase().trim(),
        p_empresa_id: empresaId,
      }
    );

    if (errRpc) {
      return { data: null, error: `Error al registrar cliente nuevo: ${errRpc.message}` };
    }

    finalClienteId = nuevoId;
  }

  // 3. Insertar la venta
  const { data, error } = await supabase
    .from("venta")
    .insert({
      cliente_id: finalClienteId,
      tanque_id: tanqueId,
      litros: parseFloat(litros),
      precio_unitario: parseFloat(precioUnitario),
      cupo_al_momento: cupoAlMomento,
      id_turno: turnoActivo.id,
      metodo_pago: metodoPago || "Efectivo",
    })
    .select()
    .single();

  if (error) {
    // Mensajes de error amigables desde los triggers del backend
    const msg = error.message || "Error desconocido";
    if (msg.includes("stock insuficiente")) {
      return { data: null, error: "Stock insuficiente en el tanque seleccionado." };
    }
    if (msg.includes("excede el cupo")) {
      return { data: null, error: "La cantidad excede el cupo autorizado del cliente." };
    }
    if (msg.includes("Suspendido")) {
      return { data: null, error: "El cliente se encuentra suspendido." };
    }
    if (msg.includes("stock_minimo") || msg.includes("por debajo del mínimo")) {
      return { data: null, error: "La venta dejaría el tanque por debajo del stock mínimo." };
    }
    return { data: null, error: `Error al registrar venta: ${msg}` };
  }

  return { data, error: null };
}
