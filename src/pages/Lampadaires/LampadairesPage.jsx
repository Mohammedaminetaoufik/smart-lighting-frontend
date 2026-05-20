import { useEffect, useState } from 'react'
import { Search, Lightbulb, Download, Archive, MapPin, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLampadaires } from '../../api/lampadaires'
import { bulkArchiveLampadaires, bulkUpdateLampadaires } from '../../api/bulk'
import { exportLampadaires } from '../../api/export'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import BulkActionBar from '../../components/ui/BulkActionBar'
import { statusColor, labelStatus, commissioningColor, labelCommissioning, cn } from '../../utils/helpers'
import LampadaireDetail from './LampadaireDetail'
import ImportModal from './ImportModal'

const STATUSES = ['online', 'offline', 'maintenance']
const COMMISSIONING = ['discovered', 'located', 'configured', 'tested', 'commissioned']

export default function LampadairesPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCom, setFilterCom] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [zoneModalOpen, setZoneModalOpen] = useState(false)
  const [newZone, setNewZone] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const load = () => {
    setLoading(true)
    getLampadaires()
      .then((r) => setData(Array.isArray(r) ? r : r?.lampadaires || []))
      .catch(() => {})
      .finally(() => { setLoading(false); setPicked(new Set()) })
  }
  useEffect(load, [])

  const filtered = data.filter((l) => {
    if (filterStatus && l.etat !== filterStatus) return false
    if (filterCom && l.commissioning_status !== filterCom) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.reference?.toLowerCase().includes(q) ||
        l.zone?.toLowerCase().includes(q) ||
        l.device_uid?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const toggleOne = (id) => setPicked((s) => {
    const next = new Set(s)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allSelected = filtered.length > 0 && picked.size === filtered.length
  const toggleAll = () => {
    if (allSelected) setPicked(new Set())
    else setPicked(new Set(filtered.map((l) => l.id)))
  }

  const handleArchive = async () => {
    if (picked.size === 0) return
    if (!confirm(`Archiver ${picked.size} lampadaire(s) ?`)) return
    setBulkBusy(true)
    try {
      const res = await bulkArchiveLampadaires([...picked])
      toast.success(`${res?.archived ?? 0} archivé(s)`)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBulkBusy(false)
    }
  }

  const handleZoneUpdate = async () => {
    const zone = newZone.trim()
    if (!zone) { toast.error('Zone obligatoire'); return }
    setBulkBusy(true)
    try {
      const res = await bulkUpdateLampadaires([...picked], { zone })
      toast.success(`${res?.updated ?? 0} mis à jour`)
      setZoneModalOpen(false)
      setNewZone('')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBulkBusy(false)
    }
  }

  const handleExport = () => {
    exportLampadaires({
      ...(filterStatus && { etat: filterStatus }),
    })
    toast.success('Export CSV lancé')
  }

  const columns = [
    {
      key: '__select__',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 accent-brand-500"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      className: 'w-10',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={picked.has(row.id)}
          onChange={() => toggleOne(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-brand-500"
        />
      ),
    },
    { key: 'reference', label: 'Référence', render: (v) => <span className="font-mono text-[12px] font-medium text-[var(--text)]">{v}</span> },
    { key: 'zone', label: 'Zone' },
    {
      key: 'etat', label: 'État',
      render: (v) => {
        const c = statusColor(v)
        return <Badge label={labelStatus(v)} bg={c.bg} text={c.text} dot={c.dot} />
      }
    },
    {
      key: 'intensite', label: 'Intensité',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${v ?? 0}%` }} />
          </div>
          <span className="text-[12px] text-[var(--text-muted)]">{v ?? 0}%</span>
        </div>
      )
    },
    {
      key: 'commissioning_status', label: 'Mise en service',
      render: (v) => {
        const c = commissioningColor(v)
        return <Badge label={labelCommissioning(v)} bg={c.bg} text={c.text} />
      }
    },
    {
      key: 'type_driver', label: 'Driver',
      render: (v) => v ? <span className="text-[12px] font-mono text-[var(--text-muted)]">{v}</span> : '—'
    },
    {
      key: 'has_critical_alert', label: 'Alerte',
      render: (v) => v ? <span className="text-[11px] text-red-500 font-semibold">⚠ Critique</span> : null
    },
  ]

  return (
    <div className="space-y-5 pb-20">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, zone…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Tous les états</option>
          {STATUSES.map((s) => <option key={s} value={s}>{labelStatus(s)}</option>)}
        </select>
        <select
          value={filterCom}
          onChange={(e) => setFilterCom(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Toutes les phases</option>
          {COMMISSIONING.map((s) => <option key={s} value={s}>{labelCommissioning(s)}</option>)}
        </select>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={13} /> Exporter CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          <Upload size={13} /> Importer CSV
        </Button>
        <span className="text-[12px] text-[var(--text-muted)]">{filtered.length} / {data.length}</span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={setSelected}
        emptyText="Aucun lampadaire trouvé"
      />

      {/* Detail sheet */}
      {selected && (
        <LampadaireDetail
          lamp={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setData((d) => d.map((l) => (l.id === updated.id ? updated : l)))
            setSelected(updated)
          }}
        />
      )}

      {/* Bulk action bar */}
      <BulkActionBar count={picked.size} onClear={() => setPicked(new Set())}>
        <Button size="sm" variant="secondary" loading={bulkBusy} onClick={() => setZoneModalOpen(true)}>
          <MapPin size={13} /> Changer zone
        </Button>
        <Button size="sm" variant="danger" loading={bulkBusy} onClick={handleArchive}>
          <Archive size={13} /> Archiver
        </Button>
      </BulkActionBar>

      {/* CSV import modal */}
      <ImportModal
        open={importOpen}
        onClose={() => { setImportOpen(false); load() }}
      />

      {/* Zone update modal */}
      <Modal open={zoneModalOpen} onClose={() => setZoneModalOpen(false)} title={`Changer la zone de ${picked.size} lampadaire(s)`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">
              Nouvelle zone
            </label>
            <input
              type="text"
              value={newZone}
              onChange={(e) => setNewZone(e.target.value)}
              placeholder="ex: Zone Nord"
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setZoneModalOpen(false)}>Annuler</Button>
            <Button loading={bulkBusy} onClick={handleZoneUpdate}>Appliquer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
