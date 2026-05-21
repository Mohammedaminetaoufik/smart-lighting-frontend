import { useState, useMemo, useRef, useEffect } from 'react'
import {
  CalendarPlus, Clock, MapPin, Wrench, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Edit2, BellOff, ShieldAlert, Zap,
  ClipboardList, AlertTriangle, Globe, Cpu, Lightbulb, List,
  Search,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getMaintenanceWindows,
  createMaintenanceWindow,
  updateMaintenanceWindow,
  cancelMaintenanceWindow,
  completeMaintenanceWindow,
  deleteMaintenanceWindow,
} from '../../api/maintenance'
import { getLCUs } from '../../api/lcus'
import { getLampadaires } from '../../api/lampadaires'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate, cn } from '../../utils/helpers'

/* ─── Constants ──────────────────────────────────────────────────── */

const MAINTENANCE_TYPES = [
  { value: 'preventive', label: 'Préventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'commissioning', label: 'Mise en service' },
  { value: 'lcu_test', label: 'Test LCU' },
  { value: 'dimming_test', label: 'Test variateur' },
  { value: 'network_test', label: 'Test réseau' },
  { value: 'firmware_update', label: 'Mise à jour firmware' },
  { value: 'driver_replacement', label: 'Remplacement driver' },
  { value: 'other', label: 'Autre' },
]

const TARGET_TYPES = [
  { value: 'global', label: 'Global (tous les équipements)', icon: Globe },
  { value: 'zone', label: 'Zone géographique', icon: MapPin },
  { value: 'lcu', label: 'LCU', icon: Cpu },
  { value: 'lampadaire', label: 'Lampadaire unique', icon: Lightbulb },
  { value: 'selection', label: 'Sélection de lampadaires', icon: List },
]

const IMPACT_LEVELS = [
  { value: 'low', label: 'Faible', color: 'text-green-500' },
  { value: 'medium', label: 'Moyen', color: 'text-amber-500' },
  { value: 'high', label: 'Élevé', color: 'text-red-500' },
]

const EMPTY_FORM = {
  title: '',
  maintenance_type: 'preventive',
  target_type: 'zone',
  target_id: '',
  target_reference: '',
  zone: '',
  lampadaire_ids_raw: '',
  start_at: '',
  end_at: '',
  reason: '',
  impact_level: 'low',
  suppress_alerts: false,
  suppress_auto_work_orders: false,
  create_work_order: false,
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function statusBadge(w) {
  const map = {
    active:    { label: 'En cours',   bg: 'bg-blue-500/15',   text: 'text-blue-500' },
    planned:   { label: 'Planifiée',  bg: 'bg-amber-500/15',  text: 'text-amber-500' },
    completed: { label: 'Terminée',   bg: 'bg-green-500/15',  text: 'text-green-500' },
    cancelled: { label: 'Annulée',    bg: 'bg-red-500/15',    text: 'text-red-500' },
  }
  const s = map[w.status] || map.planned
  return <Badge label={s.label} bg={s.bg} text={s.text} />
}

function impactColor(level) {
  return { low: 'text-green-500', medium: 'text-amber-500', high: 'text-red-500' }[level] || ''
}

function typeLabel(type) {
  return MAINTENANCE_TYPES.find((t) => t.value === type)?.label || type
}

function targetLabel(w) {
  if (w.target_type === 'global') return 'Tous les équipements'
  if (w.target_type === 'zone') return `Zone: ${w.zone || '—'}`
  if (w.target_type === 'lcu') return `LCU #${w.target_id} ${w.target_reference ? `(${w.target_reference})` : ''}`
  if (w.target_type === 'lampadaire') return `Lampadaire #${w.target_id} ${w.target_reference ? `(${w.target_reference})` : ''}`
  if (w.target_type === 'selection') return `${w.lampadaire_ids?.length || 0} lampadaire(s)`
  return '—'
}

function inputCls(extra = '') {
  return cn(
    'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg',
    'bg-[var(--surface-2)] text-[var(--text)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30',
    extra
  )
}

function labelCls() {
  return 'block text-[12px] font-medium text-[var(--text-muted)] mb-1'
}

/* ─── Step wizard progress bar ───────────────────────────────────── */

function StepBar({ step, total = 3, labels }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all',
              done  && 'bg-[var(--brand)] text-white',
              active && 'bg-[var(--brand)]/15 text-[var(--brand)] ring-2 ring-[var(--brand)]/40',
              !done && !active && 'bg-[var(--surface-2)] text-[var(--text-muted)]'
            )}>
              {done ? <CheckCircle2 size={13} /> : i + 1}
            </div>
            {labels && (
              <span className={cn('ml-1.5 text-[11px] hidden sm:inline',
                active ? 'text-[var(--text)] font-medium' : 'text-[var(--text-muted)]')}>
                {labels[i]}
              </span>
            )}
            {i < total - 1 && (
              <div className={cn('flex-1 h-px mx-2', done ? 'bg-[var(--brand)]/40' : 'bg-[var(--border)]')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Searchable dropdown ─────────────────────────────────────────── */

function SearchableSelect({ options = [], value, onChange, placeholder, loading, getLabel, getSubLabel }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((o) => getLabel(o).toLowerCase().includes(q) ||
      (getSubLabel && getSubLabel(o).toLowerCase().includes(q)))
  }, [options, search, getLabel, getSubLabel])

  const selected = options.find((o) => String(o.id) === String(value))

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); setSearch('') }}
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-between gap-2',
          'bg-[var(--surface-2)] border-[var(--border)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30',
          open && 'ring-2 ring-[var(--brand)]/30 border-[var(--brand)]/50'
        )}>
        <span className={cn('truncate', selected ? 'text-[var(--text)]' : 'text-[var(--text-muted)]')}>
          {loading ? 'Chargement…' : selected ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{getLabel(selected)}</span>
              {getSubLabel && getSubLabel(selected) && (
                <span className="text-[var(--text-muted)] text-[11px]">{getSubLabel(selected)}</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown size={14} className={cn('shrink-0 text-[var(--text-muted)] transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--surface-2)]">
            <Search size={13} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-[12px] bg-transparent text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}
                className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <XCircle size={13} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-[12px] text-[var(--text-muted)]">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-[var(--text-muted)]">Aucun résultat pour "{search}"</p>
            ) : (
              filtered.map((o) => {
                const isActive = String(o.id) === String(value)
                return (
                  <button key={o.id} type="button"
                    onClick={() => { onChange(o); setOpen(false); setSearch('') }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left flex items-center justify-between gap-3',
                      'hover:bg-[var(--surface-2)] transition-colors',
                      isActive && 'bg-[var(--brand)]/8'
                    )}>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-[13px] font-medium block truncate',
                        isActive ? 'text-[var(--brand)]' : 'text-[var(--text)]')}>
                        {getLabel(o)}
                      </span>
                      {getSubLabel && getSubLabel(o) && (
                        <span className="text-[11px] text-[var(--text-muted)] truncate block">
                          {getSubLabel(o)}
                        </span>
                      )}
                    </div>
                    {isActive && <CheckCircle2 size={14} className="text-[var(--brand)] shrink-0" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer count */}
          {!loading && options.length > 0 && (
            <div className="px-4 py-1.5 border-t border-[var(--border)] bg-[var(--surface-2)]">
              <span className="text-[10px] text-[var(--text-muted)]">
                {filtered.length}/{options.length} résultat{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Multi-select checklist with zone/LCU filter + search ──────── */

function ChecklistSelect({ options = [], lcus = [], selectedIds, onToggle, onBulkSet, loading }) {
  const [search, setSearch]       = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [filterLCU, setFilterLCU]   = useState('')

  // Distinct zones from loaded lamps
  const zones = useMemo(() =>
    [...new Set(options.map((l) => l.zone).filter(Boolean))].sort()
  , [options])

  const filtered = useMemo(() => {
    let list = options
    if (filterZone) list = list.filter((l) => l.zone === filterZone)
    if (filterLCU)  list = list.filter((l) => String(l.lcu_id) === filterLCU)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((l) =>
        l.reference.toLowerCase().includes(q) ||
        (l.zone || '').toLowerCase().includes(q) ||
        (l.address || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [options, filterZone, filterLCU, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selectedIds.includes(String(l.id)))

  const toggleAll = () => {
    const filteredIdSet = new Set(filtered.map((l) => String(l.id)))
    if (allFilteredSelected) {
      // Remove all filtered from selection in one shot
      onBulkSet(selectedIds.filter((id) => !filteredIdSet.has(id)))
    } else {
      // Add all filtered to selection in one shot (deduplicated)
      const next = new Set(selectedIds)
      filtered.forEach((l) => next.add(String(l.id)))
      onBulkSet([...next])
    }
  }

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">

      {/* Filter bar: zone + LCU */}
      <div className="flex gap-2 px-3 pt-2.5 pb-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <select
          value={filterZone}
          onChange={(e) => { setFilterZone(e.target.value); setFilterLCU('') }}
          className="flex-1 text-[11px] px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/40">
          <option value="">Toutes les zones</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>

        <select
          value={filterLCU}
          onChange={(e) => { setFilterLCU(e.target.value); setFilterZone('') }}
          className="flex-1 text-[11px] px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/40">
          <option value="">Toutes les LCU</option>
          {lcus.map((l) => <option key={l.id} value={l.id}>{l.reference || `LCU #${l.id}`}</option>)}
        </select>

        {(filterZone || filterLCU) && (
          <button type="button"
            onClick={() => { setFilterZone(''); setFilterLCU('') }}
            className="text-[10px] text-[var(--brand)] hover:underline shrink-0 self-center">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Search + select-all */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <Search size={11} className="text-[var(--text-muted)] shrink-0" />
        <input type="text" placeholder="Rechercher par référence, zone…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-[11px] bg-transparent text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none" />
        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
          <input type="checkbox" className="w-3 h-3 accent-[var(--brand)]"
            checked={allFilteredSelected} onChange={toggleAll}
            disabled={filtered.length === 0} />
          <span className="text-[10px] text-[var(--text-muted)]">Tout</span>
        </label>
        <span className="text-[10px] text-[var(--brand)] font-medium shrink-0">
          {selectedIds.length} ✓
        </span>
      </div>

      {/* List */}
      <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)]">
        {loading ? (
          <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-[var(--text-muted)]">Aucun lampadaire trouvé</p>
        ) : (
          filtered.map((l) => {
            const checked = selectedIds.includes(String(l.id))
            return (
              <label key={l.id}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors',
                  'hover:bg-[var(--surface-2)]',
                  checked && 'bg-[var(--brand)]/5'
                )}>
                <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--brand)] shrink-0"
                  checked={checked} onChange={() => onToggle(l.id)} />
                <span className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-[var(--text)] block">{l.reference}</span>
                  {(l.zone || l.address) && (
                    <span className="text-[10px] text-[var(--text-muted)] truncate block">
                      {[l.zone, l.address].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {checked && <CheckCircle2 size={12} className="text-[var(--brand)] shrink-0" />}
              </label>
            )
          })
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            {filtered.length} affiché{filtered.length !== 1 ? 's' : ''} / {options.length} total
          </span>
          {selectedIds.length > 0 && (
            <button type="button" onClick={() => onBulkSet([])}
              className="text-[10px] text-red-400 hover:text-red-500">
              Tout désélectionner
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Form (3-step wizard) ────────────────────────────────────────── */

const STEP_LABELS = ['Général', 'Périmètre', 'Options']

function WindowForm({ draft, setDraft, step, setStep, onSubmit, loading }) {
  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }))

  // Load data only when relevant step is reached
  const needLCUs = draft.target_type === 'lcu' || draft.target_type === 'selection'
  const { data: lcus = [], isLoading: lcusLoading } = useQuery({
    queryKey: ['lcus'],
    queryFn: getLCUs,
    enabled: step === 1 && needLCUs,
    staleTime: 60_000,
  })

  const needLamps = draft.target_type === 'lampadaire' || draft.target_type === 'selection'
  const { data: lamps = [], isLoading: lampsLoading } = useQuery({
    queryKey: ['lampadaires', 'for-maintenance'],
    queryFn: () => getLampadaires(),
    enabled: needLamps,
    staleTime: 60_000,
  })

  const selectedIds = useMemo(() =>
    draft.lampadaire_ids_raw
      ? draft.lampadaire_ids_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  , [draft.lampadaire_ids_raw])

  const toggleLampId = (id) => {
    const sid = String(id)
    const next = selectedIds.includes(sid)
      ? selectedIds.filter((x) => x !== sid)
      : [...selectedIds, sid]
    set('lampadaire_ids_raw', next.join(', '))
  }

  const setAllLampIds = (ids) => {
    set('lampadaire_ids_raw', ids.join(', '))
  }

  /* ── Step 0 — Général ── */
  const step0 = (
    <div className="space-y-4">
      <div>
        <label className={labelCls()}>Titre</label>
        <input className={inputCls()} type="text" placeholder="ex: Maintenance préventive Q2"
          value={draft.title} onChange={(e) => set('title', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls()}>Type *</label>
          <select className={inputCls()} value={draft.maintenance_type}
            onChange={(e) => set('maintenance_type', e.target.value)}>
            {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls()}>Impact *</label>
          <select className={inputCls()} value={draft.impact_level}
            onChange={(e) => set('impact_level', e.target.value)}>
            {IMPACT_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls()}>Début *</label>
          <input className={inputCls()} type="datetime-local" required
            value={draft.start_at} onChange={(e) => set('start_at', e.target.value)} />
        </div>
        <div>
          <label className={labelCls()}>Fin *</label>
          <input className={inputCls()} type="datetime-local" required
            value={draft.end_at} onChange={(e) => set('end_at', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelCls()}>Motif</label>
        <textarea className={inputCls('resize-none')} rows={2}
          placeholder="ex: Remplacement drivers défectueux, zone nord"
          value={draft.reason} onChange={(e) => set('reason', e.target.value)} />
      </div>
    </div>
  )

  /* ── Step 1 — Périmètre ── */
  const step1 = (
    <div className="space-y-4">
      {/* Target type as icon cards */}
      <div>
        <label className={labelCls()}>Type de cible *</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {TARGET_TYPES.map(({ value, label, icon: Icon }) => {
            const active = draft.target_type === value
            return (
              <button key={value} type="button"
                onClick={() => setDraft((d) => ({ ...d, target_type: value, target_id: '', target_reference: '', zone: '', lampadaire_ids_raw: '' }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all',
                  active
                    ? 'border-[var(--brand)] bg-[var(--brand)]/8 text-[var(--brand)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--brand)]/40 hover:text-[var(--text)]'
                )}>
                <Icon size={16} />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conditional target detail */}
      {draft.target_type === 'zone' && (
        <div>
          <label className={labelCls()}>Zone *</label>
          <input className={inputCls()} type="text" placeholder="ex: Zone Nord"
            value={draft.zone} onChange={(e) => set('zone', e.target.value)} />
        </div>
      )}

      {draft.target_type === 'lcu' && (
        <div>
          <label className={labelCls()}>LCU *</label>
          <SearchableSelect
            options={lcus} value={draft.target_id} loading={lcusLoading}
            placeholder="Sélectionner une LCU…"
            getLabel={(l) => l.reference || `LCU #${l.id}`}
            getSubLabel={(l) => [l.name, l.zone, l.status].filter(Boolean).join(' · ')}
            onChange={(l) => setDraft((d) => ({ ...d, target_id: l.id, target_reference: l.reference || '' }))}
          />
        </div>
      )}

      {draft.target_type === 'lampadaire' && (
        <div>
          <label className={labelCls()}>Lampadaire *</label>
          <SearchableSelect
            options={lamps} value={draft.target_id} loading={lampsLoading}
            placeholder="Sélectionner un lampadaire…"
            getLabel={(l) => l.reference || `Lampadaire #${l.id}`}
            getSubLabel={(l) => [l.zone, l.address].filter(Boolean).join(' · ')}
            onChange={(l) => setDraft((d) => ({ ...d, target_id: l.id, target_reference: l.reference || '' }))}
          />
        </div>
      )}

      {draft.target_type === 'selection' && (
        <div>
          <label className={labelCls()}>Sélection de lampadaires *</label>
          <ChecklistSelect
            options={lamps} lcus={lcus} selectedIds={selectedIds}
            onToggle={toggleLampId} onBulkSet={setAllLampIds}
            loading={lampsLoading || lcusLoading}
          />
        </div>
      )}

      {draft.target_type === 'global' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-[12px] text-[var(--text)]">
            Cette fenêtre s'appliquera à <strong>tous les équipements</strong> du parc.
          </p>
        </div>
      )}
    </div>
  )

  /* ── Step 2 — Options ── */
  const TOGGLE_OPTIONS = [
    { key: 'suppress_alerts',          icon: BellOff,      title: 'Supprimer les alertes',         sub: 'Les alertes non-critiques ne seront pas créées' },
    { key: 'suppress_auto_work_orders', icon: ShieldAlert,  title: 'Bloquer les OT automatiques',   sub: 'Aucun ordre de travail auto pendant la fenêtre' },
    { key: 'create_work_order',         icon: ClipboardList, title: 'Créer un ordre de travail',    sub: 'Un OT lié sera créé automatiquement' },
  ]

  const step2 = (
    <div className="space-y-2">
      {TOGGLE_OPTIONS.map(({ key, icon: Icon, title, sub }) => {
        const on = draft[key]
        return (
          <button key={key} type="button"
            onClick={() => set(key, !on)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
              on
                ? 'border-[var(--brand)]/50 bg-[var(--brand)]/6'
                : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--brand)]/30'
            )}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              on ? 'bg-[var(--brand)]/15 text-[var(--brand)]' : 'bg-[var(--surface)] text-[var(--text-muted)]')}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[13px] font-medium', on ? 'text-[var(--brand)]' : 'text-[var(--text)]')}>{title}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>
            </div>
            <div className={cn(
              'w-9 h-5 rounded-full transition-all shrink-0 relative',
              on ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'
            )}>
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                on ? 'left-4' : 'left-0.5'
              )} />
            </div>
          </button>
        )
      })}
    </div>
  )

  const canNext0 = draft.start_at && draft.end_at
  const canNext1 =
    draft.target_type === 'global' ||
    (draft.target_type === 'zone' && draft.zone) ||
    ((draft.target_type === 'lcu' || draft.target_type === 'lampadaire') && draft.target_id) ||
    (draft.target_type === 'selection' && selectedIds.length > 0)

  return (
    <div>
      <StepBar step={step} total={3} labels={STEP_LABELS} />

      <div className="min-h-[260px]">
        {step === 0 && step0}
        {step === 1 && step1}
        {step === 2 && step2}
      </div>

      <div className="flex justify-between gap-2 pt-5 mt-2 border-t border-[var(--border)]">
        {step > 0 ? (
          <Button key="back" variant="ghost" type="button" onClick={() => setStep((s) => s - 1)}>
            ← Retour
          </Button>
        ) : <span key="no-back" />}
        {step < 2 ? (
          <Button key="next" type="button"
            disabled={step === 0 ? !canNext0 : !canNext1}
            onClick={() => setStep((s) => s + 1)}>
            Suivant →
          </Button>
        ) : (
          <Button key="submit" type="submit" loading={loading}>
            {onSubmit ? 'Enregistrer' : 'Créer la fenêtre'}
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Window Card ─────────────────────────────────────────────────── */

function WindowCard({ w, onCancel, onComplete, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = w.status === 'active'
  const isPlanned = w.status === 'planned'
  const isDone = w.status === 'completed' || w.status === 'cancelled'

  return (
    <div className={cn(
      'border border-[var(--border)] rounded-xl p-4 transition-all',
      isActive && 'border-blue-500/40 bg-blue-500/5',
      w.status === 'cancelled' && 'opacity-60',
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        {isActive && <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--text)] truncate">
              {w.title || typeLabel(w.maintenance_type)}
            </span>
            {statusBadge(w)}
            <span className={cn('text-[11px] font-medium', impactColor(w.impact_level))}>
              Impact {IMPACT_LEVELS.find((l) => l.value === w.impact_level)?.label || w.impact_level}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Wrench size={10} /> {typeLabel(w.maintenance_type)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <MapPin size={10} /> {targetLabel(w)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={10} /> {formatDate(w.start_at)} → {formatDate(w.end_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isDone && (
            <button onClick={() => onEdit(w)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
              title="Modifier">
              <Edit2 size={13} />
            </button>
          )}
          {isActive && (
            <button onClick={() => onComplete(w.id)}
              className="p-1.5 rounded-lg hover:bg-green-500/15 text-[var(--text-muted)] hover:text-green-500"
              title="Marquer terminée">
              <CheckCircle2 size={13} />
            </button>
          )}
          {isPlanned && (
            <button onClick={() => onCancel(w.id)}
              className="p-1.5 rounded-lg hover:bg-amber-500/15 text-[var(--text-muted)] hover:text-amber-500"
              title="Annuler">
              <XCircle size={13} />
            </button>
          )}
          {isDone && (
            <button onClick={() => { if (confirm('Supprimer définitivement cette fenêtre ?')) onDelete(w.id) }}
              className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-500"
              title="Supprimer">
              <XCircle size={13} />
            </button>
          )}
          <button onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
          {w.reason && (
            <p className="text-[12px] text-[var(--text)] italic">"{w.reason}"</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)]">
            {w.suppress_alerts && (
              <span className="flex items-center gap-1 text-amber-500">
                <BellOff size={10} /> Alertes supprimées
              </span>
            )}
            {w.suppress_auto_work_orders && (
              <span className="flex items-center gap-1 text-amber-500">
                <ShieldAlert size={10} /> OT automatiques bloqués
              </span>
            )}
            {w.related_work_order_id && (
              <span className="flex items-center gap-1 text-blue-500">
                <ClipboardList size={10} /> OT lié #{w.related_work_order_id}
              </span>
            )}
            {w.created_by_name && (
              <span>Créée par {w.created_by_name}</span>
            )}
            {w.cancelled_at && (
              <span className="text-red-400">Annulée le {formatDate(w.cancelled_at)}</span>
            )}
            {w.completed_at && (
              <span className="text-green-400">Terminée le {formatDate(w.completed_at)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [draft, setDraft] = useState(EMPTY_FORM)
  const [formStep, setFormStep] = useState(0)

  const { data: windows = [], isLoading } = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: () => getMaintenanceWindows(),
    select: (res) => Array.isArray(res) ? res : res?.data ?? [],
    refetchInterval: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['maintenance-windows'] })

  const buildPayload = (d) => {
    const ids = d.lampadaire_ids_raw
      ? d.lampadaire_ids_raw.split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean)
      : []
    return {
      title: d.title || undefined,
      maintenance_type: d.maintenance_type,
      target_type: d.target_type,
      target_id: (d.target_type === 'lcu' || d.target_type === 'lampadaire') && d.target_id
        ? parseInt(d.target_id, 10) : undefined,
      target_reference: d.target_reference || undefined,
      zone: d.zone || undefined,
      lampadaire_ids: ids.length > 0 ? ids : undefined,
      start_at: d.start_at ? new Date(d.start_at).toISOString() : undefined,
      end_at: d.end_at ? new Date(d.end_at).toISOString() : undefined,
      reason: d.reason || undefined,
      impact_level: d.impact_level,
      suppress_alerts: d.suppress_alerts,
      suppress_auto_work_orders: d.suppress_auto_work_orders,
      create_work_order: d.create_work_order,
    }
  }

  const createMut = useMutation({
    mutationFn: (d) => createMaintenanceWindow(buildPayload(d)),
    onSuccess: (res) => {
      if (res?.warning) toast.error(res.warning, { duration: 6000 })
      else toast.success('Fenêtre créée')
      setCreateOpen(false); setDraft(EMPTY_FORM); setFormStep(0); invalidate()
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => updateMaintenanceWindow(id, buildPayload(d)),
    onSuccess: (res) => {
      if (res?.warning) toast.error(res.warning, { duration: 6000 })
      else toast.success('Fenêtre mise à jour')
      setEditTarget(null); setFormStep(0); invalidate()
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  })

  const cancelMut = useMutation({
    mutationFn: cancelMaintenanceWindow,
    onSuccess: () => { toast.success('Fenêtre annulée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  })

  const completeMut = useMutation({
    mutationFn: completeMaintenanceWindow,
    onSuccess: () => { toast.success('Fenêtre marquée terminée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteMaintenanceWindow,
    onSuccess: () => { toast.success('Fenêtre supprimée'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Erreur'),
  })

  const openEdit = (w) => {
    setDraft({
      title: w.title || '',
      maintenance_type: w.maintenance_type || 'preventive',
      target_type: w.target_type || 'zone',
      target_id: w.target_id ?? '',
      target_reference: w.target_reference || '',
      zone: w.zone || '',
      lampadaire_ids_raw: w.lampadaire_ids?.join(', ') || '',
      start_at: w.start_at ? w.start_at.slice(0, 16) : '',
      end_at: w.end_at ? w.end_at.slice(0, 16) : '',
      reason: w.reason || '',
      impact_level: w.impact_level || 'low',
      suppress_alerts: w.suppress_alerts ?? false,
      suppress_auto_work_orders: w.suppress_auto_work_orders ?? false,
      create_work_order: w.create_work_order ?? false,
    })
    setFormStep(0)
    setEditTarget(w)
  }

  if (isLoading) return <PageLoader />

  const active    = windows.filter((w) => w.status === 'active')
  const planned   = windows.filter((w) => w.status === 'planned')
  const history   = windows.filter((w) => w.status === 'completed' || w.status === 'cancelled')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <Wrench size={18} className="text-[var(--brand)]" />
            Maintenance
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {active.length} en cours · {planned.length} planifiée{planned.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setDraft(EMPTY_FORM); setFormStep(0); setCreateOpen(true) }}>
          <CalendarPlus size={14} /> Nouvelle fenêtre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="En cours" value={active.length} icon={Zap} iconBg="bg-blue-500/10" iconColor="text-blue-500" />
        <StatCard label="Planifiées" value={planned.length} icon={Clock} iconBg="bg-amber-500/10" iconColor="text-amber-500" />
        <StatCard label="Terminées" value={history.filter((w) => w.status === 'completed').length} icon={CheckCircle2} iconBg="bg-green-500/10" iconColor="text-green-500" />
        <StatCard label="Annulées" value={history.filter((w) => w.status === 'cancelled').length} icon={AlertTriangle} iconBg="bg-red-500/10" iconColor="text-red-500" />
      </div>

      {/* Active windows */}
      {active.length > 0 && (
        <Card>
          <CardHeader title="En cours" subtitle="Fenêtres actives maintenant" />
          <div className="space-y-3 mt-2">
            {active.map((w) => (
              <WindowCard key={w.id} w={w}
                onCancel={(id) => { if (confirm('Annuler cette fenêtre ?')) cancelMut.mutate(id) }}
                onComplete={(id) => completeMut.mutate(id)}
                onDelete={(id) => deleteMut.mutate(id)}
                onEdit={openEdit}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Planned windows */}
      <Card>
        <CardHeader title="Planifiées" subtitle="Démarrent prochainement" />
        {planned.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune fenêtre planifiée.</p>
        ) : (
          <div className="space-y-3 mt-2">
            {planned.map((w) => (
              <WindowCard key={w.id} w={w}
                onCancel={(id) => { if (confirm('Annuler cette fenêtre ?')) cancelMut.mutate(id) }}
                onComplete={(id) => completeMut.mutate(id)}
                onDelete={(id) => deleteMut.mutate(id)}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader title="Historique" subtitle="Terminées et annulées" />
          <div className="space-y-3 mt-2 opacity-75">
            {history.map((w) => (
              <WindowCard key={w.id} w={w}
                onCancel={() => {}}
                onComplete={() => {}}
                onDelete={(id) => deleteMut.mutate(id)}
                onEdit={() => {}}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setFormStep(0) }} title="Nouvelle fenêtre de maintenance">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(draft) }}>
          <WindowForm
            draft={draft} setDraft={setDraft}
            step={formStep} setStep={setFormStep}
            loading={createMut.isPending}
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setFormStep(0) }} title="Modifier la fenêtre">
        <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate({ id: editTarget.id, d: draft }) }}>
          <WindowForm
            draft={draft} setDraft={setDraft}
            step={formStep} setStep={setFormStep}
            onSubmit={() => updateMut.mutate({ id: editTarget.id, d: draft })}
            loading={updateMut.isPending}
          />
        </form>
      </Modal>
    </div>
  )
}
