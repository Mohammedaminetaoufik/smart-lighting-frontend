import { useEffect, useState } from 'react'
import { Plus, TestTube, RefreshCw, Radio } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLCUs, createLCU, testLCU, syncLCU, getLCULampadaires } from '../../api/lcus'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner, { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { statusColor, labelStatus, timeAgo, cn } from '../../utils/helpers'

const INITIAL = { reference: '', name: '', ip_address: '', port: 8080, protocol: 'HTTP', zone: '' }

export default function LCUsPage() {
  const [lcus, setLCUs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)

  const load = () => {
    setLoading(true)
    getLCUs()
      .then((r) => setLCUs(Array.isArray(r) ? r : r?.lcus || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createLCU(form)
      toast.success('LCU créée')
      setModal(false)
      setForm(INITIAL)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const doAction = (fn, id, msg) => async () => {
    setBusy(id)
    try {
      await fn(id)
      toast.success(msg)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const columns = [
    { key: 'reference', label: 'Référence', render: (v) => <span className="font-mono text-[12px] font-medium">{v}</span> },
    { key: 'name', label: 'Nom' },
    { key: 'ip_address', label: 'IP', render: (v, row) => <span className="font-mono text-[12px]">{v}:{row.port}</span> },
    { key: 'zone', label: 'Zone' },
    { key: 'protocol', label: 'Protocole', render: (v) => <span className="text-[12px] font-medium text-brand-500">{v}</span> },
    {
      key: 'status', label: 'État',
      render: (v) => { const c = statusColor(v); return <Badge label={labelStatus(v)} bg={c.bg} text={c.text} dot={c.dot} /> }
    },
    { key: 'last_seen_at', label: 'Vu il y a', render: (v) => timeAgo(v) },
    {
      key: 'id', label: 'Actions',
      render: (id) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" loading={busy === id} onClick={doAction(testLCU, id, 'Test envoyé')}>
            <TestTube size={12} /> Test
          </Button>
          <Button size="sm" variant="ghost" loading={busy === id} onClick={doAction(syncLCU, id, 'Sync lancée')}>
            <RefreshCw size={12} /> Sync
          </Button>
        </div>
      )
    },
  ]

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus size={14} /> Nouvelle LCU
        </Button>
      </div>

      {lcus.length === 0 ? (
        <EmptyState icon={Radio} title="Aucune LCU configurée" description="Ajoutez une passerelle pour commencer." action={<Button onClick={() => setModal(true)}>Ajouter</Button>} />
      ) : (
        <Table columns={columns} data={lcus} renderExpandableRow={(row) => <LCULampadairesList lcuId={row.id} />} />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle LCU / Passerelle">
        <form onSubmit={handleCreate} className="space-y-4">
          {[
            { label: 'Référence *', name: 'reference', required: true },
            { label: 'Nom', name: 'name' },
            { label: 'Adresse IP *', name: 'ip_address', required: true },
            { label: 'Port', name: 'port', type: 'number' },
            { label: 'Zone', name: 'zone' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                required={f.required}
                value={form[f.name]}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          ))}
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Protocole</label>
            <select
              value={form.protocol}
              onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {['HTTP', 'MQTT', 'LoRaWAN'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function LCULampadairesList({ lcuId }) {
  const [lamps, setLamps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLCULampadaires(lcuId)
      .then((r) => setLamps(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lcuId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="sm" className="text-brand-500" />
        <span className="text-[12px] text-[var(--text-muted)] ml-2">Chargement des lampadaires...</span>
      </div>
    )
  }

  if (lamps.length === 0) {
    return (
      <div className="text-center py-4 text-[12px] text-[var(--text-muted)]">
        Aucun lampadaire associé à cette LCU.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 max-h-[300px]">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/80 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <th className="px-4 py-2">Référence</th>
            <th className="px-4 py-2">UID Appareil</th>
            <th className="px-4 py-2">Zone</th>
            <th className="px-4 py-2">Puissance</th>
            <th className="px-4 py-2">Intensité</th>
            <th className="px-4 py-2">Protocole</th>
            <th className="px-4 py-2">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {lamps.map((lamp) => {
            const c = statusColor(lamp.etat)
            return (
              <tr key={lamp.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                <td className="px-4 py-2 font-mono font-medium text-[var(--text)]">{lamp.reference}</td>
                <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{lamp.device_uid || '—'}</td>
                <td className="px-4 py-2 text-[var(--text-muted)]">{lamp.zone || '—'}</td>
                <td className="px-4 py-2 text-[var(--text)]">{lamp.puissance} W</td>
                <td className="px-4 py-2 text-[var(--text)]">{lamp.intensite}%</td>
                <td className="px-4 py-2 text-brand-500 font-medium">{lamp.protocole}</td>
                <td className="px-4 py-2">
                  <Badge label={labelStatus(lamp.etat)} bg={c.bg} text={c.text} dot={c.dot} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
