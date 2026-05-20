import { useEffect, useState } from 'react'
import { FlaskConical, Play, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLampadaires } from '../../api/lampadaires'
import { simulateTelemetry, simulateAll, getScenarios, runScenario } from '../../api/simulator'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'

export default function SimulatorPage() {
  const [lamps, setLamps] = useState([])
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLamp, setSelectedLamp] = useState('')
  const [scenarioLamp, setScenarioLamp] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    Promise.all([
      getLampadaires().catch(() => []),
      getScenarios().catch(() => []),
    ]).then(([ls, sc]) => {
      setLamps(Array.isArray(ls) ? ls : ls?.lampadaires || [])
      setScenarios(Array.isArray(sc) ? sc : sc?.scenarios || [])
    }).finally(() => setLoading(false))
  }, [])

  const do_ = async (fn, key, msg) => {
    setBusy(key)
    try {
      const res = await fn()
      toast.success(msg + (res?.message ? ` — ${res.message}` : ''))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex gap-3">
        <FlaskConical size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800 dark:text-amber-300">
          Le simulateur génère des données de télémétrie fictives pour tester le comportement du système sans matériel réel.
        </p>
      </div>

      {/* Single lamp */}
      <Card>
        <CardHeader title="Simuler un lampadaire" subtitle="Génère une mesure de capteurs pour un seul équipement" />
        <div className="flex gap-3">
          <select
            value={selectedLamp}
            onChange={(e) => setSelectedLamp(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Sélectionner un lampadaire…</option>
            {lamps.map((l) => <option key={l.id} value={l.id}>{l.reference} — {l.zone || '—'}</option>)}
          </select>
          <Button
            disabled={!selectedLamp}
            loading={busy === 'single'}
            onClick={() => do_(() => simulateTelemetry(selectedLamp), 'single', 'Télémétrie simulée')}
          >
            <Play size={14} /> Simuler
          </Button>
        </div>
      </Card>

      {/* All lamps */}
      <Card>
        <CardHeader title="Simuler tous les lampadaires" subtitle={`Lance la simulation pour les ${lamps.length} lampadaires en une fois`} />
        <Button
          loading={busy === 'all'}
          onClick={() => do_(simulateAll, 'all', `Simulation lancée pour ${lamps.length} lampadaires`)}
        >
          <Zap size={14} /> Tout simuler
        </Button>
      </Card>

      {/* Scenarios */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader title="Scénarios de test" subtitle="Exécute des séquences prédéfinies sur un lampadaire cible" />
          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1.5">
              Lampadaire cible (obligatoire)
            </label>
            <select
              value={scenarioLamp}
              onChange={(e) => setScenarioLamp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">Sélectionner un lampadaire…</option>
              {lamps.map((l) => <option key={l.id} value={l.id}>{l.reference} — {l.zone || '—'}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {scenarios.map((sc, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-3 bg-[var(--surface-2)] rounded-lg">
                <div>
                  <p className="text-[13px] font-medium text-[var(--text)]">{sc.name}</p>
                  {sc.description && <p className="text-[11px] text-[var(--text-muted)]">{sc.description}</p>}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!scenarioLamp}
                  loading={busy === `sc-${i}`}
                  onClick={() => do_(
                    () => runScenario({ scenario: sc.name, lampadaire_id: parseInt(scenarioLamp) }),
                    `sc-${i}`,
                    `Scénario "${sc.name}" lancé`
                  )}
                >
                  <Play size={12} /> Lancer
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
