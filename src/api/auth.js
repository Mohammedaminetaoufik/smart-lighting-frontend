import client from './client'

export const loginApi        = (email, password)          => client.post('/auth/login', { email, password })
export const meApi           = ()                         => client.get('/auth/me')
export const logoutApi       = ()                         => client.post('/auth/logout')
export const changePasswordApi = (current, next)          => client.post('/auth/change-password', { current_password: current, new_password: next })
export const resetPasswordApi  = (userId, newPassword)    => client.post('/auth/admin/reset-password', { user_id: userId, new_password: newPassword })
