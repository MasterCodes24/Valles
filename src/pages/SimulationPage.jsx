import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { runMissionSimulation, getPlayerState } from '../api/mockApi'
import { PageHeader, ResourceBar, Loader } from '../components/ui/SharedComponents'
import { Play, Pause, SkipForward, SkipBack, AlertTriangle, CheckCircle, XCircle, Home, Flag } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import './SimulationPage.css'

const MOCK_ROUTE = {
  nodes: Array.from({ length: 14 }, (_, i) => ({
    lat: 18.38 + i * 0.01, lng: 77.58 + i * 0.01,
    elevation: 800 + Math.sin(i * 0.5) * 80,
    slope: Math.random() * 15,
    hazardLevel: i === 6 ? 'medium' : 'low',
    radiationLevel: 0.3 + Math.random() * 0.3,
    terrainType: ['regolith','boulder_field','delta_deposit','crater_rim'][i % 4],
  })),
  stats: {
    distanceKm: 9.4, estimatedTimeHrs: 3.8, oxygenConsumedPct: 64,
    radiationDoseMSv: 1.2, batteryUsedPct: 58, safetyScore: 0.82,
  },
  color: '#f5c842', label: 'Balanced',
}

export default function SimulationPage() {
  const [frames, setFrames] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [missionState, setMissionState] = useState('running') // running | aborted | completed
  const [showChoiceModal, setShowChoiceModal] = useState(null)
  const [chartData, setChartData] = useState([])
  const intervalRef = useRef(null)
  const navigate = useNavigate()

  const route = (() => {
    try {
      const stored = sessionStorage.getItem('valles_sim_route')
      if (stored) return JSON.parse(stored).route
    } catch {}
    return MOCK_ROUTE
  })()

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const playerState = await getPlayerState('mock-uid-001')
      const sim = await runMissionSimulation('route_balanced', route, playerState)
      setFrames(sim.frames)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (frames.length > 0) {
      const data = frames.map((f, i) => ({
        step: i,
        oxygen: f.oxygenRemainingPct,
        battery: f.batteryRemainingPct,
        radiation: f.radiationAccumulatedMSv * 20,
        elevation: route.nodes[i]?.elevation || 800,
      }))
      setChartData(data)
    }
  }, [frames])

  const advance = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1
      if (next >= frames.length) {
        setPlaying(false)
        setMissionState('completed')
        return prev
      }
      const frame = frames[next]
      if (frame?.choiceAvailable && !frame._choiceHandled) {
        setPlaying(false)
        setShowChoiceModal(frame)
      }
      return next
    })
  }, [frames])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(advance, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, advance])

  const handleChoice = (choice) => {
    if (choice === 'return' || choice === 'abort') {
      setMissionState('aborted')
    }
    setFrames(f => f.map((fr, i) => i === currentStep ? { ...fr, _choiceHandled: true } : fr))
    setShowChoiceModal(null)
    if (choice !== 'return') setPlaying(true)
  }

  const frame = frames[currentStep]
  const totalSteps = frames.length - 1

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader size={48} label="INITIALIZING SIMULATION..." />
    </div>
  )

  return (
    <div className="sim-page animate-fadeIn">
      <PageHeader
        title="Mission Simulation"
        subtitle={`${route.label || 'Balanced'} route · ${route.stats.distanceKm} km`}
        actions={
          <div className="badge badge-mars" style={{ fontFamily: 'var(--font-mono)' }}>
            STEP {currentStep + 1} / {totalSteps + 1}
          </div>
        }
      />

      {missionState === 'completed' && (
        <div className="mission-end-banner alert alert-safe" style={{ marginBottom: 'var(--space-6)' }}>
          <CheckCircle size={24} />
          <div>
            <strong>Mission Complete!</strong>
            <span style={{ marginLeft: 12, fontSize: 'var(--text-sm)' }}>All objectives reached · +400 XP earned</span>
          </div>
          <button className="btn btn-sm btn-safe" onClick={() => navigate('/game/missions/mission_002/report')} style={{ marginLeft: 'auto', background: 'var(--clr-safe)', color: 'white' }}>
            View Report
          </button>
        </div>
      )}

      {missionState === 'aborted' && (
        <div className="mission-end-banner alert alert-hazard" style={{ marginBottom: 'var(--space-6)' }}>
          <XCircle size={24} />
          <div><strong>Mission Aborted</strong><span style={{ marginLeft: 12, fontSize: 'var(--text-sm)' }}>Returning to base</span></div>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/game/dashboard')} style={{ marginLeft: 'auto' }}>
            <Home size={14} /> Dashboard
          </button>
        </div>
      )}

      <div className="sim-layout">
        {/* Left: Telemetry */}
        <div className="sim-telemetry glass-bright">
          <div className="tele-header">
            <span className="label">LIVE TELEMETRY</span>
            <div className="tele-status-dot" />
          </div>

          {frame && (
            <>
              <div className="tele-stats">
                <ResourceBar label="OXYGEN" value={frame.oxygenRemainingPct} max={100} colorClass="oxygen" />
                <ResourceBar label="BATTERY" value={frame.batteryRemainingPct} max={100} colorClass="battery" />
                <ResourceBar label="RADIATION DOSE (×10 mSv)" value={frame.radiationAccumulatedMSv * 10} max={25} colorClass="radiation" />
              </div>

              <div className="tele-readings">
                <div className="reading-item">
                  <span className="reading-label">ELAPSED TIME</span>
                  <span className="reading-value">{frame.timeElapsedHrs}h</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">DISTANCE</span>
                  <span className="reading-value">{frame.distanceTravelledKm} km</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">ELEVATION</span>
                  <span className="reading-value">{frame.elevation?.toFixed(0)} m</span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">COMMS</span>
                  <span className="reading-value" style={{ color: frame.commsStrength > 0.5 ? 'var(--clr-safe)' : 'var(--clr-warn)' }}>
                    {(frame.commsStrength * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="reading-item">
                  <span className="reading-label">TERRAIN</span>
                  <span className="reading-value" style={{ textTransform: 'capitalize', fontSize: 'var(--text-xs)' }}>
                    {frame.terrainType?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Alerts */}
              {frame.alerts?.length > 0 && (
                <div className="sim-alerts">
                  {frame.alerts.map((a, i) => (
                    <div key={i} className={`alert alert-${a.type === 'hazard' ? 'hazard' : a.type === 'radiation' ? 'warn' : 'warn'}`}
                      style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }}>
                      <AlertTriangle size={13} />
                      {a.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Center: Visualization */}
        <div className="sim-center">
          {/* Progress track */}
          <div className="sim-track glass-bright">
            <div className="track-header">
              <span className="label">ROUTE PROGRESS</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                {frame?.distanceTravelledKm} / {route.stats.distanceKm} km
              </span>
            </div>
            <div className="track-bar">
              <div className="track-fill" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
              {frames.map((f, i) => f.choiceAvailable && (
                <div key={i} className="track-hazard-marker" style={{ left: `${(i / totalSteps) * 100}%` }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginTop: 6 }}>
              <span>START</span>
              <span>DESTINATION</span>
            </div>
          </div>

          {/* Charts: Oxygen + Elevation */}
          <div className="sim-charts">
            <div className="chart-card glass-bright">
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Resource Curves</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData.slice(0, currentStep + 1)} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="step" tick={{ fill: '#5a5550', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#5a5550', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border-bright)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'var(--clr-text-muted)' }}
                  />
                  <Line type="monotone" dataKey="oxygen" stroke="var(--clr-oxygen)" strokeWidth={2} dot={false} name="O₂ %" />
                  <Line type="monotone" dataKey="battery" stroke="var(--clr-battery)" strokeWidth={2} dot={false} name="Battery %" />
                  <ReferenceLine y={25} stroke="var(--clr-hazard)" strokeDasharray="4 2" label={{ value: 'CRITICAL', fill: '#ff3b3b', fontSize: 9 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card glass-bright">
              <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Elevation Profile</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="step" tick={{ fill: '#5a5550', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#5a5550', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border-bright)', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="elevation" stroke="var(--clr-dust-300)" strokeWidth={2} dot={false} name="Elevation (m)" />
                  {currentStep > 0 && (
                    <ReferenceLine x={currentStep} stroke="var(--clr-mars-300)" strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Playback controls */}
          <div className="playback-controls glass-bright">
            <button className="btn btn-secondary btn-icon" onClick={() => setCurrentStep(0)} disabled={missionState !== 'running'}>
              <SkipBack size={16} />
            </button>
            <button className="btn btn-secondary btn-icon" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={missionState !== 'running'}>
              <SkipBack size={14} />
            </button>
            <button
              id="play-pause-btn"
              className={`btn ${playing ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setPlaying(v => !v)}
              disabled={missionState !== 'running' || currentStep >= totalSteps}
              style={{ padding: 'var(--space-3) var(--space-8)' }}
            >
              {playing ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play</>}
            </button>
            <button className="btn btn-secondary btn-icon" onClick={advance} disabled={missionState !== 'running' || currentStep >= totalSteps}>
              <SkipForward size={14} />
            </button>
            <button className="btn btn-secondary btn-icon" onClick={() => setCurrentStep(totalSteps)} disabled={missionState !== 'running'}>
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Choice Modal */}
      {showChoiceModal && (
        <div className="choice-overlay">
          <div className="choice-modal glass-bright animate-fadeInUp">
            <div className="choice-header">
              <AlertTriangle size={24} style={{ color: 'var(--clr-warn)' }} />
              <h3>Mid-Mission Decision Required</h3>
            </div>
            <p style={{ color: 'var(--clr-text-secondary)', marginBottom: 'var(--space-6)' }}>
              Entering hazardous zone. Multiple obstacles detected. How do you proceed?
            </p>
            <div className="choice-options">
              <button id="choice-continue" className="btn btn-primary" onClick={() => handleChoice('continue')}>
                <Play size={16} /> Continue Through
              </button>
              <button id="choice-rest" className="btn btn-secondary" onClick={() => handleChoice('rest')}>
                🛑 Rest at Shelter
              </button>
              <button id="choice-shelter" className="btn btn-secondary" onClick={() => handleChoice('shelter')}>
                🏠 Seek Nearby Shelter
              </button>
              <button id="choice-return" className="btn btn-danger" onClick={() => handleChoice('return')}>
                <XCircle size={16} /> Abort & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
