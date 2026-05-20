import client from './client'

export const getLampadaires = (params) => client.get('/lampadaires', { params })
export const importLampadaires = (rows) => client.post('/lampadaires/import', { rows })
export const getLampadaire = (id) => client.get(`/lampadaires/${id}`)
export const getMissingLocation = () => client.get('/lampadaires/missing-location')
export const updateLocation = (id, data) => client.post(`/lampadaires/${id}/location`, data)
export const updateCommissioning = (id, data) => client.post(`/lampadaires/${id}/commissioning`, data)
export const getDiagnostic = (id) => client.get(`/lampadaires/${id}/diagnostic`)
export const setDimming = (id, { intensity, new_intensity, ...rest }) =>
  client.post(`/lampadaires/${id}/dimming`, {
    new_intensity: new_intensity ?? intensity,
    ...rest,
  })
export const getDimmingHistory = (id) => client.get(`/lampadaires/${id}/dimming`)
export const getTelemetry = (id, params) => client.get(`/lampadaires/${id}/telemetry`, { params })
export const getLatestTelemetry = (id) => client.get(`/lampadaires/${id}/telemetry/latest`)
export const getDecisions = (id) => client.get(`/lampadaires/${id}/decisions`)
export const assignLCU = (id, lcuId) => client.post(`/lampadaires/${id}/assign-lcu`, { lcu_id: lcuId ?? null })
