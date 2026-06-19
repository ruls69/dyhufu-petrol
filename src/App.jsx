// ============================================================================
// DyHuFu Petrol — App Root
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import NuevaVenta from "./components/NuevaVenta";
import GestionTanques from "./components/GestionTanques";
import RegistroIngreso from "./components/RegistroIngreso";
import HistorialVentas from "./components/HistorialVentas";
import GestionClientes from "./components/GestionClientes";
import CierreCaja from "./components/CierreCaja";
import Login from "./components/Login";
import RutaPrivada from "./components/RutaPrivada";

// Layout component that includes the Sidebar
function MainLayout() {
  return (
    <div className="flex min-h-dvh bg-surface-950 print:bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 print:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:p-0 print:m-0 print:max-w-none">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nueva-venta" element={<NuevaVenta />} />
            <Route path="/tanques" element={<GestionTanques />} />
            <Route path="/ingresos" element={<RegistroIngreso />} />
            <Route path="/clientes" element={<GestionClientes />} />
            <Route path="/ventas" element={<HistorialVentas />} />
            <Route path="/caja" element={<CierreCaja />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas privadas envueltas en RutaPrivada */}
        <Route element={<RutaPrivada />}>
          <Route path="/*" element={<MainLayout />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}


