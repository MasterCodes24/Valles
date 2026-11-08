import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Star, Clock, Trophy, Zap, Shield, CheckCircle, Flame, Target, Map, Wind } from 'lucide-react'

// ─── 4 hard weekly challenges that rotate by week number ─────────────────────
const WEEKLY_CHALLENGES = [
  {
    id: 'wc_great_traverse',
    title: 'THE GREAT TRAVERSE',
    subtitle: 'Jezero Complete Circuit',
    icon: '🗺️',
    description: `Complete a full circuit of the Jezero Crater exploration zone, visiting ALL four discovery sites in a single EVA session.
The catch: your oxygen starts depleting 40% faster than normal. You must carefully plan your route, use sprint only when essential, and return to base with at least 10% oxygen remaining.
This challenge was designed to take 5-6 days to master. Most astronauts fail their first attempt.`,
    objectives: [
      'Visit Delta Deposit (X:150, Z:80)',
      'Visit Esker Ridge (X:-200, Z:150)',
      'Visit Ancient Shoreline (X:300, Z:-200)',
      'Visit Lava Tube (X:-100, Z:-250)',
      'Return to base camp with O₂ > 10%',
      'Complete within a single uninterrupted session',
      'Total radiation exposure must stay below 5.0 mSv',
    ],
    constraints: { maxTimeHrs: 999, minOxygenRemainingPct: 10, maxRadiationMSv: 5.0 },
    reward: { xp: 2500, badge: 'Circuit Breaker', currency: 800 },
    difficulty: 9,
    estimatedDays: '5-6 days',
    tips: [
      'Plan the most efficient route before starting',
      'Never sprint for more than 10 seconds at a time',
      'Visit closer sites first to conserve O₂',
      'High radiation near Lava Tube — move quickly there',
    ],
  },
  {
    id: 'wc_ascent_of_mesa',
    title: 'ASCENT OF THE MESA',
    subtitle: 'High Altitude Endurance Run',
    icon: '⛰️',
    description: `The Mesa formation (X:280, Z:300) is the highest point on the map. Your challenge: reach the summit, stay there for 5 minutes under extreme radiation, and return to base.
Sounds simple. But at altitude, cosmic radiation is 3× worse and every jump drains your battery. Five days of practice routes strongly recommended.`,
    objectives: [
      'Reach Mesa summit altitude > 38m',
      'Survive 5 minutes at altitude above 35m',
      'Endure radiation exceeding 4.0 mSv',
      'Return to base with battery > 5%',
      'Do not die (O₂ reaches 0) during the attempt',
    ],
    constraints: { maxTimeHrs: 999, minOxygenRemainingPct: 1, maxRadiationMSv: 6.0 },
    reward: { xp: 2200, badge: 'Summit Conqueror', currency: 700 },
    difficulty: 8,
    estimatedDays: '5 days',
    tips: [
      'Sprint up the mesa quickly to reduce time exposed to radiation',
      'Jump conservatively — battery drain is fatal at altitude',
      'Study the terrain before your first real attempt',
      'Battery management is the true skill being tested',
    ],
  },
  {
    id: 'wc_survival_run',
    title: 'NO OXYGEN RETREAT',
    subtitle: 'Emergency Evacuation Scenario',
    icon: '💨',
    description: `Your backup O₂ supply has failed. You are spawned at the farthest corner of the map (X:-400, Z:-400) with only 35% oxygen. Walk — don't sprint — back to base.
Every second counts. Every step drains your air. This challenge simulates a real emergency EVA scenario and has a failure rate of over 90% among first-time attempts.`,
    objectives: [
      'Start from position X:-400, Z:-400 (navigate there first)',
      'Return to base camp (within 50m of habitat)',
      'Arrive alive — O₂ must not hit 0',
      'Do not sprint at all during the return journey',
      'Battery must be above 0% on arrival',
    ],
    constraints: { maxTimeHrs: 999, minOxygenRemainingPct: 0.1, maxRadiationMSv: 999 },
    reward: { xp: 2800, badge: 'Iron Lungs', currency: 900 },
    difficulty: 10,
    estimatedDays: '6 days',
    tips: [
      'Walk, never sprint — the difference is about 25% more O₂ drain',
      'Take the most direct route — explore the map first to memorize it',
      'This is the hardest challenge in the game — don\'t give up',
      'Average successful attempt takes 5+ practice runs',
    ],
  },
  {
    id: 'wc_four_flags',
    title: 'FLAG PLANTER',
    subtitle: 'Speed and Precision Challenge',
    icon: '🚩',
    description: `Reach all four discovery flags as fast as possible while keeping radiation under 3.5 mSv total. Sprint everywhere, but watch the radiation — the faster you move, the more your suit strains.
Top players complete this in under 12 minutes. The leaderboard is brutal. Study optimal routes for multiple days before attempting.`,
    objectives: [
      'Tag Delta Deposit, Esker Ridge, Ancient Shoreline, and Lava Tube',
      'Complete in minimum total time (speed scored)',
      'Radiation total must stay under 3.5 mSv',
      'O₂ must remain above 20% throughout',
      'Sprint allowed and encouraged',
    ],
    constraints: { maxTimeHrs: 999, minOxygenRemainingPct: 20, maxRadiationMSv: 3.5 },
    reward: { xp: 2000, badge: 'Speed Demon', currency: 650 },
    difficulty: 8,
    estimatedDays: '5-6 days',
    tips: [
      'Sprint heavily but pause to let radiation cool down',
      'Optimal route: Delta → Lava Tube → Shoreline → Esker (or reverse)',
      'Jumping is faster on slopes — use it',
      'Practice each flag route separately before doing all 4',
    ],
  },
]

// Pick challenge for current week
function getCurrentChallenge() {
  const now = new Date()
  const weekOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000))
  const challenge = WEEKLY_CHALLENGES[weekOfYear % WEEKLY_CHALLENGES.length]

  // Next reset: next Sunday midnight
  const nextReset = new Date(now)
  nextReset.setDate(now.getDate() + (7 - now.getDay()))
  nextReset.setHours(0, 0, 0, 0)

  return { challenge, nextReset, weekOfYear: weekOfYear + 1 }
}

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

const DIFF_STARS = (d) => Array(Math.min(d, 10)).fill('★').join('')

export default function WeeklyChallengePage() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [{ challenge, nextReset, weekOfYear }] = useState(getCurrentChallenge)
  const [accepted, setAccepted] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('valles_weekly_challenge') || '{}')
      return stored.id === challenge.id ? stored : null
    } catch { return null }
  })

  const coins = parseInt(localStorage.getItem('valles_coins') || '0')

  const handleAccept = () => {
    const entry = { id: challenge.id, status: 'started', startedAt: Date.now() }
    localStorage.setItem('valles_weekly_challenge', JSON.stringify(entry))
    localStorage.setItem('valles_active_explorer_challenge', JSON.stringify({
      id: challenge.id,
      title: challenge.title,
      objectives: challenge.objectives,
      xpReward: challenge.reward.xp,
      coinReward: challenge.reward.currency || 800,
    }))
    setAccepted(entry)
    navigate('/game/explore')
  }

  const handleContinue = () => {
    localStorage.setItem('valles_active_explorer_challenge', JSON.stringify({
      id: challenge.id,
      title: challenge.title,
      objectives: challenge.objectives,
      xpReward: challenge.reward.xp,
      coinReward: challenge.reward.currency || 800,
    }))
    navigate('/game/explore')
  }

  return (
    <div className="animate-fadeInUp" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.3)',
              borderRadius: 999, padding: '3px 12px', marginBottom: 10,
              fontSize: 10, color: '#f5c842', fontFamily: 'var(--font-mono)', fontWeight: 700,
            }}>
              <Star size={11} fill="#f5c842" /> WEEK {weekOfYear}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--clr-text-primary)', marginBottom: 4 }}>Weekly Challenge</h1>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 13 }}>Designed to take 5–6 days · Only completable in <strong style={{ color: '#4a9dc9' }}>Explorer Mode</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.3)',
              borderRadius: 10, padding: '10px 16px',
            }}>
              <span style={{ fontSize: 18 }}>🪙</span>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(245,200,66,0.7)', fontFamily: 'var(--font-mono)' }}>BALANCE</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f5c842', fontFamily: 'var(--font-mono)' }}>
                  {coins.toLocaleString()} COINS
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(23,28,46,0.8)', border: '1px solid rgba(255,125,46,0.2)',
              borderRadius: 10, padding: '10px 16px',
            }}>
              <Clock size={13} style={{ color: 'var(--clr-mars-300)' }} />
              <div>
                <div style={{ fontSize: 9, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>RESETS IN</div>
                <Countdown endAt={nextReset} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Main challenge card */}
        <div style={{
          background: 'var(--grad-card)',
          border: '1px solid rgba(245,200,66,0.3)',
          borderRadius: 16, padding: 28,
          boxShadow: '0 0 40px rgba(245,200,66,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Gold top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f5c842, #ff7d2e)' }} />

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ fontSize: 48 }}>{challenge.icon}</div>
            <div>
              <div style={{
                fontSize: 10, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em', marginBottom: 4,
              }}>{challenge.subtitle}</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#f5c842', letterSpacing: '0.03em', marginBottom: 6 }}>
                {challenge.title}
              </h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: '#ff7d2e', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  {DIFF_STARS(challenge.difficulty)} D{challenge.difficulty}/10
                </span>
                <span style={{
                  background: 'rgba(255,74,74,0.15)', border: '1px solid rgba(255,74,74,0.3)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 10,
                  color: '#ff4a4a', fontFamily: 'var(--font-mono)', fontWeight: 700,
                }}>
                  ⏱ ~{challenge.estimatedDays}
                </span>
                <span style={{
                  background: 'rgba(74,157,201,0.15)', border: '1px solid rgba(74,157,201,0.3)',
                  borderRadius: 999, padding: '2px 10px', fontSize: 10,
                  color: '#4a9dc9', fontFamily: 'var(--font-mono)', fontWeight: 700,
                }}>🎮 EXPLORER ONLY</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-line' }}>
            {challenge.description}
          </p>

          {/* Objectives */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 10 }}>
              OBJECTIVES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {challenge.objectives.map((obj, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#f5c842', fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 12, color: 'var(--clr-text-secondary)', lineHeight: 1.5 }}>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Constraints */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24,
          }}>
            {[
              { label: 'Min O₂ on Return', value: `${challenge.constraints.minOxygenRemainingPct}%`, color: 'var(--clr-oxygen)', icon: '💨' },
              { label: 'Max Radiation', value: `${challenge.constraints.maxRadiationMSv === 999 ? 'Unlimited' : challenge.constraints.maxRadiationMSv + ' mSv'}`, color: 'var(--clr-radiation)', icon: '☢️' },
              { label: 'Time Limit', value: challenge.constraints.maxTimeHrs === 999 ? 'None' : `${challenge.constraints.maxTimeHrs}h`, color: 'var(--clr-time)', icon: '⏱' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{
                background: 'var(--clr-surface-1)', borderRadius: 10, padding: 14,
                border: '1px solid var(--clr-border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginBottom: 4 }}>{icon} {label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Reward */}
          <div style={{
            display: 'flex', gap: 16, alignItems: 'center',
            background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
          }}>
            <Trophy size={32} style={{ color: '#f5c842', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f5c842', marginBottom: 4 }}>
                {challenge.reward.xp.toLocaleString()} XP + "{challenge.reward.badge}" Badge
              </div>
              <div style={{ fontSize: 11, color: '#f5c842', fontWeight: 600 }}>
                + {challenge.reward.currency} 🪙 Coins · Awarded on completion in Explorer Mode
              </div>
            </div>
          </div>

          {/* Action */}
          {accepted ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleContinue}
                style={{
                  flex: 1, background: 'linear-gradient(135deg, rgba(200,74,0,0.9), rgba(255,125,46,0.9))',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '15px 24px', fontSize: 14, fontWeight: 700,
                  fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                ▶ CONTINUE IN EXPLORER
              </button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)',
                borderRadius: 12, padding: '15px 20px', fontSize: 12, color: '#2ecc71',
              }}>
                <CheckCircle size={16} /> In Progress
              </div>
            </div>
          ) : (
            <button
              onClick={handleAccept}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #c8a44a, #f5c842)',
                color: '#000', border: 'none', borderRadius: 12,
                padding: '16px 24px', fontSize: 15, fontWeight: 800,
                fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.06em',
                textTransform: 'uppercase', transition: 'all 0.2s',
                boxShadow: '0 4px 24px rgba(245,200,66,0.3)',
              }}
              onMouseEnter={e => { e.target.style.boxShadow = '0 6px 32px rgba(245,200,66,0.5)'; e.target.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.target.style.boxShadow = '0 4px 24px rgba(245,200,66,0.3)'; e.target.style.transform = 'none' }}
            >
              <Star size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Accept Challenge & Launch Explorer
            </button>
          )}
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tips */}
          <div style={{
            background: 'var(--grad-card)', border: '1px solid rgba(255,125,46,0.2)',
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Flame size={16} style={{ color: '#ff7d2e' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--clr-text-primary)' }}>Commander Tips</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {challenge.tips.map((tip, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, fontSize: 11,
                  color: 'var(--clr-text-secondary)', lineHeight: 1.6,
                }}>
                  <span style={{ color: '#ff7d2e', flexShrink: 0, marginTop: 2 }}>→</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>

          {/* Coming challenges */}
          <div style={{
            background: 'var(--grad-card)', border: '1px solid var(--clr-border)',
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--clr-text-primary)', marginBottom: 14 }}>Upcoming Challenges</div>
            {WEEKLY_CHALLENGES.map((ch, i) => {
              const isCurrent = ch.id === challenge.id
              return (
                <div key={ch.id} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                  background: isCurrent ? 'rgba(245,200,66,0.08)' : 'var(--clr-surface-1)',
                  border: isCurrent ? '1px solid rgba(245,200,66,0.3)' : '1px solid var(--clr-border)',
                }}>
                  <span style={{ fontSize: 18 }}>{ch.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#f5c842' : 'var(--clr-text-primary)' }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      D{ch.difficulty}/10 · Week {(i + 1)}
                    </div>
                  </div>
                  {isCurrent && <div style={{ fontSize: 9, color: '#f5c842', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>NOW</div>}
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div style={{
            background: 'rgba(74,157,201,0.08)', border: '1px solid rgba(74,157,201,0.2)',
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Target size={16} style={{ color: '#4a9dc9' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#4a9dc9' }}>Challenge Format</div>
            </div>
            {[
              ['Mode Required', 'Explorer Mode only'],
              ['Duration', `~${challenge.estimatedDays} of practice`],
              ['Reward', `${challenge.reward.xp.toLocaleString()} XP + Badge`],
              ['Attempts', 'Unlimited — keep trying!'],
              ['Resets', 'Every Sunday midnight'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--clr-text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--clr-text-primary)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
