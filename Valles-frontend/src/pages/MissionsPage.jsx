import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Target, Lock, CheckCircle, ChevronRight, Play, Clock, Compass, Zap, AlertTriangle, RefreshCw } from 'lucide-react'

// ─── Mission generator (deterministic from seed so same missions all day) ────
const MISSION_POOL = [
  {
    title: 'Scout the Delta Deposit',
    description: 'Traverse to the ancient river delta and collect geological readings. The sediment layers here may hold evidence of ancient microbial life.',
    icon: '🏔️',
    objectives: ['Navigate to Delta Deposit marker (coords ~X:150, Z:80)', 'Spend 3 minutes surveying the site', 'Return to base camp with O₂ > 40%'],
    difficulty: 2, xpReward: 280, estimatedMins: 12, category: 'Exploration',
  },
  {
    title: 'Esker Ridge Survey',
    description: 'Climb Esker Ridge and map the ancient glacial formations. High altitude winds make this a challenging EVA.',
    icon: '⛰️',
    objectives: ['Reach Esker Ridge summit (coords ~X:-200, Z:150)', 'Maintain radiation below 2.0 mSv throughout', 'Document 2 unique rock formations'],
    difficulty: 3, xpReward: 420, estimatedMins: 18, category: 'Geology',
  },
  {
    title: 'Ancient Shoreline Investigation',
    description: 'The ancient shoreline suggests a vast ocean once covered this region. Walk the boundary and take readings.',
    icon: '🌊',
    objectives: ['Navigate to Ancient Shoreline (coords ~X:300, Z:-200)', 'Walk at least 500m along the shoreline boundary', 'Survive with battery > 25%'],
    difficulty: 2, xpReward: 320, estimatedMins: 15, category: 'Science',
  },
  {
    title: 'Lava Tube Descent',
    description: 'A collapsed lava tube offers potential shelter and unique geology. Explore the area carefully — steep terrain ahead.',
    icon: '🌋',
    objectives: ['Locate the Lava Tube entrance (coords ~X:-100, Z:-250)', 'Descend into the crater area', 'Survive for 8 minutes in the zone'],
    difficulty: 4, xpReward: 560, estimatedMins: 22, category: 'Extreme',
  },
  {
    title: 'Habitat System Check',
    description: 'Perform a full exterior inspection of the base habitat. Check solar panels, antenna, and the pressure dome.',
    icon: '🏠',
    objectives: ['Circle the habitat base completely', 'Inspect all 4 solar panel groups', 'Check the communication antenna from base'],
    difficulty: 1, xpReward: 150, estimatedMins: 8, category: 'Maintenance',
  },
  {
    title: 'Dust Storm Survival',
    description: 'A dust storm is approaching. Navigate back to base under worsening conditions without running out of oxygen.',
    icon: '🌪️',
    objectives: ['Begin from any point 400m+ from base', 'Return to base camp area', 'Complete with O₂ > 15% and battery > 10%'],
    difficulty: 5, xpReward: 700, estimatedMins: 25, category: 'Survival',
  },
  {
    title: 'Boulder Field Traverse',
    description: 'Navigate through the rocky outcrop west of base. This terrain tests your movement skills and patience.',
    icon: '🪨',
    objectives: ['Sprint through the rock cluster field', 'Do not fall below altitude 5m for more than 10 seconds', 'Reach waypoint at X:-80, Z:200'],
    difficulty: 3, xpReward: 390, estimatedMins: 14, category: 'Navigation',
  },
  {
    title: 'Crater Rim Walk',
    description: 'Walk the full rim of the large impact crater northwest of base. The views are spectacular but the edge is dangerous.',
    icon: '🔭',
    objectives: ['Locate Crater 1 at X:-180, Z:220', 'Walk the perimeter at the crater edge', 'Return within 20 game-minutes'],
    difficulty: 3, xpReward: 450, estimatedMins: 20, category: 'Exploration',
  },
  {
    title: 'Speed Run to Mesa',
    description: 'Sprint to the mesa formation and plant the expedition marker. Every second counts — battery drains faster when sprinting.',
    icon: '⚡',
    objectives: ['Reach the Mesa at X:280, Z:300', 'Use sprint at least 50% of the journey', 'Arrive before oxygen drops below 60%'],
    difficulty: 4, xpReward: 520, estimatedMins: 16, category: 'Speed',
  },
  {
    title: 'Night Patrol (Radiation Check)',
    description: 'Cosmic rays are at peak tonight. Patrol the perimeter and keep your radiation detector active.',
    icon: '☢️',
    objectives: ['Circle the base at 50m radius', 'Keep moving for 10 continuous minutes', 'Monitor and survive radiation hitting 3.0 mSv'],
    difficulty: 2, xpReward: 260, estimatedMins: 10, category: 'Science',
  },
  {
    title: 'Mesa Top Photography Run',
    description: 'Reach the highest elevation point on the map and document the panoramic view of Jezero Crater.',
    icon: '📸',
    objectives: ['Reach altitude above 40m', 'Spend 2 minutes at peak elevation', 'Return to base safely'],
    difficulty: 4, xpReward: 480, estimatedMins: 19, category: 'Exploration',
  },
  {
    title: 'Emergency O₂ Resupply Run',
    description: 'Your secondary O₂ tank is malfunctioning. Rush to the supply cache at the far eastern edge before your primary runs out.',
    icon: '💨',
    objectives: ['Reach X:400, Z:100 in under 10 game-minutes', 'Do not use sprint — it uses O₂ too fast', 'Survive with any O₂ remaining'],
    difficulty: 5, xpReward: 680, estimatedMins: 18, category: 'Survival',
  },
]

const CATEGORY_COLORS = {
  Exploration: '#4a9dc9', Geology: '#c8a44a', Science: '#5ee6f5',
  Extreme: '#ff4a4a', Maintenance: '#7ab55c', Survival: '#ff7d2e',
  Navigation: '#a855f7', Speed: '#f5c842',
}

const COIN_REWARDS_BY_DIFF = { 1: 50, 2: 100, 3: 180, 4: 280, 5: 400 }

// Generate 4-6 fresh missions based on current date seed
function generateDailyMissions() {
  const now = new Date()
  // Each mission batch lasts 24-48 hours — use day-of-year as seed
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const seed = dayOfYear * 1337
  const seededRand = (n) => Math.abs(Math.sin(seed + n) * 9999) % 1

  // Pick 5 unique missions
  const picked = []
  const indices = []
  let attempts = 0
  while (picked.length < 5 && attempts < 50) {
    const idx = Math.floor(seededRand(attempts + 100) * MISSION_POOL.length)
    if (!indices.includes(idx)) {
      indices.push(idx)
      const base = MISSION_POOL[idx]
      const coinReward = COIN_REWARDS_BY_DIFF[base.difficulty] || 100
      picked.push({
        ...base,
        id: `daily_${dayOfYear}_${idx}`,
        coinReward,
      })
    }
    attempts++
  }

  // Compute next refresh time (48 hours from start of current 2-day block)
  const blockStart = Math.floor(dayOfYear / 2) * 2
  const blockStartDate = new Date(now.getFullYear(), 0, blockStart + 1)
  const nextRefresh = new Date(blockStartDate.getTime() + 48 * 3600 * 1000)

  return { missions: picked, nextRefresh }
}

function Countdown({ endAt }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const update = () => {
      const diff = new Date(endAt) - new Date()
      if (diff <= 0) { setRemaining('REFRESHING SOON'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(`${h}h ${m}m`)
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [endAt])
  return <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-warn)', fontSize: 11 }}>{remaining}</span>
}

function MissionCard({ mission, status, onStart }) {
  const isCompleted = status === 'completed'
  const catColor = CATEGORY_COLORS[mission.category] || '#ff7d2e'

  return (
    <div style={{
      background: 'var(--grad-card)',
      border: `1px solid ${isCompleted ? 'rgba(46,204,113,0.3)' : 'rgba(255,125,46,0.2)'}`,
      borderRadius: 14, padding: '20px',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.borderColor = 'rgba(255,125,46,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isCompleted ? 'rgba(46,204,113,0.3)' : 'rgba(255,125,46,0.2)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isCompleted ? 'var(--clr-safe)' : catColor }} />

      {/* Explorer badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(74,157,201,0.15)', border: '1px solid rgba(74,157,201,0.3)',
        borderRadius: 999, padding: '2px 8px',
        fontSize: 9, color: '#4a9dc9', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em',
      }}>🎮 EXPLORER MODE</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 28 }}>{mission.icon}</div>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
              background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40`,
              fontFamily: 'var(--font-mono)',
            }}>{mission.category}</span>
            {[...Array(mission.difficulty)].map((_, i) => (
              <span key={i} style={{ color: '#ff7d2e', fontSize: 10 }}>★</span>
            ))}
            {isCompleted && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#2ecc71', fontSize: 11 }}>
                <CheckCircle size={12} /> Done
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--clr-text-primary)' }}>{mission.title}</div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', lineHeight: 1.6, marginBottom: 14 }}>{mission.description}</p>

      <div style={{ marginBottom: 16 }}>
        {mission.objectives.map((obj, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--clr-text-secondary)', marginBottom: 5 }}>
            <ChevronRight size={12} style={{ color: 'var(--clr-mars-300)', flexShrink: 0, marginTop: 1 }} />
            {obj}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--clr-time)' }}>
            <Clock size={11} /> ~{mission.estimatedMins} min
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--clr-battery)' }}>
            <Zap size={11} /> +{mission.xpReward} XP
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f5c842', fontWeight: 700 }}>
            <span>🪙</span> +{mission.coinReward} Coins
          </div>
        </div>
        <button
          onClick={() => onStart(mission)}
          style={{
            background: isCompleted ? 'rgba(46,204,113,0.15)' : 'linear-gradient(135deg, rgba(200,74,0,0.8), rgba(255,125,46,0.8))',
            color: isCompleted ? '#2ecc71' : '#fff',
            border: isCompleted ? '1px solid rgba(46,204,113,0.4)' : 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
        >
          {isCompleted ? '✓ Completed' : '▶ Start in Explorer'}
        </button>
      </div>
    </div>
  )
}

export default function MissionsPage() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [{ missions, nextRefresh }] = useState(() => generateDailyMissions())
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('valles_completed_missions') || '[]') } catch { return [] }
  })
  const coins = parseInt(localStorage.getItem('valles_coins') || '0')

  const handleStart = (mission) => {
    // Store active mission for Explorer mode to pick up
    localStorage.setItem('valles_active_explorer_mission', JSON.stringify({
      id: mission.id,
      title: mission.title,
      objectives: mission.objectives,
      xpReward: mission.xpReward,
      coinReward: mission.coinReward,
      difficulty: mission.difficulty,
      category: mission.category,
    }))
    navigate('/game/explore')
  }

  const completedCount = missions.filter(m => completed.includes(m.id)).length

  return (
    <div className="animate-fadeInUp" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--clr-text-primary)', marginBottom: 4 }}>Daily Missions</h1>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 13 }}>
              {completedCount}/{missions.length} completed · Complete in <strong style={{ color: '#4a9dc9' }}>Explorer Mode</strong> to earn XP and 🪙 Coins
            </p>
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
              <RefreshCw size={13} style={{ color: 'var(--clr-mars-300)' }} />
              <div>
                <div style={{ fontSize: 9, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>NEXT REFRESH IN</div>
                <Countdown endAt={nextRefresh} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'rgba(74,157,201,0.08)', border: '1px solid rgba(74,157,201,0.25)',
        borderRadius: 12, padding: '14px 20px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <Compass size={18} style={{ color: '#4a9dc9', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: '#4a9dc9' }}>Explorer Mode Missions</strong> — These missions refresh every <strong>24–48 hours</strong>.
          Click <em>"Start in Explorer"</em> to load the mission objective into your HUD, then complete it during your EVA session.
          Progress is automatically saved when you return to base camp.
        </div>
      </div>

      {/* Mission grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 18 }}>
        {missions.map(m => (
          <MissionCard
            key={m.id}
            mission={m}
            status={completed.includes(m.id) ? 'completed' : 'available'}
            onStart={handleStart}
          />
        ))}
      </div>

      {/* Completion summary */}
      {completedCount === missions.length && (
        <div style={{
          marginTop: 32, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)',
          borderRadius: 14, padding: '24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#2ecc71', marginBottom: 8 }}>All Daily Missions Complete!</div>
          <div style={{ color: 'var(--clr-text-muted)', fontSize: 13 }}>New missions arrive in <Countdown endAt={nextRefresh} /></div>
        </div>
      )}
    </div>
  )
}
