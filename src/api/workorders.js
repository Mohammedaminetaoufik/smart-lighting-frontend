import client from './client'

export const getWorkOrders = (params) => client.get('/workorders', { params })
export const createWorkOrder = (data) => client.post('/workorders', data)
export const getWorkOrder = (id) => client.get(`/workorders/${id}`)
export const assignWorkOrder = (id, data) => client.post(`/workorders/${id}/assign`, data)
export const startWorkOrder = (id) => client.post(`/workorders/${id}/start`)
export const resolveWorkOrder = (id, data) => client.post(`/workorders/${id}/resolve`, data)
export const closeWorkOrder = (id) => client.post(`/workorders/${id}/close`)
export const createWorkOrdersFromAlerts = (data) => client.post('/workorders/from-alerts', data)

export const getInterventions = (params) => client.get('/interventions', { params })
export const createIntervention = (data) => client.post('/interventions', data)
export const startIntervention = (id) => client.post(`/interventions/${id}/start`)
export const resolveIntervention = (id, data) => client.post(`/interventions/${id}/resolve`, data)
export const closeIntervention = (id) => client.post(`/interventions/${id}/close`)
