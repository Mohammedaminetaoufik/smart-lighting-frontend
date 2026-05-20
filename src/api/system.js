import client from './client'

export const getSystemHealth = () => client.get('/system/health')
export const getSystemVersion = () => client.get('/system/version')
export const getSystemJobs = () => client.get('/system/jobs')
export const getSystemConfig = () => client.get('/system/config')
export const updateSystemConfig = (config) => client.put('/system/config', config)
export const getHealthPing = () => client.get('/health')
