import { useQuery } from '@tanstack/react-query'
import {
  Activity, Database, Cpu, AlertTriangle, Lightbulb, GitCommit,
  Clock, RefreshCw, CheckCircle2, XCircle, Workflow,
} from 'lucide-react'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { getSystemHealth, getSystemVersion, getSystemJobs } from '../../api/system'
import { cn, timeAgo } from '../../utils/helpers'

const formatUptime = (secs) => {
  if (!secs) return '—'
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}j ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function SystemHealthPage() {
  const { data: health, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
    refetchInterval: 10_000,
  })

  const { data: version } = useQuery({
    queryKey: ['system-version'],
    queryFn: getSystemVersion,
    staleTime: 5 * 60_000, // version rarely changes
  })

  const { data: jobs = [] } = useQuery({
    queryKey: ['system-jobs'],
    queryFn: getSystemJobs,
    refetchInterval: 15_000,
  })

  if (isLoading) return <PageLoader />

  const db = health?.db || {}
  const rc = health?.row_counts || {}
  const rt = health?.runtime || {}
  const al = health?.alerts || {}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <Activity size={18} className="text-brand-500" />
            État du système
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            Auto-rafraîchi toutes les 10s · Dernière vérification {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw size={13} /> Actualiser
        </Button>
      </div>

      {/* Top status tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusTile
          icon={Database}
          label="Base de données"
          status={db.reachable ? 'ok' : 'critical'}
          value={db.reachable ? `${db.latency_ms ?? 0}ms` : 'Injoignable'}
          sub={db.reachable ? 'PostgreSQL connecté' : db.error || 'Erreur'}
        />
        <StatusTile
          icon={AlertTriangle}
          label="Alertes ouvertes"
          status={al.critical_open > 0 ? 'critical' : al.open > 5 ? 'warning' : 'ok'}
          value={al.open ?? 0}
          sub={`${al.critical_open ?? 0} critique(s)`}
        />
        <StatusTile
          icon={Lightbulb}
          label="Lampadaires hors ligne"
          status={(health?.lamps_offline ?? 0) > 10 ? 'warning' : 'ok'}
          value={health?.lamps_offline ?? 0}
          sub={`sur ${rc.lampadaires ?? 0} actifs`}
        />
        <StatusTile
          icon={Clock}
          label="Uptime"
          status="ok"
          value={formatUptime(rt.uptime_secs)}
          sub="Depuis le dernier redémarrage"
        />
      </div>

      {/* Background jobs */}
      <Card>
        <CardHeader title="Tâches planifiées" subtitle="Battements de cœur des jobs de fond" />
        {jobs.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune tâche n'a encore enregistré de battement.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {jobs.map((j) => {
              const ok = j.status === 'ok'
              return (
                <li key={j.name} className="py-2.5 flex items-center gap-3">
                  <Workflow size={14} className={ok ? 'text-green-500' : 'text-red-500'} />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)] font-mono">{j.name}</p>
                    {j.message && <p className="text-[11px] text-red-500">{j.message}</p>}
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
                    ok ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500')}>
                    {j.status}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    {timeAgo(j.last_run_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Runtime */}
      <Card>
        <CardHeader title="Runtime Go" subtitle="Mémoire et goroutines en cours" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric icon={Cpu} label="Goroutines" value={rt.goroutines ?? '—'} />
          <Metric label="Mémoire allouée" value={`${rt.alloc_mb ?? 0} MB`} />
          <Metric label="Mémoire système" value={`${rt.sys_mb ?? 0} MB`} />
          <Metric label="GC cycles" value={rt.num_gc ?? 0} />
        </div>
      </Card>

      {/* Row counts */}
      <Card>
        <CardHeader title="Volumes en base" subtitle="Nombre de lignes par table principale" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(rc).map(([table, count]) => (
            <Metric key={table} label={table} value={count.toLocaleString('fr-FR')} />
          ))}
        </div>
      </Card>

      {/* Version */}
      <Card>
        <CardHeader title="Version" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Metric icon={GitCommit} label="Commit" value={version?.commit || 'dev'} mono />
          <Metric label="Go" value={version?.go_version || '—'} mono />
          <Metric label="Démarré le" value={version?.started_at ? new Date(version.started_at).toLocaleString('fr-FR') : '—'} />
        </div>
      </Card>
    </div>
  )
}

function StatusTile({ icon: Icon, label, status, value, sub }) {
  const color = {
    ok:       { text: 'text-green-500', bg: 'bg-green-500/15', dot: 'bg-green-500',  Icon: CheckCircle2 },
    warning:  { text: 'text-amber-500', bg: 'bg-amber-500/15', dot: 'bg-amber-500',  Icon: AlertTriangle },
    critical: { text: 'text-red-500',   bg: 'bg-red-500/15',   dot: 'bg-red-500',    Icon: XCircle },
  }[status]
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color.bg)}>
          <Icon size={16} className={color.text} />
        </div>
        <span className={cn('w-2 h-2 rounded-full mt-1', color.dot)} />
      </div>
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold', color.text)}>{value}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>
    </Card>
  )
}

function Metric({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className={cn('text-[15px] font-semibold text-[var(--text)]', mono && 'font-mono')}>
        {value}
      </p>
    </div>
  )
}
