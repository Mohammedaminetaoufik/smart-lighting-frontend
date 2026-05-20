import client from './client'

export const getLCUs = () => client.get('/lcus')
export const getLCU = (id) => client.get(`/lcus/${id}`)
export const createLCU = (data) => client.post('/lcus', data)
export const testLCU = (id) => client.post(`/lcus/${id}/test`)
export const syncLCU = (id) => client.post(`/lcus/${id}/sync`)
export const getLCULampadaires = (id) => client.get(`/lcus/${id}/lampadaires`)
