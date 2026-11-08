import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { loginUser, registerUser, logoutUser, onAuthStateChange } from '../api/auth'
import { getPlayerState } from '../api/playerState'
import { adaptPlayerState } from '../api/adapters'
import { supabase } from '../api/supabaseClient'

const AppContext = createContext(null)

const makeDefaultPlayerState = (userId, email = '', callsign = '') => {
  const name = callsign || (email ? email.split('@')[0] : 'COMMANDER')
  return {
    userId,
    callsign: name,
    displayName: name,
    level: 1,
    xp: 0,
    xpToNextLevel: 500,
    currency: 0,
    totalMissions: 0,
    successRate: 0.83,
    totalDistanceKm: 0,
    currentRegion: 'jezero',
    suit: { id: 'suit_base', name: 'Base EVA Suit', oxygenCapacity: 6, radiationShielding: 0.2, weight: 50 },
    rover: null,
    inventory: [],
    achievements: [],
    unlockedRegions: ['jezero'],
    unlockedSuits: ['suit_base'],
    unlockedRovers: [],
    hasRover: false,
    isExtractionComplete: false,
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)           // { userId, email }
  const [playerState, setPlayerState] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const unsubRef = useRef(null)

  // ── Bootstrap session from Supabase on mount ─────────────────────────────
  useEffect(() => {
    // Use Supabase's onAuthStateChange to restore session (handles refresh tokens)
    const { data: { subscription } } = onAuthStateChange(async (userId) => {
      if (userId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const email = sessionData?.session?.user?.email ?? ''
          const metadata = sessionData?.session?.user?.user_metadata
          const callsign = metadata?.username || metadata?.display_name || ''
          const realPS = await getPlayerState(userId)
          const adapted = adaptPlayerState(realPS)
          setUser({ userId, email })
          setPlayerState(adapted || makeDefaultPlayerState(userId, email, callsign))
        } catch (err) {
          console.error('[AppContext] Failed to load player state:', err)
          const { data: sessionData } = await supabase.auth.getSession()
          const email = sessionData?.session?.user?.email ?? ''
          setUser({ userId, email })
          setPlayerState(makeDefaultPlayerState(userId, email))
        }
      } else {
        setUser(null)
        setPlayerState(null)
      }
      setAuthLoading(false)
    })

    unsubRef.current = subscription

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true)
    const { userId, error } = await loginUser(email, password)
    if (error) {
      setLoading(false)
      return { user: null, error }
    }
    try {
      const realPS = await getPlayerState(userId)
      const adapted = adaptPlayerState(realPS)
      setUser({ userId, email })
      setPlayerState(adapted || makeDefaultPlayerState(userId, email))
      setLoading(false)
      return { user: { userId, email }, error: null }
    } catch (err) {
      setUser({ userId, email })
      setPlayerState(makeDefaultPlayerState(userId, email))
      setLoading(false)
      return { user: { userId, email }, error: null }
    }
  }, [])

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (email, password, callsign) => {
    setLoading(true)
    // registerUser expects (email, password, username)
    const { userId, error } = await registerUser(email, password, callsign)
    if (error) {
      setLoading(false)
      return { user: null, error }
    }
    try {
      // After registration, player_progress row is created by DB trigger.
      // Wait briefly for trigger to fire, then load state.
      await new Promise(r => setTimeout(r, 600))
      const realPS = await getPlayerState(userId)
      const adapted = adaptPlayerState(realPS)
      setUser({ userId, email })
      setPlayerState(adapted || makeDefaultPlayerState(userId, email, callsign))
      setLoading(false)
      return { user: { userId, email }, error: null }
    } catch (err) {
      setUser({ userId, email })
      setPlayerState(makeDefaultPlayerState(userId, email, callsign))
      setLoading(false)
      return { user: { userId, email }, error: null }
    }
  }, [])

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await logoutUser()
    setUser(null)
    setPlayerState(null)
  }, [])

  // ── Refresh player state ──────────────────────────────────────────────────
  const refreshPlayerState = useCallback(async () => {
    if (!user?.userId) return
    try {
      const realPS = await getPlayerState(user.userId)
      const adapted = adaptPlayerState(realPS)
      setPlayerState(adapted)
    } catch (err) {
      console.error('[AppContext] Failed to refresh player state:', err)
    }
  }, [user])

  // ── Notification system ───────────────────────────────────────────────────
  const addNotification = useCallback((notif) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { ...notif, id }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000)
  }, [])

  const value = {
    user,
    playerState,
    loading,
    authLoading,
    login,
    logout,
    register,
    refreshPlayerState,
    notifications,
    addNotification,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
