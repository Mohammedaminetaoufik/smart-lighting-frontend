import client from './client'

export const getMaintenanceWindows = () => client.get('/maintenance-windows')
export const createMaintenanceWindow = (data) => client.post('/maintenance-windows', data)
export const deleteMaintenanceWindow = (id) => client.delete(`/maintenance-windows/${id}`)
