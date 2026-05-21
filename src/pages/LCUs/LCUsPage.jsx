import { useEffect, useState } from 'react'
import { Plus, TestTube, RefreshCw, Radio, X, Edit2, Save, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLCUs, getLCU, createLCU, updateLCU, testLCU, syncLCU, getLCULampadaires } from '../../api/lcus'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner, { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { statusColor, labelStatus, timeAgo, cn } from '../../utils/helpers'

const INITIAL = { reference: '', name: '', ip_address: '', port: 8080, protocol: 'HTTP', zone: '' }

const inputCls = 'w-full px-3 py-2.5 text-[13px] bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   LCU DETAIL / EDIT PANEL
───────────────────────────────────────────────────────────── */
function LCUDetailPanel({ lcuId, onClose, onUpdated, onAction }) {
  const [lcu,      setLcu]      = useState(null)
  const [lamps,    setLamps]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form,     setForm]     = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [busy,     setBusy]     = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      getLCU(lcuId),
      getLCULampadaires(lcuId).catch(() => []),
    ]).then(([lcuData, lampData]) => {
      const l = lcuData?.data ?? lcuData
      setLcu(l)
      setForm({
        reference:  l.reference  || '',
        name:       l.name       || '',
        ip_address: l.ip_address || '',
        port:       l.port       || 8080,
        protocol:   l.protocol   || 'HTTP',
        zone:       l.zone       || '',
        address:    l.address    || '',
      })
      setLamps(Array.isArray(lampData) ? lampData : lampData?.data || [])
    }).catch(() => toast.error('Impossible de charger la LCU'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setEditMode(false)
    load()
  }, [lcuId]) // eslint-disable-line

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.reference.trim() || !form.ip_address.trim()) {
      toast.error('Référence et adresse IP requises')
      return
    }
    setSaving(true)
    try {
      await updateLCU(lcuId, { ...form, port: Number(form.port) })
      toast.success('LCU mise à jour')
      setEditMode(false)
      load()
      onUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  const doAction = (fn, label) => async () => {
    setBusy(label)
    try {
      await fn(lcuId)
      toast.success(`${label} effectué`)
      load()
      onAction?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  const sc = lcu ? statusColor(lcu.status) : {}
  const onlineCnt = lamps.filter((l) => l.etat === 'online').length

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><PageLoader /></div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-start gap-3 px-6 py-4 border-b border-[var(--border)] shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[18px] text-[var(--text)] truncate">{lcu.reference}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge label={labelStatus(lcu.status)} bg={sc.bg} text={sc.text} dot={sc.dot} />
                  {lcu.zone && (
                    <span className="text-[11px] text-[var(--text-muted)]">{lcu.zone}</span>
                  )}
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">{lcu.ip_address}:{lcu.port}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={cn(
                    'p-2 rounded-xl border text-[12px] font-medium transition-all',
                    editMode
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-500'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  )}>
                  <Edit2 size={13} />
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition-all">
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">

              {/* Actions */}
              <div className="px-6 pt-4 flex gap-2">
                <button onClick={doAction(testLCU, 'Test')} disabled={!!busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all disabled:opacity-50">
                  {busy === 'Test'
                    ? <Spinner size="sm" />
                    : <TestTube size={14} />}
                  Test
                </button>
                <button onClick={doAction(syncLCU, 'Sync')} disabled={!!busy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all disabled:opacity-50">
                  {busy === 'Sync'
                    ? <Spinner size="sm" />
                    : <RefreshCw size={14} />}
                  Synchroniser
                </button>
              </div>

              {/* Edit form */}
              {editMode && form ? (
                <form onSubmit={handleSave} className="px-6 pt-5 space-y-4 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Modification</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Référence *">
                      <input required value={form.reference}
                        onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                        className={inputCls} />
                    </Field>
                    <Field label="Nom">
                      <input value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="ex: Passerelle Centre"
                        className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Adresse IP *">
                      <input required value={form.ip_address}
                        onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                        placeholder="192.168.1.10"
                        className={inputCls} />
                    </Field>
                    <Field label="Port">
                      <input type="number" value={form.port}
                        onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                        className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Protocole">
                      <div className="relative">
                        <select value={form.protocol}
                          onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value }))}
                          className={inputCls + ' appearance-none pr-8 cursor-pointer'}>
                          {['HTTP', 'MQTT', 'LoRaWAN'].map((p) => <option key={p}>{p}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      </div>
                    </Field>
                    <Field label="Zone">
                      <input value={form.zone}
                        onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                        placeholder="ex: zone-a"
                        className={inputCls} />
                    </Field>
                  </div>

                  <Field label="Adresse physique">
                    <input value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="ex: Avenue Mohammed V"
                      className={inputCls} />
                  </Field>

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="secondary" onClick={() => setEditMode(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button type="submit" loading={saving} className="flex-1">
                      <Save size={13} /> Enregistrer
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── View mode ── */
                <div className="px-6 pt-5 space-y-5 pb-6">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Référence',    value: lcu.reference },
                      { label: 'Nom',          value: lcu.name || '—' },
                      { label: 'Adresse IP',   value: lcu.ip_address },
                      { label: 'Port',         value: lcu.port },
                      { label: 'Protocole',    value: lcu.protocol },
                      { label: 'Zone',         value: lcu.zone || '—' },
                      { label: 'Vu il y a',    value: timeAgo(lcu.last_seen_at) },
                      { label: 'Sync il y a',  value: timeAgo(lcu.last_sync_at) },
                    ].map((row) => (
                      <div key={row.label} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">{row.label}</p>
                        <p className="text-[13px] font-medium text-[var(--text)] mt-0.5 truncate">{row.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Lamps section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Lampadaires ({lamps.length})
                      </p>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-green-500">
                          <Wifi size={11} /> {onlineCnt} en ligne
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <WifiOff size={11} /> {lamps.length - onlineCnt} hors ligne
                        </span>
                      </div>
                    </div>

                    {lamps.length === 0 ? (
                      <p className="text-center text-[12px] text-[var(--text-muted)] py-6">
                        Aucun lampadaire synchronisé
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
                        {lamps.map((lamp) => {
                          const c = statusColor(lamp.etat)
                          return (
                            <div key={lamp.id}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[12px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                              <span className="font-mono font-medium text-[var(--text)] flex-1 truncate">{lamp.reference}</span>
                              <span className="text-[var(--text-muted)] shrink-0 hidden sm:block">{lamp.zone || '—'}</span>
                              <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0 w-8 text-right">{lamp.intensite}%</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function LCUsPage() {
  const [lcus,       setLCUs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(INITIAL)
  const [saving,     setSaving]     = useState(false)
  const [busy,       setBusy]       = useState(null)
  const [selectedId, setSelectedId] = useState(null)

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

  const doAction = (fn, id, msg) => async (e) => {
    e.stopPropagation()
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
    { key: 'name',      label: 'Nom' },
    { key: 'ip_address', label: 'IP', render: (v, row) => <span className="font-mono text-[12px]">{v}:{row.port}</span> },
    { key: 'zone',      label: 'Zone' },
    { key: 'protocol',  label: 'Protocole', render: (v) => <span className="text-[12px] font-medium text-brand-500">{v}</span> },
    {
      key: 'status', label: 'État',
      render: (v) => { const c = statusColor(v); return <Badge label={labelStatus(v)} bg={c.bg} text={c.text} dot={c.dot} /> }
    },
    { key: 'last_seen_at', label: 'Vu il y a', render: (v) => timeAgo(v) },
    {
      key: 'id', label: 'Actions',
      render: (id) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
        <EmptyState icon={Radio} title="Aucune LCU configurée"
          description="Ajoutez une passerelle pour commencer."
          action={<Button onClick={() => setModal(true)}>Ajouter</Button>} />
      ) : (
        <Table
          columns={columns}
          data={lcus}
          onRowClick={(row) => setSelectedId(row.id)}
          rowClassName={() => 'cursor-pointer hover:bg-[var(--surface-2)] transition-colors'}
          renderExpandableRow={(row) => <LCULampadairesList lcuId={row.id} />}
        />
      )}

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle LCU / Passerelle">
        <form onSubmit={handleCreate} className="space-y-4">
          {[
            { label: 'Référence *', name: 'reference', required: true },
            { label: 'Nom',         name: 'name' },
            { label: 'Adresse IP *', name: 'ip_address', required: true },
            { label: 'Port',        name: 'port', type: 'number' },
            { label: 'Zone',        name: 'zone' },
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
            <select value={form.protocol}
              onChange={(e) => setForm((p) => ({ ...p, protocol: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
              {['HTTP', 'MQTT', 'LoRaWAN'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit" loading={saving}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Detail / edit panel */}
      {selectedId != null && (
        <LCUDetailPanel
          lcuId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
          onAction={load}
        />
      )}
    </div>
  )
}

function LCULampadairesList({ lcuId }) {
  const [lamps, setLamps]   = useState([])
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
    return <div className="text-center py-4 text-[12px] text-[var(--text-muted)]">Aucun lampadaire associé à cette LCU.</div>
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
                <td className="px-4 py-2"><Badge label={labelStatus(lamp.etat)} bg={c.bg} text={c.text} dot={c.dot} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
