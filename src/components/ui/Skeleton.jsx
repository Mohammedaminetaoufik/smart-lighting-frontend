import { cn } from '../../utils/helpers'

/** Barre de chargement de base — même esthétique que le skeleton d'AIPageInsights */
export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse bg-[var(--surface-2)] rounded-full', className)} {...props} />
}

/** Squelette de tableau : header + lignes de largeurs variées */
export function TableSkeleton({ rows = 8, cols = 6 }) {
  const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3', 'w-3/5']
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex-1">
                <Skeleton className={cn('h-2.5', widths[(r + c) % widths.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Squelette de carte KPI (StatCard) */
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-2.5 w-2/3" />
    </div>
  )
}

/** Squelette de graphique */
export function ChartSkeleton({ height = 260 }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      <Skeleton className="h-3.5 w-1/4" />
      <div className="flex items-end gap-3" style={{ height }}>
        {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton className={cn('w-full rounded-t-lg rounded-b-none')} style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skeleton
