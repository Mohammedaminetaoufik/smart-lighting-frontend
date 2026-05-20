import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr))
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export function statusColor(etat) {
  switch (etat) {
    case 'online':      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' }
    case 'offline':     return { bg: 'bg-red-100 dark:bg-red-900/30',   text: 'text-red-700 dark:text-red-400',   dot: 'bg-red-500' }
    case 'maintenance': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' }
    default:            return { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' }
  }
}

export function severityColor(severity) {
  switch (severity) {
    case 'critical': return { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400' }
    case 'warning':  return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' }
    case 'info':     return { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400' }
    default:         return { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-600 dark:text-gray-400' }
  }
}

export function commissioningColor(status) {
  const map = {
    commissioned: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
    tested:       { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400' },
    configured:   { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
    located:      { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    discovered:   { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-600 dark:text-gray-400' },
  }
  return map[status] || map.discovered
}

export function priorityColor(priority) {
  switch (priority) {
    case 'critical': return { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400' }
    case 'high':     return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' }
    case 'medium':   return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' }
    case 'low':      return { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-600 dark:text-gray-400' }
    default:         return { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-600 dark:text-gray-400' }
  }
}

export function intensityColor(value) {
  if (value >= 80) return 'text-green-500'
  if (value >= 50) return 'text-amber-500'
  return 'text-blue-500'
}

export function markerColor(etat) {
  switch (etat) {
    case 'online':      return '#22c55e'
    case 'offline':     return '#ef4444'
    case 'maintenance': return '#f59e0b'
    default:            return '#6b7280'
  }
}

export function labelStatus(etat) {
  const map = { online: 'En ligne', offline: 'Hors ligne', maintenance: 'Maintenance' }
  return map[etat] || etat
}

export function labelSeverity(s) {
  const map = { critical: 'Critique', warning: 'Avertissement', info: 'Info' }
  return map[s] || s
}

export function labelCommissioning(s) {
  const map = {
    commissioned: 'Mis en service',
    tested: 'Testé',
    configured: 'Configuré',
    located: 'Localisé',
    discovered: 'Découvert',
  }
  return map[s] || s
}

export function labelPriority(p) {
  const map = { critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible' }
  return map[p] || p
}
