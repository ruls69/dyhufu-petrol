// ============================================================================
// DyHuFu Petrol — Stat Card Component
// ============================================================================
// Tarjeta de estadística reutilizable para el dashboard.
// ============================================================================

export default function StatCard({
  id,
  icon,
  label,
  value,
  unit,
  trend,
  trendLabel,
  accent = "petrol",
  className = "",
  animDelay = "",
}) {
  const accentMap = {
    petrol: {
      iconBg: "from-petrol-500 to-petrol-700",
      glow: "group-hover:shadow-[0_0_20px_rgb(42_146_114/0.25)]",
      trendUp: "text-emerald-400",
    },
    fuel: {
      iconBg: "from-fuel-500 to-fuel-700",
      glow: "group-hover:shadow-[0_0_20px_rgb(249_140_7/0.25)]",
      trendUp: "text-fuel-400",
    },
    danger: {
      iconBg: "from-danger-500 to-danger-600",
      glow: "group-hover:shadow-[0_0_20px_rgb(239_68_68/0.25)]",
      trendUp: "text-danger-500",
    },
    info: {
      iconBg: "from-sky-500 to-sky-700",
      glow: "group-hover:shadow-[0_0_20px_rgb(14_165_233/0.25)]",
      trendUp: "text-sky-400",
    },
  };

  const colors = accentMap[accent] || accentMap.petrol;

  return (
    <div
      id={id}
      className={`
        group relative bg-surface-800/60 backdrop-blur-sm border border-surface-700/50
        rounded-2xl p-5 transition-all duration-300
        hover:border-surface-600/60 hover:bg-surface-800/80
        ${colors.glow}
        animate-fade-in ${animDelay} ${className}
      `}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.iconBg} flex items-center justify-center text-white shadow-lg`}
        >
          {icon}
        </div>

        {trend !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${
                trend >= 0
                  ? `${colors.trendUp} bg-emerald-500/10`
                  : "text-red-400 bg-red-500/10"
              }
            `}
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="animate-count-up">
        <p className="text-2xl sm:text-3xl font-bold text-surface-50 tracking-tight">
          {value}
          {unit && (
            <span className="text-sm font-medium text-surface-400 ml-1">
              {unit}
            </span>
          )}
        </p>
      </div>

      {/* Label */}
      <p className="mt-1 text-sm text-surface-400">{label}</p>

      {/* Trend label */}
      {trendLabel && (
        <p className="mt-2 text-xs text-surface-500">{trendLabel}</p>
      )}
    </div>
  );
}
