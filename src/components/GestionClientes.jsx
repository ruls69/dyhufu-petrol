import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function GestionClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ── Buscador ──
  const [searchTerm, setSearchTerm] = useState("");

  // ── Modal de Nuevo Cliente ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    placa: "",
    nombre_titular: "",
    tipo_vehiculo: "Particular",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ── Carga Inicial ──
  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("cliente")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setClientes(data || []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los clientes. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  // ── Cambiar Estado (Toggle) ──
  const handleToggleEstado = async (cliente) => {
    const nuevoEstado = cliente.estado === "Activo" ? "Suspendido" : "Activo";
    
    // Actualización optimista
    setClientes((prev) =>
      prev.map((c) => (c.id === cliente.id ? { ...c, estado: nuevoEstado } : c))
    );

    try {
      const { error: err } = await supabase
        .from("cliente")
        .update({ estado: nuevoEstado })
        .eq("id", cliente.id);

      if (err) throw err;
    } catch (e) {
      console.error("Error actualizando estado:", e);
      // Revertir en caso de error
      setClientes((prev) =>
        prev.map((c) =>
          c.id === cliente.id ? { ...c, estado: cliente.estado } : c
        )
      );
      setError(`No se pudo actualizar el estado de la placa ${cliente.placa}.`);
    }
  };

  // ── Guardar Nuevo Cliente ──
  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    const placaNorm = nuevoCliente.placa.trim().toUpperCase();
    
    if (placaNorm.length < 3) {
      setModalError("La placa debe tener al menos 3 caracteres.");
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      // 1. Obtener la empresa por defecto (asumimos que hay una sola empresa base)
      const { data: empresa, error: errEmpresa } = await supabase
        .from("empresa")
        .select("id")
        .limit(1)
        .single();

      if (errEmpresa) throw new Error("No se pudo obtener el ID de la empresa base.");

      // 2. Insertar el cliente
      const { data: clienteInsertado, error: errInsert } = await supabase
        .from("cliente")
        .insert({
          empresa_id: empresa.id,
          placa: placaNorm,
          nombre_titular: nuevoCliente.nombre_titular.trim() || null,
          tipo_vehiculo: nuevoCliente.tipo_vehiculo,
          estado: "Activo",
          es_nuevo: true,
        })
        .select()
        .single();

      if (errInsert) {
        if (errInsert.code === "23505") { // Código de violación de UNIQUE en Postgres
          throw new Error(`La placa ${placaNorm} ya está registrada en el sistema.`);
        }
        throw errInsert;
      }

      // 3. Actualizar estado local
      setClientes([clienteInsertado, ...clientes]);
      setIsModalOpen(false);
      setNuevoCliente({ placa: "", nombre_titular: "", tipo_vehiculo: "Particular" });

    } catch (e) {
      console.error(e);
      setModalError(e.message || "Ocurrió un error al guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filtro local ──
  const clientesFiltrados = clientes.filter((c) =>
    c.placa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in relative">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-info-500 to-info-700 flex items-center justify-center text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
              Gestión de Clientes
            </h2>
            <p className="text-sm text-surface-400 mt-1">
              Administración de vehículos y estados de cupo
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-info-600 to-info-500 text-white font-semibold text-sm shadow-lg shadow-info-500/20 hover:shadow-info-500/40 active:scale-[0.98] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {/* ── Buscador y Alertas ── */}
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-danger-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm font-medium text-danger-500">{error}</p>
          </div>
        )}

        <div className="relative max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700/50 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-info-500/50 focus:border-info-500/50 transition-all"
          />
        </div>
      </div>

      {/* ── Tabla de Clientes ── */}
      <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-surface-900/50 border-b border-surface-700/50">
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Placa
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Titular / Tipo
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">
                  Registro
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-center">
                  Estado
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/30">
              {loading && clientes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    <div className="flex justify-center items-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-info-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Cargando clientes...
                    </div>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-surface-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-surface-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-surface-50 text-base">
                        {cliente.placa}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-surface-200">
                        {cliente.nombre_titular || <span className="text-surface-500 italic">No especificado</span>}
                      </div>
                      <div className="text-xs text-surface-500 mt-1">
                        {cliente.tipo_vehiculo || "Vehículo"}
                        {cliente.es_nuevo && (
                          <span className="ml-2 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider bg-surface-700 text-surface-300">
                            Nuevo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-surface-400">
                      {new Date(cliente.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        cliente.estado === "Activo"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-danger-500/10 text-danger-400 border-danger-500/20"
                      }`}>
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleEstado(cliente)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-info-500/50 focus:ring-offset-2 focus:ring-offset-surface-900 ${
                          cliente.estado === "Activo" ? "bg-emerald-500" : "bg-surface-600"
                        }`}
                        role="switch"
                        aria-checked={cliente.estado === "Activo"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            cliente.estado === "Activo" ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Nuevo Cliente ── */}
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
              <h3 className="text-xl font-bold text-surface-50">Registrar Cliente</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-surface-500 hover:text-surface-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleGuardarCliente} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-sm text-danger-500 font-medium">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Placa (Obligatorio)
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={nuevoCliente.placa}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, placa: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-info-500/50"
                  placeholder="ABC-123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Nombre del Titular
                </label>
                <input
                  type="text"
                  value={nuevoCliente.nombre_titular}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre_titular: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 focus:outline-none focus:ring-2 focus:ring-info-500/50"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                  Tipo de Vehículo
                </label>
                <select
                  value={nuevoCliente.tipo_vehiculo}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo_vehiculo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600/50 text-surface-50 focus:outline-none focus:ring-2 focus:ring-info-500/50 appearance-none"
                >
                  <option value="Particular">Particular</option>
                  <option value="Transporte Público">Transporte Público</option>
                  <option value="Carga">Carga</option>
                  <option value="Motocicleta">Motocicleta</option>
                  <option value="Otro">Otro</option>
                </select>
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
                      : "bg-info-600 hover:bg-info-500 active:scale-[0.98]"
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
