import React, { useEffect, useState } from 'react'
import { getWeeklyChallenge } from '../api/mockApi'
import { PageHeader } from '../components/ui/SharedComponents'
import { Star, Clock, Trophy, Zap, Shield, CheckCircle } from 'lucide-react'

function Countdown({ endAt }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const update = () => {
      const diff = new Date(endAt) - new Date()
      if (diff <= 0) { setRemaining('ENDED'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(`${d}d ${h}h ${m}m`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [endAt])
  return <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-warn)' }}>{remaining}</span>
}

export default function WeeklyChallengePage() {
  const [challenge, setChallenge] = useState(null)

  useEffect(() => {
    getWeeklyChallenge().then(setChallenge)
  }, [])

  if (!challenge) return null

  return (
    <div className="animate-fadeInUp">
      <PageHeader
        title="Weekly Challenge"
        subtitle="Compete globally — top scores unlock exclusive rewards"
        actions={<div className="badge badge-mars"><Star size={12} /> Week 12</div>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Challenge Card */}
        <div className="card" style={{ borderColor: 'rgba(245,200,66,0.3)', boxShadow: '0 0 20px rgba(245,200,66,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Star size={20} style={{ color: 'var(--clr-battery)', fill: 'var(--clr-battery)' }} />
              <h3>{challenge.title}</h3>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Clock size={12} /> <Countdown endAt={challenge.endAt} />
            </div>
          </div>

          <p style={{ marginBottom: 'var(--space-6)' }}>{challenge.description}</p>

          <h5 style={{ marginBottom: 'var(--space-4)', color: 'var(--clr-text-muted)' }}>CONSTRAINTS</h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <div style={{ background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Max Time
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--clr-time)' }}>{challenge.constraints.maxTimeHrs}h</div>
            </div>
            <div style={{ background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} /> Min O₂ Left
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--clr-oxygen)' }}>{challenge.constraints.minOxygenRemainingPct}%</div>
            </div>
            <div style={{ background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Shield size={11} /> Max Radiation
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--clr-radiation)' }}>{challenge.constraints.maxRadiationMSv} mSv</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'rgba(245,200,66,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,200,66,0.2)', marginBottom: 'var(--space-5)' }}>
            <Trophy size={28} style={{ color: 'var(--clr-battery)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700 }}>Reward: {challenge.reward.xp} XP</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>+ "{challenge.reward.badge}" badge</div>
            </div>
          </div>

          <button id="start-challenge-btn" className="btn btn-primary w-full btn-lg">
            <Star size={18} /> Accept Challenge
          </button>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)' }}>Leaderboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {challenge.leaderboard.map((entry, i) => (
              <div key={entry.rank} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                background: i === 0 ? 'rgba(245,200,66,0.08)' : 'var(--clr-surface-1)',
                border: i === 0 ? '1px solid rgba(245,200,66,0.2)' : '1px solid var(--clr-border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 'var(--text-sm)',
                  background: i === 0 ? '#f5c842' : i === 1 ? '#a0a0b0' : i === 2 ? '#b07040' : 'var(--clr-surface-3)',
                  color: i < 3 ? 'var(--clr-void)' : 'var(--clr-text-secondary)',
                }}>
                  {entry.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: i === 0 ? 'var(--clr-battery)' : 'var(--clr-text-primary)' }}>
                    {entry.callsign}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>O₂ Left: {entry.oxygenLeft}%</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--clr-time)' }}>{entry.time}</div>
              </div>
            ))}
            {challenge.userEntry === null && (
              <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--clr-text-muted)', fontSize: 'var(--text-sm)' }}>
                — You haven't competed yet —
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
