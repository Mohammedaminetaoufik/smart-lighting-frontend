import client from './client'

export const getStats = () => client.get('/dashboard/stats')
export const getNetworkHealth = () => client.get('/dashboard/network-health')
export const getCommissioningProgress = () => client.get('/dashboard/commissioning-progress')
export const getEnergySummary = () => client.get('/energy/summary')
export const getDailyEnergy   = (days = 30) => client.get('/energy/daily', { params: { days } })
