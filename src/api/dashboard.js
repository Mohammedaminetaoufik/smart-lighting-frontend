import client from './client'

export const getStats = () => client.get('/dashboard/stats')
export const getNetworkHealth = () => client.get('/dashboard/network-health')
export const getCommissioningProgress = () => client.get('/dashboard/commissioning-progress')
export const getEnergySummary = () => client.get('/energy/summary')

// Returns { days: [...], previous_total_kwh: float }
export const getDailyEnergy = (days = 30) => client.get('/energy/daily', { params: { days } })

export const getEnergyTopConsumers = (days = 30, limit = 8) =>
  client.get('/energy/top-consumers', { params: { days, limit } })

export const getEnergyAnomalies = (days = 30) =>
  client.get('/energy/anomalies', { params: { days } })

export const getEnergyHourly = () => client.get('/energy/hourly')

export const getEnergyRecommendations = () => client.get('/energy/recommendations')
