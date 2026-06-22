import { cn } from '../../utils/helpers'

/**
 * Industrial score badge (0–100).
 * - higherIsBetter=true  → green high / red low (maintainability, communication, energy)
 * - higherIsBetter=false → red high / green low (risk_score)
 */
function colorFor(score, higherIsBetter) {
  if (score == null) return { text: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-2)]', ring: 'var(--border)' }
  const good = { text: 'text-green-400', bg: 'bg-green-500/10', ring: '#22c55e' }
  const warn = { text: 'text-amber-400', bg: 'bg-amber-500/10', ring: '#f59e0b' }
  const bad = { text: 'text-red-400', bg: 'bg-red-500/10', ring: '#ef4444' }
  if (higherIsBetter) {
    if (score >= 70) return good
    if (score >= 40) return warn
    return bad
  }
  if (score >= 70) return bad
  if (score >= 40) return warn
  return good
}

export default function ScoreBadge({ label, score, higherIsBetter = true, size = 'md' }) {
  if (score == null) return null
  const c = colorFor(score, higherIsBetter)
  const dim = size === 'sm' ? 40 : 48
  const r = (dim - 6) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke={c.ring} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className={cn('absolute inset-0 flex items-center justify-center font-bold', c.text,
          size === 'sm' ? 'text-[12px]' : 'text-[14px]')}>
          {Math.round(score)}
        </div>
      </div>
      <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide text-center leading-tight max-w-[64px]">
        {label}
      </span>
    </div>
  )
}
