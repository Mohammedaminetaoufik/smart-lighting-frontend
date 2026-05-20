import client from './client'

export const simulateTelemetry = (id) => client.post(`/simulator/telemetry/${id}`)
export const simulateAll = () => client.post('/simulator/telemetry/all')
export const getScenarios = () => client.get('/simulator/scenarios')
export const runScenario = (data) => client.post('/simulator/scenario', data)
