// Predictive-maintenance service: single place for API calls + pure business
// logic (risk levels, freshness, filtering, sorting, CSV). Uses the project's
// existing HTTP layer (api/client). Pure helpers are exported for unit tests.

import client from '../api/client'

/* ── Design tokens (criticité pilote la couleur, pas le type de panne) ─────── */
export const RISK_META = {
  critical: { label: 'Critique',  color: '#ef4444', bg: 'bg-red-500/12',    text: 'text-red-500',    order: 5 },
  high:     { label: 'Élevé',     color: '#f97316', bg: 'bg-orange-500/12', text: 'text-orange-500', order: 4 },
  moderate: { label: 'Modéré',    color: '#eab308', bg: 'bg-yellow-500/12', text: 'text-yellow-600 dark:text-yellow-400', order: 3 },
  low:      { label: 'Faible',    color: '#3b82f6', bg: 'bg-blue-500/12',   text: 'text-blue-500',   order: 2 },
  healthy:  { label: 'Sain',      color: '#22c55e', bg: 'bg-green-500/12',  text: 'text-green-500',  order: 1 },
  unknown:  { label: 'Inconnu',   color: '#6b7280', bg: 'bg-slate-500/12',  text: 'text-slate-400',  order: 0 },
}

export const FRESHNESS_META = {
  fresh:       { label: 'À jour',       color: '#22c55e', order: 4, hint: 'moins de 15 min' },
  delayed:     { label: 'Retardée',     color: '#eab308', order: 3, hint: '15 min – 2 h' },
  stale:       { label: 'Ancienne',     color: '#f97316', order: 2, hint: '2 h – 24 h' },
  obsolete:    { label: 'Obsolète',     color: '#ef4444', order: 1, hint: 'plus de 24 h' },
  unavailable: { label: 'Indisponible', color: '#6b7280', order: 0, hint: 'aucune donnée' },
}

/* ── Pure logic (deterministic, testable) ──────────────────────────────────── */

/** Map a 0..100 score to a risk level. @returns {import('../types/predictiveMaintenance').RiskLevel} */
export function riskLevelFromScore(score, hasFault = true) {
  if (!hasFault) return 'unknown'
  if (score >= 85) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 50) return 'moderate'
  return 'low'
}

/** Derive freshness from an ISO date (client-side fallback / safety). */
export function freshnessFromDate(iso, now = Date.now()) {
  if (!iso) return 'unavailable'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'unavailable'
  const min = (now - t) / 60000
  if (min < 15) return 'fresh'
  if (min < 120) return 'delayed'
  if (min < 1440) return 'stale'
  return 'obsolete'
}

const validDate = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime())
const cleanText = (value, fallback = '') => String(value ?? fallback).trim().replace(/\s+/g, ' ')
const titleCase = (value) => cleanText(value).toLocaleLowerCase('fr-FR').replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('fr-FR'))

/** Return validation errors without mutating the received API record. */
export function validatePrediction(p) {
  const errors = []
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['record']
  if (!Number.isFinite(Number(p.id)) || Number(p.id) <= 0) errors.push('id')
  if (!cleanText(p.reference)) errors.push('reference')
  if (!validDate(p.prediction_generated_at)) errors.push('prediction_generated_at')
  if (!Number.isFinite(Number(p.risk_score))) errors.push('risk_score')
  if (!Number.isFinite(Number(p.confidence))) errors.push('confidence')
  return errors
}

/** Guard against incoherent values coming from the API. */
export function sanitizePrediction(p) {
  const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0))
  const riskScore = clampPct(p.risk_score)
  const telemetryFreshness = FRESHNESS_META[p.telemetry_freshness]
    ? p.telemetry_freshness
    : freshnessFromDate(p.last_telemetry_at)
  const hasEnoughData = telemetryFreshness !== 'unavailable'
  return {
    ...p,
    id: Number(p.id),
    reference: cleanText(p.reference),
    zone: titleCase(p.zone || 'Sans zone'),
    lcu_reference: cleanText(p.lcu_reference),
    risk_score: riskScore,
    confidence: clampPct(p.confidence),
    eta_hours: Math.max(0, Number(p.eta_hours) || 0),
    telemetry_freshness: telemetryFreshness,
    online: Boolean(p.online) && ['fresh', 'delayed'].includes(telemetryFreshness),
    risk_level: hasEnoughData ? riskLevelFromScore(riskScore, true) : 'unknown',
  }
}

/** Validate, normalize and de-duplicate records by reference. */
export function sanitizePredictions(rows) {
  const references = new Set()
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    if (validatePrediction(row).length > 0) return []
    const item = sanitizePrediction(row)
    const key = item.reference.toLocaleLowerCase('fr-FR')
    if (references.has(key)) return []
    references.add(key)
    return [item]
  })
}

/** Filter predictions by the active filter set. */
export function filterPredictions(items, filters = {}) {
  const q = (filters.search || '').trim().toLowerCase()
  return (items || []).filter((p) => {
    if (filters.periodHours && (!p.eta_hours || p.eta_hours > Number(filters.periodHours))) return false
    if (filters.zone && filters.zone !== 'all' && p.zone !== filters.zone) return false
    if (filters.lcu && filters.lcu !== 'all' && p.lcu_reference !== filters.lcu) return false
    if (filters.riskLevel && filters.riskLevel !== 'all' && p.risk_level !== filters.riskLevel) return false
    if (filters.faultType && filters.faultType !== 'all' && p.fault_status !== filters.faultType) return false
    if (filters.online === 'online' && !p.online) return false
    if (filters.online === 'offline' && p.online) return false
    if (filters.freshness && filters.freshness !== 'all' && p.telemetry_freshness !== filters.freshness) return false
    if (q && !(`${p.reference} ${p.zone} ${p.lcu_reference}`.toLowerCase().includes(q))) return false
    return true
  })
}

/** Derive filtered KPI values from the same records displayed in the table. */
export function summarizePredictions(items, base = {}) {
  const rows = items || []
  const count = (level) => rows.filter((p) => p.risk_level === level).length
  const atRisk = rows.filter((p) => ['critical', 'high', 'moderate'].includes(p.risk_level))
  const known = rows.filter((p) => p.telemetry_freshness !== 'unavailable')
  const stale = rows.filter((p) => ['stale', 'obsolete'].includes(p.telemetry_freshness)).length
  const missing = rows.filter((p) => p.telemetry_freshness === 'unavailable').length
  return {
    ...base,
    at_risk_count: atRisk.length,
    critical_count: count('critical'),
    high_risk_count: count('high'),
    moderate_risk_count: count('moderate'),
    predicted_failures_30d: rows.filter((p) => p.eta_hours > 0 && p.eta_hours <= 720).length,
    average_model_confidence: known.length
      ? Math.round(known.reduce((sum, p) => sum + p.confidence, 0) / known.length)
      : 0,
    average_rule_reliability: known.length
      ? Math.round(known.reduce((sum, p) => sum + p.confidence, 0) / known.length)
      : 0,
    scoring_method: 'deterministic_threshold_rules',
    priority_interventions: rows.filter((p) => ['critical', 'high'].includes(p.risk_level)).length,
    created_work_orders: rows.filter((p) => p.work_order_id != null).length,
    stale_telemetry_count: stale,
    missing_telemetry_count: missing,
    data_quality_score: rows.length ? Math.max(0, Math.round(((rows.length - stale - missing) / rows.length) * 100)) : 100,
  }
}

/** Build the cause chart from the exact same filtered prediction set. */
export function distributePredictions(items) {
  const groups = new Map()
  for (const item of items || []) {
    const key = item.fault_status || 'unknown'
    const current = groups.get(key) || { fault_type: key, label: item.predicted_label || key, count: 0, score_sum: 0 }
    current.count += 1
    current.score_sum += item.risk_score
    groups.set(key, current)
  }
  return {
    by_type: [...groups.values()].map(({ score_sum, ...group }) => ({
      ...group,
      average_risk_score: Math.round(score_sum / group.count),
      evolution_percent: null,
    })),
  }
}

export function mergeDistribution(current, historical) {
  const history = new Map((historical?.by_type || []).map((item) => [item.fault_type, item]))
  return {
    by_type: (current?.by_type || []).map((item) => ({
      ...item,
      evolution_percent: history.get(item.fault_type)?.evolution_percent ?? null,
    })),
  }
}

/** Sort predictions by a key with a direction. */
export function sortPredictions(items, key = 'risk_score', dir = 'desc') {
  const factor = dir === 'asc' ? 1 : -1
  const value = (p) => {
    if (key === 'freshness') return FRESHNESS_META[p.telemetry_freshness]?.order ?? 0
    if (key === 'eta_hours') return p.eta_hours || Number.MAX_SAFE_INTEGER
    return p[key] ?? 0
  }
  return [...(items || [])].sort((a, b) => (value(a) - value(b)) * factor)
}

/** Build a CSV string from predictions (for export). */
export function buildPredictionsCsv(items) {
  const header = ['Reference', 'Zone', 'LCU', 'En ligne', 'Niveau', 'Score', 'Panne probable', 'Echeance', 'Fiabilite du score', 'Fraicheur']
  const rows = (items || []).map((p) => [
    p.reference, p.zone, p.lcu_reference, p.online ? 'oui' : 'non',
    RISK_META[p.risk_level]?.label ?? p.risk_level, `${p.risk_score}%`,
    p.predicted_label, p.eta_label, `${p.confidence}%`, FRESHNESS_META[p.telemetry_freshness]?.label,
  ])
  return [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

/* ── API (real endpoints — see faults_predictive.go) ───────────────────────── */
export const getPredictiveSummary = ({ signal } = {}) => client.get('/faults/predictive-summary', { signal })
export const getPredictions       = ({ signal } = {}) => client.get('/faults/predictions', { signal }).then(sanitizePredictions)
const apiFilterParams = (filters = {}) => ({
    days: Math.max(1, Math.round((filters.periodHours || 720) / 24)),
    hours: filters.periodHours || 720,
    zone: filters.zone !== 'all' ? filters.zone : undefined,
    lcu: filters.lcu !== 'all' ? filters.lcu : undefined,
    risk_level: filters.riskLevel !== 'all' ? filters.riskLevel : undefined,
    fault_type: filters.faultType !== 'all' ? filters.faultType : undefined,
    online: filters.online !== 'all' ? filters.online : undefined,
    freshness: filters.freshness !== 'all' ? filters.freshness : undefined,
    search: cleanText(filters.search) || undefined,
})
export const getRiskTrend = (filters = {}, signal) => client.get('/faults/trend', {
  signal,
  params: apiFilterParams(filters),
})
export const getFaultDistribution = () => client.get('/faults/stats')
export const getPredictiveDistribution = (filters = {}, signal) => client.get('/faults/predictive-distribution', {
  signal,
  params: apiFilterParams(filters),
})
export const getLampPrediction    = (id) => client.get(`/lampadaires/${id}/prediction`).then((row) => ({
  ...sanitizePrediction(row),
  signals: Array.isArray(row?.signals) ? row.signals : [],
  recommendation: cleanText(row?.recommendation, 'Inspection du luminaire recommandée.'),
}))

export async function createWorkOrderFromPrediction(item) {
  if (!item) throw new Error('Prédiction introuvable')
  if (item.work_order_id) return { id: item.work_order_id, existed: true }
  const details = item.recommendation ? item : await getLampPrediction(item.id)
  const explanation = details.predictive_explanation
  const plan = Array.isArray(explanation?.preventive_plan)
    ? explanation.preventive_plan
        .map((step, index) => `${step.order ?? index + 1}. ${step.action}${step.why ? ` — ${step.why}` : ''}`)
        .join('\n')
    : ''
  const description = [
    `Risque ${details.risk_score}% · fiabilité du score ${details.confidence}% · échéance ${details.eta_label}.`,
    explanation?.situation_summary,
    explanation?.likely_scenario ? `Scénario à confirmer : ${explanation.likely_scenario}` : '',
    explanation?.operational_impact ? `Impact possible : ${explanation.operational_impact}` : '',
  ].filter(Boolean).join('\n\n')
  const recommendedAction = plan || explanation?.decision || details.recommendation
  const dueDate = new Date(Date.now() + Math.max(1, details.eta_hours || 24) * 3600000)
  const priority = { critical: 'urgent', high: 'high', moderate: 'medium', low: 'low' }[details.risk_level] || 'medium'
  const workOrder = await client.post('/workorders', {
    title: `Maintenance prédictive — ${details.reference}`,
    description,
    priority,
    source_type: 'predictive_maintenance',
    lampadaire_id: details.id,
    zone: details.zone,
    equipment_type: 'lampadaire',
    equipment_reference: details.reference,
    crew_type: 'lighting',
    team_type: 'lighting',
    due_date: dueDate.toISOString(),
    probable_cause: details.predicted_label,
    recommended_action: recommendedAction,
  })
  return { ...workOrder, existed: false }
}
