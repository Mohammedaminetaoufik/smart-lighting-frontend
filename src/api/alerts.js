import client from './client'

export const getAlerts = (params) => client.get('/alerts', { params })
export const getAlertCounts = () => client.get('/alerts/counts')
export const getAlertSummary = () => client.get('/alerts/summary')
export const resolveAlert = (id) => client.post(`/alerts/${id}/resolve`)
export const ackAlert = (id) => client.post(`/alerts/${id}/ack`)
export const closeAlert = (id) => client.post(`/alerts/${id}/close`)
export const createInterventionFromAlert = (id, data) => client.post(`/alerts/${id}/intervention`, data)
export const createWorkOrderFromAlert = (id) => client.post(`/alerts/${id}/create-work-order`)
