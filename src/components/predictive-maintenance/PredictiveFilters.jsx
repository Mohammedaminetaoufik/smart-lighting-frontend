import { Search, X, RotateCcw } from 'lucide-react'
import { RISK_META, FRESHNESS_META } from '../../services/predictiveMaintenanceService'

const PERIODS = [
  { value: 24, label: '24 h' },
  { value: 7 * 24, label: '7 j' },
  { value: 30 * 24, label: '30 j' },
  { value: 90 * 24, label: '90 j' },
]

const FAULT_TYPES = [
  { value: 'overcurrent', label: 'Surintensité' },
  { value: 'overvoltage', label: 'Surtension' },
  { value: 'underpower', label: 'Sous-consommation' },
  { value: 'leakage', label: 'Fuite de courant' },
  { value: 'overtemp', label: 'Surchauffe' },
  { value: 'power_factor', label: 'Dégradation du facteur de puissance' },
  { value: 'unstable_current', label: 'Instabilité du courant' },
  { value: 'intermittent_communication', label: 'Communication intermittente' },
]

function Select({ label, value, onChange, options, allLabel = 'Tous' }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="px-2.5 py-1.5 rounded-lg text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] focus:outline-none focus:border-brand-500/60 cursor-pointer">
        <option value="all">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export default function PredictiveFilters({ filters, setFilters, zones = [], lcus = [], onReset }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const hasActive = filters.periodHours !== 30 * 24 || filters.zone !== 'all' || filters.lcu !== 'all' || filters.riskLevel !== 'all' ||
    filters.faultType !== 'all' || filters.online !== 'all' || filters.freshness !== 'all' || filters.search

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3.5">
      <div className="flex flex-wrap items-end gap-3">
        {/* Période (segment) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Période</span>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => set('periodHours', p.value)}
                aria-pressed={filters.periodHours === p.value}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors ${filters.periodHours === p.value ? 'bg-brand-500 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Select label="Zone" value={filters.zone} onChange={(v) => set('zone', v)} options={zones.map((z) => ({ value: z, label: z }))} />
        <Select label="LCU" value={filters.lcu} onChange={(v) => set('lcu', v)} options={lcus.map((l) => ({ value: l, label: l }))} />
        <Select label="Niveau de risque" value={filters.riskLevel} onChange={(v) => set('riskLevel', v)}
          options={['critical', 'high', 'moderate', 'low'].map((k) => ({ value: k, label: RISK_META[k].label }))} />
        <Select label="Type de panne" value={filters.faultType} onChange={(v) => set('faultType', v)} options={FAULT_TYPES} />
        <Select label="État" value={filters.online} onChange={(v) => set('online', v)}
          options={[{ value: 'online', label: 'En ligne' }, { value: 'offline', label: 'Hors ligne' }]} />
        <Select label="Fraîcheur" value={filters.freshness} onChange={(v) => set('freshness', v)}
          options={Object.keys(FRESHNESS_META).map((k) => ({ value: k, label: FRESHNESS_META[k].label }))} />

        {/* Recherche */}
        <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Recherche</span>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text" value={filters.search} onChange={(e) => set('search', e.target.value)}
              placeholder="Référence, zone, LCU…" aria-label="Rechercher par référence"
              className="w-full pl-7 pr-7 py-1.5 rounded-lg text-[12px] border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-500/60" />
            {filters.search && (
              <button onClick={() => set('search', '')} aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                <X size={12} />
              </button>
            )}
          </div>
        </label>

        {hasActive && (
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-brand-500 bg-brand-500/10 border border-brand-500/25 hover:bg-brand-500/20 transition-colors">
            <RotateCcw size={11} /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
