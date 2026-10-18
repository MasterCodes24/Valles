import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Activity, Target, Map, Star, Radio, TrendingUp, Shield, Zap } from 'lucide-react'
import { StatCard, PageHeader, SectionTitle, ResourceBar } from '../components/ui/SharedComponents'
import { getMissions, getWeeklyChallenge, getExplorationLog } from '../api/mockApi'
import './DashboardPage.css'

export default function DashboardPage() {
  const { playerState } = useApp()
  const [missions, setMissions] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [log, setLog] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getMissions('mock-uid-001', 'jezero').then(setMissions)
    getWeeklyChallenge().then(setChallenge)
    getExplorationLog('mock-uid-001').then(setLog)
  }, [])

  if (!playerState) return null

  const xpPct = Math.min(100, (playerState.xp / playerState.xpToNextLevel) * 100)
  const availMissions = missions.filter(m => m.status === 'available')
  const completedMissions = missions.filter(m => m.status === 'completed')

  return (
    <div className="dashboard animate-fadeInUp">
      {/* Hero / Welcome */}
      <div className="dash-hero">
        <div className="dash-hero-text">
          <div className="dash-region-tag badge badge-mars">📍 {playerState.currentRegion.toUpperCase()}</div>
          <h1 style={{ fontSize: 'var(--text-4xl)', marginTop: 'var(--space-3)' }}>
            Welcome back, <span style={{ color: 'var(--clr-mars-200)' }}>{playerState.callsign}</span>
          </h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: 'var(--space-2)' }}>
            Level {playerState.level} Commander · {completedMissions.length} missions complete · {playerState.totalDistanceKm} km traversed
          </p>
        </div>

        {/* XP Progress */}
        <div className="dash-xp-card card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span className="label">Experience Points</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--clr-time)' }}>
              {playerState.xp} / {playerState.xpToNextLevel}
            </span>
          </div>
          <div className="stat-bar" style={{ height: 10, marginBottom: 'var(--space-3)' }}>
            <div className="stat-bar-fill time" style={{ width: `${xpPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
            <span>LVL {playerState.level}</span>
            <span>{(xpPct).toFixed(0)}% to LVL {playerState.level + 1}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stats">
        <StatCard label="Total Missions" value={playerState.totalMissions} icon={Target} color="var(--clr-mars-200)" />
        <StatCard label="Success Rate" value={`${(playerState.successRate * 100).toFixed(0)}`} unit="%" icon={TrendingUp} color="var(--clr-safe)" trend={5} />
        <StatCard label="Distance Traversed" value={playerState.totalDistanceKm} unit="km" icon={Map} color="var(--clr-ice-300)" />
        <StatCard label="Current Level" value={playerState.level} unit={`/ 10`} icon={Zap} color="var(--clr-battery)" />
      </div>

      {/* Suit + Rover */}
      <div className="dash-equipment">
        <SectionTitle accent>Active Equipment</SectionTitle>
        <div className="equipment-grid">
          <div className="card equip-card">
            <Shield size={20} style={{ color: 'var(--clr-mars-200)', marginBottom: 'var(--space-3)' }} />
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>{playerState.suit.name}</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
              <span>O₂ {playerState.suit.oxygenCapacity}h</span>
              <span>Rad Shield {(playerState.suit.radiationShielding * 100).toFixed(0)}%</span>
              <span>{playerState.suit.weight}kg</span>
            </div>
          </div>
          <div className="card equip-card">
            <Activity size={20} style={{ color: 'var(--clr-ice-300)', marginBottom: 'var(--space-3)' }} />
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>{playerState.rover.name}</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
              <span>Range {playerState.rover.batteryCapacity}km</span>
              <span>Cargo {playerState.rover.cargoCapacity}kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-actions">
        <SectionTitle accent>Quick Actions</SectionTitle>
        <div className="actions-grid">
          <button className="action-btn btn btn-primary" onClick={() => navigate('/game/map')}>
            <Map size={20} />
            <span>Plan Route</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>Select start & destination</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/missions')}>
            <Target size={20} />
            <span>Missions</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>{availMissions.length} available</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/explore')}>
            <Activity size={20} />
            <span>Free Roam</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>Explore the terrain</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/weekly-challenge')}>
            <Star size={20} style={{ color: 'var(--clr-battery)' }} />
            <span>Challenge</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>1500 XP reward</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dash-log">
        <SectionTitle accent>Recent Activity</SectionTitle>
        <div className="log-list">
          {log.map(entry => (
            <div key={entry.id} className="log-item card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>{entry.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>{entry.details}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {entry.xpDelta > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-time)' }}>+{entry.xpDelta} XP</span>
                  )}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginTop: 2 }}>
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
