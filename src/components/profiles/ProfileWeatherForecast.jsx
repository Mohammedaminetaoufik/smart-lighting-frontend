import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, CloudRain, CloudSun, Droplets, RefreshCw,
  ShieldCheck, Sparkles, Sunrise, Sunset, Thermometer, Wind,
} from 'lucide-react'
import { getProfileWeatherForecast } from '../../api/profiles'
import MaadenAILogo from '../brand/MaadenAILogo'
import { cn } from '../../utils/helpers'

const HORIZONS = [
  { value: 1, label: "Aujourd'hui" },
  { value: 3, label: '3 jours' },
  { value: 7, label: '7 jours' },
]

const riskStyle = {
  faible: 'text-green-400 bg-green-500/10 border-green-500/20',
  modéré: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  élevé: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const formatDay = (date) => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short', day: '2-digit', month: 'short',
}).format(new Date(`${date}T12:00:00`))

const formatTime = (value) => {
  if (!value) return '—'
  const parts = value.split('T')
  return parts.length > 1 ? parts[1].slice(0, 5) : value
}

function Metric({ icon, label, value, accent = '' }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-1">{icon}{label}</div>
      <p className={cn('text-[15px] font-bold text-[var(--text)] truncate', accent)}>{value}</p>
    </div>
  )
}

export default function ProfileWeatherForecast({ profileId }) {
  const [horizon, setHorizon] = useState(3)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((force = false) => {
    setLoading(true)
    setError('')
    getProfileWeatherForecast(profileId, horizon, force)
      .then(setForecast)
      .catch((err) => {
        setForecast(null)
        setError(err.message || 'Prévision météo indisponible')
      })
      .finally(() => setLoading(false))
  }, [profileId, horizon])

  useEffect(() => { load(false) }, [load])

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.06] to-transparent overflow-hidden">
      <div className="flex items-center gap-3 p-3.5 border-b border-cyan-500/15">
        <MaadenAILogo size={31} thinking={loading} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-[var(--text)]">Prévision météo du profil</p>
            <Sparkles size={11} className="text-cyan-400" />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Impact prévisionnel et recommandations explicables</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={loading}
          title="Actualiser la météo"
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-cyan-400 disabled:opacity-40">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-3">
          {HORIZONS.map((item) => (
            <button key={item.value} type="button" onClick={() => setHorizon(item.value)}
              className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
                horizon === item.value ? 'bg-cyan-500/15 text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text)]')}>
              {item.label}
            </button>
          ))}
        </div>

        {loading && !forecast ? (
          <div className="py-8 flex flex-col items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <MaadenAILogo size={42} thinking />
            Analyse de la météo et du profil…
          </div>
        ) : error ? (
          <div className="flex gap-2.5 p-3 rounded-xl border border-orange-500/25 bg-orange-500/[0.07] text-orange-300">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        ) : forecast && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Metric icon={<Thermometer size={11} />} label="Max prévue" value={`${forecast.summary.temperature_max_c} °C`} accent="text-orange-400" />
              <Metric icon={<ShieldCheck size={11} />} label="Risque thermique" value={forecast.summary.highest_thermal_risk} accent={forecast.summary.highest_thermal_risk === 'élevé' ? 'text-red-400' : ''} />
              <Metric icon={<CloudSun size={11} />} label="Énergie programmée" value={`${forecast.summary.baseline_energy_kwh} kWh`} />
              <Metric icon={<Sparkles size={11} />} label="Simulation conseillée" value={`${forecast.summary.simulated_energy_kwh} kWh`} accent="text-cyan-400" />
            </div>

            <div className="space-y-2">
              {forecast.days.map((day) => (
                <article key={day.date} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <p className="font-bold text-[12px] text-[var(--text)] capitalize">{formatDay(day.date)}</p>
                    <span className={cn('ml-auto px-2 py-0.5 rounded-full border text-[9px] font-bold capitalize', riskStyle[day.thermal_risk] || riskStyle.faible)}>
                      risque {day.thermal_risk}
                    </span>
                    {day.suggested_adjustment_pct !== 0 && (
                      <span className="text-[10px] font-bold text-cyan-400">{day.suggested_adjustment_pct}%</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-y-2 text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1"><Thermometer size={10} /> {day.temperature_min_c}–{day.temperature_max_c} °C</span>
                    <span className="flex items-center gap-1"><Droplets size={10} /> {Math.round(day.humidity_mean_pct)}%</span>
                    <span className="flex items-center gap-1"><CloudRain size={10} /> {day.precipitation_mm} mm</span>
                    <span className="flex items-center gap-1"><Wind size={10} /> {day.wind_max_kmh} km/h</span>
                    <span className="flex items-center gap-1"><Sunset size={10} /> {formatTime(day.sunset)}</span>
                    <span className="flex items-center gap-1"><Sunrise size={10} /> {formatTime(day.sunrise)}</span>
                  </div>
                  <p className="mt-2.5 pt-2.5 border-t border-[var(--border)] text-[10px] leading-relaxed text-[var(--text-muted)]">
                    {day.recommendation}
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium text-cyan-400">
                    {day.scheduled_hours} h programmées · {day.baseline_energy_kwh} → {day.simulated_energy_kwh} kWh
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">Conseils</p>
              {forecast.recommendations.map((item) => <p key={item} className="text-[10px] leading-relaxed text-[var(--text-muted)]">• {item}</p>)}
            </div>

            <div className="mt-2 flex items-start gap-2 text-[9px] leading-relaxed text-[var(--text-muted)]">
              <ShieldCheck size={11} className="text-green-400 shrink-0 mt-0.5" />
              <span>Simulation uniquement — aucune commande automatique. Source : {forecast.provider}{forecast.cached ? ' (cache)' : ''}, actualisée le {new Date(forecast.fetched_at).toLocaleString('fr-FR')}.</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
