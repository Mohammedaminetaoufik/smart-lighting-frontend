import client from './client'

/* Cabinets */
export const getCabinets = () => client.get('/cabinets')
export const getCabinet = (id) => client.get(`/cabinets/${id}`)
export const getCabinetCircuits = (id) => client.get(`/cabinets/${id}/circuits`)
export const createCabinetCircuit = (id, data) => client.post(`/cabinets/${id}/circuits`, data)
export const simulateCabinetDoorOpen = (id) => client.post(`/cabinets/${id}/simulate-door-open`)
export const simulateCabinetPowerFailure = (id) => client.post(`/cabinets/${id}/simulate-power-failure`)

/* Basestations */
export const getBasestations = () => client.get('/basestations')
export const getBasestation = (id) => client.get(`/basestations/${id}`)
export const getBasestationControllers = (id) => client.get(`/basestations/${id}/controllers`)
export const simulateBasestationOffline = (id) => client.post(`/basestations/${id}/simulate-offline`)

/* Controllers */
export const getControllers = () => client.get('/controllers')
export const getController = (id) => client.get(`/controllers/${id}`)
export const associateController = (id, lampadaire_id) =>
  client.post(`/controllers/${id}/associate`, { lampadaire_id })
