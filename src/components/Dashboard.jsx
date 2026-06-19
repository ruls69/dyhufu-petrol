// ============================================================================
// DyHuFu Petrol — Dashboard Component
// ============================================================================
// Panel principal del operador. Muestra:
//   - KPIs en tarjetas de estadísticas
//   - Estado visual de los tanques
//   - Tabla de últimas ventas (placeholder)
//   - Acceso rápido a registro de venta
//
// Mobile/Tablet First: diseñado para pantallas de 768px+.
// No se realizan consultas a la BD; los datos son de ejemplo (placeholder).
// ============================================================================

import { useNavigate } from "react-router-dom";
import StatCard from "./StatCard";
import TankLevel from "./TankLevel";

// ── Placeholder data (será reemplazado por queries a Supabase) ──
const mockStats = {
  ventasHoy: { value: "1,240", unit: "L", trend: 12, trendLabel: "vs. ayer" },
  clientesActivos: { value: "87", trend: 3, trendLabel: "este mes" },
  ingresoHoy: { value: "5,000", unit: "L", trend: null, trendLabel: "última cisterna" },
  cupoPromedio: { value: "22.5", unit: "L", trend: -2, trendLabel: "promedio semanal" },
};

const mockTanques = [
  {
    id: "tank-1",
    nombre: "Tanque A-01",
    tipo: "gasolina",
    porcentaje: 72.4,
    stockActual: 7240,
    capacidad: 10000,
    alerta: "NORMAL",
  },
  {
    id: "tank-2",
    nombre: "Tanque A-02",
    tipo: "diesel",
    porcentaje: 35.1,
    stockActual: 3510,
    capacidad: 10000,
    alerta: "BAJO",
  },
  {
    id: "tank-3",
    nombre: "Tanque B-01",
    tipo: "gasolina",
    porcentaje: 12.8,
    stockActual: 1280,
    capacidad: 10000,
    alerta: "CRÍTICO",
  },
];

const mockVentasRecientes = [
  { placa: "ABC-123", litros: 18.5, tipo: "gasolina", hora: "09:42", cupo: 22.5 },
  { placa: "XYZ-789", litros: 25.0, tipo: "diesel", hora: "09:38", cupo: 30.0 },
  { placa: "DEF-456", litros: 15.0, tipo: "gasolina", hora: "09:31", cupo: 20.0 },
  { placa: "GHI-012", litros: 20.0, tipo: "diesel", hora: "09:25", cupo: 22.5 },
  { placa: "JKL-345", litros: 10.0, tipo: "gasolina", hora: "09:18", cupo: 20.0 },
];

// ── SVG Icons ──
const iconLitros = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M5.5 5.5L12 2l6.5 3.5v8L12 17l-6.5-3.5z" />
    <path d="M12 17v5" />
    <path d="M5.5 5.5L12 9l6.5-3.5" />
    <path d="M12 9v8" />
  </svg>
);

const iconClientes = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const iconIngreso = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

const iconCupo = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export default function Dashboard() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Buenos días" : now.getHours() < 18 ? "Buenas tardes" : "Buenas noches";
  const navigate = useNavigate();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
            {greeting}, Operador
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            {now.toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            <span className="text-petrol-400 font-medium">Turno Matutino</span>
          </p>
        </div>

        {/* Quick action */}
        <button
          id="btn-nueva-venta"
          onClick={() => navigate("/nueva-venta")}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-gradient-to-r from-petrol-600 to-petrol-500
            text-white font-semibold text-sm
            shadow-lg shadow-petrol-500/20
            hover:shadow-petrol-500/40 hover:from-petrol-500 hover:to-petrol-400
            active:scale-[0.97] transition-all duration-200
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva Venta
        </button>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          id="stat-ventas-hoy"
          icon={iconLitros}
          label="Litros Despachados Hoy"
          value={mockStats.ventasHoy.value}
          unit={mockStats.ventasHoy.unit}
          trend={mockStats.ventasHoy.trend}
          trendLabel={mockStats.ventasHoy.trendLabel}
          accent="petrol"
          animDelay="stagger-1"
        />
        <StatCard
          id="stat-clientes"
          icon={iconClientes}
          label="Clientes Activos"
          value={mockStats.clientesActivos.value}
          trend={mockStats.clientesActivos.trend}
          trendLabel={mockStats.clientesActivos.trendLabel}
          accent="info"
          animDelay="stagger-2"
        />
        <StatCard
          id="stat-ingreso"
          icon={iconIngreso}
          label="Último Ingreso"
          value={mockStats.ingresoHoy.value}
          unit={mockStats.ingresoHoy.unit}
          trendLabel={mockStats.ingresoHoy.trendLabel}
          accent="fuel"
          animDelay="stagger-3"
        />
        <StatCard
          id="stat-cupo"
          icon={iconCupo}
          label="Cupo Promedio (Ps)"
          value={mockStats.cupoPromedio.value}
          unit={mockStats.cupoPromedio.unit}
          trend={mockStats.cupoPromedio.trend}
          trendLabel={mockStats.cupoPromedio.trendLabel}
          accent="petrol"
          animDelay="stagger-4"
        />
      </div>

      {/* ── Tanks Section ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-100">
            Estado de Tanques
          </h3>
          <span className="text-xs text-surface-500">
            Actualizado en tiempo real
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {mockTanques.map((tanque, i) => (
            <TankLevel
              key={tanque.id}
              id={tanque.id}
              nombre={tanque.nombre}
              tipo={tanque.tipo}
              porcentaje={tanque.porcentaje}
              stockActual={tanque.stockActual}
              capacidad={tanque.capacidad}
              alerta={tanque.alerta}
              animDelay={`stagger-${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Recent Sales Table ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-100">
            Últimas Ventas
          </h3>
          <button
            id="btn-ver-todas-ventas"
            className="text-xs text-petrol-400 hover:text-petrol-300 font-medium transition-colors"
          >
            Ver todas →
          </button>
        </div>

        <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-2xl overflow-hidden animate-fade-in">
          {/* Table: visible on sm+ */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Placa
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Litros
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Cupo
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {mockVentasRecientes.map((venta, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-700/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-surface-100">
                        {venta.placa}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-surface-100">
                        {venta.litros}
                      </span>
                      <span className="text-surface-500 ml-1">L</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${
                            venta.tipo === "gasolina"
                              ? "bg-petrol-500/15 text-petrol-400"
                              : "bg-fuel-500/15 text-fuel-400"
                          }
                        `}
                      >
                        {venta.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-surface-400">
                      {venta.cupo} L
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-surface-400">
                      {venta.hora}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards: visible on mobile */}
          <div className="sm:hidden divide-y divide-surface-700/30">
            {mockVentasRecientes.map((venta, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold
                      ${
                        venta.tipo === "gasolina"
                          ? "bg-petrol-500/15 text-petrol-400"
                          : "bg-fuel-500/15 text-fuel-400"
                      }
                    `}
                  >
                    {venta.tipo === "gasolina" ? "G" : "D"}
                  </div>
                  <div>
                    <p className="font-mono font-semibold text-sm text-surface-100">
                      {venta.placa}
                    </p>
                    <p className="text-xs text-surface-500">
                      Cupo: {venta.cupo} L
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-surface-100">
                    {venta.litros} <span className="text-xs text-surface-400">L</span>
                  </p>
                  <p className="text-xs text-surface-500 font-mono">{venta.hora}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer spacer for mobile nav ── */}
      <div className="h-4 lg:h-0" />
    </div>
  );
}
