import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { logoutApi, meApi } from '../api/auth'
import { resetMaadenAIWelcome } from '../utils/maadenAIWelcome'
import { resetMapStartup } from '../utils/mapStartup'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    meApi()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback((userData) => {
    // A successful login starts a new welcome cycle. A simple page refresh,
    // which uses meApi above, intentionally does not reset this value.
    resetMaadenAIWelcome()
    resetMapStartup()
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
