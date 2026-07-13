import client from './client'

// Maintenance prédictive
export const getAtRiskLamps = () => client.get('/faults/at-risk')
export const getFaultStats = () => client.get('/faults/stats')
export const getLampFaults = (id) => client.get(`/lampadaires/${id}/faults`)
