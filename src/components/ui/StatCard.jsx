import { cn } from '../../utils/helpers'

export default function StatCard({ icon: Icon, label, value, sub, iconBg = 'bg-brand-500/10', iconColor = 'text-brand-500', trend, className }) {
  return (
    <div className={cn('bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex items-start gap-4 shadow-card', className)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {Icon && <Icon size={20} className={iconColor} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--text-muted)] font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-[var(--text)] leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>}
        {trend !== undefined && (
          <p className={cn('text-[11px] font-medium mt-1', trend >= 0 ? 'text-green-500' : 'text-red-500')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs hier
          </p>
        )}
      </div>
    </div>
  )
}
