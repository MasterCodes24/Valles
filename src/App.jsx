import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import GameLayout from './layouts/GameLayout'
import PlannerLayout from './layouts/PlannerLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import SimulationPage from './pages/SimulationPage'
import ProfilePage from './pages/ProfilePage'
import InventoryPage from './pages/InventoryPage'
import MissionsPage from './pages/MissionsPage'
import WeeklyChallengePage from './pages/WeeklyChallengePage'
import EarthCommsPage from './pages/EarthCommsPage'
import MissionReportPage from './pages/MissionReportPage'
import ExplorationPage from './pages/ExplorationPage'
import EndingPage from './pages/EndingPage'
import PlannerPage from './pages/PlannerPage'
import NotificationToast from './components/ui/NotificationToast'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, authLoading } = useApp()
  if (authLoading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function FullscreenLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--clr-void)',
      flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--clr-surface-3)',
        borderTopColor: 'var(--clr-mars-300)',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
        INITIALIZING SYSTEMS...
      </p>
    </div>
  )
}

function AppRoutes() {
  const { notifications } = useApp()
  return (
    <>
      <NotificationToast notifications={notifications} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Game (Product A) */}
        <Route path="/game" element={<ProtectedRoute><GameLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/game/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="simulation" element={<SimulationPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="missions/:id/report" element={<MissionReportPage />} />
          <Route path="explore" element={<ExplorationPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="weekly-challenge" element={<WeeklyChallengePage />} />
          <Route path="earth-comms" element={<EarthCommsPage />} />
          <Route path="ending" element={<EndingPage />} />
        </Route>

        {/* Planner (Product B) */}
        <Route path="/planner" element={<PlannerLayout />}>
          <Route index element={<PlannerPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
