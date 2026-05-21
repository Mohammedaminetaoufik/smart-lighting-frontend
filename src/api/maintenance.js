import client from './client'

export const getMaintenanceWindows = (params) => client.get('/maintenance-windows', { params })
export const getMaintenanceWindow = (id) => client.get(`/maintenance-windows/${id}`)
export const getActiveMaintenanceWindows = () => client.get('/maintenance-windows/active')
export const getUpcomingMaintenanceWindows = () => client.get('/maintenance-windows/upcoming')
export const checkMaintenance = (params) => client.get('/maintenance-windows/check', { params })
export const createMaintenanceWindow = (data) => client.post('/maintenance-windows', data)
export const updateMaintenanceWindow = (id, data) => client.put(`/maintenance-windows/${id}`, data)
export const cancelMaintenanceWindow = (id) => client.post(`/maintenance-windows/${id}/cancel`)
export const completeMaintenanceWindow = (id) => client.post(`/maintenance-windows/${id}/complete`)
export const deleteMaintenanceWindow = (id) => client.delete(`/maintenance-windows/${id}`)
