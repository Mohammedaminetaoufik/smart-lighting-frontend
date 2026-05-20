import { useEffect, useState } from 'react'
import { CheckSquare, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLampadaires } from '../../api/lampadaires'
import { advanceCommissioning, testCommCom, testDimmingCom, validateCommissioning, failCommissioning } from '../../api/admin'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { commissioningColor, labelCommissioning, cn } from '../../utils/helpers'

const STEPS = ['discovered', 'located', 'configured', 'tested', 'commissioned']
const STEP_IDX = Object.fromEntries(STEPS.map((s, i) => [s, i]))

export default function CommissioningPage() {
  const [lamps, setLamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    getLampadaires()
      .then((r) => setLamps(Array.isArray(r) ? r : r?.lampadaires || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const pending = lamps.filter((l) => l.commissioning_status !== 'commissioned')
  const commissioned = lamps.filter((l) => l.commissioning_status === 'commissioned')
  const progress = lamps.length > 0 ? (commissioned.length / lamps.length) * 100 : 0

  const filtered = pending.filter((l) => !filter || l.commissioning_status === filter)

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

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <Card>
        <CardHeader title="Progression de mise en service" subtitle={`${commissioned.length} / ${lamps.length} lampadaires commissionnés`} />
        <div className="w-full h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((s) => {
            const count = lamps.filter((l) => l.commissioning_status === s).length
            const col = commissioningColor(s)
            return (
              <div key={s} className="text-center">
                <p className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', col.bg, col.text)}>{labelCommissioning(s)}</p>
                <p className="font-bold text-[16px] text-[var(--text)] mt-1">{count}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Toutes les phases</option>
          {STEPS.filter((s) => s !== 'commissioned').map((s) => (
            <option key={s} value={s}>{labelCommissioning(s)}</option>
          ))}
        </select>
        <span className="text-[12px] text-[var(--text-muted)]">{filtered.length} en attente</span>
      </div>

      {/* Lamp list */}
      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Tout est commissionné !" description="Tous les lampadaires ont été mis en service." />
      ) : (
        <div className="space-y-3">
          {filtered.map((lamp) => {
            const stepIdx = STEP_IDX[lamp.commissioning_status] ?? 0
            const col = commissioningColor(lamp.commissioning_status)
            return (
              <Card key={lamp.id} padding={false}>
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-[13px] text-[var(--text)]">{lamp.reference}</span>
                      <Badge label={labelCommissioning(lamp.commissioning_status)} bg={col.bg} text={col.text} />
                      <span className="text-[11px] text-[var(--text-muted)]">{lamp.zone}</span>
                    </div>
                    {/* Step bar */}
                    <div className="flex items-center gap-1">
                      {STEPS.map((s, i) => (
                        <div key={s} className="flex items-center gap-1">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold',
                            i < stepIdx ? 'bg-brand-500 text-white' :
                            i === stepIdx ? 'bg-brand-500/20 text-brand-500 ring-2 ring-brand-500' :
                            'bg-[var(--surface-2)] text-[var(--text-muted)]'
                          )}>
                            {i < stepIdx ? '✓' : i + 1}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={cn('h-0.5 w-6', i < stepIdx ? 'bg-brand-500' : 'bg-[var(--border)]')} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {lamp.commissioning_status === 'configured' && (
                      <>
                        <Button size="sm" variant="secondary" loading={busy === lamp.id} onClick={doAction(testCommCom, lamp.id, 'Test communication lancé')}>Test comm.</Button>
                        <Button size="sm" variant="secondary" loading={busy === lamp.id} onClick={doAction(testDimmingCom, lamp.id, 'Test dimming lancé')}>Test dim.</Button>
                      </>
                    )}
                    {['located', 'configured', 'tested'].includes(lamp.commissioning_status) && (
                      <Button size="sm" loading={busy === lamp.id} onClick={doAction(advanceCommissioning, lamp.id, 'Étape avancée')}>
                        Avancer <ChevronRight size={12} />
                      </Button>
                    )}
                    {lamp.commissioning_status === 'tested' && (
                      <Button size="sm" loading={busy === lamp.id} onClick={doAction(validateCommissioning, lamp.id, 'Lampadaire validé !')}>
                        ✓ Valider
                      </Button>
                    )}
                    <Button size="sm" variant="danger" loading={busy === lamp.id} onClick={doAction(failCommissioning, lamp.id, 'Marqué en échec')}>
                      Échec
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
