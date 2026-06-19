import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import TicketCierre from "./TicketCierre";

export default function CierreCaja() {
  const [turno, setTurno] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fechaCierreImpresion, setFechaCierreImpresion] = useState(null);
  
  // ── Modal de Confirmación ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [cierreCompletado, setCierreCompletado] = useState(false);

  useEffect(() => {
    fetchTurnoYVentas();
  }, []);

  const fetchTurnoYVentas = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar turno activo
      const { data: turnoActivo, error: errTurno } = await supabase
        .from("turno_caja")
        .select("*")
        .eq("estado", "Abierto")
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errTurno) throw errTurno;

      if (!turnoActivo) {
        setTurno(null);
        setVentas([]);
        setLoading(false);
        return;
      }

      setTurno(turnoActivo);

      // 2. Buscar ventas de este turno
      const { data: ventasTurno, error: errVentas } = await supabase
        .from("venta")
        .select(`
          id,
          litros,
          monto_total_bob,
          metodo_pago,
          tanque:tanque_id (tipo)
        `)
        .eq("id_turno", turnoActivo.id);

      if (errVentas) throw errVentas;

      setVentas(ventasTurno || []);
    } catch (e) {
      console.error(e);
      setError("Error al cargar los datos del turno.");
    } finally {
      setLoading(false);
    }
  };

  // ── Sumarización usando reduce() ──
  const resumen = ventas.reduce(
    (acc, venta) => {
      const litros = parseFloat(venta.litros) || 0;
      const monto = parseFloat(venta.monto_total_bob) || 0;
      const tipo = venta.tanque?.tipo || "desconocido";
      const pago = venta.metodo_pago || "Efectivo";

      // Sumar litros por tipo
      if (tipo === "gasolina") acc.litrosGasolina += litros;
      else if (tipo === "diesel") acc.litrosDiesel += litros;

      // Sumar ingresos
      acc.totalBOB += monto;

      // Sumar por método de pago
      if (pago === "Efectivo") acc.efectivo += monto;
      else if (pago === "QR") acc.qr += monto;
      else if (pago === "Tarjeta") acc.tarjeta += monto;

      return acc;
    },
    {
      litrosGasolina: 0,
      litrosDiesel: 0,
      totalBOB: 0,
      efectivo: 0,
      qr: 0,
      tarjeta: 0,
    }
  );

  // ── Acción de Cierre ──
  const handleCerrarCaja = async () => {
    setIsClosing(true);
    setError(null);

    const now = new Date().toISOString();

    try {
      const { error: errUpdate } = await supabase
        .from("turno_caja")
        .update({
          estado: "Cerrado",
          fecha_cierre: now,
          total_recaudado_bob: resumen.totalBOB,
        })
        .eq("id", turno.id);

      if (errUpdate) throw errUpdate;

      setFechaCierreImpresion(now);
      setCierreCompletado(true);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      setError("No se pudo cerrar la caja. Por favor, intenta de nuevo.");
      setIsModalOpen(false);
    } finally {
      setIsClosing(false);
    }
  };

  // ── Renderizado de Estados ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in print:hidden">
        <svg className="animate-spin w-8 h-8 text-petrol-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
        <p className="text-surface-400">Calculando resumen financiero...</p>
      </div>
    );
  }

  if (cierreCompletado) {
    return (
      <TicketCierre
        operador={turno.operador}
        fecha_apertura={turno.fecha_apertura}
        fecha_cierre={fechaCierreImpresion}
        resumen={resumen}
        onVolver={() => window.location.reload()}
      />
    );
  }

  if (!turno) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 bg-surface-800 border border-surface-700/50 rounded-2xl flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-surface-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-surface-100 mb-2">Sin Turno Activo</h2>
        <p className="text-surface-500 max-w-md">No hay ningún turno abierto actualmente en este punto de venta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <line x1="6" y1="16" x2="6.01" y2="16" />
              <line x1="10" y1="16" x2="10.01" y2="16" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
              Cierre de Caja
            </h2>
            <p className="text-sm text-surface-400 mt-1">
              Arqueo del turno activo ({new Date(turno.fecha_apertura).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })})
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-[0.98] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Realizar Cierre
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-500 text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Dashboard Monetario ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total General */}
        <div className="col-span-1 md:col-span-3 bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none" />
          <p className="text-surface-400 font-semibold uppercase tracking-widest text-xs mb-2">Ingresos Totales (BOB)</p>
          <p className="text-5xl sm:text-6xl font-black text-amber-500 font-mono tracking-tight drop-shadow-lg">
            {resumen.totalBOB.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-surface-500 mt-3 text-sm">Operador: <span className="text-surface-200 font-medium">{turno.operador}</span></p>
        </div>

        {/* Métodos de Pago */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-400"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg>
              <h3 className="text-sm font-semibold text-surface-200">Efectivo</h3>
            </div>
            <p className="text-2xl font-bold text-surface-50 font-mono">
              Bs. {resumen.efectivo.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-info-400"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10M7 12h10M7 17h10" /></svg>
              <h3 className="text-sm font-semibold text-surface-200">QR / Digital</h3>
            </div>
            <p className="text-2xl font-bold text-surface-50 font-mono">
              Bs. {resumen.qr.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="col-span-2 bg-surface-800/40 border border-surface-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-purple-400"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              <h3 className="text-sm font-semibold text-surface-200">Tarjeta (POS)</h3>
            </div>
            <p className="text-2xl font-bold text-surface-50 font-mono">
              Bs. {resumen.tarjeta.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Volúmenes */}
        <div className="col-span-1 bg-surface-800/60 border border-surface-700/50 rounded-2xl p-5 flex flex-col justify-center">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-6 text-center border-b border-surface-700/50 pb-3">
            Volumen Despachado
          </h3>
          <div className="space-y-5">
            <div className="flex justify-between items-end">
              <div>
                <div className="w-2 h-2 rounded-full bg-petrol-400 mb-1" />
                <p className="text-sm text-surface-300">Gasolina</p>
              </div>
              <p className="text-xl font-bold text-surface-100 font-mono">
                {resumen.litrosGasolina.toFixed(2)} <span className="text-xs text-surface-500 font-normal">L</span>
              </p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="w-2 h-2 rounded-full bg-fuel-400 mb-1" />
                <p className="text-sm text-surface-300">Diésel</p>
              </div>
              <p className="text-xl font-bold text-surface-100 font-mono">
                {resumen.litrosDiesel.toFixed(2)} <span className="text-xs text-surface-500 font-normal">L</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de Confirmación ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-surface-900 border border-surface-700/50 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-scale-in">
            <div className="w-16 h-16 bg-danger-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-danger-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-danger-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-surface-50 mb-2">¿Cerrar Caja?</h3>
            <p className="text-sm text-surface-400 mb-6">
              Estás a punto de reportar <strong className="text-surface-200">Bs. {resumen.totalBOB.toFixed(2)}</strong>. 
              Esta acción no se puede deshacer y el turno se marcará como cerrado.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 bg-surface-800 text-surface-300 font-medium rounded-xl hover:bg-surface-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                disabled={isClosing}
                className="flex-1 px-4 py-3 bg-danger-600 text-white font-bold rounded-xl hover:bg-danger-500 transition-colors disabled:opacity-50"
              >
                {isClosing ? "Procesando..." : "Confirmar Cierre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
