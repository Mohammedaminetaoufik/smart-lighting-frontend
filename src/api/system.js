import client from './client'

export const getSystemConfig = () => client.get('/system/config')
export const updateSystemConfig = (config) => client.put('/system/config', config)
