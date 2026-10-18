import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMissions } from '../api/mockApi'
import { PageHeader } from '../components/ui/SharedComponents'
import { Target, Lock, CheckCircle, ChevronRight, Play } from 'lucide-react'

const DIFF_LABELS = ['', 'Recruit', 'Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Major', 'Colonel', 'General', 'Admiral']
const DIFF_COLORS = ['', '#2ecc71', '#3498db', '#f39c12', '#e67e22', '#e74c3c', '#9b59b6', '#c0392b', '#c0392b', '#c0392b', '#ff0000']

function MissionCard({ mission, onStart }) {
  const isAvailable = mission.status === 'available'
  const isCompleted = mission.status === 'completed'
  const isLocked = mission.status === 'locked'

  return (
    <div style={{
      background: 'var(--grad-card)',
      border: `1px solid ${isAvailable ? 'var(--clr-border-bright)' : 'var(--clr-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      opacity: isLocked ? 0.6 : 1,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all var(--duration-normal)',
    }}>
      {isCompleted && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--clr-safe)' }} />
      )}
      {isAvailable && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--clr-mars-300)' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{
            padding: '2px 10px', borderRadius: 'var(--radius-full)',
            background: `${DIFF_COLORS[mission.difficulty]}22`,
            color: DIFF_COLORS[mission.difficulty],
            border: `1px solid ${DIFF_COLORS[mission.difficulty]}44`,
            fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', fontWeight: 700,
          }}>
            D{mission.difficulty} · {DIFF_LABELS[mission.difficulty]}
          </span>
          {isCompleted && <span className="badge badge-safe"><CheckCircle size={10} /> Done</span>}
          {isLocked && <span className="badge" style={{ background: 'rgba(90,85,80,0.2)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)' }}><Lock size={10} /> Lvl {mission.unlockLevel}</span>}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-time)' }}>+{mission.xpReward} XP</span>
      </div>

      <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-lg)' }}>{mission.title}</h4>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>{mission.description}</p>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        {mission.objectives.map((obj, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4 }}>
            <ChevronRight size={12} style={{ color: 'var(--clr-mars-300)', flexShrink: 0 }} />
            {obj}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {isAvailable && (
          <button id={`start-mission-${mission.id}`} className="btn btn-primary btn-sm" onClick={() => onStart(mission)}>
            <Play size={14} /> Start Mission
          </button>
        )}
        {isCompleted && (
          <button className="btn btn-ghost btn-sm" onClick={() => onStart(mission)}>
            View Report
          </button>
        )}
      </div>
    </div>
  )
}

export default function MissionsPage() {
  const [missions, setMissions] = useState([])
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    getMissions('mock-uid-001').then(setMissions)
  }, [])

  const filtered = missions.filter(m => filter === 'all' ? true : m.status === filter)

  const handleStart = (mission) => {
    if (mission.status === 'completed') {
      navigate(`/game/missions/${mission.id}/report`)
    } else {
      navigate('/game/map')
    }
  }

  return (
    <div className="animate-fadeInUp">
      <PageHeader
        title="Missions"
        subtitle={`${missions.filter(m => m.status === 'available').length} missions available`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {['all', 'available', 'completed', 'locked'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
        {filtered.map(m => <MissionCard key={m.id} mission={m} onStart={handleStart} />)}
      </div>
    </div>
  )
}
