import { useState } from 'react'
import {
  ShieldAlert, RefreshCw, Filter, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Info,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs, getAuditSummary } from '../../api/audit'
import { QK } from '../../lib/queryClient'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate, cn } from '../../utils/helpers'

const PAGE_SIZES = [25, 50, 100]

// ── French label mapping for all audit actions ──────────────────────────────
const ACTION_LABELS = {
  // LCU
  lcu_created:                    'LCU créée',
  lcu_updated:                    'LCU modifiée',
  lcu_tested:                     'LCU testée',
  lcu_synced:                     'LCU synchronisée',
  // Lampadaire
  lampadaire_updated:             'Lampadaire modifié',
  lampadaire_localized:           'Localisation GPS définie',
  lampadaire_lcu_assigned:        'LCU assignée',
  // Commissioning
  commissioning_advanced:         'Étape commissioning avancée',
  commissioning_comm_tested:      'Test comm. commissioning',
  commissioning_dimming_tested:   'Test gradation commissioning',
  commissioning_validated:        'Commissioning validé',
  commissioning_failed:           'Commissioning échoué',
  // Dimming
  dimming_command_sent:           'Commande gradation envoyée',
  dimming_command_failed:         'Commande gradation échouée',
  // Calculator
  calculator_run:                 'Calculateur exécuté',
  calculator_run_all:             'Calculateur exécuté (tous)',
  // Alerts
  alert_acknowledged:             'Alerte acquittée',
  alert_resolved:                 'Alerte résolue',
  alert_closed:                   'Alerte fermée',
  work_order_created_from_alert:  'BT créé depuis alerte',
  // Work orders
  work_order_created:             'Bon de travail créé',
  work_order_assigned:            'Bon de travail assigné',
  work_order_started:             'Bon de travail démarré',
  work_order_accepted:            'Bon de travail accepté',
  work_order_resolved:            'Bon de travail résolu',
  work_order_closed:              'Bon de travail clôturé',
  work_order_cancelled:           'Bon de travail annulé',
  work_order_reopened:            'Bon de travail réouvert',
  work_order_note_added:          'Note ajoutée (BT)',
  // Simulation
  simulation_measure_generated:   'Télémétrie simulée',
  simulation_run_all:             'Simulation globale',
  simulation_scenario_started:    'Scénario simulé',
  // Users
  user_created:                   'Utilisateur créé',
  user_updated:                   'Utilisateur modifié',
  user_deleted:                   'Utilisateur supprimé',
}

const ENTITY_COLORS = {
  lcu:         'text-sky-500 bg-sky-500/12',
  lampadaire:  'text-amber-500 bg-amber-500/12',
  alert:       'text-rose-500 bg-rose-500/12',
  work_order:  'text-purple-500 bg-purple-500/12',
  user:        'text-emerald-500 bg-emerald-500/12',
  system:      'text-zinc-400 bg-zinc-500/12',
}

const ACTION_COLORS = {
  // creates / success → green
  lcu_created: 'text-emerald-500 bg-emerald-500/12',
  lampadaire_localized: 'text-emerald-500 bg-emerald-500/12',
  commissioning_validated: 'text-emerald-500 bg-emerald-500/12',
  work_order_created: 'text-emerald-500 bg-emerald-500/12',
  user_created: 'text-emerald-500 bg-emerald-500/12',
  // errors → red
  commissioning_failed: 'text-rose-500 bg-rose-500/12',
  dimming_command_failed: 'text-rose-500 bg-rose-500/12',
  user_deleted: 'text-rose-500 bg-rose-500/12',
  work_order_cancelled: 'text-rose-500 bg-rose-500/12',
}

const actionColor = (action) =>
  ACTION_COLORS[action] || 'text-[var(--text-muted)] bg-[var(--surface-2)]'

const entityColor = (et) =>
  ENTITY_COLORS[et] || 'text-[var(--text-muted)] bg-[var(--surface-2)]'

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [filters, setFilters] = useState({ action: '', entity_type: '', status: '', from: '', to: '' })
  const [pendingFilters, setPendingFilters] = useState(filters)
  const [expanded, setExpanded] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  const queryFilters = { ...filters, limit: pageSize, offset: page * pageSize }

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: QK.auditLogs ? QK.auditLogs(queryFilters) : ['audit-logs', queryFilters],
    queryFn: () => getAuditLogs(queryFilters),
    placeholderData: (prev) => prev,
  })

  const { data: summary } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: getAuditSummary,
    enabled: showSummary,
  })

  const logs = data?.logs || []
  const total = data?.total || 0

  const applyFilters = () => { setFilters(pendingFilters); setPage(0) }
  const resetFilters = () => {
    const empty = { action: '', entity_type: '', status: '', from: '', to: '' }
    setPendingFilters(empty); setFilters(empty); setPage(0)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            Journal d'audit
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {total} événement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowSummary((v) => !v)}>
            <Info size={13} /> Résumé
          </Button>
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw size={13} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Summary panel */}
      {showSummary && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile label="Aujourd'hui" value={summary.total_today} color="text-brand-500" />
          <SummaryTile label="7 derniers jours" value={summary.total_week} color="text-sky-500" />
          {summary.by_entity?.slice(0, 2).map((e) => (
            <SummaryTile key={e.entity_type} label={e.entity_type} value={e.count} color="text-amber-500" />
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text)]">Filtres</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <FilterInput label="Action" placeholder="ex: lcu, alert" value={pendingFilters.action}
            onChange={(v) => setPendingFilters((f) => ({ ...f, action: v }))} />
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Entité</label>
            <select value={pendingFilters.entity_type}
              onChange={(e) => setPendingFilters((f) => ({ ...f, entity_type: e.target.value }))}
              className="w-full px-3 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              <option value="">Toutes</option>
              {['lcu','lampadaire','alert','work_order','user','system'].map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Statut</label>
            <select value={pendingFilters.status}
              onChange={(e) => setPendingFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              <option value="">Tous</option>
              <option value="success">Succès</option>
              <option value="error">Erreur</option>
            </select>
          </div>
          <FilterInput label="Du" type="datetime-local" value={pendingFilters.from}
            onChange={(v) => setPendingFilters((f) => ({ ...f, from: v }))} />
          <FilterInput label="Au" type="datetime-local" value={pendingFilters.to}
            onChange={(v) => setPendingFilters((f) => ({ ...f, to: v }))} />
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters} className="flex-1">Appliquer</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>
        </div>
      </Card>

      {/* Logs list */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">
            Aucun événement correspondant aux filtres
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {logs.map((l) => {
              const isOpen = expanded === l.id
              const label = ACTION_LABELS[l.action] || l.action
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : l.id)}
                    className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* Expand icon */}
                    <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>

                    {/* Status icon */}
                    <span className="mt-0.5 shrink-0">
                      {l.status === 'error'
                        ? <XCircle size={14} className="text-rose-500" />
                        : <CheckCircle size={14} className="text-emerald-500" />}
                    </span>

                    {/* Action badge */}
                    <span className={cn(
                      'text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 hidden sm:inline',
                      actionColor(l.action)
                    )}>
                      {l.action}
                    </span>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--text)]">{label}</span>
                        {l.user_name ? (
                          <span className="text-[11px] text-[var(--text-muted)]">par {l.user_name}</span>
                        ) : l.user_id ? (
                          <span className="text-[11px] text-[var(--text-muted)]">par #{l.user_id}</span>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)] italic">système</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {l.entity_type && (
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', entityColor(l.entity_type))}>
                            {l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ''}
                            {l.entity_reference ? ` — ${l.entity_reference}` : ''}
                          </span>
                        )}
                        {l.description && (
                          <span className="text-[11px] text-[var(--text-muted)] truncate max-w-sm">{l.description}</span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0 font-mono">
                      {formatDate(l.created_at)}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-10 pb-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                        {l.old_values && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Avant</p>
                            <pre className="text-[10px] font-mono text-[var(--text)] bg-[var(--bg)] px-3 py-2 rounded-lg whitespace-pre-wrap break-words max-h-40 overflow-y-auto border border-[var(--border)]">
                              {JSON.stringify(l.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {l.new_values && (
                          <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Après</p>
                            <pre className="text-[10px] font-mono text-[var(--text)] bg-[var(--bg)] px-3 py-2 rounded-lg whitespace-pre-wrap break-words max-h-40 overflow-y-auto border border-[var(--border)]">
                              {JSON.stringify(l.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                      {(l.ip_address || l.user_agent) && (
                        <div className="mt-3 flex flex-wrap gap-4">
                          {l.ip_address && (
                            <p className="text-[10px] text-[var(--text-muted)]">
                              <span className="font-semibold">IP :</span> {l.ip_address}
                            </p>
                          )}
                          {l.user_agent && (
                            <p className="text-[10px] text-[var(--text-muted)] truncate max-w-md">
                              <span className="font-semibold">Agent :</span> {l.user_agent}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={setPage}
        pageSizes={PAGE_SIZES}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0) }}
      />
    </div>
  )
}

function FilterInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" />
    </div>
  )
}

function SummaryTile({ label, value, color }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
      <p className={cn('text-[22px] font-bold', color)}>{value ?? '—'}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 capitalize">{label}</p>
    </div>
  )
}
