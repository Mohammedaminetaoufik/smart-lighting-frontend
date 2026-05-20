import client from './client'

export const getAuditLogs = (params) => client.get('/audit-logs', { params })
