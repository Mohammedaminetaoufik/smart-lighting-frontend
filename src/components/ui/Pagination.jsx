import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../utils/helpers'

/**
 * Pagination component.
 *
 * Props:
 *   page       — current page (0-indexed)
 *   pageSize   — items per page
 *   total      — total number of items
 *   onChange   — (newPage) => void
 *   pageSizes  — optional [number] list to expose a size selector
 *   onPageSizeChange — (newSize) => void (used with pageSizes)
 */
export default function Pagination({ page, pageSize, total, onChange, pageSizes, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 0
  const canNext = page < totalPages - 1
  const start = page * pageSize + 1
  const end = Math.min((page + 1) * pageSize, total)

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <p className="text-[12px] text-[var(--text-muted)]">
        {start}–{end} sur {total}
      </p>

      <div className="flex items-center gap-1">
        {pageSizes && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="mr-3 px-2 py-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {pageSizes.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        )}

        <PageBtn disabled={!canPrev} onClick={() => onChange(0)} title="Première page">
          <ChevronsLeft size={13} />
        </PageBtn>
        <PageBtn disabled={!canPrev} onClick={() => onChange(page - 1)} title="Précédent">
          <ChevronLeft size={13} />
        </PageBtn>

        <span className="px-3 text-[12px] text-[var(--text)] font-medium">
          {page + 1} <span className="text-[var(--text-muted)]">/ {totalPages}</span>
        </span>

        <PageBtn disabled={!canNext} onClick={() => onChange(page + 1)} title="Suivant">
          <ChevronRight size={13} />
        </PageBtn>
        <PageBtn disabled={!canNext} onClick={() => onChange(totalPages - 1)} title="Dernière page">
          <ChevronsRight size={13} />
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ disabled, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        disabled
          ? 'text-[var(--text-muted)] opacity-30 cursor-not-allowed'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
      )}
    >
      {children}
    </button>
  )
}
