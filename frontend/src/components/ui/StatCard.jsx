import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function StatCard({ label, value, icon: Icon, trend, trendUp, sweepDelay = 150 }) {
  const TrendIcon  = trendUp === false ? TrendingDown : trendUp === true ? TrendingUp : Minus
  // Muted — informational, not attention-grabbing
  const trendColor = trendUp === false
    ? 'rgba(248,113,113,0.45)'
    : trendUp === true
      ? 'rgba(52,211,153,0.50)'
      : '#3f3f46'

  return (
    <div
      className="card-glow relative flex flex-col gap-5 rounded-2xl p-6 overflow-hidden
                 bg-gradient-to-b from-[#1c1c2a] to-[#14141e]
                 border border-white/[0.08]
                 shadow-xl shadow-black/50
                 hover:-translate-y-0.5 cursor-default"
    >
      {/* Very soft top-edge inner line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* One-time sweep on mount */}
      <span className="card-sweep" style={{ animationDelay: `${sweepDelay}ms` }} />

      {/* Icon + Label */}
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-accent/[0.07] border border-accent/[0.12] flex items-center justify-center">
          {Icon && <Icon size={13} className="text-accent/70" />}
        </div>
        <span className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest">
          {label}
        </span>
      </div>

      {/* Value + Trend */}
      <div>
        <div className="text-4xl font-bold text-zinc-100 tabular-nums tracking-tight leading-none">
          {value?.toLocaleString() ?? '—'}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color: trendColor }}>
            <TrendIcon size={10} />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  )
}
