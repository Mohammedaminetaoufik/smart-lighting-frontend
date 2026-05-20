import { useState } from 'react'
import { CalendarPlus, Trash2, Clock, MapPin } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  getMaintenanceWindows,
  createMaintenanceWindow,
  deleteMaintenanceWindow,
} from '../../api/maintenance'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate, cn } from '../../utils/helpers'

const EMPTY = { zone: '', starts_at: '', ends_at: '', reason: '' }

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY)

  const { data: windows = [], isLoading } = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: getMaintenanceWindows,
    refetchInterval: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['maintenance-windows'] })

  const createMut = useMutation({
    mutationFn: createMaintenanceWindow,
    onSuccess: () => { toast.success('Fenêtre créée'); setCreateOpen(false); setDraft(EMPTY); invalidate() },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteMaintenanceWindow,
    onSuccess: () => { toast.success('Fenêtre supprimée'); invalidate() },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const submit = (e) => {
    e.preventDefault()
    createMut.mutate({
      zone: draft.zone || undefined,
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: new Date(draft.ends_at).toISOString(),
      reason: draft.reason || undefined,
    })
  }

  if (isLoading) return <PageLoader />

  const active = windows.filter((w) => w.active)
  const upcoming = windows.filter((w) => !w.active && new Date(w.starts_at) > new Date())
  const past = windows.filter((w) => !w.active && new Date(w.ends_at) < new Date())

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Fenêtres de maintenance
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {active.length} active{active.length > 1 ? 's' : ''} · {upcoming.length} planifiée{upcoming.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <CalendarPlus size={14} /> Nouvelle fenêtre
        </Button>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <Card>
          <CardHeader title="En cours" subtitle="Alertes suppressed pour ces équipements" />
          <ul className="divide-y divide-[var(--border)]">
            {active.map((w) => <WindowRow key={w.id} w={w} onDelete={(id) => deleteMut.mutate(id)} highlight />)}
          </ul>
        </Card>
      )}

      {/* Upcoming */}
      <Card>
        <CardHeader title="Planifiées" subtitle="Démarrent prochainement" />
        {upcoming.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)] py-2">Aucune fenêtre planifiée.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {upcoming.map((w) => <WindowRow key={w.id} w={w} onDelete={(id) => deleteMut.mutate(id)} />)}
          </ul>
        )}
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card>
          <CardHeader title="Récentes" subtitle="Terminées (gardées 7 jours)" />
          <ul className="divide-y divide-[var(--border)] opacity-60">
            {past.map((w) => <WindowRow key={w.id} w={w} onDelete={(id) => deleteMut.mutate(id)} />)}
          </ul>
        </Card>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle fenêtre de maintenance">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">
              Zone (laisser vide pour cibler des lampadaires spécifiques)
            </label>
            <input
              type="text"
              value={draft.zone}
              onChange={(e) => setDraft((d) => ({ ...d, zone: e.target.value }))}
              placeholder="ex: Zone Nord"
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">Début *</label>
              <input
                type="datetime-local"
                required
                value={draft.starts_at}
                onChange={(e) => setDraft((d) => ({ ...d, starts_at: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">Fin *</label>
              <input
                type="datetime-local"
                required
                value={draft.ends_at}
                onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">Motif</label>
            <textarea
              value={draft.reason}
              onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
              placeholder="ex: Maintenance préventive trimestrielle"
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button type="submit" loading={createMut.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function WindowRow({ w, onDelete, highlight }) {
  return (
    <li className={cn('py-3 flex items-center gap-3', highlight && 'bg-blue-500/5 -mx-6 px-6')}>
      {w.active && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {w.zone ? (
            <span className="text-[13px] font-medium text-[var(--text)] flex items-center gap-1">
              <MapPin size={11} /> {w.zone}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--text-muted)]">
              {w.lampadaire_ids?.length || 0} lampadaire(s) ciblé(s)
            </span>
          )}
          {w.active && <Badge label="En cours" bg="bg-blue-500/15" text="text-blue-500" />}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {formatDate(w.starts_at)} → {formatDate(w.ends_at)}
        </p>
        {w.reason && <p className="text-[11px] text-[var(--text)] mt-1 italic">{w.reason}</p>}
        {w.created_by_name && <p className="text-[10px] text-[var(--text-muted)]">par {w.created_by_name}</p>}
      </div>
      <button
        onClick={() => {
          if (confirm('Supprimer cette fenêtre ?')) onDelete(w.id)
        }}
        className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-500"
        title="Supprimer"
      >
        <Trash2 size={13} />
      </button>
    </li>
  )
}
