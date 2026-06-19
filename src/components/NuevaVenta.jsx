// ============================================================================
// DyHuFu Petrol — Nueva Venta Component
// ============================================================================
// Módulo de registro de venta de combustible.
//
// Flujo del operador:
//   1. Digita la placa del vehículo
//   2. El sistema consulta Supabase (cliente + historial + parámetros empresa)
//   3. Se muestra el cupo disponible calculado con Ps
//   4. Operador selecciona tanque y digita litros solicitados
//   5. Validación en tiempo real: verde = aprobado, rojo = excedido
//   6. Procesar venta → INSERT en Supabase
//
// Arquitectura:
//   - La lógica de negocio está en src/lib/cuposLogic.js (queries + math)
//   - Este archivo SOLO maneja estado de UI y renderizado
//   - Mobile/Tablet First: botones táctiles, inputs grandes, alertas claras
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  calcularCupoDinamico,
  validarCantidad,
  obtenerTanquesDisponibles,
  registrarVenta,
} from "../lib/cuposLogic";

// ── Step enum for the multi-step flow ──
const STEPS = {
  PLACA: "placa",
  CUPO: "cupo",
  DESPACHO: "despacho",
  RESULTADO: "resultado",
};

export default function NuevaVenta() {
  const navigate = useNavigate();

  // ── Flow state ──
  const [step, setStep] = useState(STEPS.PLACA);

  // ── Form fields ──
  const [placa, setPlaca] = useState("");
  const [litros, setLitros] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("3.74");
  const [tanqueSeleccionado, setTanqueSeleccionado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  // ── Data from Supabase ──
  const [cupoInfo, setCupoInfo] = useState(null);
  const [tanques, setTanques] = useState([]);
  const [ventaRegistrada, setVentaRegistrada] = useState(null);

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validacion, setValidacion] = useState(null);

  // ──────────────────────────────────────────────────────────────
  // STEP 1: Buscar cliente y calcular cupo
  // ──────────────────────────────────────────────────────────────
  const handleBuscarPlaca = useCallback(async () => {
    const placaTrimmed = placa.trim();
    if (placaTrimmed.length < 3) {
      setError("Ingresa una placa válida (mínimo 3 caracteres).");
      return;
    }

    setLoading(true);
    setError(null);
    setCupoInfo(null);

    try {
      // Consulta en paralelo: cupo del cliente + tanques disponibles
      const [cupoResult, tanquesResult] = await Promise.all([
        calcularCupoDinamico(placaTrimmed),
        obtenerTanquesDisponibles(),
      ]);

      if (cupoResult.error) {
        setError(cupoResult.error);
        setLoading(false);
        return;
      }

      if (tanquesResult.error) {
        setError(tanquesResult.error);
        setLoading(false);
        return;
      }

      setCupoInfo(cupoResult);
      setTanques(tanquesResult.data);

      // Auto-seleccionar primer tanque si hay disponibles
      if (tanquesResult.data.length > 0) {
        setTanqueSeleccionado(tanquesResult.data[0].id);
      }

      setStep(STEPS.CUPO);
    } catch (err) {
      setError("Error de conexión con la base de datos. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [placa]);

  // ──────────────────────────────────────────────────────────────
  // STEP 2 → 3: Validar litros en tiempo real
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== STEPS.DESPACHO || !cupoInfo) {
      setValidacion(null);
      return;
    }

    const resultado = validarCantidad(litros, cupoInfo.cupoMaximo);
    setValidacion(resultado);
  }, [litros, cupoInfo, step]);

  // ──────────────────────────────────────────────────────────────
  // STEP 3: Procesar venta
  // ──────────────────────────────────────────────────────────────
  const handleProcesarVenta = useCallback(async () => {
    if (!validacion?.valido || !tanqueSeleccionado) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: errVenta } = await registrarVenta({
        placa: placa.trim(),
        clienteId: cupoInfo.cliente?.id || null,
        tanqueId: tanqueSeleccionado,
        litros: parseFloat(litros),
        precioUnitario: parseFloat(precioUnitario),
        cupoAlMomento: cupoInfo.cupoMaximo,
        empresaId: cupoInfo.empresa?.id,
        esClienteNuevo: cupoInfo.esNuevo,
        metodoPago,
      });

      if (errVenta) {
        setError(errVenta);
        setLoading(false);
        return;
      }

      setVentaRegistrada(data);
      setStep(STEPS.RESULTADO);
    } catch (err) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [validacion, tanqueSeleccionado, placa, litros, precioUnitario, cupoInfo]);

  // ──────────────────────────────────────────────────────────────
  // Reset: Nueva transacción
  // ──────────────────────────────────────────────────────────────
  const handleNuevaTransaccion = () => {
    setStep(STEPS.PLACA);
    setPlaca("");
    setLitros("");
    setPrecioUnitario("3.74");
    setTanqueSeleccionado("");
    setMetodoPago("Efectivo");
    setCupoInfo(null);
    setTanques([]);
    setVentaRegistrada(null);
    setError(null);
    setValidacion(null);
  };

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 flex items-center justify-center text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
            <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
            <path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v0a1 1 0 0 0 1-1V8l-3-3" />
            <path d="M3 22h12" />
            <path d="M7 8h4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-surface-50">
            Nueva Venta
          </h2>
          <p className="text-xs text-surface-400">Registro de despacho de combustible</p>
        </div>
      </div>

      {/* ── Progress Steps ── */}
      <StepIndicator currentStep={step} />

      {/* ── Error Alert ── */}
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* ── Step Content ── */}
      {step === STEPS.PLACA && (
        <StepPlaca
          placa={placa}
          setPlaca={setPlaca}
          loading={loading}
          onBuscar={handleBuscarPlaca}
        />
      )}

      {step === STEPS.CUPO && cupoInfo && (
        <StepCupo
          cupoInfo={cupoInfo}
          placa={placa}
          onContinuar={() => setStep(STEPS.DESPACHO)}
          onVolver={() => { setStep(STEPS.PLACA); setCupoInfo(null); }}
        />
      )}

      {step === STEPS.DESPACHO && cupoInfo && (
        <StepDespacho
          cupoInfo={cupoInfo}
          litros={litros}
          setLitros={setLitros}
          precioUnitario={precioUnitario}
          setPrecioUnitario={setPrecioUnitario}
          tanques={tanques}
          tanqueSeleccionado={tanqueSeleccionado}
          setTanqueSeleccionado={setTanqueSeleccionado}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          validacion={validacion}
          loading={loading}
          onProcesar={handleProcesarVenta}
          onVolver={() => setStep(STEPS.CUPO)}
        />
      )}

      {step === STEPS.RESULTADO && ventaRegistrada && (
        <StepResultado
          venta={ventaRegistrada}
          placa={placa}
          cupoInfo={cupoInfo}
          litros={litros}
          precioUnitario={precioUnitario}
          onNuevaTransaccion={handleNuevaTransaccion}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Progress indicator showing current step */
function StepIndicator({ currentStep }) {
  const steps = [
    { key: STEPS.PLACA, label: "Placa", num: 1 },
    { key: STEPS.CUPO, label: "Cupo", num: 2 },
    { key: STEPS.DESPACHO, label: "Despacho", num: 3 },
    { key: STEPS.RESULTADO, label: "Listo", num: 4 },
  ];

  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between gap-1 px-2 animate-fade-in">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isCompleted = i < currentIdx;

        return (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`
                  w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
                  text-xs font-bold transition-all duration-300
                  ${isCompleted
                    ? "bg-petrol-500 text-white shadow-md shadow-petrol-500/30"
                    : isActive
                      ? "bg-petrol-500/20 text-petrol-400 ring-2 ring-petrol-500/50"
                      : "bg-surface-800 text-surface-500 border border-surface-700/50"
                  }
                `}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-petrol-400" : isCompleted ? "text-surface-300" : "text-surface-600"
                }`}
              >
                {s.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full mx-1 mb-4 transition-colors duration-300 ${
                  isCompleted ? "bg-petrol-500/50" : "bg-surface-700/50"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Error alert banner */
function ErrorAlert({ message, onDismiss }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30 animate-fade-in">
      <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-danger-500">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-danger-500">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-danger-500/60 hover:text-danger-500 transition-colors p-1"
        aria-label="Cerrar alerta"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Ingreso de placa
// ─────────────────────────────────────────────────────────────────────────────

function StepPlaca({ placa, setPlaca, loading, onBuscar }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onBuscar();
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-5 sm:p-7 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-surface-100 mb-1">
            Identificar Vehículo
          </h3>
          <p className="text-sm text-surface-400">
            Digita la placa del vehículo para consultar su cupo disponible.
          </p>
        </div>

        {/* Placa input — large for touch */}
        <div>
          <label
            htmlFor="input-placa"
            className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2"
          >
            Placa del Vehículo
          </label>
          <input
            id="input-placa"
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Ej: ABC-1234"
            autoFocus
            autoComplete="off"
            maxLength={12}
            className="
              w-full px-4 py-4 sm:py-3.5 rounded-xl
              bg-surface-900/80 border border-surface-600/50
              text-surface-50 text-lg sm:text-xl font-mono font-bold text-center tracking-[0.15em]
              placeholder:text-surface-600 placeholder:font-normal placeholder:tracking-normal
              focus:outline-none focus:ring-2 focus:ring-petrol-500/50 focus:border-petrol-500/60
              transition-all duration-200
            "
          />
        </div>

        {/* Submit — large touch target */}
        <button
          id="btn-buscar-placa"
          type="submit"
          disabled={loading || placa.trim().length < 3}
          className={`
            w-full flex items-center justify-center gap-2
            px-6 py-4 sm:py-3.5 rounded-xl font-semibold text-base
            transition-all duration-200
            ${
              loading || placa.trim().length < 3
                ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                : "bg-gradient-to-r from-petrol-600 to-petrol-500 text-white shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98]"
            }
          `}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Consultando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Consultar Cupo
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Mostrar cupo calculado
// ─────────────────────────────────────────────────────────────────────────────

function StepCupo({ cupoInfo, placa, onContinuar, onVolver }) {
  const { esNuevo, ps, cupoMaximo, totalLitros28d, cliente } = cupoInfo;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Client info card */}
      <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm
                ${esNuevo
                  ? "bg-fuel-500/15 text-fuel-400"
                  : "bg-petrol-500/15 text-petrol-400"
                }
              `}
            >
              {esNuevo ? "N" : "R"}
            </div>
            <div>
              <p className="font-mono font-bold text-lg text-surface-50 tracking-wider">
                {placa.toUpperCase().trim()}
              </p>
              <p className="text-xs text-surface-400">
                {esNuevo ? "Cliente nuevo — sin historial" : (cliente?.nombre_titular || "Cliente registrado")}
              </p>
            </div>
          </div>
          <span
            className={`
              text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full
              ${esNuevo
                ? "bg-fuel-500/15 text-fuel-400"
                : "bg-petrol-500/15 text-petrol-400"
              }
            `}
          >
            {esNuevo ? "Nuevo" : "Activo"}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-900/60 rounded-xl p-4">
            <p className="text-xs text-surface-500 mb-1">Consumo 28 días</p>
            <p className="text-xl font-bold text-surface-100">
              {totalLitros28d.toFixed(1)}
              <span className="text-xs font-medium text-surface-500 ml-1">L</span>
            </p>
          </div>
          <div className="bg-surface-900/60 rounded-xl p-4">
            <p className="text-xs text-surface-500 mb-1">
              Promedio Semanal (P<sub>s</sub>)
            </p>
            <p className="text-xl font-bold text-surface-100">
              {ps.toFixed(2)}
              <span className="text-xs font-medium text-surface-500 ml-1">L</span>
            </p>
          </div>
        </div>

        {/* Cupo highlight */}
        <div className="mt-4 bg-petrol-500/10 border border-petrol-500/30 rounded-xl p-4 text-center">
          <p className="text-xs text-petrol-400/80 font-medium mb-1">
            CUPO MÁXIMO AUTORIZADO
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-petrol-400 tracking-tight animate-count-up">
            {cupoMaximo.toFixed(2)}
            <span className="text-lg font-semibold text-petrol-400/60 ml-1">
              L
            </span>
          </p>
          <p className="text-[10px] text-surface-500 mt-1">
            {esNuevo
              ? "Cupo base para clientes nuevos"
              : `Ps (${ps.toFixed(2)}) × Factor holgura (${cupoInfo.empresa?.factor_holgura})`
            }
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          id="btn-volver-placa"
          onClick={onVolver}
          className="flex-1 px-4 py-3.5 rounded-xl bg-surface-800 border border-surface-700/50 text-surface-300 font-medium text-sm hover:bg-surface-700/60 active:scale-[0.98] transition-all"
        >
          ← Cambiar Placa
        </button>
        <button
          id="btn-continuar-despacho"
          onClick={onContinuar}
          className="flex-[2] px-4 py-3.5 rounded-xl bg-gradient-to-r from-petrol-600 to-petrol-500 text-white font-semibold text-sm shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98] transition-all"
        >
          Continuar al Despacho →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Despacho — seleccionar tanque y cantidad
// ─────────────────────────────────────────────────────────────────────────────

function StepDespacho({
  cupoInfo,
  litros,
  setLitros,
  precioUnitario,
  setPrecioUnitario,
  tanques,
  tanqueSeleccionado,
  setTanqueSeleccionado,
  metodoPago,
  setMetodoPago,
  validacion,
  loading,
  onProcesar,
  onVolver,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onProcesar();
  };

  const isExcedido = validacion?.razon === "excede_cupo";
  const isValid = validacion?.valido === true;
  const litrosNum = parseFloat(litros) || 0;
  const precioNum = parseFloat(precioUnitario) || 0;
  const totalVenta = (litrosNum * precioNum).toFixed(2);

  // Find selected tank info for stock display
  const tanqueActivo = tanques.find((t) => t.id === tanqueSeleccionado);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      {/* Cupo reminder bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/50">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-surface-100">
            {cupoInfo.cliente?.placa || cupoInfo.empresa?.nombre}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cupoInfo.esNuevo ? "bg-fuel-500/15 text-fuel-400" : "bg-petrol-500/15 text-petrol-400"}`}>
            {cupoInfo.esNuevo ? "Nuevo" : "Activo"}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-surface-500">Cupo máx.</p>
          <p className="text-sm font-bold text-petrol-400">
            {cupoInfo.cupoMaximo.toFixed(2)} L
          </p>
        </div>
      </div>

      <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-5 sm:p-7 space-y-5">
        <h3 className="text-lg font-semibold text-surface-100">
          Datos del Despacho
        </h3>

        {/* Tank selector */}
        <div>
          <label
            htmlFor="select-tanque"
            className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2"
          >
            Tanque de origen
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tanques.map((t) => {
              const isSelected = t.id === tanqueSeleccionado;
              const pctStock = ((t.stock_actual / t.capacidad_maxima) * 100).toFixed(0);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTanqueSeleccionado(t.id)}
                  className={`
                    flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200
                    ${isSelected
                      ? "bg-petrol-500/10 border-petrol-500/50 ring-1 ring-petrol-500/30"
                      : "bg-surface-900/60 border-surface-700/40 hover:border-surface-600/60"
                    }
                  `}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? "text-petrol-400" : "text-surface-200"}`}>
                      {t.identificador}
                    </p>
                    <p className="text-[10px] text-surface-500 capitalize">{t.tipo}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isSelected ? "text-petrol-400" : "text-surface-300"}`}>
                      {pctStock}%
                    </p>
                    <p className="text-[10px] text-surface-500">
                      {Number(t.stock_actual).toLocaleString("es")} L
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {tanques.length === 0 && (
            <p className="text-sm text-fuel-400 mt-2">
              ⚠ No hay tanques con stock disponible.
            </p>
          )}
        </div>

        {/* Litros input — large */}
        <div>
          <label
            htmlFor="input-litros"
            className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2"
          >
            Cantidad de litros
          </label>
          <div className="relative">
            <input
              id="input-litros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="0.00"
              autoFocus
              className={`
                w-full px-4 py-4 sm:py-3.5 rounded-xl
                bg-surface-900/80 border
                text-surface-50 text-2xl font-bold text-center font-mono
                placeholder:text-surface-700 placeholder:font-normal
                focus:outline-none focus:ring-2 transition-all duration-200
                ${isExcedido
                  ? "border-danger-500/60 focus:ring-danger-500/50 text-danger-500"
                  : isValid
                    ? "border-petrol-500/60 focus:ring-petrol-500/50"
                    : "border-surface-600/50 focus:ring-petrol-500/50"
                }
              `}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-500">
              Litros
            </span>
          </div>

          {/* Validation feedback */}
          {isExcedido && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-500/10 border border-danger-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-danger-500 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-xs font-medium text-danger-500">
                Excede el cupo por <span className="font-bold">{validacion.excedente.toFixed(2)} L</span>.
                Máximo permitido: {cupoInfo.cupoMaximo.toFixed(2)} L
              </p>
            </div>
          )}

          {isValid && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-400 flex-shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <p className="text-xs font-medium text-emerald-400">
                Cantidad dentro del cupo autorizado ✓
              </p>
            </div>
          )}

          {/* Stock warning */}
          {tanqueActivo && litrosNum > parseFloat(tanqueActivo.stock_actual) && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-fuel-500/10 border border-fuel-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-fuel-400 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-xs font-medium text-fuel-400">
                Stock insuficiente en tanque. Disponible: {Number(tanqueActivo.stock_actual).toLocaleString("es")} L
              </p>
            </div>
          )}
        </div>

        {/* Precio unitario */}
        <div>
          <label
            htmlFor="input-precio"
            className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2"
          >
            Precio unitario (por litro)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-500">
              Bs.
            </span>
            <input
              id="input-precio"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
              className="
                w-full px-4 pl-12 py-3 rounded-xl
                bg-surface-900/80 border border-surface-600/50
                text-surface-100 text-base font-semibold font-mono
                focus:outline-none focus:ring-2 focus:ring-petrol-500/50 focus:border-petrol-500/60
                transition-all duration-200
              "
            />
          </div>
        </div>

        {/* Método de Pago */}
        <div>
          <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["Efectivo", "QR", "Tarjeta"].map((metodo) => (
              <button
                key={metodo}
                type="button"
                onClick={() => setMetodoPago(metodo)}
                className={`py-3 rounded-xl font-semibold text-sm transition-all duration-200 border ${
                  metodoPago === metodo
                    ? "bg-petrol-500/10 border-petrol-500/50 text-petrol-400 ring-1 ring-petrol-500/30"
                    : "bg-surface-900/60 border-surface-700/40 text-surface-400 hover:border-surface-600/60"
                }`}
              >
                {metodo}
              </button>
            ))}
          </div>
        </div>

        {/* Total preview */}
        {litrosNum > 0 && precioNum > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-900/60 border border-surface-700/30 animate-fade-in">
            <span className="text-sm text-surface-400">Total a cobrar</span>
            <span className="text-xl font-bold text-surface-50 font-mono">
              Bs. {Number(totalVenta).toLocaleString("es", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          id="btn-volver-cupo"
          type="button"
          onClick={onVolver}
          className="flex-1 px-4 py-3.5 rounded-xl bg-surface-800 border border-surface-700/50 text-surface-300 font-medium text-sm hover:bg-surface-700/60 active:scale-[0.98] transition-all"
        >
          ← Atrás
        </button>
        <button
          id="btn-procesar-venta"
          type="submit"
          disabled={!isValid || loading || !tanqueSeleccionado}
          className={`
            flex-[2] flex items-center justify-center gap-2
            px-4 py-3.5 rounded-xl font-semibold text-base
            transition-all duration-200
            ${
              !isValid || loading || !tanqueSeleccionado
                ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                : "bg-gradient-to-r from-petrol-600 to-petrol-500 text-white shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98]"
            }
          `}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Procesando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              Procesar Venta
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Confirmación de venta exitosa
// ─────────────────────────────────────────────────────────────────────────────

function StepResultado({ venta, placa, cupoInfo, litros, precioUnitario, onNuevaTransaccion }) {
  const litrosNum = parseFloat(litros);
  const precioNum = parseFloat(precioUnitario);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Success card */}
      <div className="bg-surface-800/60 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center animate-count-up">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-emerald-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-emerald-400 mb-1">¡Venta Registrada!</h3>
        <p className="text-sm text-surface-400">Despacho procesado exitosamente</p>

        {/* Receipt summary */}
        <div className="mt-6 bg-surface-900/60 rounded-xl p-4 text-left space-y-3">
          <div className="flex justify-between items-center py-1 border-b border-surface-700/30">
            <span className="text-xs text-surface-500">Placa</span>
            <span className="font-mono font-bold text-surface-100">{placa.toUpperCase().trim()}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-surface-700/30">
            <span className="text-xs text-surface-500">Litros despachados</span>
            <span className="font-bold text-surface-100">{litrosNum.toFixed(2)} L</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-surface-700/30">
            <span className="text-xs text-surface-500">Precio unitario</span>
            <span className="font-mono text-surface-200">Bs. {precioNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-surface-700/30">
            <span className="text-xs text-surface-500">Cupo utilizado</span>
            <span className="text-surface-200">
              {litrosNum.toFixed(2)} / {cupoInfo.cupoMaximo.toFixed(2)} L
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-semibold text-surface-300">TOTAL</span>
            <span className="text-2xl font-bold text-petrol-400 font-mono">
              Bs. {(litrosNum * precioNum).toLocaleString("es", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <p className="mt-4 text-[10px] text-surface-600 font-mono">
          ID: {venta?.id?.slice(0, 8) || "---"} · {new Date().toLocaleTimeString("es-ES")}
        </p>
      </div>

      {/* New transaction button */}
      <button
        id="btn-nueva-transaccion"
        onClick={onNuevaTransaccion}
        className="
          w-full flex items-center justify-center gap-2
          px-6 py-4 sm:py-3.5 rounded-xl font-semibold text-base
          bg-gradient-to-r from-petrol-600 to-petrol-500 text-white
          shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40
          active:scale-[0.98] transition-all duration-200
        "
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva Transacción
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: Loading spinner
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin w-5 h-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
