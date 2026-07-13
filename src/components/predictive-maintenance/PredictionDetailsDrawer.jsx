import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X, MapPin, Activity, ClipboardPlus, Cpu, Clock, AlertTriangle, Info,
} from 'lucide-react'
import { getLampPrediction } from '../../services/predictiveMaintenanceService'
import RiskLevelBadge from './RiskLevelBadge'
import TelemetryFreshnessBadge from './TelemetryFreshnessBadge'
import PredictionConfidence from './PredictionConfidence'
import { timeAgo } from '../../utils/helpers'

const SEVERITY_COLOR = { normal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' }

function SignalRow({ s }) {
  const color = SEVERITY_COLOR[s.severity] ?? '#6b7280'
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-[var(--text)]">{s.label}</span>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color, background: `${color}18` }}>
          {s.deviation_percent > 0 ? '+' : ''}{s.deviation_percent}%
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
        <span>Actuel : <span className="text-[var(--text)] font-medium tabular-nums">{s.current_value}{s.unit}</span></span>
        {s.expected_value != null && <span>Normal : <span className="text-[var(--text)] tabular-nums">{s.expected_value}{s.unit}</span></span>}
      </div>
      {s.contribution_percent != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
            <span>Contribution au risque</span><span>{s.contribution_percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${s.contribution_percent}%`, background: color }} />
          </div>
        </div>
      )}
    </li>
  )
}

export default function PredictionDetailsDrawer({ lampId, onClose, onAction }) {
  const open = lampId != null

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lamp-prediction', lampId],
    queryFn: () => getLampPrediction(lampId),
    enabled: open,
  })

  if (!open) return null
  const staleWarning = data && ['stale', 'obsolete', 'unavailable'].includes(data.telemetry_freshness)

  return (
    <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-modal="true" aria-label="Diagnostic prédictif">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300 motion-reduce:animate-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[var(--text)] font-mono">{data?.reference ?? '…'}</p>
            <p className="text-[12px] text-[var(--text-muted)] truncate">{data?.zone} · {data?.lcu_reference || 'LCU —'}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isError ? (
            <p className="text-[13px] text-red-500">Impossible de charger le diagnostic.</p>
          ) : isLoading || !data ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--surface-2)]" />)}
            </div>
          ) : (
            <>
              {/* Synthèse */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Niveau de risque</p>
                  <RiskLevelBadge level={data.risk_level} score={data.risk_score} />
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Panne probable</p>
                  <p className="text-[13px] font-semibold text-[var(--text)]">{data.predicted_label}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Échéance estimée</p>
                  <p className="text-[13px] font-semibold text-[var(--text)]">{data.eta_label}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Confiance</p>
                  <PredictionConfidence value={data.confidence} compact />
                </div>
              </div>

              {/* Méta modèle / fraîcheur */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1"><Cpu size={12} /> {data.model_version}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} /> Prédiction {timeAgo(data.prediction_generated_at)}</span>
                <TelemetryFreshnessBadge freshness={data.telemetry_freshness} lastAt={data.last_telemetry_at} showTime />
              </div>

              {staleWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11.5px] text-amber-600 dark:text-amber-400">
                    Cette prédiction repose sur des données anciennes ou obsolètes. Sa fiabilité peut être réduite.
                  </p>
                </div>
              )}

              {/* Signaux */}
              <div>
                <p className="text-[12px] font-semibold text-[var(--text)] mb-2 flex items-center gap-1.5">
                  <Info size={13} className="text-[var(--text-muted)]" /> Signaux principaux
                </p>
                <ul className="space-y-2">
                  {(data.signals ?? []).map((s) => <SignalRow key={s.key} s={s} />)}
                  {(!data.signals || data.signals.length === 0) && (
                    <li className="text-[12px] text-[var(--text-muted)]">Pas de télémétrie récente pour expliquer la prédiction.</li>
                  )}
                </ul>
              </div>

              {/* Recommandation */}
              <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-3.5">
                <p className="text-[12px] font-semibold text-brand-500 mb-1">Recommandation</p>
                <p className="text-[12.5px] text-[var(--text)] leading-relaxed">{data.recommendation}</p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 px-5 py-3.5 border-t border-[var(--border)] grid grid-cols-2 gap-2">
          <button onClick={() => onAction('workorder', data)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors">
            <ClipboardPlus size={13} /> Créer un BT
          </button>
          <button onClick={() => onAction('map', data)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
            <MapPin size={13} /> Voir sur la carte
          </button>
          <button onClick={() => onAction('telemetry', data)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
            <Activity size={13} /> Télémétrie
          </button>
          <button onClick={onClose}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
