import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  Map, Zap, Shield, Package, Radio, Star,
  Globe, ChevronRight, LogOut, User, Target,
  Activity, BookOpen, Rocket, Menu, X
} from 'lucide-react'
import './GameLayout.css'

const NAV = [
  { to: '/game/dashboard', icon: Activity, label: 'Dashboard' },
  { to: '/game/map', icon: Map, label: 'Mission Map' },
  { to: '/game/missions', icon: Target, label: 'Missions' },
  { to: '/game/explore', icon: Globe, label: 'Exploration' },
  { to: '/game/weekly-challenge', icon: Star, label: 'Challenge' },
  { to: '/game/earth-comms', icon: Radio, label: 'Earth Comms' },
  { to: '/game/profile', icon: User, label: 'Profile' },
  { to: '/game/inventory', icon: Package, label: 'Inventory' },
]

export default function GameLayout() {
  const { playerState, logout, user } = useApp()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const xpPct = playerState
    ? Math.min(100, (playerState.xp / playerState.xpToNextLevel) * 100)
    : 0

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="game-layout">
      {/* Mobile toggle */}
      <button className="sidebar-toggle btn btn-ghost btn-icon" onClick={() => setSidebarOpen(o => !o)}>
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <aside className={`game-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Rocket size={22} className="logo-icon" />
            <span className="logo-text">VALLES</span>
          </div>
          <div className="sidebar-badge badge badge-mars">GAME</div>
        </div>

        {/* Player info */}
        {playerState && (
          <div className="sidebar-player">
            <div className="player-avatar">
              <Shield size={18} />
            </div>
            <div className="player-info">
              <div className="player-callsign">{playerState.callsign}</div>
              <div className="player-level">
                <span>LVL {playerState.level}</span>
                <span className="xp-label">{playerState.xp} XP</span>
              </div>
              <div className="stat-bar" style={{ marginTop: '4px' }}>
                <div className="stat-bar-fill time" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className="nav-item" onClick={() => setSidebarOpen(false)}>
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRight size={13} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/planner" className="planner-link" target="_blank">
            <Zap size={15} />
            <span>Mission Planner</span>
          </a>
          <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="game-main">
        <div className="game-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
