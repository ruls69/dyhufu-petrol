import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVentas();
  }, []);

  const fetchVentas = async () => {
    setLoading(true);
    setError(null);

    try {
      // Usamos el join de Supabase para obtener la placa del cliente y el identificador del tanque
      const { data, error: err } = await supabase
        .from("venta")
        .select(`
          id,
          fecha,
          litros,
          monto_total_bob,
          metodo_pago,
          cliente:cliente_id (
            placa,
            nombre_titular
          ),
          tanque:tanque_id (
            identificador,
            tipo
          )
        `)
        .order("fecha", { ascending: false });

      if (err) {
        throw new Error(err.message);
      }

      setVentas(data || []);
    } catch (e) {
      setError("No se pudo cargar el historial de ventas. Verifica tu conexión a la base de datos.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 flex items-center justify-center text-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
              Historial de Ventas
            </h2>
            <p className="text-sm text-surface-400 mt-1">
              Registro general de despachos de combustible
            </p>
          </div>
        </div>

        <button
          onClick={fetchVentas}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700/50 text-surface-300 font-medium text-sm hover:bg-surface-700/60 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-danger-500 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm font-medium text-danger-500">{error}</p>
        </div>
      )}

      {/* ── Data Table ── */}
      <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-surface-900/50 border-b border-surface-700/50">
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Cliente (Placa)
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Combustible
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                  Litros
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/30">
              {loading && ventas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-surface-500">
                      <svg
                        className="animate-spin w-8 h-8 mb-4 text-petrol-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                      <p>Cargando registros...</p>
                    </div>
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    No se encontraron registros de ventas.
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => {
                  const fecha = new Date(venta.fecha);
                  return (
                    <tr
                      key={venta.id}
                      className="hover:bg-surface-700/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-surface-200">
                          {fecha.toLocaleDateString("es-ES")}
                        </div>
                        <div className="text-xs text-surface-500 font-mono mt-0.5">
                          {fecha.toLocaleTimeString("es-ES")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-surface-100 bg-surface-900 px-2 py-1 rounded">
                            {venta.cliente?.placa || "N/A"}
                          </span>
                        </div>
                        <div className="text-[10px] text-surface-500 mt-1 uppercase tracking-wide truncate max-w-[150px]">
                          {venta.cliente?.nombre_titular || "Usuario Regular"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              venta.tanque?.tipo === "gasolina" ? "bg-petrol-400" : "bg-fuel-400"
                            }`}
                          />
                          <span className="text-surface-200 capitalize">
                            {venta.tanque?.tipo || "Desconocido"}
                          </span>
                        </div>
                        <div className="text-xs text-surface-500 mt-1">
                          Tanque: {venta.tanque?.identificador || "---"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-surface-100">
                          {Number(venta.litros).toFixed(2)}
                        </span>
                        <span className="text-surface-500 ml-1 text-xs">L</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Completado
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
