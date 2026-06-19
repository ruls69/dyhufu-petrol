import React from "react";

export default function TicketCierre({ operador, fecha_apertura, fecha_cierre, resumen, onVolver }) {
  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "N/A";
    const date = new Date(fechaISO);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      
      {/* ── Botones de Acción (No se imprimen) ── */}
      <div className="w-full max-w-[320px] mb-6 flex flex-col gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-petrol-600 text-white font-bold text-lg shadow-lg hover:bg-petrol-500 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir Ticket
        </button>
        <button
          onClick={onVolver}
          className="w-full px-6 py-3 bg-surface-800 text-surface-200 font-medium rounded-xl hover:bg-surface-700 transition-colors"
        >
          Volver al Inicio
        </button>
      </div>

      {/* ── Vista Previa del Ticket (Visible en pantalla y al imprimir) ── */}
      <div className="bg-white text-black p-4 w-full max-w-[300px] shadow-2xl mx-auto rounded-sm border-t-4 border-b-4 border-dashed border-gray-300 print:shadow-none print:border-none print:m-0 print:p-0 print:w-full">
        
        {/* Cabecera */}
        <div className="text-center font-mono border-b-2 border-black pb-3 mb-3">
          <h1 className="text-xl font-bold uppercase tracking-widest mb-1">DYHUFU PETROL</h1>
          <p className="text-[11px] leading-tight">Sistema de Control de Carburantes</p>
          <p className="text-[11px] leading-tight">Ticket de Arqueo - Cierre de Caja</p>
        </div>

        {/* Datos del Turno */}
        <div className="font-mono text-[12px] mb-3">
          <div className="flex justify-between">
            <span>OPERADOR:</span>
            <span className="font-bold">{operador.toUpperCase()}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>APERTURA:</span>
            <span>{formatearFecha(fecha_apertura)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>CIERRE:</span>
            <span>{formatearFecha(fecha_cierre)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Volumen Despachado */}
        <div className="font-mono text-[12px] mb-3">
          <p className="font-bold text-center mb-1">VOLUMEN DESPACHADO (L)</p>
          <div className="flex justify-between">
            <span>GASOLINA:</span>
            <span>{resumen.litrosGasolina.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>DIÉSEL:</span>
            <span>{resumen.litrosDiesel.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold mt-1">
            <span>TOTAL LITROS:</span>
            <span>{(resumen.litrosGasolina + resumen.litrosDiesel).toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Resumen Financiero */}
        <div className="font-mono text-[12px] mb-3">
          <p className="font-bold text-center mb-1">INGRESOS POR MÉTODO (Bs.)</p>
          <div className="flex justify-between">
            <span>EFECTIVO:</span>
            <span>{resumen.efectivo.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>QR/DIGITAL:</span>
            <span>{resumen.qr.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>TARJETA:</span>
            <span>{resumen.tarjeta.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-b-2 border-black mb-3" />

        {/* Total General */}
        <div className="font-mono text-[14px] font-bold mb-4">
          <div className="flex justify-between">
            <span>TOTAL RECAUDADO:</span>
            <span>Bs. {resumen.totalBOB.toFixed(2)}</span>
          </div>
        </div>

        {/* Firma */}
        <div className="mt-10 font-mono text-[11px] text-center">
          <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
          <p>FIRMA OPERADOR</p>
        </div>

        <div className="mt-6 text-center font-mono text-[10px] text-gray-500">
          <p>*** FIN DEL REPORTE ***</p>
          <p>{new Date().toLocaleString("es-ES")}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}} />
    </div>
  );
}
