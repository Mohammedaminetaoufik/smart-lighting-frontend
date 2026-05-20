import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Radio, Wifi, MapPin, RefreshCw, Battery, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import {
  getBasestation, getBasestationControllers, simulateBasestationOffline,
} from '../../api/infrastructure'
import { statusColor, labelStatus, formatDate, cn } from '../../utils/helpers'

export default function BasestationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: bs, isLoading } = useQuery({
    queryKey: ['basestation', id],
    queryFn: () => getBasestation(id),
    refetchInterval: 15_000,
  })

  const { data: controllers = [] } = useQuery({
    queryKey: ['basestation-controllers', id],
    queryFn: () => getBasestationControllers(id),
  })

  const simOfflineMut = useMutation({
    mutationFn: () => simulateBasestationOffline(id),
    onSuccess: () => {
      toast.success('Basestation simulée hors ligne')
      qc.invalidateQueries({ queryKey: ['basestation', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />
  if (!bs) return <div className="text-center py-16 text-[var(--text-muted)]">Station introuvable</div>

  const sc = statusColor(bs.status)
  const isOffline = bs.status === 'offline'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-[var(--text)] flex items-center gap-2">
            <Radio size={18} className="text-blue-500" />
            {bs.reference}
            <Badge label={labelStatus(bs.status)} bg={sc.bg} text={sc.text} dot={sc.dot} />
          </h1>
          {bs.zone && (
            <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {bs.zone}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ['basestation', id] })}>
          <RefreshCw size={13} /> Actualiser
        </Button>
      </div>

      {isOffline && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/40">
          <AlertTriangle size={16} className="text-red-500" />
          <p className="text-[13px] text-red-700 dark:text-red-400 font-medium">
            Station de base hors ligne — {bs.disconnected_nodes_count ?? 0} nœuds isolés
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={Wifi} label="Nœuds connectés" value={bs.connected_nodes_count ?? 0} />
        <Tile label="Nœuds isolés" value={bs.disconnected_nodes_count ?? 0}
          alert={(bs.disconnected_nodes_count ?? 0) > 0} />
        <Tile label="Signal moyen" value={`${(bs.signal_quality_avg ?? 0).toFixed(0)}%`} />
        <Tile icon={Battery} label="Batterie" value={bs.battery_status || 'inconnu'} />
      </div>

      <Card>
        <CardHeader title="Réseau" subtitle="Type de réseau et backhaul" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Type de réseau" value={bs.network_type || '—'} />
          <Stat label="Backhaul primaire" value={bs.primary_backhaul || '—'} />
          <Stat label="Backhaul actif" value={bs.active_backhaul || '—'} />
          <Stat label="Dernier contact" value={bs.last_seen_at ? formatDate(bs.last_seen_at) : '—'} />
          <Stat label="Commissionnée le" value={bs.commissioned_at ? formatDate(bs.commissioned_at) : '—'} />
          <Stat label="Adresse" value={bs.address || '—'} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Contrôleurs raccordés" subtitle={`${controllers.length} contrôleur(s)`} />
        {controllers.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucun contrôleur rattaché.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {controllers.map((c) => {
              const cs = statusColor(c.status === 'ok' ? 'online' : 'offline')
              return (
                <li key={c.id} className="py-2.5 flex items-center gap-3">
                  <span className="font-mono text-[12px] text-[var(--text)] flex-1">{c.controller_uid}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">{c.type || '—'}</span>
                  {c.signal_quality != null && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">{c.signal_quality}%</span>
                  )}
                  <Badge label={c.status || 'inconnu'} bg={cs.bg} text={cs.text} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Outils de test" />
        <Button variant="secondary" size="sm" loading={simOfflineMut.isPending}
          onClick={() => simOfflineMut.mutate()}>
          <AlertTriangle size={13} /> Simuler hors ligne
        </Button>
      </Card>
    </div>
  )
}

function Tile({ icon: Icon, label, value, alert }) {
  return (
    <Card className={cn(alert && 'ring-1 ring-red-500/40')}>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className={cn('text-[15px] font-bold', alert ? 'text-red-500' : 'text-[var(--text)]')}>
        {value}
      </p>
    </Card>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] text-[var(--text)] font-medium">{value}</p>
    </div>
  )
}
