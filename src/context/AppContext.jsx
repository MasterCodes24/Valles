import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getPlayerState, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/mockApi'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [playerState, setPlayerState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Simulate session persistence
  useEffect(() => {
    const stored = localStorage.getItem('valles_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUser(u)
      getPlayerState(u.id).then(ps => {
        setPlayerState(ps)
        setAuthLoading(false)
      })
    } else {
      setAuthLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    const { user: u, error } = await apiLogin({ email, password })
    if (!error) {
      setUser(u)
      localStorage.setItem('valles_user', JSON.stringify(u))
      const ps = await getPlayerState(u.id)
      setPlayerState(ps)
    }
    setLoading(false)
    return { user: u, error }
  }, [])

  const register = useCallback(async (email, password, callsign) => {
    setLoading(true)
    const { user: u, error } = await apiRegister({ email, password, callsign })
    if (!error) {
      setUser(u)
      localStorage.setItem('valles_user', JSON.stringify(u))
      const ps = await getPlayerState(u.id)
      setPlayerState(ps)
    }
    setLoading(false)
    return { user: u, error }
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
    setPlayerState(null)
    localStorage.removeItem('valles_user')
  }, [])

  const refreshPlayerState = useCallback(async () => {
    if (!user) return
    const ps = await getPlayerState(user.id)
    setPlayerState(ps)
  }, [user])

  // Notification system
  const [notifications, setNotifications] = useState([])
  const addNotification = useCallback((notif) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { ...notif, id }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }, [])

  const value = {
    user, playerState, loading, authLoading,
    login, logout, register, refreshPlayerState,
    notifications, addNotification,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
