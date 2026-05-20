import client from './client'

export const runCalculator = (id) => client.post(`/calculateur/run/${id}`)
export const runAllCalculator = () => client.post('/calculateur/run-all')
