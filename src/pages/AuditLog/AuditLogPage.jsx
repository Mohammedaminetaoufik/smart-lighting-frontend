import { useState } from 'react'
import { ShieldAlert, RefreshCw, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '../../api/audit'
import { QK } from '../../lib/queryClient'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import { formatDate, cn } from '../../utils/helpers'

const PAGE_SIZES = [25, 50, 100]

const ACTION_META = {
  'user.create':              { color: 'text-green-500',  bg: 'bg-green-500/15',  label: 'Utilisateur créé' },
  'user.update':              { color: 'text-blue-500',   bg: 'bg-blue-500/15',   label: 'Utilisateur modifié' },
  'user.delete':              { color: 'text-red-500',    bg: 'bg-red-500/15',    label: 'Utilisateur supprimé' },
  'lampadaires.bulk_update':  { color: 'text-amber-500',  bg: 'bg-amber-500/15',  label: 'Lampadaires mis à jour' },
  'lampadaires.bulk_archive': { color: 'text-red-500',    bg: 'bg-red-500/15',    label: 'Lampadaires archivés' },
  'alerts.bulk_ack':          { color: 'text-blue-500',   bg: 'bg-blue-500/15',   label: 'Alertes accusées' },
  'alerts.bulk_resolve':      { color: 'text-green-500',  bg: 'bg-green-500/15',  label: 'Alertes résolues' },
  'alerts.bulk_close':        { color: 'text-zinc-500',   bg: 'bg-zinc-500/15',   label: 'Alertes fermées' },
  'workorders.bulk_assign':   { color: 'text-purple-500', bg: 'bg-purple-500/15', label: 'Bons assignés' },
}

const actionMeta = (a) => ACTION_META[a] || {
  color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-2)]', label: a,
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [filters, setFilters] = useState({ action: '', user_id: '', from: '', to: '' })
  const [pendingFilters, setPendingFilters] = useState(filters)

  const queryFilters = {
    ...filters,
    limit: pageSize,
    offset: page * pageSize,
  }

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: QK.auditLogs(queryFilters),
    queryFn: () => getAuditLogs(queryFilters),
    placeholderData: (prev) => prev, // keep previous results while paging
  })

  const logs = data?.logs || []
  const total = data?.total || 0

  const applyFilters = () => {
    setFilters(pendingFilters)
    setPage(0)
  }

  const resetFilters = () => {
    const empty = { action: '', user_id: '', from: '', to: '' }
    setPendingFilters(empty)
    setFilters(empty)
    setPage(0)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            Journal d'audit
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
            {total} événement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw size={13} /> Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text)]">Filtres</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <FilterInput
            label="Action"
            placeholder="ex: user, alert"
            value={pendingFilters.action}
            onChange={(v) => setPendingFilters((f) => ({ ...f, action: v }))}
          />
          <FilterInput
            label="ID utilisateur"
            type="number"
            placeholder="#"
            value={pendingFilters.user_id}
            onChange={(v) => setPendingFilters((f) => ({ ...f, user_id: v }))}
          />
          <FilterInput
            label="Du"
            type="datetime-local"
            value={pendingFilters.from}
            onChange={(v) => setPendingFilters((f) => ({ ...f, from: v }))}
          />
          <FilterInput
            label="Au"
            type="datetime-local"
            value={pendingFilters.to}
            onChange={(v) => setPendingFilters((f) => ({ ...f, to: v }))}
          />
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters} className="flex-1">Appliquer</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>
        </div>
      </Card>

      {/* Logs list */}
      <Card className="p-0">
        {isLoading ? (
          <PageLoader />
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)] text-sm">
            Aucun événement
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {logs.map((l) => {
              const meta = actionMeta(l.action)
              return (
                <li key={l.id} className="px-5 py-3 flex items-start gap-4 hover:bg-[var(--surface-2)] transition-colors">
                  <span className={cn('text-[11px] font-mono font-semibold px-2 py-1 rounded shrink-0', meta.bg, meta.color)}>
                    {l.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-[var(--text)]">{meta.label}</span>
                      {l.user_name && (
                        <span className="text-[11px] text-[var(--text-muted)]">par {l.user_name}</span>
                      )}
                      {!l.user_name && l.user_id && (
                        <span className="text-[11px] text-[var(--text-muted)]">par #{l.user_id}</span>
                      )}
                      {!l.user_name && !l.user_id && (
                        <span className="text-[11px] text-[var(--text-muted)] italic">système</span>
                      )}
                      {l.target_type && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          → {l.target_type}{l.target_id ? ` #${l.target_id}` : ''}
                        </span>
                      )}
                    </div>
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <pre className="mt-1 text-[10px] text-[var(--text-muted)] font-mono whitespace-pre-wrap break-words bg-[var(--surface-2)] px-2 py-1 rounded max-h-20 overflow-y-auto">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0 font-mono">
                    {formatDate(l.created_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onChange={setPage}
        pageSizes={PAGE_SIZES}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0) }}
      />
    </div>
  )
}

function FilterInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
    </div>
  )
}
