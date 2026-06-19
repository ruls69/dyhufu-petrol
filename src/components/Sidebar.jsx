// ============================================================================
// DyHuFu Petrol — Sidebar Component
// ============================================================================
// Menú lateral responsive: colapsado en mobile, expandido en desktop.
// Incluye toggle para abrir/cerrar en tablets.
// ============================================================================

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Inline SVG icons to avoid external dependencies
const icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  tank: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M3 15h18" />
      <path d="M8 15v4" />
      <path d="M16 15v4" />
    </svg>
  ),
  client: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  sale: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  ingreso: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  ),
  menu: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  fuel: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
      <path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v0a1 1 0 0 0 1-1V8l-3-3" />
      <path d="M3 22h12" />
      <path d="M7 8h4" />
    </svg>
  ),
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
  { id: "tanques", label: "Tanques", icon: icons.tank },
  { id: "clientes", label: "Clientes", icon: icons.client },
  { id: "ventas", label: "Ventas", icon: icons.sale },
  { id: "ingresos", label: "Ingresos", icon: icons.ingreso },
  { id: "caja", label: "Cierre Caja", icon: icons.sale },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const activeSection = location.pathname.substring(1) || "dashboard";

  const handleNav = (id) => {
    navigate(id === "dashboard" ? "/" : `/${id}`);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-surface-900/95 backdrop-blur-md border-b border-surface-700/50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="text-petrol-400">{icons.fuel}</div>
          <div>
            <h1 className="text-base font-bold text-surface-50 leading-tight">
              DyHuFu Petrol
            </h1>
            <p className="text-[10px] text-surface-400 font-medium tracking-widest uppercase">
              Control de Carburantes
            </p>
          </div>
        </div>
        <button
          id="sidebar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-surface-300 hover:text-surface-50 hover:bg-surface-700/60 transition-colors"
          aria-label="Abrir menú"
        >
          {mobileOpen ? icons.close : icons.menu}
        </button>
      </header>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-surface-900 border-r border-surface-700/50
          flex flex-col transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto print:hidden
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
        style={{ boxShadow: mobileOpen ? "var(--shadow-sidebar)" : undefined }}
      >
        {/* Brand */}
        <div className="p-5 pb-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 flex items-center justify-center text-white shadow-lg">
              {icons.fuel}
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-50 leading-tight">
                DyHuFu Petrol
              </h1>
              <p className="text-[10px] text-surface-400 font-medium tracking-[0.15em] uppercase">
                Control de Carburantes
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
            Operaciones
          </p>
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-petrol-500/15 text-petrol-400 shadow-sm"
                      : "text-surface-400 hover:text-surface-100 hover:bg-surface-800/60"
                  }
                `}
              >
                <span
                  className={`transition-colors ${
                    isActive
                      ? "text-petrol-400"
                      : "text-surface-500 group-hover:text-surface-300"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-petrol-400 animate-pulse-glow" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuel-500 to-fuel-700 flex items-center justify-center text-white text-xs font-bold">
              OP
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">
                Operador
              </p>
              <p className="text-[11px] text-surface-500">Bomba #1</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="En línea" />
          </div>
        </div>
      </aside>
    </>
  );
}
