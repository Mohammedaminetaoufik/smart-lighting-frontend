import { useState } from 'react'
import {
  ClipboardList, Download, UserCheck, Plus, RefreshCw, X,
  Wrench, AlertTriangle, CheckCircle, Clock, ChevronRight,
  Bell, Zap, Network, Lightbulb, Eye, MessageSquare, RotateCcw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkOrders, getWorkOrder, startWorkOrder, resolveWorkOrder, closeWorkOrder,
  cancelWorkOrder, assignWorkOrder, createWorkOrder,
  getWorkOrderAlerts, getWorkOrderInterventions, createWorkOrderIntervention,
  acceptWorkOrder, addWorkOrderNote, reopenWorkOrder, getWorkOrderLogs,
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
import { priorityColor, labelPriority, formatDate, timeAgo, cn } from '../../utils/helpers'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'accepted', label: 'Acceptés' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'urgent', label: 'Urgents', isPriority: true },
  { key: 'resolved', label: 'Résolus' },
  { key: 'closed', label: 'Clôturés' },
  { key: 'cancelled', label: 'Annulés' },
]

const STATUS_COLOR = {
  open:          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  accepted:      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  in_progress:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  resolved:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  closed:        'bg-[var(--surface-2)] text-[var(--text-muted)]',
  cancelled:     'bg-[var(--surface-2)] text-[var(--text-muted)] line-through',
  waiting_parts: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
}

const STATUS_LABEL = {
  open:          'Ouvert',
  accepted:      'Accepté',
  in_progress:   'En cours',
  resolved:      'Résolu',
  closed:        'Clôturé',
  cancelled:     'Annulé',
  waiting_parts: 'En attente pièces',
}

const LOG_ACTION_LABEL = {
  created:     'Créé',
  accepted:    'Accepté',
  started:     'Démarré',
  note_added:  'Note ajoutée',
  resolved:    'Résolu',
  closed:      'Clôturé',
  cancelled:   'Annulé',
  reopened:    'Réouvert',
  updated:     'Mis à jour',
}

const TEAM_ICON = {
  lighting:   Lightbulb,
  network:    Network,
  electrical: Zap,
  inspection: Eye,
}

const SOURCE_LABEL = { alert: 'Alerte', manual: 'Manuel', system: 'Système' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const pc = priorityColor(priority)
  return <Badge label={labelPriority(priority)} bg={pc.bg} text={pc.text} className="text-[10px]" />
}

function StatusPill({ status }) {
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[status] || STATUS_COLOR.open)}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function TeamIcon({ teamType }) {
  const Icon = TEAM_ICON[teamType] || Wrench
  return <Icon size={13} className="text-[var(--text-muted)]" />
}

// ─── Work Order Row ────────────────────────────────────────────────────────────

function WORow({ wo, onSelect, isSelected }) {
  return (
    <div
      onClick={() => onSelect(wo.id)}
      className={cn(
        'grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-3 items-center',
        'px-4 py-3 border-b border-[var(--border)] cursor-pointer transition-colors',
        'hover:bg-[var(--surface-2)]',
        isSelected ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : '',
        wo.priority === 'urgent' && !isSelected ? 'border-l-2 border-l-red-500' : '',
      )}
    >
      <span className="text-[12px] text-[var(--text-muted)] font-mono">#{wo.id}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text)] truncate">{wo.title}</p>
        <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1">
          <TeamIcon teamType={wo.team_type} />
          {wo.equipment_reference || wo.zone || '—'}
          {wo.repeat_count > 1 && (
            <span className="ml-1 text-amber-500 font-semibold">×{wo.repeat_count}</span>
          )}
        </p>
      </div>
      <PriorityBadge priority={wo.priority} />
      <StatusPill status={wo.status} />
      <span className="text-[12px] text-[var(--text-muted)] truncate">
        {wo.source_type ? SOURCE_LABEL[wo.source_type] || wo.source_type : '—'}
      </span>
      <span className="text-[12px] text-[var(--text-muted)] truncate">
        {wo.assignee_name || wo.assigned_to_name || <span className="italic">Non assigné</span>}
      </span>
      <span className="text-[11px] text-[var(--text-muted)]">{timeAgo(wo.created_at)}</span>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function WODetailPanel({ woId, onClose, users, onAction, actionBusy, onAssign }) {
  const [tab, setTab] = useState('info')
  const [newIvForm, setNewIvForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [ivData, setIvData] = useState({ title: '', technician_name: '', action_taken: '', note: '', priority: 'medium' })

  const qc = useQueryClient()

  const { data: wo, isLoading } = useQuery({
    queryKey: ['workorder', woId],
    queryFn: () => getWorkOrder(woId).then((r) => r?.data ?? r),
    enabled: !!woId,
  })

  const { data: linkedAlerts = [] } = useQuery({
    queryKey: ['wo-alerts', woId],
    queryFn: () => getWorkOrderAlerts(woId).then((r) => Array.isArray(r) ? r : r?.data ?? []),
    enabled: !!woId && tab === 'alerts',
  })

  const { data: interventions = [], refetch: refetchIv } = useQuery({
    queryKey: ['wo-interventions', woId],
    queryFn: () => getWorkOrderInterventions(woId).then((r) => Array.isArray(r) ? r : r?.data ?? []),
    enabled: !!woId && tab === 'interventions',
  })

  const { data: logs = [] } = useQuery({
    queryKey: ['wo-logs', woId],
    queryFn: () => getWorkOrderLogs(woId).then((r) => Array.isArray(r) ? r : r?.data ?? []),
    enabled: !!woId && tab === 'logs',
  })

  const ivMut = useMutation({
    mutationFn: (data) => createWorkOrderIntervention(woId, data),
    onSuccess: () => {
      toast.success('Intervention ajoutée')
      setNewIvForm(false)
      setIvData({ title: '', technician_name: '', action_taken: '', note: '', priority: 'medium' })
      refetchIv()
      qc.invalidateQueries({ queryKey: QK.workorders })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const noteMut = useMutation({
    mutationFn: () => addWorkOrderNote(woId, { note: noteText }),
    onSuccess: () => {
      toast.success('Note ajoutée')
      setShowNoteForm(false)
      setNoteText('')
      qc.invalidateQueries({ queryKey: ['wo-logs', woId] })
      qc.invalidateQueries({ queryKey: ['workorder', woId] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const reopenMut = useMutation({
    mutationFn: () => reopenWorkOrder(woId, {}),
    onSuccess: () => {
      toast.success('Bon réouvert')
      qc.invalidateQueries({ queryKey: QK.workorders })
      qc.invalidateQueries({ queryKey: ['workorder', woId] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  if (!woId) return null

  const TABS = [
    { key: 'info', label: 'Détails' },
    { key: 'alerts', label: 'Alertes' },
    { key: 'interventions', label: 'Interventions' },
    { key: 'logs', label: 'Historique' },
  ]

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-40 flex flex-col"
      style={{ animation: 'slideInRight 0.2s ease-out' }}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[var(--border)]">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-5 w-40 bg-[var(--surface-2)] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mb-0.5">Bon #{wo?.id}</p>
              <p className="text-[15px] font-semibold text-[var(--text)] leading-tight">{wo?.title}</p>
            </>
          )}
        </div>
        <button onClick={onClose} className="ml-3 p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex-1 py-2.5 text-[11px] font-medium transition-colors',
              tab === t.key ? 'border-b-2 border-brand-500 text-brand-500' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--surface-2)] rounded animate-pulse" />
            ))}
          </div>
        ) : tab === 'info' && wo ? (
          <>
            {/* Status + Priority row */}
            <div className="flex gap-3 flex-wrap">
              <StatusPill status={wo.status} />
              <PriorityBadge priority={wo.priority} />
              {wo.source_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                  Source : {SOURCE_LABEL[wo.source_type] || wo.source_type}
                </span>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Équipement', wo.equipment_reference || wo.equipment_type],
                ['Zone', wo.zone || '—'],
                ['Équipe', wo.team_type || wo.crew_type || '—'],
                ['Assigné à', wo.assignee_name || wo.assigned_to_name || 'Non assigné'],
                ['Créé le', formatDate(wo.created_at)],
                ['Mis à jour', timeAgo(wo.updated_at)],
                ...(wo.accepted_at ? [['Accepté le', formatDate(wo.accepted_at)]] : []),
                ...(wo.started_at ? [['Démarré le', formatDate(wo.started_at)]] : []),
                ...(wo.resolved_at ? [['Résolu le', formatDate(wo.resolved_at)]] : []),
                ...(wo.repeat_count > 1 ? [['Répétitions', `${wo.repeat_count} fois`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="bg-[var(--surface-2)] rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-0.5">{label}</p>
                  <p className="text-[12px] text-[var(--text)]">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {wo.description && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">Description</p>
                <p className="text-[12px] text-[var(--text)] bg-[var(--surface-2)] rounded-lg p-3">{wo.description}</p>
              </div>
            )}

            {/* Diagnosis */}
            {(wo.probable_cause || wo.recommended_action) && (
              <div className="space-y-2">
                {wo.probable_cause && (
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">Cause probable</p>
                    <p className="text-[12px] text-[var(--text)] bg-amber-500/8 border border-amber-500/20 rounded-lg p-3">{wo.probable_cause}</p>
                  </div>
                )}
                {wo.recommended_action && (
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">Action recommandée</p>
                    <p className="text-[12px] text-[var(--text)] bg-green-500/8 border border-green-500/20 rounded-lg p-3">{wo.recommended_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* Resolution note */}
            {wo.resolution_note && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">Note de résolution</p>
                <p className="text-[12px] text-[var(--text)] bg-[var(--surface-2)] rounded-lg p-3">{wo.resolution_note}</p>
              </div>
            )}

            {/* Add note inline form */}
            {showNoteForm ? (
              <div className="border border-[var(--border)] rounded-xl p-3 space-y-2 bg-[var(--surface)]">
                <p className="text-[12px] font-semibold text-[var(--text)]">Ajouter une note</p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Votre note..."
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-brand-500/30 resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setShowNoteForm(false); setNoteText('') }}>Annuler</Button>
                  <Button size="sm" disabled={!noteText.trim()} loading={noteMut.isPending}
                    onClick={() => noteMut.mutate()}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : wo && !['closed', 'cancelled'].includes(wo.status) && (
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setShowNoteForm(true)}>
                <MessageSquare size={12} /> Ajouter une note
              </Button>
            )}
          </>
        ) : tab === 'alerts' ? (
          linkedAlerts.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">Aucune alerte liée</div>
          ) : linkedAlerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 bg-[var(--surface-2)] rounded-xl p-3">
              <Bell size={14} className={a.severity === 'critical' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--text)]">{a.message}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{a.type} · {timeAgo(a.created_at)}</p>
              </div>
              <StatusPill status={a.status} />
            </div>
          ))
        ) : tab === 'interventions' ? (
          <>
            {interventions.length === 0 && !newIvForm && (
              <div className="text-center py-6 text-[var(--text-muted)] text-[13px]">Aucune intervention</div>
            )}
            {interventions.map((iv) => (
              <div key={iv.id} className="bg-[var(--surface-2)] rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-[var(--text)]">{iv.title}</p>
                  <StatusPill status={iv.status} />
                </div>
                {iv.technician_name && (
                  <p className="text-[11px] text-[var(--text-muted)]">Technicien : {iv.technician_name}</p>
                )}
                {iv.action_taken && (
                  <p className="text-[11px] text-[var(--text)]">Action : {iv.action_taken}</p>
                )}
                {iv.note && (
                  <p className="text-[11px] text-[var(--text-muted)] italic">{iv.note}</p>
                )}
                <p className="text-[10px] text-[var(--text-muted)]">{formatDate(iv.created_at)}</p>
              </div>
            ))}

            {newIvForm ? (
              <div className="border border-[var(--border)] rounded-xl p-3 space-y-2 bg-[var(--surface)]">
                <p className="text-[12px] font-semibold text-[var(--text)]">Nouvelle intervention</p>
                {[
                  { key: 'title', label: 'Titre', placeholder: 'Ex: Remplacement contrôleur' },
                  { key: 'technician_name', label: 'Technicien', placeholder: 'Nom du technicien' },
                  { key: 'action_taken', label: 'Action effectuée', placeholder: "Décrivez l'action..." },
                  { key: 'note', label: 'Note', placeholder: 'Remarques...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-0.5">{label}</label>
                    <input
                      value={ivData[key]}
                      onChange={(e) => setIvData((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                    />
                  </div>
                ))}
                <select
                  value={ivData.priority}
                  onChange={(e) => setIvData((d) => ({ ...d, priority: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]">
                  {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setNewIvForm(false)}>Annuler</Button>
                  <Button size="sm" loading={ivMut.isPending}
                    onClick={() => ivMut.mutate(ivData)}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : wo && !['closed', 'cancelled', 'resolved'].includes(wo.status) && (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setNewIvForm(true)}>
                <Plus size={13} /> Ajouter une intervention
              </Button>
            )}
          </>
        ) : tab === 'logs' ? (
          logs.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">Aucun historique</div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[var(--border)]" />
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 relative">
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[var(--text)]">
                          {LOG_ACTION_LABEL[log.action] || log.action}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(log.created_at)}</span>
                      </div>
                      {log.user_name && (
                        <p className="text-[11px] text-[var(--text-muted)]">par {log.user_name}</p>
                      )}
                      {(log.old_status || log.new_status) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {log.old_status && <StatusPill status={log.old_status} />}
                          {log.old_status && log.new_status && <ChevronRight size={10} className="text-[var(--text-muted)]" />}
                          {log.new_status && <StatusPill status={log.new_status} />}
                        </div>
                      )}
                      {log.note && (
                        <p className="text-[11px] text-[var(--text)] bg-[var(--surface-2)] rounded p-1.5 mt-1 italic">{log.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Footer actions */}
      {wo && (
        <div className="border-t border-[var(--border)] p-3 flex flex-wrap gap-2">
          {wo.status === 'open' && (
            <>
              <Button size="sm" variant="primary" onClick={() => onAssign(wo)}>
                <UserCheck size={13} /> Assigner
              </Button>
              <Button size="sm" variant="secondary"
                onClick={() => {
                  const name = prompt('Nom du technicien acceptant ce bon :')
                  if (name) acceptWorkOrder(wo.id, { technician_name: name })
                    .then(() => {
                      toast.success('Bon accepté')
                      qc.invalidateQueries({ queryKey: QK.workorders })
                      qc.invalidateQueries({ queryKey: ['workorder', wo.id] })
                    })
                    .catch((e) => toast.error(e.message || 'Erreur'))
                }}>
                Accepter
              </Button>
            </>
          )}
          {wo.status === 'accepted' && (
            <>
              <Button size="sm" variant="primary" loading={actionBusy === 'start'}
                onClick={() => onAction('start', wo.id)}>Démarrer</Button>
              <Button size="sm" variant="ghost" onClick={() => onAssign(wo)}>Ré-assigner</Button>
            </>
          )}
          {wo.status === 'in_progress' && (
            <>
              <Button size="sm" variant="primary" loading={actionBusy === 'resolve'}
                onClick={() => onAction('resolve', wo.id)}>
                <CheckCircle size={13} /> Résoudre
              </Button>
            </>
          )}
          {wo.status === 'resolved' && (
            <Button size="sm" variant="secondary" loading={reopenMut.isPending}
              onClick={() => reopenMut.mutate()}>
              <RotateCcw size={13} /> Réouvrir
            </Button>
          )}
          {!['closed', 'cancelled', 'resolved'].includes(wo.status) && (
            <Button size="sm" variant="ghost" loading={actionBusy === 'close'}
              onClick={() => onAction('close', wo.id)}>Clôturer</Button>
          )}
          {!['closed', 'cancelled'].includes(wo.status) && (
            <Button size="sm" variant="danger" loading={actionBusy === 'cancel'}
              onClick={() => onAction('cancel', wo.id)}>Annuler</Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New Work Order Modal ──────────────────────────────────────────────────────

function NewWOModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', team_type: 'lighting', equipment_type: 'lampadaire',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const mut = useMutation({
    mutationFn: () => createWorkOrder({ ...form, source_type: 'manual', crew_type: form.team_type }),
    onSuccess: () => {
      toast.success('Bon de travail créé')
      onCreated()
      onClose()
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  return (
    <Modal open={open} onClose={onClose} title="Nouveau bon de travail" size="sm">
      <div className="space-y-3">
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Titre *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Vérifier LP-021"
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
            placeholder="Détails de l'intervention..."
            className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Priorité</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]">
              {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p} value={p}>{labelPriority(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Équipe</label>
            <select value={form.team_type} onChange={(e) => set('team_type', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)]">
              {['lighting', 'network', 'electrical', 'inspection'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button disabled={!form.title} loading={mut.isPending} onClick={() => mut.mutate()}>
            Créer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [assignUserID, setAssignUserID] = useState('')
  const [newWOOpen, setNewWOOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(null)

  const { data: workorders = [], isLoading, refetch } = useQuery({
    queryKey: QK.workorders,
    queryFn: async () => {
      const r = await getWorkOrders()
      return Array.isArray(r) ? r : r?.data ?? r?.work_orders ?? []
    },
  })

  const { data: users = [] } = useQuery({
    queryKey: QK.users,
    queryFn: async () => {
      const r = await getUsers()
      return Array.isArray(r) ? r : r?.data ?? []
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QK.workorders })
    qc.invalidateQueries({ queryKey: ['workorder', selectedId] })
  }

  const ACTION_FNS = {
    start:   (id) => startWorkOrder(id),
    resolve: (id) => resolveWorkOrder(id),
    close:   (id) => closeWorkOrder(id),
    cancel:  (id) => cancelWorkOrder(id),
  }
  const ACTION_LABELS = { start: 'Démarré', resolve: 'Résolu', close: 'Clôturé', cancel: 'Annulé' }

  const handleAction = async (action, id) => {
    setActionBusy(action)
    try {
      await ACTION_FNS[action](id)
      toast.success(ACTION_LABELS[action])
      invalidate()
    } catch (e) {
      toast.error(e.message || 'Erreur')
    } finally {
      setActionBusy(null)
    }
  }

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

  // Filter logic
  const filtered = workorders.filter((wo) => {
    if (!filterStatus) return true
    if (filterStatus === 'urgent') return wo.priority === 'urgent'
    return wo.status === filterStatus
  })

  // Stats
  const stats = {
    open:       workorders.filter((w) => w.status === 'open').length,
    accepted:   workorders.filter((w) => w.status === 'accepted').length,
    in_progress:workorders.filter((w) => w.status === 'in_progress').length,
    urgent:     workorders.filter((w) => w.priority === 'urgent' && !['closed','cancelled','resolved'].includes(w.status)).length,
    resolved:   workorders.filter((w) => w.status === 'resolved').length,
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ouverts', value: stats.open + stats.accepted, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'En cours', value: stats.in_progress, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Urgents', value: stats.urgent, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Résolus', value: stats.resolved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg)}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={cn('px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors',
                filterStatus === f.key
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
              {f.label}
              {f.key === 'accepted' && stats.accepted > 0 && (
                <span className="ml-1 text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1 rounded-full">
                  {stats.accepted}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw size={13} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { exportWorkOrders(); toast.success('Export CSV lancé') }}>
            <Download size={13} /> CSV
          </Button>
          <Button size="sm" onClick={() => setNewWOOpen(true)}>
            <Plus size={13} /> Nouveau
          </Button>
        </div>
      </div>

      {/* Table + Detail Panel */}
      <div className={cn('flex gap-4', selectedId ? 'mr-[488px]' : '')}>
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
            {['#', 'Titre / Équipement', 'Priorité', 'Statut', 'Source', 'Assigné à', 'Créé'].map((h) => (
              <p key={h} className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</p>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucun bon de travail"
              description={filterStatus ? `Aucun bon avec le statut "${STATUS_LABEL[filterStatus] || filterStatus}"` : 'Les bons apparaîtront ici.'} />
          ) : filtered.map((wo) => (
            <WORow
              key={wo.id}
              wo={wo}
              isSelected={wo.id === selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSelectedId(null)} />
          <WODetailPanel
            woId={selectedId}
            onClose={() => setSelectedId(null)}
            users={users}
            onAction={handleAction}
            actionBusy={actionBusy}
            onAssign={(wo) => {
              setAssigning(wo)
              setAssignUserID(wo.assigned_to ? String(wo.assigned_to) : '')
            }}
          />
        </>
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
              <select value={assignUserID} onChange={(e) => setAssignUserID(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500">
                <option value="">Sélectionner un utilisateur…</option>
                {users.filter((u) => u.status === 'active').map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} — {u.role}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssigning(null)}>Annuler</Button>
              <Button disabled={!assignUserID} loading={assignMut.isPending}
                onClick={() => assignMut.mutate({ id: assigning.id, user_id: Number(assignUserID) })}>
                <UserCheck size={13} /> Assigner
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New WO modal */}
      <NewWOModal open={newWOOpen} onClose={() => setNewWOOpen(false)} onCreated={invalidate} />
    </div>
  )
}
