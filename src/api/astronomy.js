import client from './client'

// Lever/coucher du soleil pour une position (défaut : Casablanca).
// Base du pilotage crépusculaire (dusk-to-dawn) de l'éclairage public.
export const getSunTimes = (params = {}) => client.get('/astronomy/sun', { params })
