import { useState } from 'react'
import { Cpu, Link2, Wifi, WifiOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getControllers, associateController } from '../../api/infrastructure'
import { getLampadaires } from '../../api/lampadaires'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import { PageLoader } from '../../components/ui/Spinner'
import { statusColor, labelStatus, formatDate, cn } from '../../utils/helpers'

export default function ControllersPage() {
  const qc = useQueryClient()
  const [associating, setAssociating] = useState(null)
  const [lampID, setLampID] = useState('')

  const { data: controllers = [], isLoading } = useQuery({
    queryKey: ['controllers'],
    queryFn: getControllers,
    refetchInterval: 30_000,
  })

  const { data: lamps = [] } = useQuery({
    queryKey: ['lampadaires', {}],
    queryFn: async () => {
      const r = await getLampadaires()
      return Array.isArray(r) ? r : r?.lampadaires || []
    },
    enabled: !!associating,  // only fetch when modal opens
  })

  const lampById = lamps.reduce((acc, l) => { acc[l.id] = l; return acc }, {})

  const associateMut = useMutation({
    mutationFn: ({ id, lampID }) => associateController(id, Number(lampID)),
    onSuccess: () => {
      toast.success('Controller associé')
      setAssociating(null)
      setLampID('')
      qc.invalidateQueries({ queryKey: ['controllers'] })
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />

  const columns = [
    {
      key: 'controller_uid',
      label: 'UID Controller',
      render: (v) => <span className="font-mono text-[12px] font-medium text-[var(--text)]">{v}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (v) => <span className="text-[12px] text-[var(--text-muted)]">{v || '—'}</span>,
    },
    {
      key: 'status',
      label: 'État',
      render: (v) => {
        const c = statusColor(v === 'ok' ? 'online' : v === 'lost' ? 'offline' : 'maintenance')
        const Icon = v === 'ok' ? Wifi : WifiOff
        return (
          <div className="flex items-center gap-1.5">
            <Icon size={12} className={c.text} />
            <Badge label={v || 'inconnu'} bg={c.bg} text={c.text} />
          </div>
        )
      },
    },
    {
      key: 'lampadaire_id',
      label: 'Lampadaire associé',
      render: (v, row) => v
        ? <span className="text-[12px] text-[var(--text)]">#{v}</span>
        : (
          <button
            onClick={() => setAssociating(row)}
            className="text-[11px] text-brand-500 hover:underline flex items-center gap-1"
          >
            <Link2 size={11} /> Associer
          </button>
        ),
    },
    {
      key: 'signal_quality',
      label: 'Signal',
      render: (v) => v != null
        ? <span className="text-[12px] font-mono text-[var(--text-muted)]">{v}%</span>
        : '—',
    },
    {
      key: 'firmware',
      label: 'Firmware',
      render: (v) => <span className="text-[11px] font-mono text-[var(--text-muted)]">{v || '—'}</span>,
    },
    {
      key: 'last_seen_at',
      label: 'Dernier contact',
      render: (v) => v
        ? <span className="text-[11px] text-[var(--text-muted)]">{formatDate(v)}</span>
        : <span className="text-[11px] text-[var(--text-muted)]">—</span>,
    },
  ]

  const stats = {
    total: controllers.length,
    online: controllers.filter((c) => c.status === 'ok').length,
    offline: controllers.filter((c) => c.status === 'lost').length,
    unassigned: controllers.filter((c) => !c.lampadaire_id).length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
          <Cpu size={18} className="text-brand-500" />
          Contrôleurs
        </h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
          {stats.total} contrôleurs · {stats.online} en ligne · {stats.offline} hors ligne · {stats.unassigned} non associés
        </p>
      </div>

      <Card className="p-0">
        <Table columns={columns} data={controllers} emptyText="Aucun contrôleur" />
      </Card>

      <Modal open={!!associating} onClose={() => setAssociating(null)}
        title={`Associer ${associating?.controller_uid ?? ''}`} size="sm">
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--text-muted)]">
            Sélectionnez le lampadaire qui héberge ce contrôleur.
          </p>
          <select
            value={lampID}
            onChange={(e) => setLampID(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Choisir un lampadaire…</option>
            {lamps.map((l) => (
              <option key={l.id} value={l.id}>
                {l.reference} {l.zone ? `— ${l.zone}` : ''}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAssociating(null)}>Annuler</Button>
            <Button
              disabled={!lampID}
              loading={associateMut.isPending}
              onClick={() => associateMut.mutate({ id: associating.id, lampID })}
            >
              <Link2 size={13} /> Associer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
