import { useState } from 'react'
import { Navigation, X, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react'

/* metres → "4.8" km */
const toKm = (m) => (m / 1000).toFixed(1)
/* seconds → whole minutes (min 1) */
const toMin = (s) => Math.max(1, Math.round(s / 60))

function Row({ label, value, strong, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/45">{label}</span>
      <span className={[
        'text-[12px]',
        strong ? 'font-bold text-white' : 'text-white/80',
        mono ? 'font-mono' : '',
      ].join(' ')}>{value}</span>
    </div>
  )
}

/**
 * Floating panel showing the current driving route (or its loading / error
 * state). Purely presentational — all state comes from useMapboxDirections.
 */
export default function RoutePanel({ status, error, route, onClear }) {
  const [showSteps, setShowSteps] = useState(false)
  if (status === 'idle') return null

  return (
    <div className="absolute right-3 top-24 z-[550] w-[260px] map-glass p-3 text-white">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500/20">
          <Navigation size={12} className="text-brand-400" />
        </div>
        <span className="flex-1 text-[13px] font-bold">Itinéraire routier</span>
        <button onClick={onClear} title="Effacer l’itinéraire"
          className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 py-2 text-[12px] text-white/70">
          <Loader2 size={14} className="animate-spin text-brand-400" />
          Calcul de l’itinéraire…
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 py-1.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[12px] leading-snug text-red-300">{error}</p>
        </div>
      )}

      {status === 'ready' && route && (
        <>
          <div className="space-y-1.5">
            <Row label="Destination" value={route.destination?.label || '—'} mono />
            <Row label="Mode" value="Voiture" />
            <Row label="Distance" value={`${toKm(route.distanceMeters)} km`} strong />
            <Row label="Temps estimé" value={`${toMin(route.durationSeconds)} min`} strong />
          </div>

          {route.steps?.length > 0 && (
            <div className="mt-2 border-t border-white/8 pt-2">
              <button onClick={() => setShowSteps((v) => !v)}
                className="flex w-full items-center justify-between text-[11px] font-semibold text-white/60 transition-colors hover:text-white">
                Détails de l’itinéraire
                {showSteps ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {showSteps && (
                <ol className="mt-1.5 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {route.steps.map((step, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-white/60">
                      <span className="text-brand-400/70">{i + 1}.</span>
                      <span className="flex-1">
                        {step.instruction}
                        {step.distanceMeters > 0 && (
                          <span className="text-white/30"> · {toKm(step.distanceMeters)} km</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <button onClick={onClear}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-semibold transition-colors"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <X size={12} /> Effacer l’itinéraire
          </button>
        </>
      )}
    </div>
  )
}
