import { useEffect, useRef, useState } from 'react'
import {
  CheckSquare, ChevronRight, Play, CheckCheck,
  RefreshCw, AlertTriangle, Filter, Radio,
  MapPin, Layers, X, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getLampadaires } from '../../api/lampadaires'
import { getLCUs } from '../../api/lcus'
import {
  batchTestCommissioning, validateSuccessful, retryFailed,
  failCommissioning,
} from '../../api/admin'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { commissioningColor, labelCommissioning, cn } from '../../utils/helpers'

const STEPS = ['discovered', 'located', 'configured', 'tested', 'commissioned']
const STEP_IDX = Object.fromEntries(STEPS.map((s, i) => [s, i]))

/* status dot colour */
const reasonColor = (status) => {
  if (status === 'tested')       return 'text-green-500 bg-green-500/10 border-green-500/20'
  if (status === 'failed')       return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (status === 'commissioned') return 'text-brand-500 bg-brand-500/10 border-brand-500/20'
  if (status === 'configured')   return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  return 'text-[var(--text-muted)] bg-[var(--surface-2)] border-[var(--border)]'
}

/* ── Batch result summary card ── */
function SummaryCard({ summary, onDismiss }) {
  if (!summary) return null
  const items = [
    { label: 'Total testés',           value: summary.tested,              color: 'text-[var(--text)]' },
    { label: 'Réussis',                value: summary.passed,              color: 'text-green-500' },
    { label: 'Échecs',                 value: summary.failed,              color: 'text-red-400' },
    { label: 'À localiser',            value: summary.pending_location,    color: 'text-amber-400' },
    { label: 'Prêts à commissionner',  value: summary.commissioned_ready,  color: 'text-brand-500' },
  ]
  return (
    <div className="relative rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
      <button onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors">
        <X size={14} />
      </button>
      <p className="font-bold text-[13px] text-[var(--text)] mb-4 flex items-center gap-2">
        <CheckCheck size={15} className="text-brand-500" />
        Résultat du test batch
      </p>
      <div className="grid grid-cols-5 gap-3">
        {items.map((it) => (
          <div key={it.label} className="bg-[var(--surface)] rounded-xl p-3 text-center border border-[var(--border)]">
            <p className={cn('text-[22px] font-bold leading-tight', it.color)}>{it.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CommissioningPage() {
  const [lamps,      setLamps]      = useState([])
  const [lcus,       setLCUs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [batchBusy,  setBatchBusy]  = useState(null)   // which batch action is running
  const [summary,    setSummary]    = useState(null)    // last batch result
  const [selected,   setSelected]   = useState(new Set()) // selected lamp IDs
  const [filterMode, setFilterMode] = useState('pending') // 'pending' | 'failed' | 'all'
  const [filterLCU,  setFilterLCU]  = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [lcuPickerOpen,  setLcuPickerOpen]  = useState(false)
  const [zonePicker, setZonePicker] = useState(false)
  const firstLoad = useRef(true)

  const load = () => {
    if (firstLoad.current) setLoading(true)
    Promise.all([
      getLampadaires().catch(() => []),
      getLCUs().catch(() => []),
    ]).then(([lampData, lcuData]) => {
      setLamps(Array.isArray(lampData) ? lampData : lampData?.lampadaires || [])
      setLCUs(Array.isArray(lcuData) ? lcuData : lcuData?.lcus || [])
    }).finally(() => { setLoading(false); firstLoad.current = false })
  }
  useEffect(load, [])

  /* ── derived data ── */
  const commissioned = lamps.filter((l) => l.commissioning_status === 'commissioned')
  const pending      = lamps.filter((l) => l.commissioning_status !== 'commissioned')
  const failed       = lamps.filter((l) => l.commissioning_status === 'failed')
  const tested       = lamps.filter((l) => l.commissioning_status === 'tested')
  const progress     = lamps.length > 0 ? (commissioned.length / lamps.length) * 100 : 0
  const zones        = [...new Set(lamps.map((l) => l.zone).filter(Boolean))].sort()

  /* filtered list for the table */
  const visible = lamps.filter((l) => {
    if (filterMode === 'pending' && l.commissioning_status === 'commissioned') return false
    if (filterMode === 'failed'  && l.commissioning_status !== 'failed')       return false
    if (filterLCU  && String(l.lcu_id) !== filterLCU)  return false
    if (filterZone && l.zone !== filterZone)            return false
    return true
  })

  /* ── selection helpers ── */
  const toggleSelect = (id) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const selectAll  = () => setSelected(new Set(visible.map((l) => l.id)))
  const clearSel   = () => setSelected(new Set())
  const allChecked = visible.length > 0 && visible.every((l) => selected.has(l.id))

  /* ── batch actions ── */
  const runBatch = async (scope, extra = {}) => {
    setBatchBusy(scope)
    setSummary(null)
    try {
      const body = { scope, ...extra }
      if (scope === 'selected') body.ids = [...selected]
      const res = await batchTestCommissioning(body)
      const data = res?.data ?? res
      setSummary(data)
      toast.success(`Test terminé — ${data.passed} réussis, ${data.failed} échecs`)
      clearSel()
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message)
    } finally {
      setBatchBusy(null)
    }
  }

  const runValidate = async () => {
    setBatchBusy('validate')
    try {
      const res = await validateSuccessful()
      const n = (res?.data ?? res)?.commissioned ?? 0
      toast.success(`${n} lampadaire(s) commissionnés`)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBatchBusy(null)
    }
  }

  const runRetry = async () => {
    setBatchBusy('retry')
    try {
      const res = await retryFailed()
      const n = (res?.data ?? res)?.retried ?? 0
      toast.success(`${n} lampadaire(s) remis en file`)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBatchBusy(null)
    }
  }

  const runFail = async (id) => {
    try {
      await failCommissioning(id)
      toast.success('Marqué en échec')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">

      {/* ── Progress overview ── */}
      <Card>
        <CardHeader
          title="Mise en service"
          subtitle={`${commissioned.length} / ${lamps.length} lampadaires commissionnés`}
        />
        <div className="w-full h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-6 gap-2">
          {[...STEPS, 'failed'].map((s) => {
            const count = lamps.filter((l) => l.commissioning_status === s).length
            const col = commissioningColor(s)
            return (
              <div key={s}
                className="text-center bg-[var(--surface-2)] rounded-xl p-2.5 border border-[var(--border)] cursor-pointer hover:border-brand-500/30 transition-colors"
                onClick={() => setFilterMode(s === 'commissioned' ? 'all' : s === 'failed' ? 'failed' : 'pending')}>
                <p className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block', col.bg, col.text)}>
                  {labelCommissioning(s)}
                </p>
                <p className="font-bold text-[20px] text-[var(--text)] mt-1">{count}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Batch action toolbar ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Actions batch
        </p>
        <div className="flex flex-wrap gap-2">

          {/* Tester tous */}
          <Button size="sm" loading={batchBusy === 'all'} onClick={() => runBatch('all')}
            disabled={!!batchBusy}>
            <Play size={12} /> Tester tous ({pending.length})
          </Button>

          {/* Tester par LCU — dropdown */}
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setLcuPickerOpen((v) => !v)}
              disabled={!!batchBusy}>
              <Radio size={12} /> Tester par LCU <ChevronDown size={11} />
            </Button>
            {lcuPickerOpen && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl min-w-[200px] py-1 max-h-52 overflow-y-auto">
                {lcus.map((lcu) => (
                  <button key={lcu.id}
                    className="w-full text-left px-3 py-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                    onClick={() => { setLcuPickerOpen(false); runBatch('lcu', { lcu_id: lcu.id }) }}>
                    <span className="font-mono font-medium">{lcu.reference}</span>
                    {lcu.zone && <span className="text-[var(--text-muted)] ml-2">{lcu.zone}</span>}
                  </button>
                ))}
                {lcus.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-[var(--text-muted)]">Aucune LCU</p>
                )}
              </div>
            )}
          </div>

          {/* Tester par zone — dropdown */}
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setZonePicker((v) => !v)}
              disabled={!!batchBusy}>
              <MapPin size={12} /> Tester par zone <ChevronDown size={11} />
            </Button>
            {zonePicker && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl min-w-[160px] py-1 max-h-52 overflow-y-auto">
                {zones.map((z) => (
                  <button key={z}
                    className="w-full text-left px-3 py-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                    onClick={() => { setZonePicker(false); runBatch('zone', { zone: z }) }}>
                    {z}
                  </button>
                ))}
                {zones.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-[var(--text-muted)]">Aucune zone</p>
                )}
              </div>
            )}
          </div>

          {/* Tester la sélection */}
          {selected.size > 0 && (
            <Button size="sm" variant="secondary" loading={batchBusy === 'selected'}
              onClick={() => runBatch('selected')} disabled={!!batchBusy}>
              <Layers size={12} /> Tester la sélection ({selected.size})
            </Button>
          )}

          {/* Separator */}
          <div className="w-px bg-[var(--border)] mx-1 self-stretch" />

          {/* Valider les réussis */}
          <Button size="sm" variant="secondary" loading={batchBusy === 'validate'}
            onClick={runValidate} disabled={!!batchBusy || tested.length === 0}
            className={tested.length > 0 ? 'border-green-500/40 text-green-500 hover:bg-green-500/10' : ''}>
            <CheckCheck size={12} /> Valider les réussis ({tested.length})
          </Button>

          {/* Relancer les échecs */}
          <Button size="sm" variant="secondary" loading={batchBusy === 'retry'}
            onClick={runRetry} disabled={!!batchBusy || failed.length === 0}
            className={failed.length > 0 ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' : ''}>
            <RefreshCw size={12} /> Relancer les échecs ({failed.length})
          </Button>

          {/* Filter toggle */}
          <div className="ml-auto flex gap-1">
            {[
              { key: 'pending', label: 'En attente' },
              { key: 'failed',  label: 'Échecs' },
              { key: 'all',     label: 'Tous' },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilterMode(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-colors',
                  filterMode === f.key
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-500'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                )}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filters: LCU + Zone */}
        <div className="flex gap-3 mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-muted)]">LCU :</span>
            <select value={filterLCU} onChange={(e) => setFilterLCU(e.target.value)}
              className="px-2.5 py-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-brand-500/30">
              <option value="">Toutes</option>
              {lcus.map((l) => <option key={l.id} value={String(l.id)}>{l.reference}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-muted)]">Zone :</span>
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
              className="px-2.5 py-1 text-[12px] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-brand-500/30">
              <option value="">Toutes</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          {(filterLCU || filterZone) && (
            <button onClick={() => { setFilterLCU(''); setFilterZone('') }}
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-red-400 transition-colors">
              <X size={11} /> Réinitialiser
            </button>
          )}
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">{visible.length} lampadaire(s)</span>
        </div>
      </div>

      {/* ── Batch test result summary ── */}
      <SummaryCard summary={summary} onDismiss={() => setSummary(null)} />

      {/* ── Lamp list ── */}
      {visible.length === 0 ? (
        <EmptyState icon={CheckSquare}
          title={filterMode === 'failed' ? 'Aucun échec' : 'Tout est commissionné !'}
          description={filterMode === 'failed' ? 'Aucun lampadaire en échec.' : 'Tous les lampadaires ont été mis en service.'} />
      ) : (
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-2)] border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <input type="checkbox" checked={allChecked}
              onChange={() => allChecked ? clearSel() : selectAll()}
              className="w-3.5 h-3.5 accent-brand-500 cursor-pointer shrink-0" />
            <span className="w-28 shrink-0">Référence</span>
            <span className="w-20 shrink-0">Zone</span>
            <span className="w-24 shrink-0">LCU</span>
            <span className="w-32 shrink-0">Contrôleur</span>
            <span className="w-24 shrink-0">Phase</span>
            <span className="flex-1">Statut / Raison</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {visible.map((lamp) => {
              const stepIdx = STEP_IDX[lamp.commissioning_status] ?? 0
              const col     = commissioningColor(lamp.commissioning_status)
              const lcu     = lcus.find((l) => l.id === lamp.lcu_id)
              const reason  = lamp.commissioning_notes || defaultReason(lamp.commissioning_status)
              const isSel   = selected.has(lamp.id)

              return (
                <div key={lamp.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-[12px] transition-colors',
                    isSel ? 'bg-brand-500/5' : 'bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                  )}>
                  <input type="checkbox" checked={isSel} onChange={() => toggleSelect(lamp.id)}
                    className="w-3.5 h-3.5 accent-brand-500 cursor-pointer shrink-0" />

                  {/* Reference */}
                  <span className="w-28 shrink-0 font-mono font-bold text-[var(--text)] truncate">{lamp.reference}</span>

                  {/* Zone */}
                  <span className="w-20 shrink-0 text-[var(--text-muted)] truncate">{lamp.zone || '—'}</span>

                  {/* LCU */}
                  <span className="w-24 shrink-0 text-brand-500 font-mono text-[11px] truncate">
                    {lcu?.reference || (lamp.lcu_id ? `#${lamp.lcu_id}` : '—')}
                  </span>

                  {/* Controller type */}
                  <span className="w-32 shrink-0 text-[var(--text-muted)] text-[11px] truncate">
                    {lamp.controller_type || '—'}
                  </span>

                  {/* Phase — step progress dots */}
                  <div className="w-24 shrink-0 flex items-center gap-0.5">
                    {STEPS.filter(s => s !== 'commissioned').map((s, i) => (
                      <div key={s} className={cn('w-3 h-3 rounded-full',
                        i < stepIdx ? 'bg-brand-500' :
                        i === stepIdx ? 'bg-brand-500/40 ring-1 ring-brand-500' :
                        'bg-[var(--border)]'
                      )} title={labelCommissioning(s)} />
                    ))}
                  </div>

                  {/* Status / reason */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Badge label={labelCommissioning(lamp.commissioning_status)}
                      bg={col.bg} text={col.text} dot={col.dot} />
                    {reason && (
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full border font-medium truncate',
                        reasonColor(lamp.commissioning_status)
                      )}>
                        {reason}
                      </span>
                    )}
                  </div>

                  {/* Actions — only for failed or manually manageable cases */}
                  <div className="w-20 shrink-0 flex justify-end">
                    {lamp.commissioning_status === 'failed' && (
                      <button
                        onClick={() => runFail(lamp.id)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors px-1.5 py-1 rounded"
                        title="Réinitialiser cet échec">
                        <RefreshCw size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(lcuPickerOpen || zonePicker) && (
        <div className="fixed inset-0 z-10"
          onClick={() => { setLcuPickerOpen(false); setZonePicker(false) }} />
      )}
    </div>
  )
}

function defaultReason(status) {
  const map = {
    discovered:   'En attente de localisation',
    located:      'Données contrôleur manquantes',
    configured:   'Test requis',
    tested:       'Prêt à commissionner',
    commissioned: 'Mis en service',
    failed:       'Échec du commissioning',
  }
  return map[status] || ''
}
