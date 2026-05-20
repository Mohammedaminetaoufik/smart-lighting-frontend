import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Shield, ShieldCheck, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users'
import { QK } from '../../lib/queryClient'
import Table from '../../components/ui/Table'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import UserForm from './UserForm'
import { formatDate, cn } from '../../utils/helpers'

const ROLE_META = {
  admin:    { label: 'Administrateur', icon: ShieldCheck, color: 'text-red-500',    bg: 'bg-red-500/15' },
  operator: { label: 'Opérateur',      icon: Shield,      color: 'text-amber-500',  bg: 'bg-amber-500/15' },
  viewer:   { label: 'Lecteur',        icon: Eye,         color: 'text-blue-500',   bg: 'bg-blue-500/15' },
}

const STATUS_META = {
  active:   { label: 'Actif',     bg: 'bg-green-500/15', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  disabled: { label: 'Désactivé', bg: 'bg-zinc-500/15',  text: 'text-zinc-500',                       dot: 'bg-zinc-500' },
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: QK.users,
    queryFn: getUsers,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.users })

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { toast.success('Utilisateur créé'); setCreateOpen(false); invalidate() },
    onError: (e) => toast.error(e.message || 'Erreur création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { toast.success('Utilisateur mis à jour'); setEditing(null); invalidate() },
    onError: (e) => toast.error(e.message || 'Erreur mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success(`${deleting?.full_name ?? 'Utilisateur'} supprimé`)
      setDeleting(null)
      invalidate()
    },
    onError: (e) => toast.error(e.message || 'Erreur suppression'),
  })

  const columns = [
    { key: 'id', label: '#', className: 'w-12' },
    {
      key: 'full_name',
      label: 'Nom',
      render: (v, row) => (
        <div>
          <p className="font-medium text-[var(--text)]">{v || '—'}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (v) => {
        const meta = ROLE_META[v] || ROLE_META.viewer
        const Icon = meta.icon
        return (
          <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full', meta.bg)}>
            <Icon size={11} className={meta.color} />
            <span className={cn('text-[11px] font-medium', meta.color)}>{meta.label}</span>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (v) => {
        const meta = STATUS_META[v] || STATUS_META.active
        return <Badge label={meta.label} bg={meta.bg} text={meta.text} dot={meta.dot} />
      },
    },
    {
      key: 'last_login_at',
      label: 'Dernière connexion',
      render: (v) => v
        ? <span className="text-[12px] text-[var(--text-muted)]">{formatDate(v)}</span>
        : <span className="text-[11px] text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'created_at',
      label: 'Créé le',
      render: (v) => <span className="text-[11px] text-[var(--text-muted)]">{formatDate(v)}</span>,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(row) }}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Modifier"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleting(row) }}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-500"
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  if (isLoading) return <PageLoader />

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === 'admin').length,
    operator: users.filter((u) => u.role === 'operator').length,
    viewer: users.filter((u) => u.role === 'viewer').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)]">Gestion des utilisateurs</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {stats.total} utilisateurs · {stats.admin} admin · {stats.operator} opérateurs · {stats.viewer} lecteurs
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus size={14} />
          Nouvel utilisateur
        </Button>
      </div>

      <Card className="p-0">
        <Table columns={columns} data={users} emptyText="Aucun utilisateur" />
      </Card>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvel utilisateur">
        <UserForm
          onSubmit={(data) => createMut.mutate(data)}
          onCancel={() => setCreateOpen(false)}
          busy={createMut.isPending}
          submitLabel="Créer"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Modifier ${editing?.full_name ?? ''}`}>
        <UserForm
          defaultValues={editing}
          onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
          onCancel={() => setEditing(null)}
          busy={updateMut.isPending}
          submitLabel="Enregistrer"
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Supprimer cet utilisateur ?" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text)]">
            <span className="font-semibold">{deleting?.full_name}</span> sera désactivé et ne pourra plus se connecter.
            Cette action est réversible côté base de données.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Annuler</Button>
            <Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteMut.mutate(deleting.id)}>
              <Trash2 size={13} /> Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
