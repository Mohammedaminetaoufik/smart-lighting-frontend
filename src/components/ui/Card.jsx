import { cn } from '../../utils/helpers'

export default function Card({ className, children, padding = true, ...props }) {
  return (
    <div
      {...props}
      className={cn(
        'bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-card',
        padding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div>
        <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}
