import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Cpu, Zap, Activity, DoorOpen, AlertTriangle, MapPin, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import {
  getCabinet, getCabinetCircuits,
  simulateCabinetDoorOpen, simulateCabinetPowerFailure,
} from '../../api/infrastructure'
import { statusColor, labelStatus, formatDate, cn } from '../../utils/helpers'

export default function CabinetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: cab, isLoading } = useQuery({
    queryKey: ['cabinet', id],
    queryFn: () => getCabinet(id),
    refetchInterval: 15_000,
  })

  const { data: circuits = [] } = useQuery({
    queryKey: ['cabinet-circuits', id],
    queryFn: () => getCabinetCircuits(id),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['cabinet', id] })
    qc.invalidateQueries({ queryKey: ['cabinets'] })
  }

  const simDoorMut = useMutation({
    mutationFn: () => simulateCabinetDoorOpen(id),
    onSuccess: () => { toast.success('Ouverture de porte simulée'); invalidate() },
    onError: (e) => toast.error(e.message),
  })

  const simPowerMut = useMutation({
    mutationFn: () => simulateCabinetPowerFailure(id),
    onSuccess: () => { toast.success('Panne d\'alimentation simulée'); invalidate() },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />
  if (!cab) return (
    <div className="text-center py-16 text-[var(--text-muted)]">
      Armoire introuvable
    </div>
  )

  const sc = statusColor(cab.status)
  const doorOpen = cab.door_status === 'open'
  const powerFailure = cab.power_status === 'failure'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-[18px] font-bold text-[var(--text)] flex items-center gap-2">
            <Cpu size={18} className="text-brand-500" />
            {cab.reference}
            <Badge label={labelStatus(cab.status)} bg={sc.bg} text={sc.text} dot={sc.dot} />
          </h1>
          {cab.zone && (
            <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {cab.zone}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={invalidate}>
          <RefreshCw size={13} /> Actualiser
        </Button>
      </div>

      {/* Status banners */}
      {(doorOpen || powerFailure) && (
        <div className="space-y-2">
          {doorOpen && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40">
              <DoorOpen size={16} className="text-amber-500" />
              <p className="text-[13px] text-amber-700 dark:text-amber-400 font-medium">
                Porte ouverte — intrusion potentielle
              </p>
            </div>
          )}
          {powerFailure && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/40">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-[13px] text-red-700 dark:text-red-400 font-medium">
                Coupure d'alimentation détectée
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={DoorOpen} label="Porte" value={cab.door_status || '—'} alert={doorOpen} />
        <Tile icon={Zap} label="Alimentation" value={cab.power_status || '—'} alert={powerFailure} />
        <Tile icon={Activity} label="Énergie cumulée" value={`${(cab.energy_kwh ?? 0).toFixed(1)} kWh`} />
        <Tile label="Dernier contact" value={cab.last_seen_at ? formatDate(cab.last_seen_at) : '—'} small />
      </div>

      {/* Voltage / current */}
      <Card>
        <CardHeader title="Réseau électrique" subtitle="Tensions et courants par phase" />
        <div className="grid grid-cols-3 gap-4">
          {['l1', 'l2', 'l3'].map((phase) => (
            <div key={phase} className="bg-[var(--surface-2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Phase {phase.toUpperCase()}</p>
              <p className="text-[15px] font-bold text-[var(--text)] font-mono">
                {cab[`voltage_${phase}`] != null ? `${cab[`voltage_${phase}`].toFixed(0)} V` : '—'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] font-mono">
                {cab[`current_${phase}`] != null ? `${cab[`current_${phase}`].toFixed(1)} A` : '—'}
              </p>
            </div>
          ))}
        </div>
        {cab.leakage_current != null && (
          <div className="mt-3 flex items-center justify-between p-2 px-3 bg-[var(--surface-2)] rounded-lg">
            <span className="text-[12px] text-[var(--text-muted)]">Courant de fuite</span>
            <span className={cn(
              'text-[13px] font-bold font-mono',
              cab.leakage_current > 30 ? 'text-red-500' : 'text-[var(--text)]'
            )}>
              {cab.leakage_current.toFixed(2)} mA
            </span>
          </div>
        )}
      </Card>

      {/* Circuits */}
      <Card>
        <CardHeader title="Circuits" subtitle={`${circuits.length} circuit(s) raccordé(s)`} />
        {circuits.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucun circuit configuré.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {circuits.map((cir) => {
              const cs = statusColor(cir.status)
              return (
                <li key={cir.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[11px] font-bold font-mono">
                    {cir.phase || '—'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)]">Circuit #{cir.circuit_number}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{cir.lamp_count || 0} lampadaires</p>
                  </div>
                  <Badge label={labelStatus(cir.status)} bg={cs.bg} text={cs.text} dot={cs.dot} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Simulation actions */}
      <Card>
        <CardHeader title="Outils de test" subtitle="Simulations pour entraîner le système d'alertes" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={simDoorMut.isPending} onClick={() => simDoorMut.mutate()}>
            <DoorOpen size={13} /> Simuler porte ouverte
          </Button>
          <Button variant="secondary" size="sm" loading={simPowerMut.isPending} onClick={() => simPowerMut.mutate()}>
            <AlertTriangle size={13} /> Simuler coupure
          </Button>
        </div>
      </Card>

      {cab.notes && (
        <Card>
          <CardHeader title="Notes" />
          <p className="text-[13px] text-[var(--text)] whitespace-pre-wrap">{cab.notes}</p>
        </Card>
      )}
    </div>
  )
}

function Tile({ icon: Icon, label, value, alert, small }) {
  return (
    <Card className={cn('relative', alert && 'ring-1 ring-red-500/40')}>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
        {Icon && <Icon size={11} />} {label}
      </p>
      <p className={cn(
        small ? 'text-[12px]' : 'text-[15px] font-bold',
        alert ? 'text-red-500' : 'text-[var(--text)]'
      )}>
        {value}
      </p>
    </Card>
  )
}
