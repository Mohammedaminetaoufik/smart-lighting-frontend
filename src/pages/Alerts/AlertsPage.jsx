import { useState } from 'react'
import { Bell, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Download, CheckCheck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, getAlertCounts, ackAlert, resolveAlert, closeAlert } from '../../api/alerts'
import { bulkAlertAction } from '../../api/bulk'
import { exportAlerts } from '../../api/export'
import { QK } from '../../lib/queryClient'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import BulkActionBar from '../../components/ui/BulkActionBar'
import { PageLoader } from '../../components/ui/Spinner'
import { severityColor, labelSeverity, formatDate, timeAgo, cn } from '../../utils/helpers'

const TYPES = {
  critical: { label: 'Critiques', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warning:  { label: 'Avertissements', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  info:     { label: 'Informations', icon: Bell, color: 'text-blue-500', bg: 'bg-blue-500/10' },
}

export default function AlertsPage() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(null)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [selected, setSelected] = useState(new Set())

  const filters = {
    ...(filterStatus && { status: filterStatus }),
    ...(filterSeverity && { severity: filterSeverity }),
  }

  const { data: alertsRes, isLoading: alertsLoading, refetch } = useQuery({
    queryKey: QK.alerts(filters),
    queryFn: () => getAlerts(filters),
  })

  const { data: counts } = useQuery({
    queryKey: QK.alertCounts,
    queryFn: getAlertCounts,
  })

  const alerts = Array.isArray(alertsRes) ? alertsRes : alertsRes?.alerts || []

  // Invalidate both lists when an action mutates a single alert.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['alerts'] })
    qc.invalidateQueries({ queryKey: QK.alertCounts })
  }

  const singleAction = useMutation({
    mutationFn: ({ fn, id }) => fn(id),
    onSuccess: (_, vars) => {
      toast.success(vars.label)
      invalidate()
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const bulkMut = useMutation({
    mutationFn: ({ ids, action }) => bulkAlertAction(ids, action),
    onSuccess: (res, vars) => {
      toast.success(`${res?.updated ?? 0} alerte(s) ${vars.label}`)
      setSelected(new Set())
      invalidate()
    },
    onError: (e) => toast.error(e.message || 'Erreur bulk'),
  })

  const toggleOne = (id) => setSelected((s) => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === alerts.length) setSelected(new Set())
    else setSelected(new Set(alerts.map((a) => a.id)))
  }

  const handleExport = () => {
    exportAlerts(filters)
    toast.success('Export CSV lancé')
  }

  return (
    <div className="space-y-5">
      {/* Count cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(TYPES).map(([key, cfg]) => (
          <Card key={key} className="flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg)}>
              <cfg.icon size={20} className={cfg.color} />
            </div>
            <div>
              <p className="text-[12px] text-[var(--text-muted)]">{cfg.label}</p>
              <p className={cn('text-2xl font-bold', cfg.color)}>{counts?.[key] ?? 0}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Tous les statuts</option>
          {['open', 'acknowledged', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Toutes sévérités</option>
          {['critical', 'warning', 'info'].map((s) => <option key={s} value={s}>{labelSeverity(s)}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={13} /> Exporter CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw size={13} />
        </Button>
        {alerts.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-[12px] text-brand-500 hover:underline ml-2"
          >
            {selected.size === alerts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
        <span className="text-[12px] text-[var(--text-muted)] ml-auto">{alerts.length} alertes</span>
      </div>

      {/* Alert list */}
      {alertsLoading ? <PageLoader /> : (
        <div className="space-y-2 pb-20">
          {alerts.length === 0 ? (
            <Card className="py-16 text-center text-[var(--text-muted)]">Aucune alerte</Card>
          ) : alerts.map((a) => {
            const col = severityColor(a.severity)
            const isOpen = expanded === a.id
            const isSelected = selected.has(a.id)
            const busy = singleAction.isPending && singleAction.variables?.id === a.id
            return (
              <div key={a.id} className={cn(
                'bg-[var(--surface)] border rounded-xl overflow-hidden transition-colors',
                isSelected ? 'border-brand-500 ring-1 ring-brand-500/30' : 'border-[var(--border)]'
              )}>
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(a.id)}
                    className="mt-1 w-4 h-4 accent-brand-500 shrink-0"
                  />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : a.id)}>
                    <div className="flex items-start gap-3">
                      <Badge label={labelSeverity(a.severity)} bg={col.bg} text={col.text} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[var(--text)] truncate">{a.message}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {a.type} · {timeAgo(a.created_at)}
                          {a.lampadaire_id && ` · Lampadaire #${a.lampadaire_id}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full',
                          a.status === 'open' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          a.status === 'acknowledged' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        )}>
                          {a.status}
                        </span>
                        {isOpen ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--surface-2)] space-y-3">
                    {a.probable_cause && (
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Cause probable</p>
                        <p className="text-[13px] text-[var(--text)]">{a.probable_cause}</p>
                      </div>
                    )}
                    {a.recommended_action && (
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Action recommandée</p>
                        <p className="text-[13px] text-[var(--text)]">{a.recommended_action}</p>
                      </div>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)]">Créé le {formatDate(a.created_at)}</p>
                    <div className="flex gap-2 pt-1">
                      {a.status === 'open' && (
                        <Button size="sm" variant="secondary" loading={busy}
                          onClick={() => singleAction.mutate({ fn: ackAlert, id: a.id, label: 'Alerte acquittée' })}>
                          Acquitter
                        </Button>
                      )}
                      {['open', 'acknowledged'].includes(a.status) && (
                        <Button size="sm" variant="primary" loading={busy}
                          onClick={() => singleAction.mutate({ fn: resolveAlert, id: a.id, label: 'Alerte résolue' })}>
                          <CheckCircle size={13} /> Résoudre
                        </Button>
                      )}
                      {a.status !== 'closed' && (
                        <Button size="sm" variant="danger" loading={busy}
                          onClick={() => singleAction.mutate({ fn: closeAlert, id: a.id, label: 'Alerte fermée' })}>
                          <XCircle size={13} /> Fermer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button size="sm" variant="secondary" loading={bulkMut.isPending}
          onClick={() => bulkMut.mutate({ ids: [...selected], action: 'ack', label: 'acquittée(s)' })}>
          <CheckCheck size={13} /> Acquitter
        </Button>
        <Button size="sm" variant="primary" loading={bulkMut.isPending}
          onClick={() => bulkMut.mutate({ ids: [...selected], action: 'resolve', label: 'résolue(s)' })}>
          <CheckCircle size={13} /> Résoudre
        </Button>
        <Button size="sm" variant="danger" loading={bulkMut.isPending}
          onClick={() => bulkMut.mutate({ ids: [...selected], action: 'close', label: 'fermée(s)' })}>
          <XCircle size={13} /> Fermer
        </Button>
      </BulkActionBar>
    </div>
  )
}
