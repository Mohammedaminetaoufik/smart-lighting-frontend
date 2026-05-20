import { cn } from '../../utils/helpers'

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
          <Icon size={24} className="text-[var(--text-muted)]" />
        </div>
      )}
      <p className="font-semibold text-[var(--text)] mb-1">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
