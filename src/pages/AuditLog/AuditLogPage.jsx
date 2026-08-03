import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Clock3,
  Code2, Copy, Database, FileJson, FileSpreadsheet, Filter,
  RefreshCw, Search, ShieldAlert, UserRound, Users, X, XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getAllAuditLogs, getAuditLog, getAuditLogs, getAuditSummary } from '../../api/audit'
import { useAuth } from '../../context/AuthContext'
import { QK } from '../../lib/queryClient'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import { cn, formatDate, timeAgo } from '../../utils/helpers'
import {
  actionLabel, auditAPIParams, buildAuditCSV, diffAuditValues, entityLabel,
  eventSeverity, formatAuditValue, friendlyIPAddress, parseUserAgent, toDateTimeLocal,
} from '../../utils/auditLog'

const PAGE_SIZES = [25, 50, 100]
const EMPTY_FILTERS = {
  search: '', action: '', entity_type: '', status: '', from: '', to: '',
  user_id: '', sensitive: false,
}

const ENTITY_COLORS = {
  lcu: 'text-sky-500 bg-sky-500/12',
  lampadaire: 'text-amber-500 bg-amber-500/12',
  alert: 'text-rose-500 bg-rose-500/12',
  work_order: 'text-purple-500 bg-purple-500/12',
  user: 'text-emerald-500 bg-emerald-500/12',
  system: 'text-zinc-400 bg-zinc-500/12',
}

function filtersFromURL(searchParams) {
  const filters = { ...EMPTY_FILTERS }
  for (const key of Object.keys(filters)) {
    const value = searchParams.get(key)
    if (value != null) filters[key] = key === 'sensitive' ? value === 'true' : value
  }
  return filters
}

function dateGroupLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

function downloadFile(content, type, filename) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function AuditLogPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [filters, setFilters] = useState(() => filtersFromURL(searchParams))
  const [pendingFilters, setPendingFilters] = useState(() => filtersFromURL(searchParams))
  const [expanded, setExpanded] = useState(null)
  const [exporting, setExporting] = useState(false)

  const apiFilters = useMemo(() => auditAPIParams(filters), [filters])
  const queryFilters = useMemo(() => ({
    ...apiFilters, include_details: false, limit: pageSize, offset: page * pageSize,
  }), [apiFilters, page, pageSize])

  const logsQuery = useQuery({
    queryKey: QK.auditLogs ? QK.auditLogs(queryFilters) : ['audit-logs', queryFilters],
    queryFn: () => getAuditLogs(queryFilters),
    placeholderData: (previous) => previous,
  })
  const summaryQuery = useQuery({ queryKey: ['audit-summary'], queryFn: getAuditSummary })

  const logs = logsQuery.data?.logs || []
  const total = logsQuery.data?.total || 0
  const summary = summaryQuery.data || {}
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(pendingFilters)
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== '' && value !== false)

  function persistFilters(next) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value !== '' && value !== false) params.set(key, String(value))
    }
    setSearchParams(params, { replace: true })
  }

  function commitFilters(next) {
    setPendingFilters(next)
    setFilters(next)
    setPage(0)
    persistFilters(next)
  }

  function applyFilters() {
    if (pendingFilters.from && pendingFilters.to && new Date(pendingFilters.from) > new Date(pendingFilters.to)) {
      toast.error('La date de début doit précéder la date de fin')
      return
    }
    commitFilters(pendingFilters)
  }

  function resetFilters() {
    commitFilters({ ...EMPTY_FILTERS })
  }

  function applyPreset(preset) {
    if (preset === '24h') {
      commitFilters({ ...EMPTY_FILTERS, from: toDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000)) })
    } else if (preset === 'errors') {
      commitFilters({ ...EMPTY_FILTERS, status: 'error' })
    } else if (preset === 'sensitive') {
      commitFilters({ ...EMPTY_FILTERS, sensitive: true })
    } else if (preset === 'mine' && user?.id) {
      commitFilters({ ...EMPTY_FILTERS, user_id: String(user.id) })
    }
  }

  function removeFilter(key) {
    commitFilters({ ...filters, [key]: key === 'sensitive' ? false : '' })
  }

  async function refreshAll() {
    await Promise.all([logsQuery.refetch(), summaryQuery.refetch()])
  }

  async function exportLogs(format) {
    setExporting(true)
    try {
      const entries = await getAllAuditLogs(apiFilters)
      const day = new Date().toISOString().slice(0, 10)
      if (format === 'csv') {
        downloadFile(`\uFEFF${buildAuditCSV(entries)}`, 'text/csv;charset=utf-8', `journal-audit-${day}.csv`)
      } else {
        downloadFile(JSON.stringify(entries, null, 2), 'application/json;charset=utf-8', `journal-audit-${day}.json`)
      }
      toast.success(`${entries.length} événement(s) exporté(s)`)
    } catch (error) {
      toast.error(error.message || "Échec de l'export")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert size={19} className="text-amber-500" /> Journal d'audit
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {total} événement{total !== 1 ? 's' : ''} · sources opérationnelles et historiques unifiées
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => exportLogs('csv')} loading={exporting}>
            <FileSpreadsheet size={13} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportLogs('json')} disabled={exporting}>
            <FileJson size={13} /> JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshAll} loading={logsQuery.isFetching || summaryQuery.isFetching}>
            <RefreshCw size={13} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryTile icon={Clock3} label="Aujourd'hui" value={summary.total_today} color="text-brand-500" />
        <SummaryTile icon={Activity} label="7 derniers jours" value={summary.total_week} color="text-sky-500" />
        <SummaryTile icon={XCircle} label="Erreurs (30 j)" value={summary.errors_30_days} color="text-rose-500" />
        <SummaryTile icon={ShieldAlert} label="Actions sensibles" value={summary.sensitive_actions_30_days} color="text-amber-500" />
        <SummaryTile icon={Users} label="Utilisateurs actifs" value={summary.unique_users_30_days} color="text-purple-500" />
        <SummaryTile icon={Database} label="Événements historiques" value={summary.legacy_events_30_days} color="text-zinc-400" />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[var(--text-muted)]" />
            <span className="text-[12px] font-semibold text-[var(--text)]">Recherche et filtres</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <PresetButton onClick={() => applyPreset('24h')}>24 dernières heures</PresetButton>
            <PresetButton onClick={() => applyPreset('errors')}>Erreurs</PresetButton>
            <PresetButton onClick={() => applyPreset('sensitive')}>Actions sensibles</PresetButton>
            {user?.id && <PresetButton onClick={() => applyPreset('mine')}>Mes actions</PresetButton>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-3">
            <label className="filter-label">Recherche globale</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={pendingFilters.search}
                onChange={(event) => setPendingFilters((current) => ({ ...current, search: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
                placeholder="Action, utilisateur, référence, IP…"
                className="audit-input pl-9"
              />
            </div>
          </div>
          <FilterSelect
            className="xl:col-span-2" label="Action" value={pendingFilters.action}
            onChange={(value) => setPendingFilters((current) => ({ ...current, action: value }))}
            options={(summary.by_action || []).map((item) => ({ value: item.action, label: actionLabel(item.action) }))}
            emptyLabel="Toutes les actions"
          />
          <FilterSelect
            className="xl:col-span-2" label="Entité" value={pendingFilters.entity_type}
            onChange={(value) => setPendingFilters((current) => ({ ...current, entity_type: value }))}
            options={(summary.by_entity || []).map((item) => ({ value: item.entity_type, label: entityLabel(item.entity_type) }))}
            emptyLabel="Toutes les entités"
          />
          <FilterSelect
            className="xl:col-span-1" label="Statut" value={pendingFilters.status}
            onChange={(value) => setPendingFilters((current) => ({ ...current, status: value }))}
            options={[{ value: 'success', label: 'Succès' }, { value: 'error', label: 'Erreur' }]}
            emptyLabel="Tous"
          />
          <FilterInput className="xl:col-span-2" label="Du" type="datetime-local" value={pendingFilters.from}
            onChange={(value) => setPendingFilters((current) => ({ ...current, from: value }))} />
          <FilterInput className="xl:col-span-2" label="Au" type="datetime-local" value={pendingFilters.to}
            onChange={(value) => setPendingFilters((current) => ({ ...current, to: value }))} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5 min-h-7">
            {activeFilters.map(([key, value]) => (
              <FilterChip key={key} label={filterChipLabel(key, value, user)} onRemove={() => removeFilter(key)} />
            ))}
            {activeFilters.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">Aucun filtre actif</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilters.length === 0 && !filtersChanged}>
              Réinitialiser
            </Button>
            <Button size="sm" onClick={applyFilters} disabled={!filtersChanged}>Appliquer</Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {logsQuery.isLoading ? (
          <PageLoader />
        ) : logsQuery.isError ? (
          <div className="py-12 text-center" role="alert">
            <XCircle size={22} className="mx-auto text-rose-500 mb-2" />
            <p className="text-sm text-[var(--text)]">Impossible de charger le journal d'audit</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => logsQuery.refetch()}>Réessayer</Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">
            Aucun événement correspondant aux filtres
          </div>
        ) : (
          <ul>
            {logs.map((entry, index) => {
              const eventKey = `${entry.source || 'audit'}:${entry.id}`
              const previousDay = index > 0 ? new Date(logs[index - 1].created_at).toDateString() : null
              const currentDay = new Date(entry.created_at).toDateString()
              return (
                <Fragment key={eventKey}>
                  {currentDay !== previousDay && (
                    <li className="px-5 py-2 bg-[var(--surface-2)] border-y border-[var(--border)] first:border-t-0 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] capitalize">
                      {dateGroupLabel(entry.created_at)}
                    </li>
                  )}
                  <AuditEventRow
                    entry={entry}
                    open={expanded === eventKey}
                    onToggle={() => setExpanded(expanded === eventKey ? null : eventKey)}
                  />
                </Fragment>
              )
            })}
          </ul>
        )}
      </Card>

      <Pagination
        page={page} pageSize={pageSize} total={total} onChange={setPage}
        pageSizes={PAGE_SIZES} onPageSizeChange={(size) => { setPageSize(size); setPage(0) }}
      />
    </div>
  )
}

function AuditEventRow({ entry, open, onToggle }) {
  const severity = eventSeverity(entry)
  return (
    <li className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button" onClick={onToggle} aria-expanded={open}
        className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-[var(--surface-2)] transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <EventStatusIcon severity={severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--text)]">{actionLabel(entry.action)}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">{entry.action}</span>
            {entry.source === 'access' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400">historique</span>}
            {severity === 'sensitive' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">sensible</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1"><UserRound size={11} /> {entry.user_name || (entry.user_id ? `#${entry.user_id}` : 'Système')}</span>
            {entry.user_role && <span className="px-1.5 rounded bg-[var(--surface-2)] capitalize">{entry.user_role}</span>}
            {entry.entity_type && (
              <span className={cn('px-1.5 py-0.5 rounded font-medium', ENTITY_COLORS[entry.entity_type] || ENTITY_COLORS.system)}>
                {entityLabel(entry.entity_type)}{entry.entity_id ? ` #${entry.entity_id}` : ''}{entry.entity_reference ? ` · ${entry.entity_reference}` : ''}
              </span>
            )}
            {entry.description && entry.description !== entry.action && <span className="truncate max-w-xl">{entry.description}</span>}
          </div>
        </div>
        <span className="text-right shrink-0" title={formatDate(entry.created_at)}>
          <span className="block text-[11px] text-[var(--text)]">{timeAgo(entry.created_at)}</span>
          <span className="block text-[9px] text-[var(--text-muted)] font-mono mt-0.5">{formatDate(entry.created_at)}</span>
        </span>
      </button>
      {open && <AuditEventDetail entry={entry} />}
    </li>
  )
}

function AuditEventDetail({ entry }) {
  const [showRaw, setShowRaw] = useState(false)
  const detailQuery = useQuery({
    queryKey: ['audit-log-detail', entry.source || 'audit', entry.id],
    queryFn: () => getAuditLog(entry.id, entry.source || 'audit'),
  })
  const detail = detailQuery.data
  const changes = detail ? diffAuditValues(detail.old_values || {}, detail.new_values || {}) : []

  async function copyJSON() {
    await navigator.clipboard.writeText(JSON.stringify({ before: detail?.old_values, after: detail?.new_values }, null, 2))
    toast.success('Détails copiés')
  }

  return (
    <div className="px-10 pb-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
      {detailQuery.isLoading ? (
        <div className="py-5 text-[11px] text-[var(--text-muted)]">Chargement des détails…</div>
      ) : detailQuery.isError ? (
        <div className="py-4 text-[11px] text-rose-500">Impossible de charger les détails de cet événement.</div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 pt-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {changes.length} champ{changes.length !== 1 ? 's' : ''} modifié{changes.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={copyJSON}><Copy size={11} /> Copier</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowRaw((value) => !value)}><Code2 size={11} /> JSON brut</Button>
            </div>
          </div>

          {changes.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg)]">
              <div className="grid grid-cols-[minmax(140px,0.7fr)_minmax(180px,1fr)_minmax(180px,1fr)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
                <span className="px-3 py-2">Champ</span><span className="px-3 py-2">Avant</span><span className="px-3 py-2">Après</span>
              </div>
              {changes.map((change) => (
                <div key={change.key} className="grid grid-cols-[minmax(140px,0.7fr)_minmax(180px,1fr)_minmax(180px,1fr)] text-[11px] border-b border-[var(--border)] last:border-b-0">
                  <span className="px-3 py-2 font-mono text-[var(--text)] break-all">{change.key}</span>
                  <span className={cn('px-3 py-2 font-mono break-all', change.type !== 'added' ? 'text-rose-400 bg-rose-500/5' : 'text-[var(--text-muted)]')}>
                    {formatAuditValue(change.before)}
                  </span>
                  <span className={cn('px-3 py-2 font-mono break-all', change.type !== 'removed' ? 'text-emerald-400 bg-emerald-500/5' : 'text-[var(--text-muted)]')}>
                    {formatAuditValue(change.after)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] py-2">Aucune valeur structurée associée à cet événement.</p>
          )}

          {showRaw && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              <RawJSON title="Avant" value={detail?.old_values} />
              <RawJSON title="Après / métadonnées" value={detail?.new_values} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-[var(--text-muted)]">
            {detail?.ip_address && <span><strong>IP :</strong> {friendlyIPAddress(detail.ip_address)} <span className="font-mono opacity-60">({detail.ip_address})</span></span>}
            {detail?.user_agent && <span title={detail.user_agent}><strong>Client :</strong> {parseUserAgent(detail.user_agent)}</span>}
            <span><strong>Source :</strong> {detail?.source === 'access' ? 'journal historique' : 'journal enrichi'}</span>
          </div>
        </>
      )}
    </div>
  )
}

function EventStatusIcon({ severity }) {
  if (severity === 'error') return <XCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
  if (severity === 'sensitive') return <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
  return <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
}

function RawJSON({ title, value }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">{title}</p>
      <pre className="text-[10px] font-mono text-[var(--text)] bg-[var(--bg)] p-3 rounded-lg whitespace-pre-wrap break-words max-h-48 overflow-y-auto border border-[var(--border)]">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  )
}

function FilterInput({ className, label, value, onChange, type = 'text' }) {
  return (
    <div className={className}>
      <label className="filter-label">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="audit-input" />
    </div>
  )
}

function FilterSelect({ className, label, value, onChange, options, emptyLabel }) {
  return (
    <div className={className}>
      <label className="filter-label">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="audit-input">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )
}

function PresetButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="text-[10px] px-2 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">{children}</button>
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/15">
      {label}<button type="button" onClick={onRemove} aria-label={`Retirer le filtre ${label}`}><X size={10} /></button>
    </span>
  )
}

function filterChipLabel(key, value, user) {
  const labels = {
    search: `Recherche : ${value}`,
    action: actionLabel(value),
    entity_type: entityLabel(value),
    status: value === 'error' ? 'Erreurs' : 'Succès',
    from: `Depuis ${value.replace('T', ' ')}`,
    to: `Jusqu’au ${value.replace('T', ' ')}`,
    user_id: `Utilisateur : ${String(user?.id) === String(value) ? user?.name || value : value}`,
    sensitive: 'Actions sensibles',
  }
  return labels[key] || `${key}: ${value}`
}

function SummaryTile({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-[22px] font-bold', color)}>{value ?? '—'}</p>
        <Icon size={15} className={cn(color, 'opacity-70')} />
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
    </div>
  )
}
