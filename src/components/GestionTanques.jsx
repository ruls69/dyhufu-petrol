// ============================================================================
// DyHuFu Petrol — Gestión de Tanques (Tiempo Real)
// ============================================================================
//
// Visualización en tiempo real del inventario de tanques.
//
// ─── Suscripción Realtime de Supabase ───
//
// Supabase Realtime utiliza canales (Channels) basados en WebSockets.
// Para escuchar cambios en una tabla PostgreSQL se usa el método
// `channel().on('postgres_changes', ...)`.
//
// Configuración:
//   1. Se crea un canal con un nombre único: 'tanques-realtime'
//   2. Se suscribe al evento 'UPDATE' en la tabla 'tanque' del schema 'public'
//      (los triggers de Ingreso y Venta hacen UPDATE en tanque.stock_actual)
//   3. Cuando llega un payload con la fila actualizada, se reemplaza el
//      tanque correspondiente en el estado local por su `id`
//   4. En el cleanup del useEffect se llama `supabase.removeChannel(channel)`
//      para cerrar la conexión WebSocket y evitar fugas de memoria
//
// Nota: Para que Realtime funcione, la tabla debe tener habilitada la
// replicación en el dashboard de Supabase:
//   Database → Replication → Seleccionar tabla `tanque` → Toggle ON
//
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Determinar estado de alerta basado en stock vs mínimo
// ─────────────────────────────────────────────────────────────────────────────
function calcularAlerta(stockActual, stockMinimo, capacidadMaxima) {
  const pct = (stockActual / capacidadMaxima) * 100;

  if (stockActual <= stockMinimo) return "CRITICO";
  if (pct <= 30 || stockActual <= stockMinimo * 1.5) return "BAJO";
  return "NORMAL";
}

function calcularPorcentaje(stockActual, capacidadMaxima) {
  if (capacidadMaxima <= 0) return 0;
  return Math.min(100, Math.max(0, (stockActual / capacidadMaxima) * 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOR CONFIG por estado de alerta
// ─────────────────────────────────────────────────────────────────────────────
const ALERTA_CONFIG = {
  NORMAL: {
    barGradient: "from-emerald-500 to-petrol-400",
    barBg: "bg-emerald-500/8",
    badge: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
    icon: "text-emerald-400",
    glow: "group-hover:shadow-[0_0_24px_rgb(52_211_153/0.15)]",
    label: "Normal",
    pulseRing: false,
  },
  BAJO: {
    barGradient: "from-amber-500 to-fuel-400",
    barBg: "bg-fuel-500/8",
    badge: "bg-fuel-500/15 text-fuel-400 ring-fuel-500/20",
    icon: "text-fuel-400",
    glow: "group-hover:shadow-[0_0_24px_rgb(249_140_7/0.15)]",
    label: "Bajo",
    pulseRing: false,
  },
  CRITICO: {
    barGradient: "from-red-500 to-danger-600",
    barBg: "bg-danger-500/8",
    badge: "bg-danger-500/15 text-danger-500 ring-danger-500/20",
    icon: "text-danger-500",
    glow: "group-hover:shadow-[0_0_24px_rgb(239_68_68/0.15)]",
    label: "Crítico",
    pulseRing: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function GestionTanques() {
  const [tanques, setTanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // ── Estado del Modal Nuevo Tanque ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoTanque, setNuevoTanque] = useState({
    identificador: "",
    tipo: "gasolina",
    capacidad_maxima: "",
    stock_minimo: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ── Fetch inicial de todos los tanques ──
  const fetchTanques = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("tanque")
      .select("id, identificador, tipo, capacidad_maxima, stock_minimo, stock_actual, updated_at")
      .order("tipo")
      .order("identificador");

    if (err) {
      setError(`Error al cargar tanques: ${err.message}`);
      setLoading(false);
      return;
    }

    setTanques(data || []);
    setLastUpdate(new Date());
    setError(null);
    setLoading(false);
  }, []);

  // ── Guardar Nuevo Tanque ──
  const handleGuardarTanque = async (e) => {
    e.preventDefault();
    const identNorm = nuevoTanque.identificador.trim().toUpperCase();
    if (!identNorm) {
      setModalError("El identificador es obligatorio.");
      return;
    }
    const cap = parseFloat(nuevoTanque.capacidad_maxima);
    const min = parseFloat(nuevoTanque.stock_minimo) || 0;

    if (isNaN(cap) || cap <= 0) {
      setModalError("La capacidad máxima debe ser mayor a 0.");
      return;
    }
    if (isNaN(min) || min < 0 || min > cap) {
      setModalError("El stock mínimo debe ser válido y no exceder la capacidad máxima.");
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      // Obtener empresa base
      const { data: empresa, error: errEmpresa } = await supabase
        .from("empresa")
        .select("id")
        .limit(1)
        .single();
      
      if (errEmpresa) throw new Error("No se pudo obtener la empresa base.");

      const { error: errInsert } = await supabase.from("tanque").insert({
        empresa_id: empresa.id,
        identificador: identNorm,
        tipo: nuevoTanque.tipo,
        capacidad_maxima: cap,
        stock_minimo: min,
        stock_actual: 0,
      });

      if (errInsert) {
        if (errInsert.code === "23505") {
          throw new Error(`El tanque ${identNorm} ya está registrado.`);
        }
        throw errInsert;
      }

      setIsModalOpen(false);
      setNuevoTanque({ identificador: "", tipo: "gasolina", capacidad_maxima: "", stock_minimo: "" });
    } catch (error) {
      console.error(error);
      setModalError(error.message || "Error al guardar el tanque.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Setup: fetch inicial + suscripción Realtime ──
  useEffect(() => {
    fetchTanques();

    // ────────────────────────────────────────────────────────────
    // SUPABASE REALTIME: Suscripción al canal 'tanques-realtime'
    // ────────────────────────────────────────────────────────────
    // Se escucha el evento UPDATE en la tabla `tanque` del schema `public`.
    // Los triggers de Ingreso y Venta actualizan stock_actual con UPDATE,
    // por lo tanto cada vez que se vende o ingresa combustible, este canal
    // recibe el nuevo estado de la fila del tanque modificado.
    // ────────────────────────────────────────────────────────────
    const channel = supabase
      .channel("tanques-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tanque",
        },
        (payload) => {
          // payload.new contiene la fila actualizada completa
          const updatedTanque = payload.new;

          setTanques((prev) =>
            prev.map((t) =>
              t.id === updatedTanque.id ? { ...t, ...updatedTanque } : t
            )
          );
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tanque",
        },
        (payload) => {
          // Si se agrega un tanque nuevo, añadirlo a la lista
          setTanques((prev) => {
            const exists = prev.some((t) => t.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tanque",
        },
        (payload) => {
          setTanques((prev) => prev.filter((t) => t.id !== payload.old.id));
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // ── Cleanup: remover canal al desmontar el componente ──
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTanques]);

  // ── Filtrado por tipo ──
  const tanquesFiltrados =
    filtroTipo === "todos"
      ? tanques
      : tanques.filter((t) => t.tipo === filtroTipo);

  // ── Estadísticas globales ──
  const stats = tanques.reduce(
    (acc, t) => {
      const stock = parseFloat(t.stock_actual) || 0;
      const cap = parseFloat(t.capacidad_maxima) || 0;
      acc.totalStock += stock;
      acc.totalCapacidad += cap;
      const alerta = calcularAlerta(stock, parseFloat(t.stock_minimo), cap);
      acc.alertas[alerta] = (acc.alertas[alerta] || 0) + 1;
      return acc;
    },
    { totalStock: 0, totalCapacidad: 0, alertas: {} }
  );
  const pctGlobal = stats.totalCapacidad > 0
    ? ((stats.totalStock / stats.totalCapacidad) * 100).toFixed(1)
    : 0;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center">
          <svg className="animate-spin w-6 h-6 text-petrol-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-surface-400">Cargando inventario de tanques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
            Gestión de Tanques
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            Inventario de combustible en tiempo real
          </p>
        </div>

        {/* Realtime status + refresh */}
        <div className="flex items-center gap-3">
          <RealtimeIndicator
            connected={realtimeConnected}
            lastUpdate={lastUpdate}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-petrol-600 to-petrol-500 text-white font-semibold text-sm shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Añadir Tanque
          </button>
          <button
            id="btn-refresh-tanques"
            onClick={fetchTanques}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700/50 text-surface-400 hover:text-surface-100 hover:bg-surface-700/60 active:scale-95 transition-all"
            title="Recargar datos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30 animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5 mt-0.5 text-danger-500 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-danger-500 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-danger-500/60 hover:text-danger-500 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Global Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
        <MiniStat
          label="Stock Total"
          value={`${Number(stats.totalStock.toFixed(0)).toLocaleString("es")} L`}
          sublabel={`de ${Number(stats.totalCapacidad.toFixed(0)).toLocaleString("es")} L`}
        />
        <MiniStat
          label="Nivel Global"
          value={`${pctGlobal}%`}
          sublabel="capacidad utilizada"
          highlight={parseFloat(pctGlobal) < 30}
        />
        <MiniStat
          label="Tanques"
          value={tanques.length}
          sublabel={`${stats.alertas.NORMAL || 0} normales`}
        />
        <MiniStat
          label="Alertas"
          value={(stats.alertas.CRITICO || 0) + (stats.alertas.BAJO || 0)}
          sublabel={`${stats.alertas.CRITICO || 0} críticos`}
          highlight={(stats.alertas.CRITICO || 0) > 0}
        />
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 animate-fade-in stagger-2">
        {[
          { key: "todos", label: "Todos" },
          { key: "gasolina", label: "Gasolina" },
          { key: "diesel", label: "Diésel" },
        ].map((tab) => (
          <button
            key={tab.key}
            id={`filter-${tab.key}`}
            onClick={() => setFiltroTipo(tab.key)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${filtroTipo === tab.key
                ? "bg-petrol-500/15 text-petrol-400 ring-1 ring-petrol-500/30"
                : "bg-surface-800/60 text-surface-400 hover:text-surface-200 hover:bg-surface-700/60"
              }
            `}
          >
            {tab.label}
            {tab.key !== "todos" && (
              <span className="ml-1.5 text-xs opacity-60">
                ({tanques.filter((t) => t.tipo === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tank Cards Grid ── */}
      {tanquesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700/50 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-surface-500">
              <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h18" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-surface-400 text-sm">
            No se encontraron tanques{filtroTipo !== "todos" ? ` de ${filtroTipo}` : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tanquesFiltrados.map((tanque, i) => (
            <TanqueCard
              key={tanque.id}
              tanque={tanque}
              animDelay={`stagger-${(i % 4) + 1}`}
            />
          ))}
        </div>
      )}

      {/* ── Footer spacer for mobile ── */}
      <div className="h-4 lg:h-0" />

      {/* ── Modal Nuevo Tanque ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-surface-700/50">
              <h3 className="text-xl font-bold text-surface-50">Añadir Tanque</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-surface-500 hover:text-surface-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleGuardarTanque} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-sm text-danger-500 font-medium">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                    Identificador
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={nuevoTanque.identificador}
                    onChange={(e) => setNuevoTanque({ ...nuevoTanque, identificador: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-petrol-500/50"
                    placeholder="T-03"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                    Tipo
                  </label>
                  <select
                    value={nuevoTanque.tipo}
                    onChange={(e) => setNuevoTanque({ ...nuevoTanque, tipo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 focus:outline-none focus:ring-2 focus:ring-petrol-500/50 appearance-none capitalize"
                  >
                    <option value="gasolina">Gasolina</option>
                    <option value="diesel">Diésel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Capacidad Máxima (Litros)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={nuevoTanque.capacidad_maxima}
                  onChange={(e) => setNuevoTanque({ ...nuevoTanque, capacidad_maxima: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 font-mono focus:outline-none focus:ring-2 focus:ring-petrol-500/50"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Stock Mínimo (Litros)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={nuevoTanque.stock_minimo}
                  onChange={(e) => setNuevoTanque({ ...nuevoTanque, stock_minimo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 font-mono focus:outline-none focus:ring-2 focus:ring-petrol-500/50"
                  placeholder="2000"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-surface-800 text-surface-300 font-medium hover:bg-surface-700/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-semibold text-white transition-all ${
                    isSaving
                      ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                      : "bg-petrol-600 hover:bg-petrol-500 active:scale-[0.98]"
                  }`}
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Tank Card (Detailed)
// ─────────────────────────────────────────────────────────────────────────────

function TanqueCard({ tanque, animDelay = "" }) {
  const stock = parseFloat(tanque.stock_actual) || 0;
  const cap = parseFloat(tanque.capacidad_maxima) || 0;
  const minimo = parseFloat(tanque.stock_minimo) || 0;
  const pct = calcularPorcentaje(stock, cap);
  const alerta = calcularAlerta(stock, minimo, cap);
  const config = ALERTA_CONFIG[alerta];

  // Position of the stock_minimo marker on the bar
  const pctMinimo = cap > 0 ? Math.min(100, (minimo / cap) * 100) : 0;

  // Litros disponibles por encima del mínimo
  const disponible = Math.max(0, stock - minimo);

  return (
    <div
      id={`tanque-card-${tanque.identificador}`}
      className={`
        group relative bg-surface-800/60 backdrop-blur-sm border border-surface-700/50
        rounded-2xl overflow-hidden transition-all duration-300
        hover:border-surface-600/60 hover:bg-surface-800/80
        ${config.glow}
        animate-fade-in ${animDelay}
      `}
    >
      {/* Subtle animated glow for critical tanks */}
      {config.pulseRing && (
        <div className="absolute inset-0 rounded-2xl ring-1 ring-danger-500/30 animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${tanque.tipo === "gasolina"
                ? "bg-petrol-500/15 text-petrol-400"
                : "bg-fuel-500/15 text-fuel-400"
              }
            `}
          >
            {tanque.tipo === "gasolina" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
                <path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v0a1 1 0 0 0 1-1V8l-3-3" />
                <path d="M3 22h12" />
                <path d="M7 8h4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M5.5 5.5L12 2l6.5 3.5v8L12 17l-6.5-3.5z" />
                <path d="M12 17v5" />
                <path d="M5.5 5.5L12 9l6.5-3.5" />
                <path d="M12 9v8" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-100">{tanque.identificador}</h3>
            <p className="text-[11px] text-surface-500 capitalize">{tanque.tipo}</p>
          </div>
        </div>

        {/* Alert badge */}
        <span
          className={`
            text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ring-1
            ${config.badge}
          `}
        >
          {config.label}
        </span>
      </div>

      {/* Main percentage display */}
      <div className="px-5 pb-2 text-center">
        <p className={`text-4xl font-extrabold tracking-tight ${config.icon} animate-count-up`}>
          {pct.toFixed(1)}
          <span className="text-lg font-semibold opacity-60">%</span>
        </p>
      </div>

      {/* Progress bar with stock_minimo marker */}
      <div className="px-5 pb-4">
        <div className="relative w-full h-4 bg-surface-700/60 rounded-full overflow-hidden">
          {/* Fill bar */}
          <div
            className={`absolute left-0 top-0 h-full bg-gradient-to-r ${config.barGradient} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
          </div>

          {/* Stock mínimo marker */}
          {pctMinimo > 0 && pctMinimo < 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-fuel-400/70 z-10"
              style={{ left: `${pctMinimo}%` }}
              title={`Stock mínimo: ${Number(minimo).toLocaleString("es")} L`}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-fuel-400 border border-surface-800" />
            </div>
          )}
        </div>

        {/* Bar legend */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-surface-600">0 L</span>
          {pctMinimo > 15 && pctMinimo < 85 && (
            <span className="text-[10px] text-fuel-400/60 font-medium" style={{ marginLeft: `${pctMinimo - 5}%` }}>
              mín
            </span>
          )}
          <span className="text-[10px] text-surface-600">{Number(cap).toLocaleString("es")} L</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2">
        <div className="bg-surface-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-surface-500 mb-0.5">Actual</p>
          <p className="text-sm font-bold text-surface-100">
            {Number(stock.toFixed(0)).toLocaleString("es")}
            <span className="text-[10px] font-normal text-surface-500"> L</span>
          </p>
        </div>
        <div className="bg-surface-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-surface-500 mb-0.5">Mínimo</p>
          <p className="text-sm font-bold text-surface-300">
            {Number(minimo.toFixed(0)).toLocaleString("es")}
            <span className="text-[10px] font-normal text-surface-500"> L</span>
          </p>
        </div>
        <div className="bg-surface-900/60 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-surface-500 mb-0.5">Disponible</p>
          <p className={`text-sm font-bold ${disponible <= 0 ? "text-danger-500" : "text-emerald-400"}`}>
            {Number(disponible.toFixed(0)).toLocaleString("es")}
            <span className="text-[10px] font-normal text-surface-500"> L</span>
          </p>
        </div>
      </div>

      {/* Last updated */}
      {tanque.updated_at && (
        <div className="px-5 pb-4 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-surface-600">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-[10px] text-surface-600">
            Últ. mov: {new Date(tanque.updated_at).toLocaleString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Realtime Connection Indicator
// ─────────────────────────────────────────────────────────────────────────────

function RealtimeIndicator({ connected, lastUpdate }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700/50">
      <div className="relative flex items-center">
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-emerald-500" : "bg-surface-500"
          }`}
        />
        {connected && (
          <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        )}
      </div>
      <span className="text-[10px] text-surface-500">
        {connected ? "En vivo" : "Desconectado"}
      </span>
      {lastUpdate && (
        <span className="text-[10px] text-surface-600 hidden sm:inline">
          · {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Mini Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function MiniStat({ label, value, sublabel, highlight = false }) {
  return (
    <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-xl p-3.5 transition-all hover:border-surface-600/60">
      <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-xl font-bold ${highlight ? "text-danger-500" : "text-surface-100"}`}>
        {value}
      </p>
      <p className="text-[10px] text-surface-600 mt-0.5">{sublabel}</p>
    </div>
  );
}
