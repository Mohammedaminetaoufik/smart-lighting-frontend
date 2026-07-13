import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingDown, CalendarDays, Leaf } from 'lucide-react'
import { getFinancialSummary } from '../../api/finance'

function fmtDH(v) {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M DH`
  if (v >= 1000) return `${(v / 1000).toFixed(1)} k DH`
  return `${Math.round(v)} DH`
}

export default function FinancialSummaryCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: getFinancialSummary,
    staleTime: 60_000,
  })

  const cells = [
    {
      label: 'Coût énergie (30 j)',
      value: fmtDH(data?.cost_month_dh),
      icon: DollarSign, color: '#f59e0b', bg: 'bg-amber-500/10',
      sub: `≈ ${fmtDH(data?.cost_today_dh)} aujourd'hui`,
    },
    {
      label: 'Économies (30 j)',
      value: fmtDH(data?.saving_month_dh),
      icon: TrendingDown, color: '#22c55e', bg: 'bg-green-500/10',
      sub: data?.saving_percent ? `−${Math.round(data.saving_percent)}% vs pleine puissance` : 'grâce au dimming',
    },
    {
      label: 'Projection annuelle',
      value: fmtDH(data?.projected_year_dh),
      icon: CalendarDays, color: '#3b82f6', bg: 'bg-blue-500/10',
      sub: 'au rythme actuel',
    },
    {
      label: 'CO₂ évité (30 j)',
      value: data?.co2_avoided_kg_month != null ? `${Math.round(data.co2_avoided_kg_month)} kg` : '—',
      icon: Leaf, color: '#10b981', bg: 'bg-emerald-500/10',
      sub: 'empreinte carbone réduite',
    },
  ]

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[14px] font-semibold text-[var(--text)]">Synthèse financière</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Facture énergie réelle (tarification ONEE) et impact du pilotage
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1 rounded-md bg-[var(--surface-2)]">
          Direction
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cells.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-[18px] font-bold text-[var(--text)] leading-tight">
              {isLoading ? '…' : value}
            </p>
            <p className="text-[11px] font-medium text-[var(--text)] mt-1">{label}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
