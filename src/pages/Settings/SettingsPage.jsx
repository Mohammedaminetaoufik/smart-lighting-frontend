import { useState, useEffect } from 'react'
import { Sun, Moon, Save, Thermometer, Zap, Clock, Database, Radio, Leaf } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Spinner'
import { getSystemConfig, updateSystemConfig } from '../../api/system'
import { getTariffs, updateTariffs } from '../../api/finance'
import { cn } from '../../utils/helpers'

/* ── Tarification énergie ONEE ─────────────────────────────── */
function TariffSettingsCard() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(null)

  const { data: cfg, isLoading } = useQuery({ queryKey: ['energy-tariffs'], queryFn: getTariffs })

  useEffect(() => { if (cfg) setDraft(structuredClone(cfg)) }, [cfg])

  const mut = useMutation({
    mutationFn: updateTariffs,
    onSuccess: () => {
      toast.success('Tarification enregistrée')
      qc.invalidateQueries({ queryKey: ['energy-tariffs'] })
      qc.invalidateQueries({ queryKey: ['energy-bill'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  if (isLoading || !draft) {
    return (
      <Card>
        <CardHeader title="Tarification énergie (ONEE)" subtitle="Chargement…" />
      </Card>
    )
  }

  const setPrice = (key, val) =>
    setDraft((d) => ({
      ...d,
      tariffs: d.tariffs.map((t) => (t.period_key === key ? { ...t, price_dh_per_kwh: val } : t)),
    }))

  const dirty = JSON.stringify(draft) !== JSON.stringify(cfg)

  const save = () => {
    const payload = {
      ...draft,
      tariffs: draft.tariffs.map((t) => ({ ...t, price_dh_per_kwh: parseFloat(t.price_dh_per_kwh) || 0 })),
      co2_factor_kg_per_kwh: parseFloat(draft.co2_factor_kg_per_kwh) || 0,
    }
    mut.mutate(payload)
  }

  return (
    <Card>
      <CardHeader
        title="Tarification énergie (ONEE)"
        subtitle="Prix par poste horaire — utilisés pour la facture réelle en DH. À renseigner selon votre contrat ONEE."
      />
      <div className="space-y-3">
        {draft.tariffs.map((t) => (
          <div key={t.period_key} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--text)]">{t.label}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{t.period_key}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" step="0.01"
                value={t.price_dh_per_kwh}
                onChange={(e) => setPrice(t.period_key, e.target.value)}
                className="w-24 px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
              <span className="text-[11px] text-[var(--text-muted)]">DH/kWh</span>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Leaf size={14} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[var(--text)]">Facteur d'émission CO₂</p>
            <p className="text-[11px] text-[var(--text-muted)]">kg CO₂ par kWh (réseau électrique marocain)</p>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number" min="0" step="0.01"
              value={draft.co2_factor_kg_per_kwh}
              onChange={(e) => setDraft((d) => ({ ...d, co2_factor_kg_per_kwh: e.target.value }))}
              className="w-24 px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <span className="text-[11px] text-[var(--text-muted)]">kg/kWh</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button onClick={save} disabled={!dirty} loading={mut.isPending}>
            <Save size={13} />
            {dirty ? 'Enregistrer les tarifs' : 'Aucune modification'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

const CONFIG_FIELDS = [
  {
    key: 'alert.temp_critical_threshold',
    label: 'Seuil température critique (°C)',
    icon: Thermometer,
    help: 'Au-delà, une alerte critique est créée par le moteur de règles.',
    type: 'number', min: 30, max: 120, step: 1,
  },
  {
    key: 'alert.power_abnormal_multiplier',
    label: 'Multiplicateur de puissance anormale',
    icon: Zap,
    help: 'Une consommation au-delà de N × nominale déclenche une alerte.',
    type: 'number', min: 1.0, max: 3.0, step: 0.1,
  },
  {
    key: 'job.offline_check_interval_min',
    label: 'Intervalle de détection hors ligne (min)',
    icon: Clock,
    help: 'Fréquence à laquelle les lampadaires inactifs sont marqués offline.',
    type: 'number', min: 1, max: 60, step: 1,
  },
  {
    key: 'job.telemetry_retention_days',
    label: 'Conservation télémétrie (jours)',
    icon: Database,
    help: 'Les mesures plus anciennes seront purgées par la tâche quotidienne.',
    type: 'number', min: 7, max: 730, step: 1,
  },
  {
    key: 'lcu.sync_interval_min',
    label: 'Intervalle de synchronisation LCU (min)',
    icon: Radio,
    help: 'Fréquence des appels de sync vers les passerelles.',
    type: 'number', min: 1, max: 120, step: 1,
  },
]

export default function SettingsPage() {
  const { theme, toggle } = useTheme()
  const qc = useQueryClient()
  const [draft, setDraft] = useState({})

  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: getSystemConfig,
  })

  // Sync draft when config loads
  useEffect(() => {
    if (config) setDraft(config)
  }, [config])

  const updateMut = useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: () => {
      toast.success('Configuration enregistrée')
      qc.invalidateQueries({ queryKey: ['system-config'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const dirty = config && Object.keys(draft).some((k) => draft[k] !== config[k])

  const save = () => {
    // Only send changed keys
    const changes = {}
    Object.keys(draft).forEach((k) => {
      if (draft[k] !== config[k]) changes[k] = String(draft[k])
    })
    if (Object.keys(changes).length === 0) return
    updateMut.mutate(changes)
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-2xl space-y-5">
      {/* Appearance */}
      <Card>
        <CardHeader title="Apparence" subtitle="Personnaliser l'interface" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[var(--text)]">Thème</p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {theme === 'dark' ? 'Mode sombre activé' : 'Mode clair activé'}
            </p>
          </div>
          <Button variant="secondary" onClick={toggle}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </Button>
        </div>
      </Card>

      {/* Thresholds & Jobs */}
      <Card>
        <CardHeader
          title="Seuils & tâches planifiées"
          subtitle="Configurer les règles d'alerte et la cadence des jobs de fond"
        />
        <div className="space-y-4">
          {CONFIG_FIELDS.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.key} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <label className="text-[12px] font-medium text-[var(--text)]">{f.label}</label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{f.key}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{f.help}</p>
                  <input
                    type={f.type}
                    min={f.min} max={f.max} step={f.step}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    className={cn(
                      'w-32 px-3 py-1.5 text-sm bg-[var(--surface-2)] border rounded-lg text-[var(--text)] font-mono',
                      'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
                      draft[f.key] !== config?.[f.key] ? 'border-amber-500/60' : 'border-[var(--border)]'
                    )}
                  />
                </div>
              </div>
            )
          })}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <Button onClick={save} disabled={!dirty} loading={updateMut.isPending}>
              <Save size={13} />
              {dirty ? 'Enregistrer les modifications' : 'Aucune modification'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tarification énergie ONEE */}
      <TariffSettingsCard />

      {/* Backend info */}
      <Card>
        <CardHeader title="Backend" subtitle="Configuration de la connexion API" />
        <div className="bg-[var(--surface-2)] rounded-lg p-3 font-mono text-[12px] text-[var(--text)]">
          http://localhost:8080/api
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          Le proxy Vite redirige /api vers le backend Go.
        </p>
      </Card>
    </div>
  )
}
