import client from './client'

export const bulkUpdateLampadaires = (ids, updates) =>
  client.patch('/lampadaires/bulk', { ids, updates })

export const bulkArchiveLampadaires = (ids) =>
  client.post('/lampadaires/bulk/archive', { ids })

export const bulkAlertAction = (ids, action) =>
  client.post('/alerts/bulk-action', { ids, action })

export const bulkAssignWorkOrders = (ids, user_id) =>
  client.post('/workorders/bulk-assign', { ids, user_id })
