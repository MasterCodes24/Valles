import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getLevelConfig } from '../api/mockApi'
import { PageHeader } from '../components/ui/SharedComponents'
import { useNavigate } from 'react-router-dom'
import { User, Shield, Activity, Star, ChevronRight, Lock, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const { playerState, logout } = useApp()
  const [levelConfig, setLevelConfig] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getLevelConfig().then(setLevelConfig)
  }, [])

  if (!playerState) return null

  const xpPct = Math.min(100, (playerState.xp / playerState.xpToNextLevel) * 100)

  return (
    <div className="animate-fadeInUp">
      <PageHeader title="Commander Profile" subtitle="Your Mars expedition record" />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)' }}>
        {/* Profile Card */}
        <div>
          <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto var(--space-5)',
              background: 'linear-gradient(135deg, var(--clr-mars-600), var(--clr-mars-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-mars)',
            }}>
              <User size={36} style={{ color: 'white' }} />
            </div>
            <h2 style={{ marginBottom: 'var(--space-1)', color: 'var(--clr-mars-200)' }}>{playerState.callsign}</h2>
            <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>Level {playerState.level} Commander</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span className="label">XP Progress</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-time)' }}>{playerState.xp} / {playerState.xpToNextLevel}</span>
            </div>
            <div className="stat-bar" style={{ height: 10, marginBottom: 'var(--space-5)' }}>
              <div className="stat-bar-fill time" style={{ width: `${xpPct}%` }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', textAlign: 'center' }}>
              {[
                { label: 'Missions', value: playerState.totalMissions },
                { label: 'Success', value: `${(playerState.successRate * 100).toFixed(0)}%` },
                { label: 'Distance', value: `${playerState.totalDistanceKm}km` },
                { label: 'Region', value: 'Jezero' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--clr-mars-200)', marginBottom: 2 }}>{value}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Achievements</h4>
            {playerState.achievements.map(ach => (
              <div key={ach} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--clr-border)' }}>
                <Star size={16} style={{ color: 'var(--clr-battery)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{ach.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level Progression */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-6)' }}>Mission Progression</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {levelConfig.map(lvl => {
              const isCurrent = lvl.level === playerState.level
              const isPast = lvl.level < playerState.level
              return (
                <div key={lvl.level} style={{
                  display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start',
                  padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                  background: isCurrent ? 'rgba(200,74,0,0.08)' : isPast ? 'rgba(46,204,113,0.05)' : 'var(--clr-surface-1)',
                  border: isCurrent ? '1px solid rgba(200,74,0,0.3)' : '1px solid var(--clr-border)',
                  opacity: !isPast && !isCurrent ? 0.5 : 1,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 'var(--text-sm)', flexShrink: 0,
                    background: isPast ? 'var(--clr-safe)' : isCurrent ? 'var(--clr-mars-400)' : 'var(--clr-surface-3)',
                    color: isPast || isCurrent ? 'white' : 'var(--clr-text-muted)',
                  }}>
                    {isPast ? <CheckCircle size={16} /> : lvl.level}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, color: isCurrent ? 'var(--clr-mars-200)' : isPast ? 'var(--clr-safe)' : 'var(--clr-text-muted)' }}>
                        Level {lvl.level}
                        {isCurrent && <span style={{ marginLeft: 8, fontSize: 'var(--text-xs)', color: 'var(--clr-mars-300)' }}>← CURRENT</span>}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>{lvl.xpRequired.toLocaleString()} XP</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {lvl.unlocks.map(u => (
                        <span key={u} className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--clr-text-secondary)', border: '1px solid var(--clr-border)', fontSize: '0.65rem' }}>
                          {isPast ? <CheckCircle size={9} style={{ marginRight: 3 }} /> : !isCurrent && <Lock size={9} style={{ marginRight: 3 }} />}
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {playerState.level >= 10 && (
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/game/ending')}>
                🚀 Proceed to Extraction
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
