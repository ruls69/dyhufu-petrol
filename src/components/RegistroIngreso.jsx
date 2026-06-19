// ============================================================================
// DyHuFu Petrol — Registro de Ingreso (Cisterna)
// ============================================================================
// Módulo para registrar el reabastecimiento de tanques de combustible.
//
// Flujo del operador:
//   1. Cargar la lista de tanques desde Supabase
//   2. Seleccionar el tanque destino (Dropdown)
//   3. Digitar la cantidad de litros ingresados por la cisterna
//   4. Digitar la placa de la cisterna y observaciones adicionales (opcional)
//   5. Validación visual: Muestra el nivel actual vs nivel proyectado
//      - Si supera la capacidad máxima del tanque, se muestra alerta y se bloquea
//   6. Insertar en la tabla 'ingreso' → El trigger de BD actualiza stock_actual
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function RegistroIngreso() {
  const navigate = useNavigate();
  // ── Form States ──
  const [tanques, setTanques] = useState([]);
  const [tanqueId, setTanqueId] = useState("");
  const [litros, setLitros] = useState("");
  const [placaCisterna, setPlacaCisterna] = useState("");
  const [observacion, setObservacion] = useState("");

  // ── UI States ──
  const [loadingTanques, setLoadingTanques] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // ── Fetch Tanques ──
  const fetchTanques = useCallback(async () => {
    setLoadingTanques(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("tanque")
        .select("id, identificador, tipo, capacidad_maxima, stock_actual, stock_minimo")
        .order("identificador");

      if (err) {
        setError(`Error al obtener tanques: ${err.message}`);
        return;
      }
      setTanques(data || []);
      if (data && data.length > 0) {
        setTanqueId(data[0].id);
      }
    } catch (e) {
      setError("Error de red al cargar los tanques.");
    } finally {
      setLoadingTanques(false);
    }
  }, []);

  useEffect(() => {
    fetchTanques();
  }, [fetchTanques]);

  // ── Get selected tank info ──
  const tanqueSeleccionado = tanques.find((t) => t.id === tanqueId);

  // ── Validaciones locales en tiempo real ──
  const litrosNum = parseFloat(litros) || 0;
  const stockActualNum = tanqueSeleccionado ? parseFloat(tanqueSeleccionado.stock_actual) : 0;
  const capMaxNum = tanqueSeleccionado ? parseFloat(tanqueSeleccionado.capacidad_maxima) : 0;
  const stockProyectado = stockActualNum + litrosNum;

  const excedeCapacidad = stockProyectado > capMaxNum;
  const esLitrosInvalido = litros !== "" && litrosNum <= 0;
  const canSubmit =
    tanqueId &&
    litrosNum > 0 &&
    !excedeCapacidad &&
    !saving;

  // ── Guardar Ingreso ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: err } = await supabase
        .from("ingreso")
        .insert([
          {
            tanque_id: tanqueId,
            litros: litrosNum,
            placa_cisterna: placaCisterna.trim() || null,
            observacion: observacion.trim() || null,
          },
        ])
        .select()
        .single();

      if (err) {
        setError(`Error de base de datos: ${err.message}`);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setSuccessData(data);

      // Reset fields except tank
      setLitros("");
      setPlacaCisterna("");
      setObservacion("");

      // Refresh tank info to get updated stock_actual from DB
      await fetchTanques();

      // Navigate to /tanques after 2 seconds to let user read the success toast
      setTimeout(() => {
        navigate("/tanques");
      }, 2500);

    } catch (e) {
      setError("Ocurrió un error inesperado al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset Toast ──
  const handleResetSuccess = () => {
    setSuccess(false);
    setSuccessData(null);
  };

  if (loadingTanques) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center">
          <svg className="animate-spin w-6 h-6 text-petrol-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-surface-400">Cargando información de tanques...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 flex items-center justify-center text-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-surface-50">
            Registro de Ingreso
          </h2>
          <p className="text-xs text-surface-400">Reabastecimiento de tanques por cisternas</p>
        </div>
      </div>

      {/* ── Success Banner / Toast ── */}
      {success && successData && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-fade-in">
          <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-400">¡Ingreso guardado con éxito!</p>
            <p className="text-xs text-surface-300 mt-1">
              Se agregaron <span className="font-semibold text-white">{successData.litros} L</span> al tanque seleccionado. El inventario físico se ha actualizado.
            </p>
          </div>
          <button
            onClick={handleResetSuccess}
            className="text-emerald-400/60 hover:text-emerald-400 transition-colors p-1"
            aria-label="Cerrar notificación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30 animate-fade-in">
          <div className="w-5 h-5 mt-0.5 flex-shrink-0 text-danger-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-danger-500">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-danger-500/60 hover:text-danger-500 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-5 sm:p-7 space-y-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-surface-100">Datos de la Cisterna</h3>

        {/* Tanque destino Selector */}
        <div>
          <label htmlFor="select-tanque" className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
            Tanque de Destino
          </label>
          <select
            id="select-tanque"
            value={tanqueId}
            onChange={(e) => {
              setTanqueId(e.target.value);
              setSuccess(false); // Hide success toast on change
            }}
            className="
              w-full px-4 py-3 rounded-xl
              bg-surface-900/80 border border-surface-600/50
              text-surface-100 font-semibold focus:outline-none focus:ring-2 focus:ring-petrol-500/50 focus:border-petrol-500/60
              transition-all duration-200
            "
          >
            {tanques.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface-900 text-surface-100">
                {t.identificador} ({t.tipo === "gasolina" ? "Gasolina" : "Diésel"}) — Stock: {Number(t.stock_actual).toLocaleString("es")} L / Cap: {Number(t.capacidad_maxima).toLocaleString("es")} L
              </option>
            ))}
          </select>
        </div>

        {/* Current & Proj. Stock visual bar (Wow design!) */}
        {tanqueSeleccionado && (
          <div className="bg-surface-900/40 border border-surface-700/40 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-surface-400">Capacidad Total del Tanque:</span>
              <span className="font-bold text-surface-200">{Number(capMaxNum).toLocaleString("es")} L</span>
            </div>

            {/* Custom bar showing stock levels */}
            <div className="relative w-full h-5 bg-surface-800 rounded-full overflow-hidden">
              {/* Current stock percentage */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-petrol-600 to-petrol-500 rounded-l-full transition-all duration-300"
                style={{ width: `${Math.min(100, (stockActualNum / capMaxNum) * 100)}%` }}
              />

              {/* Added stock projection */}
              {litrosNum > 0 && !excedeCapacidad && (
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse-glow"
                  style={{
                    left: `${(stockActualNum / capMaxNum) * 100}%`,
                    width: `${(litrosNum / capMaxNum) * 100}%`,
                  }}
                />
              )}

              {/* If exceeded capacity */}
              {litrosNum > 0 && excedeCapacidad && (
                <div
                  className="absolute top-0 h-full bg-gradient-to-r from-danger-500 to-red-400 animate-pulse"
                  style={{
                    left: `${(stockActualNum / capMaxNum) * 100}%`,
                    width: `${Math.max(0, 100 - (stockActualNum / capMaxNum) * 100)}%`,
                  }}
                />
              )}
            </div>

            {/* Labels under progress bar */}
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-surface-400">Stock Actual: </span>
                <span className="font-semibold text-surface-200">{Number(stockActualNum).toLocaleString("es")} L ({((stockActualNum / capMaxNum) * 100).toFixed(0)}%)</span>
              </div>
              {litrosNum > 0 && (
                <div>
                  <span className="text-surface-400">Proyección: </span>
                  <span className={`font-bold ${excedeCapacidad ? "text-danger-500" : "text-emerald-400"}`}>
                    {Number(stockProyectado).toLocaleString("es")} L ({((stockProyectado / capMaxNum) * 100).toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Litros Ingresados */}
        <div>
          <label htmlFor="input-litros" className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
            Litros a Ingresar
          </label>
          <div className="relative">
            <input
              id="input-litros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={litros}
              onChange={(e) => {
                const val = e.target.value;
                setLitros(val);
                setSuccess(false);
              }}
              placeholder="0.00"
              className={`
                w-full px-4 py-3.5 rounded-xl
                bg-surface-900/80 border
                text-surface-50 text-xl font-bold text-center font-mono
                placeholder:text-surface-700 placeholder:font-normal
                focus:outline-none focus:ring-2 transition-all duration-200
                ${excedeCapacidad
                  ? "border-danger-500/60 focus:ring-danger-500/50 text-danger-500"
                  : esLitrosInvalido
                    ? "border-danger-500/60 focus:ring-danger-500/50 text-danger-500"
                    : litrosNum > 0
                      ? "border-emerald-500/60 focus:ring-emerald-500/50"
                      : "border-surface-600/50 focus:ring-petrol-500/50"
                }
              `}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-500">
              Litros
            </span>
          </div>

          {/* Validation Feedback */}
          {excedeCapacidad && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-500/10 border border-danger-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-danger-500 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <p className="text-xs font-medium text-danger-500">
                El volumen ingresado excede la capacidad del tanque por{" "}
                <span className="font-bold">{(stockProyectado - capMaxNum).toFixed(2)} L</span>.
              </p>
            </div>
          )}

          {esLitrosInvalido && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-500/10 border border-danger-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-danger-500 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <p className="text-xs font-medium text-danger-500">
                Ingresa una cantidad mayor que cero.
              </p>
            </div>
          )}

          {!excedeCapacidad && litrosNum > 0 && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-400 flex-shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <p className="text-xs font-medium text-emerald-400 font-semibold">
                Capacidad disponible suficiente ✓
              </p>
            </div>
          )}
        </div>

        {/* Grid for Placa Cisterna & Observación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Placa Cisterna */}
          <div>
            <label htmlFor="input-placa-cisterna" className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
              Placa de la Cisterna (Opcional)
            </label>
            <input
              id="input-placa-cisterna"
              type="text"
              value={placaCisterna}
              onChange={(e) => setPlacaCisterna(e.target.value.toUpperCase())}
              placeholder="Ej: CIS-4928"
              maxLength={12}
              className="
                w-full px-4 py-3 rounded-xl
                bg-surface-900/80 border border-surface-600/50
                text-surface-100 font-semibold font-mono text-center tracking-wider
                focus:outline-none focus:ring-2 focus:ring-petrol-500/50 focus:border-petrol-500/60
                transition-all duration-200
              "
            />
          </div>

          {/* Observación */}
          <div>
            <label htmlFor="input-observacion" className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
              Observaciones (Opcional)
            </label>
            <input
              id="input-observacion"
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: Chofer Juan Pérez, guía #2938"
              className="
                w-full px-4 py-3 rounded-xl
                bg-surface-900/80 border border-surface-600/50
                text-surface-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-petrol-500/50 focus:border-petrol-500/60
                transition-all duration-200
              "
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="btn-registrar-ingreso"
          type="submit"
          disabled={!canSubmit}
          className={`
            w-full flex items-center justify-center gap-2
            px-6 py-4 sm:py-3.5 rounded-xl font-semibold text-base
            transition-all duration-200
            ${!canSubmit
              ? "bg-surface-700 text-surface-500 cursor-not-allowed"
              : "bg-gradient-to-r from-petrol-600 to-petrol-500 text-white shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98]"
            }
          `}
        >
          {saving ? (
            <>
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando Ingreso...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Registrar Ingreso
            </>
          )}
        </button>
      </form>
    </div>
  );
}
