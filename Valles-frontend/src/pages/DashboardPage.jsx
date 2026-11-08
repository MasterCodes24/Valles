import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Activity, Target, Star, TrendingUp, Shield, Zap, Coins, ChevronRight, Award, Footprints } from 'lucide-react'
import { StatCard, SectionTitle } from '../components/ui/SharedComponents'
import { getActiveWeeklyChallenge } from '../api/missions'
import { adaptMissions, adaptWeeklyChallenge } from '../api/adapters'
import { supabase } from '../api/supabaseClient'
import MartianPlayerViewer3D from '../components/game/MartianPlayerViewer3D'
import './DashboardPage.css'

export default function DashboardPage() {
  const { playerState, user } = useApp()
  const [missions, setMissions] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [localCoins, setLocalCoins] = useState(() => parseInt(localStorage.getItem('valles_coins') || '0'))
  const [rawDistM, setRawDistM] = useState(() => parseFloat(localStorage.getItem('valles_total_dist_m') || '0'))

  const navigate = useNavigate()

  useEffect(() => {
    // Keep local coins and distance synced if updated in explorer
    const onStorage = () => {
      setLocalCoins(parseInt(localStorage.getItem('valles_coins') || '0'))
      setRawDistM(parseFloat(localStorage.getItem('valles_total_dist_m') || '0'))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!user?.userId) return
    const uid = user.userId

    // Load missions for current region
    const region = playerState?.currentRegion || 'jezero'
    Promise.all([
      supabase.from('missions').select('*').eq('region_id', region).order('unlock_level'),
      supabase.from('player_missions').select('*').eq('user_id', uid),
    ]).then(([missionsRes, pmRes]) => {
      if (missionsRes.data) {
        setMissions(adaptMissions(missionsRes.data, pmRes.data || [], playerState?.level || 1))
      }
    })

    // Load weekly challenge
    getActiveWeeklyChallenge().then(({ challenge }) => {
      setChallenge(adaptWeeklyChallenge(challenge))
    })
  }, [user?.userId, playerState?.currentRegion, playerState?.level])

  if (!playerState) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--clr-surface-3)',
          borderTopColor: 'var(--clr-mars-300)',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          INITIALIZING TELEMETRY...
        </p>
      </div>
    )
  }

  const xpPct = playerState?.xpToNextLevel
    ? Math.min(100, (playerState.xp / playerState.xpToNextLevel) * 100)
    : 0
  const availMissions = (missions || []).filter(m => m.status === 'available')
  const completedMissions = (missions || []).filter(m => m.status === 'completed')

  // Distance & Coin Payout calculations
  // Rate: 10 coins per 1 km (1,000 m). (e.g. 5 km = 50 coins, 10 km = 100 coins)
  const distKm = (rawDistM / 1000)
  const currentWholeKm = Math.floor(distKm)
  const nextKm = currentWholeKm + 1
  const distInCurrentKm = rawDistM % 1000
  const progressToNextKm = Math.min(100, (distInCurrentKm / 1000) * 100)
  const metersLeftToNextKm = Math.max(0, Math.round(1000 - distInCurrentKm))

  const formattedDist = rawDistM >= 1000
    ? `${distKm.toFixed(2)} km`
    : `${Math.round(rawDistM)} m`

  return (
    <div className="dashboard animate-fadeInUp">
      {/* ── TOP HERO: CALL OF DUTY OPERATOR SUIT VIEW & COMMANDER INTEL ── */}
      <div className="dash-operator-grid">
        {/* 3D Interactive Astronaut Body (Call of Duty / The Martian style) */}
        <div className="dash-model-container">
          <MartianPlayerViewer3D
            callsign={playerState.callsign || 'Commander'}
            level={playerState.level || 1}
            suitName={playerState.suit?.name || 'xEMU Mark IV (Martian EVA Suit)'}
          />
        </div>

        {/* Commander Status Card & XP */}
        <div className="dash-intel-column">
          <div className="card dash-intel-card">
            <div className="dash-region-tag badge badge-mars">📍 {(playerState.currentRegion || 'jezero').toUpperCase()} BASE CAMP</div>
            <h1 style={{ fontSize: 'var(--text-3xl)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              Commander <span style={{ color: 'var(--clr-mars-200)' }}>{playerState.callsign || 'Watney'}</span>
            </h1>
            <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              Level {playerState.level || 1} Surface Specialist · {completedMissions.length} missions complete · {formattedDist} traversed on Mars
            </p>

            {/* XP Bar */}
            <div className="dash-xp-subcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span className="label" style={{ fontSize: 'var(--text-xs)' }}>Experience Points</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-time)' }}>
                  {playerState.xp || 0} / {playerState.xpToNextLevel || 500} XP
                </span>
              </div>
              <div className="stat-bar" style={{ height: 8, marginBottom: 'var(--space-2)' }}>
                <div className="stat-bar-fill time" style={{ width: `${xpPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                <span>LVL {playerState.level || 1}</span>
                <span>{(xpPct).toFixed(0)}% to LVL {(playerState.level || 1) + 1}</span>
              </div>
            </div>

            {/* Quick EVA Launch Action inside Intel */}
            <button
              onClick={() => navigate('/game/explore')}
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
              }}
            >
              🚀 Launch 3D Mars Explorer
            </button>
          </div>

          {/* ── DISTANCE & COINS REWARDS SCHEDULE CARD ── */}
          <div className="card dash-rewards-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Coins size={18} style={{ color: 'var(--clr-battery)' }} />
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#fff' }}>
                  Traverse Coin Rewards
                </span>
              </div>
              <span className="badge badge-battery" style={{ fontSize: 9 }}>
                10 COINS / KM
              </span>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              Earn <strong style={{ color: '#f5c842' }}>10 🪙 coins for every 1 kilometer</strong> you walk on Mars (e.g. <strong>5 km = 50 coins</strong>, <strong>10 km = 100 coins</strong>).
            </p>

            {/* Distance Progress toward next 10-coin payout */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, padding: '10px 14px', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'rgba(240, 237, 232, 0.7)' }}>Next Payout ({nextKm} km):</span>
                <span style={{ color: '#f5c842', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>+10 🪙 Coins</span>
              </div>
              <div className="stat-bar" style={{ height: 6, marginBottom: 4 }}>
                <div className="stat-bar-fill battery" style={{ width: `${progressToNextKm}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--clr-text-muted)' }}>
                <span>Current: {formattedDist}</span>
                <span>{metersLeftToNextKm}m remaining</span>
              </div>
            </div>

            {/* Payout Schedule Table */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              textAlign: 'center',
            }}>
              {[
                { dist: '1 km', coins: '10 🪙' },
                { dist: '5 km', coins: '50 🪙' },
                { dist: '10 km', coins: '100 🪙' },
                { dist: '25 km', coins: '250 🪙' },
              ].map(item => (
                <div key={item.dist} style={{
                  background: 'rgba(255, 125, 46, 0.06)',
                  border: '1px solid rgba(255, 125, 46, 0.2)',
                  borderRadius: 8,
                  padding: '6px 4px',
                }}>
                  <div style={{ fontSize: 10, color: '#ffb380', fontWeight: 700 }}>{item.dist}</div>
                  <div style={{ fontSize: 10, color: '#f5c842', fontWeight: 800 }}>{item.coins}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stats">
        <StatCard label="Total Missions" value={playerState.totalMissions || 0} icon={Target} color="var(--clr-mars-200)" />
        <StatCard label="Success Rate" value={`${(((playerState.successRate ?? 0.83)) * 100).toFixed(0)}`} unit="%" icon={TrendingUp} color="var(--clr-safe)" trend={5} />
        <StatCard label="Distance Walked" value={formattedDist} icon={Footprints} color="var(--clr-ice-300)" />
        <StatCard label="🪙 Total Coins" value={localCoins.toLocaleString()} icon={Zap} color="var(--clr-battery)" />
      </div>

      {/* Suit + Rover Equipment */}
      <div className="dash-equipment">
        <SectionTitle accent>Active Equipment</SectionTitle>
        <div className="equipment-grid">
          <div className="card equip-card">
            <Shield size={20} style={{ color: 'var(--clr-mars-200)', marginBottom: 'var(--space-3)' }} />
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              {playerState.suit?.name || 'xEMU Mark IV (Martian EVA Suit)'}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
              <span>O₂ {playerState.suit?.oxygenCapacity ?? 6}h</span>
              <span>Rad Shield {((playerState.suit?.radiationShielding ?? 0.2) * 100).toFixed(0)}%</span>
              <span>{playerState.suit?.weight ?? 50}kg</span>
            </div>
          </div>
          <div className="card equip-card">
            <Activity size={20} style={{ color: 'var(--clr-ice-300)', marginBottom: 'var(--space-3)' }} />
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              {playerState.rover?.name || 'No Rover (EVA Only)'}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
              {playerState.rover ? (
                <>
                  <span>Range {playerState.rover.batteryCapacity}km</span>
                  <span>Cargo {playerState.rover.cargoCapacity}kg</span>
                </>
              ) : (
                <span>Unlocked at Level 4</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dash-actions">
        <SectionTitle accent>Operations Navigation</SectionTitle>
        <div className="actions-grid">
          <button className="action-btn btn btn-primary" onClick={() => navigate('/game/explore')}>
            <Activity size={20} />
            <span>3D Explorer</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>Walk on Mars in 3D</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/missions')}>
            <Target size={20} />
            <span>Missions</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>{availMissions.length} available today</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/weekly-challenge')}>
            <Star size={20} style={{ color: 'var(--clr-battery)' }} />
            <span>Challenge</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>Up to 2800 XP + coins</span>
          </button>
          <button className="action-btn btn btn-secondary" onClick={() => navigate('/game/inventory')}>
            <Shield size={20} />
            <span>Inventory</span>
            <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7, fontWeight: 400, textTransform: 'none' }}>🪙 {localCoins} coins available</span>
          </button>
        </div>
      </div>
    </div>
  )
}
