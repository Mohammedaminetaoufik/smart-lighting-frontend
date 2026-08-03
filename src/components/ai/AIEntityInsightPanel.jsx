import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, X, RefreshCw, AlertTriangle, CheckCircle,
  Info, Lightbulb, Radio, Wifi, WifiOff, Wrench,
  Thermometer, Zap, Activity, MapPin, Clock, Globe2,
} from 'lucide-react'
import { getEntityInsights } from '../../api/ai'
import TypewriterText from './TypewriterText'
import ScoreBadge from './ScoreBadge'
import { RecommendationList } from './RecommendationCard'
import AIQualityMeta from './AIQualityMeta'
import GroundedRecommendations from './GroundedRecommendations'
import { cn } from '../../utils/helpers'

/* ── Priority badge ──────────────────────────────────────────── */
const PRIORITY = {
  low:      { label: 'Faible',   bg: 'bg-slate-500/15',  text: 'text-slate-400',  border: 'border-slate-500/25' },
  medium:   { label: 'Moyen',    bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/25' },
  high:     { label: 'Élevé',    bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25' },
  critical: { label: 'Critique', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25' },
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY[priority] ?? PRIORITY.medium
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
      cfg.bg, cfg.text, cfg.border,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  )
}

/* ── Detail field ────────────────────────────────────────────── */
function DetailField({ label, value, icon: Icon }) {
  if (value == null || value === '' || value === false) return null
  const formatted = typeof value === 'number'
    ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    : String(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-[var(--text-muted)] shrink-0" />}
        <span className="text-[12px] font-medium text-[var(--text)] break-all">{formatted}</span>
      </div>
    </div>
  )
}

/* ── Section header ──────────────────────────────────────────── */
function SectionHeader({ label }) {
  return (
    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 pt-1">
      {label}
    </p>
  )
}

/* ── Technical details grids ─────────────────────────────────── */
function LampadaireDetails({ d }) {
  const statusIcon = d.etat === 'online' ? Wifi : d.etat === 'offline' ? WifiOff : Wrench
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <DetailField label="Référence"     value={d.reference}       icon={Lightbulb} />
      <DetailField label="Zone"          value={d.zone}             icon={MapPin} />
      <DetailField label="État"          value={d.etat}             icon={statusIcon} />
      <DetailField label="Intensité"     value={d.intensite != null ? `${d.intensite}%` : null} icon={Zap} />
      <DetailField label="Puissance nominale" value={d.puissance != null ? `${d.puissance} W` : null} icon={Activity} />
      <DetailField label="Puissance mesurée"  value={d.measured_power != null ? `${d.measured_power} W` : null} icon={Activity} />
      <DetailField label="LCU associée"  value={d.lcu_reference}   icon={Radio} />
      <DetailField label="Commissioning" value={d.commissioning} />
      <DetailField label="Température"   value={d.temperature != null ? `${Number(d.temperature).toFixed(1)} °C` : null} icon={Thermometer} />
      <DetailField label="Tension"       value={d.tension != null ? `${Number(d.tension).toFixed(1)} V` : null} />
      <DetailField label="Courant"       value={d.courant != null ? `${Number(d.courant).toFixed(2)} A` : null} />
      <DetailField label="Driver"        value={[d.driver_brand, d.driver_model].filter(Boolean).join(' ')} />
      <DetailField label="Défaut"        value={d.fault_status} />
      <DetailField label="Vu il y a"     value={d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('fr-FR') : null} icon={Clock} />
    </div>
  )
}

function LCUDetails({ d }) {
  const statusIcon = d.status === 'online' ? Wifi : WifiOff
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <DetailField label="Référence"   value={d.reference}    icon={Radio} />
      <DetailField label="Nom"         value={d.name} />
      <DetailField label="Adresse IP"  value={d.ip_address} />
      <DetailField label="Port"        value={d.port} />
      <DetailField label="Protocole"   value={d.protocol} />
      <DetailField label="Zone"        value={d.zone}         icon={MapPin} />
      <DetailField label="Statut"      value={d.status}       icon={statusIcon} />
      <DetailField label="Score santé" value={d.health_score != null ? `${d.health_score}/100` : null} />
      <DetailField label="Lampadaires" value={d.lampadaires_count} icon={Lightbulb} />
      <DetailField label="En ligne"    value={d.online_count} />
      <DetailField label="Hors ligne"  value={d.offline_count} />
      <DetailField label="Maintenance" value={d.maintenance_count} />
      <DetailField label="Vu il y a"   value={d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('fr-FR') : null} icon={Clock} />
      <DetailField label="Sync"        value={d.last_sync_at ? new Date(d.last_sync_at).toLocaleString('fr-FR') : null} />
    </div>
  )
}

/* ── Loading skeleton ────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-4 p-5 animate-pulse">
      <div className="h-3 bg-[var(--surface-2)] rounded-full w-2/3" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 bg-[var(--surface-2)] rounded-xl" />
        ))}
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-[var(--surface-2)] rounded-full w-full" />
        <div className="h-3 bg-[var(--surface-2)] rounded-full w-5/6" />
        <div className="h-3 bg-[var(--surface-2)] rounded-full w-4/5" />
      </div>
    </div>
  )
}

/* ── Shared panel body ───────────────────────────────────────── */
function PanelHeader({ entityRef, entityLabel, data, isLoading, isFetching, onRefresh, onClose }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
      <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
        <Sparkles size={15} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[var(--text)] truncate">Analyse IA — {entityRef}</p>
        <p className="text-[10px] text-[var(--text-muted)]">{entityLabel}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {data && !isLoading && <PriorityBadge priority={data.priority} />}
        <button
          onClick={onRefresh}
          disabled={isFetching || data?.ai_enabled === false}
          title={data?.ai_enabled === false ? "IA générative désactivée dans le Centre IA" : "Régénérer l'analyse"}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

function PanelBody({ data, isLoading, isError, error, entityType, isFetching, onGenerate }) {
  const llmGenerated = data && !!data.generated_at && !!data.summary
  const aiDisabled   = data?.ai_enabled === false
  const generating   = isFetching && !llmGenerated
  const ruleRecs     = data?.recommendations ?? []
  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading && <Skeleton />}

      {isError && !isLoading && (
        <div className="flex items-center gap-3 p-5 text-[13px] text-[var(--text-muted)]">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span>{error?.message ?? 'Service IA temporairement indisponible.'}</span>
        </div>
      )}

      {data && !isLoading && (
        <div className="p-5 space-y-5">

          {/* ── 1. Technical Details ─────────────────────── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
            <SectionHeader label="Détails techniques" />
            {entityType === 'lampadaire'
              ? <LampadaireDetails d={data.technical_details} />
              : <LCUDetails d={data.technical_details} />}

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-[11px]">
                <AlertTriangle size={11} className={data.related_data.critical_alerts > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'} />
                <span className={data.related_data.critical_alerts > 0 ? 'text-red-400 font-semibold' : 'text-[var(--text-muted)]'}>
                  {data.related_data.alerts_count ?? 0} alerte(s)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Wrench size={11} className="text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">{data.related_data.workorders_count ?? 0} intervention(s)</span>
              </div>
              {entityType === 'lcu' && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <WifiOff size={11} className={data.related_data.offline_lamps > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'} />
                  <span className={data.related_data.offline_lamps > 0 ? 'text-red-400 font-semibold' : 'text-[var(--text-muted)]'}>
                    {data.related_data.offline_lamps ?? 0} hors ligne
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Industrial scores (rule-based, always available) ── */}
          {(data.risk_score != null || data.maintainability_score != null || data.communication_health_score != null) && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
              <SectionHeader label="Scores industriels" />
              <div className="flex items-center justify-around gap-2 pt-1">
                <ScoreBadge label="Risque" score={data.risk_score} higherIsBetter={false} />
                <ScoreBadge label="Maintenabilité" score={data.maintainability_score} />
                <ScoreBadge label="Comm." score={data.communication_health_score} />
              </div>
            </div>
          )}

          {/* ── 3. Operational recommendations (rule-based, 0 token) ── */}
          <div>
            <SectionHeader label="Recommandations opérationnelles" />
            <RecommendationList recommendations={ruleRecs} />
          </div>

          {/* ── 4. IA Diagnosis (optional LLM narrative) ──── */}
          {generating ? (
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4">
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-[var(--surface-2)] rounded-full w-2/3" />
                <div className="h-3 bg-[var(--surface-2)] rounded-full w-full" />
                <div className="h-3 bg-[var(--surface-2)] rounded-full w-5/6" />
              </div>
            </div>
          ) : !llmGenerated && aiDisabled ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[12px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>IA générative désactivée dans le Centre IA. Ce diagnostic repose uniquement sur les données SQL et les règles métier.</span>
            </div>
          ) : !llmGenerated ? (
            <button
              onClick={onGenerate}
              disabled={isFetching}
              className="flex items-center gap-2 text-[12px] font-medium text-brand-500 hover:text-brand-400 transition-colors disabled:opacity-40"
            >
              <Sparkles size={13} className={isFetching ? 'animate-pulse' : ''} />
              Générer un diagnostic IA avancé (optionnel)
            </button>
          ) : (
            <>
              <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionHeader label="Diagnostic IA" />
                  {data.web?.sources?.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[9px] font-semibold text-cyan-500">
                      <Globe2 size={10} />
                      Enrichi par le web
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Résumé</p>
                  <p className="text-[13px] text-[var(--text)] leading-relaxed">
                    <TypewriterText text={data.summary} speed={12} showCursor={false} />
                  </p>
                </div>

                {data.analysis && (
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Analyse</p>
                    <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                      <TypewriterText text={data.analysis} speed={8} showCursor={false} />
                    </p>
                  </div>
                )}

                {data.recommendation && (
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">
                      {data.web?.sources?.length > 0 ? 'Recommandation ' : 'Recommandation'}
                    </p>
                    <p className="text-[12px] text-[var(--text)] leading-relaxed font-medium">
                      <TypewriterText text={data.recommendation} speed={10} showCursor={false} />
                    </p>
                  </div>
                )}

                <AIQualityMeta
                  confidence={data.confidence}
                  confidenceBasis={data.confidence_basis}
                  warnings={[...(data.quality_warnings ?? []), data.web?.warning].filter(Boolean)}
                  sources={data.sources}
                  webSources={data.web?.sources}
                  compact
                />
              </div>

              <GroundedRecommendations recommendations={data.grounded_recommendations} />

              {/* ── 3. Suggested Actions ─────────────────────── */}
              {data.suggested_actions?.length > 0 && (
                <div>
                  <SectionHeader label="Actions suggérées" />
                  <ul className="space-y-2">
                    {data.suggested_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30">
                        <CheckCircle size={13} className="text-brand-500 shrink-0 mt-0.5" />
                        <span className="text-[12px] text-[var(--text)] leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </>
          )}

          {/* ── Footer ───────────────────────────────────── */}
          {llmGenerated && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Info size={10} className="text-[var(--text-muted)]" />
                <span className="text-[10px] text-[var(--text-muted)]">
                  MAADEN IA · résultat à valider par un opérateur
                </span>
              </div>
              {data.cached && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  Cache · {new Date(data.generated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */
export default function AIEntityInsightPanel({ entityType, entityId, open, onClose, inline = false }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['entity-insights', entityType, entityId, refreshKey],
    queryFn: () => getEntityInsights(entityType, entityId, refreshKey > 0),
    enabled: open && !!entityId,
    staleTime: 4 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  })

  if (!open) return null

  const entityLabel = entityType === 'lampadaire' ? 'Lampadaire' : 'LCU'
  const entityRef = data?.technical_details?.reference ?? `${entityLabel} #${entityId}`
  const headerProps = {
    entityRef,
    entityLabel,
    data,
    isLoading,
    isFetching,
    onRefresh: () => setRefreshKey((k) => k + 1),
    onClose: inline ? null : onClose,
  }

  /* Inline mode — embedded inside a tab, no overlay */
  if (inline) {
    return (
      <div className="flex flex-col overflow-hidden h-full">
        <PanelHeader {...headerProps} />
        <PanelBody data={data} isLoading={isLoading} isError={isError} error={error} entityType={entityType}
          isFetching={isFetching} onGenerate={() => setRefreshKey((k) => k + 1)} />
      </div>
    )
  }

  /* Overlay mode — fixed backdrop + side panel */
  return (
    <>
      <div
        className="fixed inset-0 z-[600] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'fixed z-[700] bg-[var(--surface)] border-[var(--border)] flex flex-col overflow-hidden',
        'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border-t',
        'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-full sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:border-t-0 sm:border-l',
      )}>
        <PanelHeader {...headerProps} onClose={onClose} />
        <PanelBody data={data} isLoading={isLoading} isError={isError} error={error} entityType={entityType}
          isFetching={isFetching} onGenerate={() => setRefreshKey((k) => k + 1)} />
      </div>
    </>
  )
}
