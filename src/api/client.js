import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
})

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const url = err.config?.url || ''
    // Un 401 venant du proxy IA (jeton interne côté serveur) ou d'une route AI
    // ne signifie PAS que la session utilisateur a expiré — ne pas déconnecter.
    const isAIRoute = url.includes('/ai/')
    const isAuthBootstrap = url.includes('/auth/me') || url.includes('/auth/login') || url.includes('/auth/logout')
    if (err.response?.status === 401 && !isAIRoute && !isAuthBootstrap) {
      window.location.href = '/login'
      return Promise.reject(new Error('Session expirée — veuillez vous reconnecter'))
    }
    const msg = err.response?.data?.error || err.response?.data?.message || err.message
    return Promise.reject(new Error(msg))
  }
)

export default client
