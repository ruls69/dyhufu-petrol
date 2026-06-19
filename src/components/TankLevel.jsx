// ============================================================================
// DyHuFu Petrol — Tank Level Indicator Component
// ============================================================================
// Indicador visual del nivel de un tanque con barra de progreso vertical
// y estados de alerta.
// ============================================================================

export default function TankLevel({
  id,
  nombre,
  tipo,
  porcentaje,
  stockActual,
  capacidad,
  alerta,
  className = "",
  animDelay = "",
}) {
  const alertaConfig = {
    NORMAL: {
      barColor: "from-petrol-500 to-petrol-400",
      bgColor: "bg-petrol-500/10",
      badge: "bg-petrol-500/20 text-petrol-400",
      label: "Normal",
    },
    BAJO: {
      barColor: "from-fuel-500 to-fuel-400",
      bgColor: "bg-fuel-500/10",
      badge: "bg-fuel-500/20 text-fuel-400",
      label: "Bajo",
    },
    CRÍTICO: {
      barColor: "from-danger-500 to-red-400",
      bgColor: "bg-danger-500/10",
      badge: "bg-danger-500/20 text-danger-500",
      label: "Crítico",
    },
  };

  const config = alertaConfig[alerta] || alertaConfig.NORMAL;
  const pct = Math.min(100, Math.max(0, porcentaje));

  return (
    <div
      id={id}
      className={`
        group bg-surface-800/60 backdrop-blur-sm border border-surface-700/50
        rounded-2xl p-5 transition-all duration-300
        hover:border-surface-600/60 hover:bg-surface-800/80
        animate-fade-in ${animDelay} ${className}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-200">{nombre}</h3>
          <p className="text-xs text-surface-500 capitalize">{tipo}</p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${config.badge}`}
        >
          {config.label}
        </span>
      </div>

      {/* Horizontal tank bar */}
      <div className="relative w-full h-5 bg-surface-700/60 rounded-full overflow-hidden mb-3">
        <div
          className={`absolute left-0 top-0 h-full bg-gradient-to-r ${config.barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white drop-shadow-md">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-surface-400">
        <span>
          <span className="font-semibold text-surface-200">
            {Number(stockActual).toLocaleString("es")}
          </span>{" "}
          L actuales
        </span>
        <span>
          {Number(capacidad).toLocaleString("es")} L cap.
        </span>
      </div>
    </div>
  );
}
