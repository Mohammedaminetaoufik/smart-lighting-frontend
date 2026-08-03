import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, ChevronRight, Play, CheckCheck,
  RefreshCw, AlertTriangle, Filter, Radio,
  MapPin, Layers, X, ChevronDown, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getLampadaires } from '../../api/lampadaires'
import { getLCUs } from '../../api/lcus'
import {
  batchTestCommissioning, validateSuccessful, retryFailed,
} from '../../api/admin'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import AIPageInsights from '../../components/ai/AIPageInsights'
import { commissioningColor, labelCommissioning, cn } from '../../utils/helpers'

const STEPS = ['discovered', 'located', 'configured', 'tested', 'commissioned']

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
  const navigate = useNavigate()
  const [lamps,      setLamps]      = useState([])
  const [lcus,       setLCUs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [batchBusy,  setBatchBusy]  = useState(null)   // which batch action is running
  const [summary,    setSummary]    = useState(null)    // last batch result
  const [selected,   setSelected]   = useState(new Set()) // selected lamp IDs
  const [filterMode, setFilterMode] = useState('pending') // pending | failed | commissioned | all
  const [filterStage, setFilterStage] = useState('')
  const [filterLCU,  setFilterLCU]  = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [search,     setSearch]     = useState('')
  const [lcuPickerOpen,  setLcuPickerOpen]  = useState(false)
  const [zonePicker, setZonePicker] = useState(false)
  const firstLoad = useRef(true)
  const listRef = useRef(null)

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
  const awaiting     = lamps.filter((l) => !['commissioned', 'failed'].includes(l.commissioning_status))
  const remaining    = lamps.filter((l) => l.commissioning_status !== 'commissioned')
  const failed       = lamps.filter((l) => l.commissioning_status === 'failed')
  const tested       = lamps.filter((l) => l.commissioning_status === 'tested')
  const progress     = lamps.length > 0 ? (commissioned.length / lamps.length) * 100 : 0
  const progressLabel = Math.round(progress)
  const zones        = [...new Set(lamps.map((l) => l.zone).filter(Boolean))].sort()
  const countsByStage = Object.fromEntries(
    [...STEPS, 'failed'].map((status) => [status, lamps.filter((l) => l.commissioning_status === status).length])
  )

  const priority = lamps.length === 0
    ? {
        tone: 'blue',
        title: 'Aucun lampadaire à mettre en service',
        description: 'Ajoutez ou synchronisez des équipements pour démarrer le parcours de mise en service.',
        action: 'none',
      }
    : tested.length > 0
      ? {
        tone: 'green', status: 'tested',
        title: `${tested.length} lampadaire${tested.length > 1 ? 's sont' : ' est'} prêt${tested.length > 1 ? 's' : ''} à être mis en service`,
        description: 'Les tests de communication et de dimming ont réussi. Validez-les pour terminer leur mise en service.',
        action: 'validate', actionLabel: `Valider ${tested.length} réussite${tested.length > 1 ? 's' : ''}`,
      }
      : failed.length > 0
        ? {
          tone: 'red', status: 'failed',
          title: `${failed.length} échec${failed.length > 1 ? 's nécessitent' : ' nécessite'} une intervention`,
          description: 'Consultez la cause, corrigez le problème terrain puis relancez l’évaluation.',
          action: 'stage', actionLabel: 'Afficher les échecs',
        }
        : countsByStage.located > 0
          ? {
            tone: 'amber', status: 'located',
            title: `${countsByStage.located} lampadaire${countsByStage.located > 1 ? 's sont' : ' est'} bloqué${countsByStage.located > 1 ? 's' : ''} après la localisation`,
            description: 'Les données du contrôleur sont manquantes. Vérifiez puis synchronisez les passerelles LCU concernées.',
            action: 'stage', actionLabel: `Afficher les ${countsByStage.located} lampadaires`, showLCUs: true,
          }
          : countsByStage.discovered > 0
            ? {
              tone: 'amber', status: 'discovered',
              title: `${countsByStage.discovered} lampadaire${countsByStage.discovered > 1 ? 's attendent' : ' attend'} sa localisation`,
              description: 'Confirmez leur position GPS et leur association à une LCU avant de poursuivre.',
              action: 'stage', actionLabel: 'Afficher les lampadaires',
            }
            : countsByStage.configured > 0
              ? {
                tone: 'blue', status: 'configured',
                title: `${countsByStage.configured} lampadaire${countsByStage.configured > 1 ? 's doivent' : ' doit'} être testé${countsByStage.configured > 1 ? 's' : ''}`,
                description: 'Lancez leur évaluation pour contrôler la communication et le dimming.',
                action: 'stage', actionLabel: 'Afficher les lampadaires',
              }
              : {
                tone: 'green', status: 'commissioned',
                title: 'La mise en service est terminée',
                description: 'Tous les lampadaires ont franchi les étapes de configuration et de validation.',
                action: 'stage', actionLabel: 'Afficher les lampadaires en service',
              }

  /* filtered list for the table */
  const visible = lamps.filter((l) => {
    if (filterMode === 'pending' && ['commissioned', 'failed'].includes(l.commissioning_status)) return false
    if (filterMode === 'failed'  && l.commissioning_status !== 'failed')       return false
    if (filterMode === 'commissioned' && l.commissioning_status !== 'commissioned') return false
    if (filterStage && l.commissioning_status !== filterStage) return false
    if (filterLCU  && String(l.lcu_id) !== filterLCU)  return false
    if (filterZone && l.zone !== filterZone)            return false
    if (search.trim()) {
      const lcu = lcus.find((item) => item.id === l.lcu_id)
      const haystack = [l.reference, l.zone, lcu?.reference, l.controller_type, l.commissioning_notes]
        .filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(search.trim().toLowerCase())) return false
    }
    return true
  })

  const showStage = (status) => {
    setFilterStage(status)
    setFilterMode(status === 'failed' ? 'failed' : status === 'commissioned' ? 'commissioned' : 'pending')
    requestAnimationFrame(() => listRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
  }

  const changeMode = (mode) => {
    setFilterMode(mode)
    setFilterStage('')
  }

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
      if (scope === 'selected' && !body.ids) body.ids = [...selected]
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

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">

      {/* ── Progress overview: the five commissioning stages form one flow ── */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Progression globale"
          subtitle={`${commissioned.length} sur ${lamps.length} lampadaires mis en service · ${remaining.length} restant${remaining.length > 1 ? 's' : ''}`}
          action={(
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-[var(--text)]">{progressLabel}%</p>
              <p className="text-[10px] text-[var(--text-muted)]">terminé</p>
            </div>
          )}
        />
        <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mb-5" role="progressbar"
          aria-label="Progression de la mise en service" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressLabel}>
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((status, index) => {
            const count = countsByStage[status]
            const col = commissioningColor(status)
            const active = filterStage === status
            return (
              <button key={status} type="button" onClick={() => showStage(status)} aria-pressed={active}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  active
                    ? 'border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/20'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-brand-500/35 hover:bg-brand-500/5'
                )}>
                <span className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  count > 0 || status === 'commissioned' ? `${col.bg} ${col.text}` : 'bg-[var(--surface)] text-[var(--text-muted)]'
                )}>
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-[var(--text)]">{labelCommissioning(status)}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">{count} à cette étape</span>
                </span>
                <span className="text-xl font-bold tabular-nums text-[var(--text)]">{count}</span>
                {index < STEPS.length - 1 && (
                  <ChevronRight size={15} className="absolute -right-3 z-10 hidden text-[var(--text-muted)] lg:block" />
                )}
              </button>
            )
          })}
        </div>

        <button type="button" onClick={() => showStage('failed')}
          className={cn(
            'mt-3 flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors',
            failed.length > 0
              ? 'border-red-500/25 bg-red-500/5 hover:bg-red-500/10'
              : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-brand-500/30'
          )}>
          <span className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
            <AlertTriangle size={13} className={failed.length > 0 ? 'text-red-400' : ''} />
            Échecs hors parcours
          </span>
          <span className={cn('text-sm font-bold tabular-nums', failed.length > 0 ? 'text-red-400' : 'text-[var(--text)]')}>
            {failed.length}
          </span>
        </button>
      </Card>

      {/* ── The single most useful next action ── */}
      <div className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center',
        priority.tone === 'red' && 'border-red-500/25 bg-red-500/[0.06]',
        priority.tone === 'amber' && 'border-amber-500/25 bg-amber-500/[0.06]',
        priority.tone === 'green' && 'border-green-500/25 bg-green-500/[0.06]',
        priority.tone === 'blue' && 'border-blue-500/25 bg-blue-500/[0.06]',
      )}>
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          priority.tone === 'red' && 'border-red-500/25 bg-red-500/10 text-red-400',
          priority.tone === 'amber' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
          priority.tone === 'green' && 'border-green-500/25 bg-green-500/10 text-green-500',
          priority.tone === 'blue' && 'border-blue-500/25 bg-blue-500/10 text-blue-500',
        )}>
          {priority.tone === 'green' ? <CheckCheck size={19} /> : <AlertTriangle size={19} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Priorité actuelle</p>
          <h2 className="mt-1 text-[15px] font-semibold text-[var(--text)]">{priority.title}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">{priority.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {priority.showLCUs && (
            <Button size="sm" variant="secondary" onClick={() => navigate('/lcus')}>
              <Radio size={12} /> Ouvrir les LCU
            </Button>
          )}
          {priority.action !== 'none' && (
            <Button size="sm"
              loading={priority.action === 'validate' && batchBusy === 'validate'}
              disabled={!!batchBusy}
              onClick={() => priority.action === 'validate' ? runValidate() : showStage(priority.status)}>
              {priority.actionLabel} <ChevronRight size={12} />
            </Button>
          )}
        </div>
      </div>

      {/* AI help is now visible before the long list, collapsed by default. */}
      <AIPageInsights page="commissioning" title="Analyse IA de la mise en service" defaultExpanded={false} />

      {/* ── Batch action toolbar ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              Actions de mise en service
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Réévaluez les prérequis techniques pour tous les lampadaires ou un périmètre précis.
            </p>
          </div>
          {selected.size > 0 && (
            <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-500">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">

          {/* Tester tous */}
          {remaining.length > 0 ? (
            <Button size="sm" loading={batchBusy === 'all'} onClick={() => runBatch('all')}
              disabled={!!batchBusy}>
              <Play size={12} /> Évaluer les non commissionnés ({remaining.length})
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500">
              <CheckCheck size={12} /> Aucune action requise
            </span>
          )}

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

          {/* Valider les réussis */}
          {tested.length > 0 && (
            <Button size="sm" variant="secondary" loading={batchBusy === 'validate'}
              onClick={runValidate} disabled={!!batchBusy}
              className="border-green-500/40 text-green-500 hover:bg-green-500/10">
              <CheckCheck size={12} /> Valider les réussis ({tested.length})
            </Button>
          )}

          {/* Relancer les échecs */}
          {failed.length > 0 && (
            <Button size="sm" variant="secondary" loading={batchBusy === 'retry'}
              onClick={runRetry} disabled={!!batchBusy}
              className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
              <RefreshCw size={12} /> Relancer les échecs ({failed.length})
            </Button>
          )}
        </div>
      </div>

      {/* ── Batch test result stays attached to the action that produced it ── */}
      <SummaryCard summary={summary} onDismiss={() => setSummary(null)} />

      {/* ── List views and filters are separate from operational actions ── */}
      <div ref={listRef} className="scroll-mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)]">Lampadaires</h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Filtrez la liste par état ou par étape du parcours.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'pending', label: 'En attente', count: awaiting.length },
              { key: 'failed', label: 'Échecs', count: failed.length },
              { key: 'commissioned', label: 'En service', count: commissioned.length },
              { key: 'all', label: 'Tous', count: lamps.length },
            ].map((item) => (
              <button key={item.key} type="button" onClick={() => changeMode(item.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  filterMode === item.key && !filterStage
                    ? 'border-brand-500/40 bg-brand-500/15 text-brand-500'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                )}>
                {item.label} <span className="ml-1 tabular-nums opacity-70">{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto]">
          <label className="relative block">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une référence, une LCU, une zone…"
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/20" />
          </label>

          <label className="relative">
            <Filter size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select value={filterStage} onChange={(e) => e.target.value ? showStage(e.target.value) : setFilterStage('')}
              className="h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-8 text-[12px] text-[var(--text)] focus:border-brand-500/50 focus:outline-none">
              <option value="">Toutes les étapes</option>
              {STEPS.map((status) => <option key={status} value={status}>{labelCommissioning(status)}</option>)}
              <option value="failed">Échec</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          </label>

          <label className="relative">
            <Radio size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select value={filterLCU} onChange={(e) => setFilterLCU(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-8 text-[12px] text-[var(--text)] focus:border-brand-500/50 focus:outline-none">
              <option value="">Toutes les LCU</option>
              {lcus.map((l) => <option key={l.id} value={String(l.id)}>{l.reference}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          </label>

          <label className="relative">
            <MapPin size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-8 text-[12px] text-[var(--text)] focus:border-brand-500/50 focus:outline-none">
              <option value="">Toutes les zones</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          </label>

          <div className="flex h-9 items-center justify-between gap-3 md:col-span-2 xl:col-span-1">
            {(search || filterStage || filterLCU || filterZone) && (
              <button type="button" onClick={() => { setSearch(''); setFilterStage(''); setFilterLCU(''); setFilterZone('') }}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] transition-colors hover:text-red-400">
                <X size={11} /> Effacer
              </button>
            )}
            <span className="ml-auto whitespace-nowrap text-[11px] text-[var(--text-muted)]">{visible.length} résultat{visible.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ── Lamp list ── */}
      {visible.length === 0 ? (
        <EmptyState icon={CheckSquare}
          title={search || filterStage || filterLCU || filterZone ? 'Aucun résultat' : filterMode === 'failed' ? 'Aucun échec' : 'Aucun lampadaire dans cette vue'}
          description={search || filterStage || filterLCU || filterZone
            ? 'Modifiez ou effacez les filtres pour élargir la recherche.'
            : filterMode === 'failed' ? 'Aucun lampadaire en échec.' : 'Cette catégorie ne contient actuellement aucun lampadaire.'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <div className="min-w-[820px]">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <input type="checkbox" checked={allChecked} aria-label="Sélectionner tous les résultats"
                onChange={() => allChecked ? clearSel() : selectAll()}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-500" />
              <span className="w-28 shrink-0">Référence</span>
              <span className="w-44 shrink-0">Emplacement</span>
              <span className="w-36 shrink-0">Étape actuelle</span>
              <span className="flex-1">Blocage / prochaine action</span>
              <span className="w-28 shrink-0 text-right">Action</span>
            </div>

            <div className="divide-y divide-[var(--border)]">
            {visible.map((lamp) => {
              const col     = commissioningColor(lamp.commissioning_status)
              const lcu     = lcus.find((l) => l.id === lamp.lcu_id)
              const reason  = lamp.commissioning_notes || defaultReason(lamp.commissioning_status)
              const isSel   = selected.has(lamp.id)

              return (
                <div key={lamp.id}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 text-[12px] transition-colors',
                    isSel ? 'bg-brand-500/5' : 'bg-[var(--surface)] hover:bg-[var(--surface-2)]'
                  )}>
                  <input type="checkbox" checked={isSel} aria-label={`Sélectionner ${lamp.reference}`}
                    onChange={() => toggleSelect(lamp.id)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-brand-500" />

                  {/* Reference */}
                  <span className="w-28 shrink-0 font-mono font-bold text-[var(--text)] truncate">{lamp.reference}</span>

                  {/* Zone and LCU belong to the same mental model: location. */}
                  <div className="w-44 shrink-0 min-w-0">
                    <p className="truncate font-medium text-[var(--text)]">{lamp.zone || 'Zone non renseignée'}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-brand-500">
                      {lcu?.reference || (lamp.lcu_id ? `LCU #${lamp.lcu_id}` : 'Aucune LCU associée')}
                    </p>
                  </div>

                  {/* One explicit stage replaces the unexplained progress dots. */}
                  <div className="w-36 shrink-0">
                    <Badge label={labelCommissioning(lamp.commissioning_status)}
                      bg={col.bg} text={col.text} dot={col.dot} />
                  </div>

                  {/* Explain the blocker as prose; technical controller info is secondary. */}
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {lamp.commissioning_status === 'commissioned' || lamp.commissioning_status === 'tested'
                      ? <CheckCheck size={13} className="mt-0.5 shrink-0 text-green-500" />
                      : <AlertTriangle size={13} className={cn('mt-0.5 shrink-0', lamp.commissioning_status === 'failed' ? 'text-red-400' : 'text-amber-500')} />}
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[var(--text)]">{reason}</p>
                      {lamp.controller_type && (
                        <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">Contrôleur : {lamp.controller_type}</p>
                      )}
                    </div>
                  </div>

                  {/* Contextual row action. No misleading reset button. */}
                  <div className="flex w-28 shrink-0 justify-end">
                    {['located', 'failed'].includes(lamp.commissioning_status) && lcu ? (
                      <button type="button" onClick={() => navigate(`/lcus?id=${lcu.id}`)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:border-brand-500/40 hover:text-brand-500">
                        Voir la LCU
                      </button>
                    ) : ['discovered', 'configured'].includes(lamp.commissioning_status) ? (
                      <button type="button" disabled={!!batchBusy}
                        onClick={() => runBatch('selected', { ids: [lamp.id] })}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:border-brand-500/40 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40">
                        Réévaluer
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
            </div>
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
