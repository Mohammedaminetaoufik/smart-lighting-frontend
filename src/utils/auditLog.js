export const ACTION_LABELS = {
  login: 'Connexion utilisateur',
  lcu_created: 'LCU créée',
  lcu_updated: 'LCU modifiée',
  lcu_tested: 'LCU testée',
  lcu_synced: 'LCU synchronisée',
  lampadaire_updated: 'Lampadaire modifié',
  lampadaire_localized: 'Localisation GPS définie',
  lampadaire_lcu_assigned: 'LCU assignée',
  commissioning_advanced: 'Étape de mise en service avancée',
  commissioning_comm_tested: 'Communication testée',
  commissioning_dimming_tested: 'Gradation testée',
  commissioning_validated: 'Mise en service validée',
  commissioning_failed: 'Mise en service échouée',
  dimming_command_sent: 'Commande de gradation envoyée',
  dimming_command_failed: 'Commande de gradation échouée',
  dimming_bulk_lcu: 'Gradation en masse LCU',
  calculator_run: 'Calculateur exécuté',
  calculator_run_all: 'Calculateur exécuté sur le parc',
  alert_acknowledged: 'Alerte acquittée',
  alert_resolved: 'Alerte résolue',
  alert_closed: 'Alerte fermée',
  work_order_created_from_alert: 'BT créé depuis une alerte',
  work_order_created: 'Bon de travail créé',
  work_order_assigned: 'Bon de travail assigné',
  work_order_started: 'Bon de travail démarré',
  work_order_accepted: 'Bon de travail accepté',
  work_order_resolved: 'Bon de travail résolu',
  work_order_closed: 'Bon de travail clôturé',
  work_order_cancelled: 'Bon de travail annulé',
  work_order_reopened: 'Bon de travail réouvert',
  work_order_note_added: 'Note ajoutée au BT',
  simulation_measure_generated: 'Télémétrie simulée',
  simulation_run_all: 'Simulation globale',
  simulation_scenario_started: 'Scénario simulé',
  user_created: 'Utilisateur créé',
  user_updated: 'Utilisateur modifié',
  user_deleted: 'Utilisateur supprimé',
  'lampadaires.import': 'Import de lampadaires',
  'lampadaires.bulk_update': 'Modification groupée de lampadaires',
  'lampadaires.bulk_archive': 'Archivage groupé de lampadaires',
  'alerts.bulk_ack': 'Acquittement groupé d’alertes',
  'alerts.bulk_resolve': 'Résolution groupée d’alertes',
  'alerts.bulk_close': 'Fermeture groupée d’alertes',
  'workorders.bulk_assign': 'Affectation groupée de BT',
}

export const ENTITY_LABELS = {
  lcu: 'LCU',
  lampadaire: 'Lampadaire',
  alert: 'Alerte',
  work_order: 'Bon de travail',
  user: 'Utilisateur',
  system: 'Système',
}

const SENSITIVE_ACTION = /(delete|password|reset|import|bulk|config|user_)/i

export const actionLabel = (action) => ACTION_LABELS[action] || action?.replaceAll('_', ' ') || 'Action inconnue'
export const entityLabel = (entity) => ENTITY_LABELS[entity] || entity || 'Système'

export function eventSeverity(entry) {
  if (entry?.status === 'error') return 'error'
  if (SENSITIVE_ACTION.test(entry?.action || '')) return 'sensitive'
  return 'normal'
}

function sortStructuredValue(value) {
  if (Array.isArray(value)) return value.map(sortStructuredValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortStructuredValue(value[key])]),
    )
  }
  return value
}

function comparable(value) {
  if (value === undefined) return '__undefined__'
  return JSON.stringify(sortStructuredValue(value))
}

export function diffAuditValues(before = {}, after = {}) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].sort()
  return keys
    .filter((key) => comparable(before?.[key]) !== comparable(after?.[key]))
    .map((key) => ({
      key,
      before: before?.[key],
      after: after?.[key],
      type: !(key in (before || {})) ? 'added' : !(key in (after || {})) ? 'removed' : 'changed',
    }))
}

export function formatAuditValue(value) {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function auditAPIParams(filters = {}) {
  const params = { ...filters }
  for (const key of Object.keys(params)) {
    if (params[key] === '' || params[key] == null || params[key] === false) delete params[key]
  }
  for (const key of ['from', 'to']) {
    if (params[key]) {
      const date = new Date(params[key])
      if (Number.isNaN(date.getTime())) delete params[key]
      else params[key] = date.toISOString()
    }
  }
  if (params.sensitive) params.sensitive = 'true'
  return params
}

export function toDateTimeLocal(date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

export function friendlyIPAddress(ip) {
  if (ip === '::1' || ip === '127.0.0.1') return 'Localhost'
  return ip || '—'
}

export function parseUserAgent(userAgent = '') {
  if (!userAgent) return '—'
  const browser = userAgent.match(/Edg\/([\d.]+)/)?.[1]
    ? `Edge ${userAgent.match(/Edg\/([\d.]+)/)[1]}`
    : userAgent.match(/Firefox\/([\d.]+)/)?.[1]
      ? `Firefox ${userAgent.match(/Firefox\/([\d.]+)/)[1]}`
      : userAgent.match(/Chrome\/([\d.]+)/)?.[1]
        ? `Chrome ${userAgent.match(/Chrome\/([\d.]+)/)[1]}`
        : userAgent.match(/Safari\/([\d.]+)/)?.[1]
          ? 'Safari'
          : 'Client inconnu'
  const os = /Windows NT 10/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /(iPhone|iPad)/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : ''
  return [browser, os].filter(Boolean).join(' · ')
}

function csvCell(value) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function buildAuditCSV(entries) {
  const header = [
    'Date', 'Statut', 'Action', 'Libellé', 'Utilisateur', 'Rôle', 'Entité',
    'Référence', 'Description', 'IP', 'Source', 'Avant', 'Après',
  ]
  const rows = (entries || []).map((entry) => [
    entry.created_at, entry.status, entry.action, actionLabel(entry.action),
    entry.user_name || entry.user_id || 'Système', entry.user_role, entry.entity_type,
    entry.entity_reference, entry.description, entry.ip_address, entry.source,
    entry.old_values, entry.new_values,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}
