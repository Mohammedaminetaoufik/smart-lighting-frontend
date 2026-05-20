import { useState } from 'react'
import { ClipboardList, Download, UserCheck, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkOrders, startWorkOrder, resolveWorkOrder, closeWorkOrder, assignWorkOrder,
} from '../../api/workorders'
import {
  getInterventions, startIntervention, resolveIntervention, closeIntervention,
} from '../../api/workorders'
import { exportWorkOrders } from '../../api/export'
import { getUsers } from '../../api/users'
import { QK } from '../../lib/queryClient'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { priorityColor, labelPriority, formatDate, cn } from '../../utils/helpers'

const WO_COLS = ['open', 'assigned', 'in_progress', 'resolved', 'closed']
const COL_LABELS = {
  open: 'Ouvert', assigned: 'Assigné', in_progress: 'En cours',
  resolved: 'Résolu', closed: 'Fermé',
}

function KanbanCol({ status, items, onAction, onAssign, busyId, usersById }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{COL_LABELS[status]}</p>
        <span className="text-[11px] bg-[var(--surface-2)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((wo) => {
          const pc = priorityColor(wo.priority)
          const assignee = wo.assigned_to ? usersById[wo.assigned_to] : null
          return (
            <div key={wo.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium text-[var(--text)] flex-1">{wo.title}</p>
                <Badge label={labelPriority(wo.priority)} bg={pc.bg} text={pc.text} className="shrink-0 text-[10px]" />
              </div>
              {assignee && (
                <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                  <UserCheck size={11} /> {assignee.full_name}
                </p>
              )}
              {wo.due_date && (
                <p className="text-[11px] text-amber-500 flex items-center gap-1">
                  <Calendar size={11} /> {formatDate(wo.due_date)}
                </p>
              )}
              <div className="flex gap-1.5 flex-wrap pt-1">
                {status === 'open' && (
                  <Button size="sm" variant="primary" onClick={() => onAssign(wo)}>
                    <UserCheck size={11} /> Assigner
                  </Button>
                )}
                {status === 'assigned' && (
                  <>
                    <Button size="sm" variant="primary" loading={busyId === wo.id}
                      onClick={() => onAction('start', wo.id)}>
                      Démarrer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onAssign(wo)}>
                      Ré-assigner
                    </Button>
                  </>
                )}
                {status === 'in_progress' && (
                  <Button size="sm" variant="primary" loading={busyId === wo.id}
                    onClick={() => onAction('resolve', wo.id)}>
                    Résoudre
                  </Button>
                )}
                {status !== 'closed' && status !== 'open' && (
                  <Button size="sm" variant="ghost" loading={busyId === wo.id}
                    onClick={() => onAction('close', wo.id)}>
                    Fermer
                  </Button>
                )}
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center text-[11px] text-[var(--text-muted)]">
            Vide
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkOrdersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('workorders')
  const [assigning, setAssigning] = useState(null)  // current WO being assigned
  const [assignUserID, setAssignUserID] = useState('')

  const { data: workorders = [], isLoading } = useQuery({
    queryKey: QK.workorders,
    queryFn: async () => {
      const r = await getWorkOrders()
      return Array.isArray(r) ? r : r?.work_orders || []
    },
  })

  const { data: interventions = [] } = useQuery({
    queryKey: ['interventions'],
    queryFn: async () => {
      const r = await getInterventions()
      return Array.isArray(r) ? r : r?.interventions || []
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: QK.users,
    queryFn: getUsers,
  })

  const usersById = users.reduce((acc, u) => { acc[u.id] = u; return acc }, {})

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QK.workorders })
    qc.invalidateQueries({ queryKey: ['interventions'] })
  }

  const ACTION_FNS = {
    start: startWorkOrder,
    resolve: resolveWorkOrder,
    close: closeWorkOrder,
  }
  const ACTION_LABELS = {
    start: 'Démarré',
    resolve: 'Résolu',
    close: 'Fermé',
  }

  const actionMut = useMutation({
    mutationFn: ({ action, id }) => ACTION_FNS[action](id),
    onSuccess: (_, vars) => { toast.success(ACTION_LABELS[vars.action]); invalidate() },
    onError: (e) => toast.error(e.message),
  })

  const ivActionMut = useMutation({
    mutationFn: ({ fn, id, label }) => fn(id).then(() => label),
    onSuccess: (label) => { toast.success(label); invalidate() },
    onError: (e) => toast.error(e.message),
  })

  const assignMut = useMutation({
    mutationFn: ({ id, user_id }) => assignWorkOrder(id, { user_id }),
    onSuccess: () => {
      toast.success('Bon assigné')
      setAssigning(null)
      setAssignUserID('')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const openAssign = (wo) => {
    setAssigning(wo)
    setAssignUserID(wo.assigned_to ? String(wo.assigned_to) : '')
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex gap-2">
          {[['workorders', 'Bons de travail'], ['interventions', 'Interventions']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors',
                tab === key ? 'border-brand-500 text-brand-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'workorders' && (
          <Button variant="secondary" size="sm" onClick={() => { exportWorkOrders(); toast.success('Export CSV lancé') }}>
            <Download size={13} /> Exporter CSV
          </Button>
        )}
      </div>

      {tab === 'workorders' && (
        workorders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucun bon de travail" description="Les bons de travail apparaîtront ici." />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {WO_COLS.map((status) => (
              <KanbanCol
                key={status}
                status={status}
                items={workorders.filter((w) => w.status === status)}
                onAction={(action, id) => actionMut.mutate({ action, id })}
                onAssign={openAssign}
                busyId={actionMut.isPending ? actionMut.variables?.id : null}
                usersById={usersById}
              />
            ))}
          </div>
        )
      )}

      {tab === 'interventions' && (
        interventions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune intervention" description="Les interventions apparaîtront ici." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interventions.map((iv) => {
              const pc = priorityColor(iv.priority)
              const busy = ivActionMut.isPending && ivActionMut.variables?.id === iv.id
              return (
                <div key={iv.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-[14px] text-[var(--text)] flex-1">{iv.title}</p>
                    <Badge label={labelPriority(iv.priority)} bg={pc.bg} text={pc.text} />
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] mb-3">{iv.description}</p>
                  <div className="flex gap-2">
                    {iv.status === 'open' && (
                      <Button size="sm" variant="primary" loading={busy}
                        onClick={() => ivActionMut.mutate({ fn: startIntervention, id: iv.id, label: 'Intervention démarrée' })}>
                        Démarrer
                      </Button>
                    )}
                    {iv.status === 'in_progress' && (
                      <Button size="sm" loading={busy}
                        onClick={() => ivActionMut.mutate({ fn: resolveIntervention, id: iv.id, label: 'Résolue' })}>
                        Résoudre
                      </Button>
                    )}
                    {iv.status !== 'closed' && (
                      <Button size="sm" variant="ghost" loading={busy}
                        onClick={() => ivActionMut.mutate({ fn: closeIntervention, id: iv.id, label: 'Fermée' })}>
                        Fermer
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Assign modal */}
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assigner le bon de travail" size="sm">
        {assigning && (
          <div className="space-y-4">
            <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2">
              <p className="text-[12px] font-medium text-[var(--text)]">{assigning.title}</p>
              <p className="text-[11px] text-[var(--text-muted)]">Priorité : {labelPriority(assigning.priority)}</p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">
                Assigner à <span className="text-red-500">*</span>
              </label>
              <select
                value={assignUserID}
                onChange={(e) => setAssignUserID(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                <option value="">Sélectionner un utilisateur…</option>
                {users.filter((u) => u.status === 'active').map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} — {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>Annuler</Button>
              <Button
                disabled={!assignUserID}
                loading={assignMut.isPending}
                onClick={() => assignMut.mutate({ id: assigning.id, user_id: Number(assignUserID) })}
              >
                <UserCheck size={13} /> Assigner
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
