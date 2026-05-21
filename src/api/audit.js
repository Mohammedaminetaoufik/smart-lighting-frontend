import client from './client'

export const getAuditLogs = (params) => client.get('/audit-logs', { params })
export const getAuditLog = (id) => client.get(`/audit-logs/${id}`)
export const getAuditSummary = () => client.get('/audit-logs/summary')
