import client from './client'

export const getAuditLogs = (params) => client.get('/audit-logs', { params })
export const getAuditLog = (id, source = 'audit') => client.get(`/audit-logs/${id}`, { params: { source } })
export const getAuditSummary = () => client.get('/audit-logs/summary')

export async function getAllAuditLogs(params = {}) {
  const limit = 500
  let offset = 0
  let total = 0
  const logs = []

  do {
    const page = await getAuditLogs({ ...params, include_details: true, limit, offset })
    const pageLogs = page?.logs || []
    logs.push(...pageLogs)
    total = page?.total || logs.length
    offset += limit
    if (pageLogs.length === 0) break
  } while (logs.length < total)

  return logs
}
