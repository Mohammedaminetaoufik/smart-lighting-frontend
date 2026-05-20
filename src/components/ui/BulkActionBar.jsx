import { X } from 'lucide-react'
import { cn } from '../../utils/helpers'

/**
 * Sticky bottom action bar that appears when one or more rows are selected.
 *
 * Props:
 *   count      — number selected (controls visibility)
 *   onClear    — callback to clear selection
 *   children   — action buttons (composed by the caller)
 */
export default function BulkActionBar({ count, onClear, children, className }) {
  if (count < 1) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4">
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl',
          'bg-[var(--surface)] border border-[var(--border)]',
          'backdrop-blur-sm',
          className
        )}
      >
        <div className="flex items-center gap-2 pr-3 border-r border-[var(--border)]">
          <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">{count}</span>
          </div>
          <span className="text-[12px] font-medium text-[var(--text)]">
            sélectionné{count > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">{children}</div>
        <button
          onClick={onClear}
          className="ml-1 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
          title="Annuler la sélection"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
