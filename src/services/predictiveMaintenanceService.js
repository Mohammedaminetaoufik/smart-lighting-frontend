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

/** Guard against incoherent values coming from the API. */
export function sanitizePrediction(p) {
  const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0))
  return {
    ...p,
    zone: (p.zone || 'Sans zone').trim(),
    risk_score: clampPct(p.risk_score),
    confidence: clampPct(p.confidence),
    eta_hours: Math.max(0, Number(p.eta_hours) || 0),
    telemetry_freshness: FRESHNESS_META[p.telemetry_freshness] ? p.telemetry_freshness : 'unavailable',
    risk_level: RISK_META[p.risk_level] ? p.risk_level : riskLevelFromScore(p.risk_score, true),
  }
}

/** Filter predictions by the active filter set. */
export function filterPredictions(items, filters = {}) {
  const q = (filters.search || '').trim().toLowerCase()
  return (items || []).filter((p) => {
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
  const header = ['Reference', 'Zone', 'LCU', 'En ligne', 'Niveau', 'Score', 'Panne probable', 'Echeance', 'Confiance', 'Fraicheur']
  const rows = (items || []).map((p) => [
    p.reference, p.zone, p.lcu_reference, p.online ? 'oui' : 'non',
    RISK_META[p.risk_level]?.label ?? p.risk_level, `${p.risk_score}%`,
    p.predicted_label, p.eta_label, `${p.confidence}%`, FRESHNESS_META[p.telemetry_freshness]?.label,
  ])
  return [header, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
}

/* ── API (real endpoints — see faults_predictive.go) ───────────────────────── */
export const getPredictiveSummary = () => client.get('/faults/predictive-summary')
export const getPredictions       = () => client.get('/faults/predictions').then((rows) => (rows || []).map(sanitizePrediction))
export const getRiskTrend         = (days = 30) => client.get('/faults/trend', { params: { days } })
export const getFaultDistribution = () => client.get('/faults/stats')
export const getLampPrediction    = (id) => client.get(`/lampadaires/${id}/prediction`)
