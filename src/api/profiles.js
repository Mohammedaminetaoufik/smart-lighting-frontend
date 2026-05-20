import client from './client'

export const getProfiles = () => client.get('/lighting-profiles')
export const createProfile = (data) => client.post('/lighting-profiles', data)
export const getProfileDetails = (id) => client.get(`/lighting-profiles/${id}/details`)
export const enableProfile = (id) => client.post(`/lighting-profiles/${id}/enable`)
export const disableProfile = (id) => client.post(`/lighting-profiles/${id}/disable`)
export const applyProfile = (id, data) => client.post(`/lighting-profiles/${id}/apply`, data)
export const getGroups = () => client.get('/lighting-groups')
export const createGroup = (data) => client.post('/lighting-groups', data)
