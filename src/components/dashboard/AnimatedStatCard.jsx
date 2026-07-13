import { HoverCard, AnimatedNumber } from '../animations'

// Premium KPI card: accent glow, animated count-up, hover lift.
// value is numeric (animated); pass `text` instead for non-numeric values.
export default function AnimatedStatCard({
  icon: Icon, label, value, text, decimals = 0, prefix = '', suffix = '',
  accent = '#22c55e', onClick,
}) {
  return (
    <HoverCard className={onClick ? 'cursor-pointer' : ''} onClick={onClick}>
      <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 card-hover-glow h-full">
        {/* accent glow blob */}
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[0.18] pointer-events-none"
          style={{ background: accent }} />

        <div className="relative flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}1a`, boxShadow: `inset 0 0 0 1px ${accent}30` }}>
            {Icon && <Icon size={20} style={{ color: accent }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[var(--text-muted)] font-medium truncate">{label}</p>
            <p className="text-[26px] font-bold text-[var(--text)] leading-tight mt-0.5 tabular-nums">
              {text !== undefined
                ? text
                : <AnimatedNumber value={value ?? 0} decimals={decimals} prefix={prefix} suffix={suffix} />}
            </p>
            {onClick && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 opacity-50">Cliquer pour détails</p>
            )}
          </div>
        </div>
      </div>
    </HoverCard>
  )
}
