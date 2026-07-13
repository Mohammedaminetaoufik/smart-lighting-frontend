import client from './client'

// Tarification ONEE (postes horaires + mapping + globals)
export const getTariffs = () => client.get('/energy/tariffs')
export const updateTariffs = (config) => client.put('/energy/tariffs', config)

// Facture énergie réelle en DH, ventilée par poste horaire
export const getEnergyBill = (days = 30) => client.get('/energy/bill', { params: { days } })

// Synthèse financière compacte (coût jour/mois, économies DH, projection, CO2)
export const getFinancialSummary = () => client.get('/finance/summary')
