import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical, Wifi, WifiOff,
  Stethoscope, MapPin, Activity, ClipboardPlus, UserPlus, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import RiskLevelBadge from './RiskLevelBadge'
import TelemetryFreshnessBadge from './TelemetryFreshnessBadge'
import PredictionConfidence from './PredictionConfidence'
import { sortPredictions } from '../../services/predictiveMaintenanceService'
import { PredictiveEmptyState, PredictiveErrorState, PredictiveSkeleton } from './PredictiveStates'

const PAGE_SIZE = 10

const ACTIONS = [
  { key: 'diagnostic', label: 'Voir le diagnostic', icon: Stethoscope },
  { key: 'map',        label: 'Localiser sur la carte', icon: MapPin },
  { key: 'telemetry',  label: 'Voir la télémétrie', icon: Activity },
  { key: 'workorder',  label: 'Créer un bon de travail', icon: ClipboardPlus },
  { key: 'assign',     label: 'Assigner un technicien', icon: UserPlus },
  { key: 'verify',     label: 'Marquer comme vérifié', icon: CheckCircle2 },
]

function RowActionMenu({ item, onAction }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        aria-label={`Actions pour ${item.reference}`} aria-haspopup="menu" aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div role="menu"
          className="absolute right-0 top-full mt-1 w-52 z-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl py-1">
          {ACTIONS.map((a) => (
            <button key={a.key} role="menuitem"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(a.key, item) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
              <a.icon size={13} className="text-[var(--text-muted)]" />
              {a.key === 'workorder' && item.work_order_id ? 'Voir le bon de travail' : a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SortHeader({ label, active, dir, onClick, align = 'left' }) {
  const Icon = active ? (dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors ${align === 'right' ? 'flex-row-reverse' : ''}`}
      aria-label={`Trier par ${label}`}>
      {label}
      <Icon size={12} className={active ? 'text-[var(--brand)]' : 'opacity-50'} />
    </button>
  )
}

export default function PriorityLampTable({ items, loading, error, onRowClick, onAction, selected, onToggleSelect, onToggleAll }) {
  const [sortKey, setSortKey] = useState('risk_score')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => sortPredictions(items, sortKey, sortDir), [items, sortKey, sortDir])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const current = useMemo(() => sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE), [sorted, currentPage])

  const toggleSort = (key) => {
    setPage(0)
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const allOnPageSelected = current.length > 0 && current.every((i) => selected?.has(i.id))

  if (loading) return <PredictiveSkeleton rows={6} tableOnly />

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--text)]">Lampadaires nécessitant une intervention</p>
          <p className="text-[11px] text-[var(--text-muted)]">{sorted.length} lampadaire(s) · triés par {sortKey === 'risk_score' ? 'score de risque' : sortKey === 'eta_hours' ? 'échéance' : 'fraîcheur'}</p>
        </div>
        {selected?.size > 0 && (
          <span className="text-[11px] font-medium text-[var(--brand)]">{selected.size} sélectionné(s)</span>
        )}
      </div>

      {error ? (
        <PredictiveErrorState message="Erreur de chargement du tableau." />
      ) : sorted.length === 0 ? (
        <PredictiveEmptyState />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[900px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="w-9 px-3 py-2.5">
                    <input type="checkbox" checked={allOnPageSelected} onChange={() => onToggleAll(current)}
                      aria-label="Tout sélectionner sur cette page" className="accent-[var(--brand)]" />
                  </th>
                  <th className="text-left font-medium px-3 py-2.5">Réf.</th>
                  <th className="text-left font-medium px-3 py-2.5">Zone</th>
                  <th className="text-left font-medium px-3 py-2.5">LCU</th>
                  <th className="text-left font-medium px-3 py-2.5">Conn.</th>
                  <th className="text-left font-medium px-3 py-2.5">Niveau</th>
                  <th className="text-right font-medium px-3 py-2.5"><SortHeader label="Score" active={sortKey === 'risk_score'} dir={sortDir} onClick={() => toggleSort('risk_score')} align="right" /></th>
                  <th className="text-left font-medium px-3 py-2.5">Panne probable</th>
                  <th className="text-left font-medium px-3 py-2.5"><SortHeader label="Échéance" active={sortKey === 'eta_hours'} dir={sortDir} onClick={() => toggleSort('eta_hours')} /></th>
                  <th className="text-left font-medium px-3 py-2.5">Fiabilité score</th>
                  <th className="text-left font-medium px-3 py-2.5"><SortHeader label="Télémétrie" active={sortKey === 'freshness'} dir={sortDir} onClick={() => toggleSort('freshness')} /></th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {current.map((p) => (
                  <tr key={p.id}
                    onClick={() => onRowClick(p)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(p)
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Ouvrir le diagnostic de ${p.reference}`}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]">
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected?.has(p.id) || false} onChange={() => onToggleSelect(p.id)}
                        aria-label={`Sélectionner ${p.reference}`} className="accent-[var(--brand)]" />
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[var(--text)]">{p.reference}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{p.zone}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)] font-mono">{p.lcu_reference || '—'}</td>
                    <td className="px-3 py-2.5">
                      {p.online
                        ? <span className="inline-flex items-center gap-1 text-green-500"><Wifi size={12} /> En ligne</span>
                        : <span className="inline-flex items-center gap-1 text-red-500"><WifiOff size={12} /> Hors ligne</span>}
                    </td>
                    <td className="px-3 py-2.5"><RiskLevelBadge level={p.risk_level} size="sm" /></td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[var(--text)]">{p.risk_score}%</td>
                    <td className="px-3 py-2.5 text-[var(--text)]">{p.predicted_label}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{p.eta_label}</td>
                    <td className="px-3 py-2.5"><PredictionConfidence value={p.confidence} compact /></td>
                    <td className="px-3 py-2.5"><TelemetryFreshnessBadge freshness={p.telemetry_freshness} lastAt={p.last_telemetry_at} showTime /></td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu item={p} onAction={onAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">Page {currentPage + 1} / {pageCount}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
                  aria-label="Page précédente"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={currentPage >= pageCount - 1}
                  aria-label="Page suivante"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
