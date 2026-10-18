import React, { useEffect, useState } from 'react'
import { getMissionReport } from '../api/mockApi'
import { PageHeader } from '../components/ui/SharedComponents'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Target, Zap, Shield, Clock, Activity } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts'

export default function MissionReportPage() {
  const [report, setReport] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getMissionReport('mission_002').then(setReport)
  }, [])

  if (!report) return null

  const radarData = [
    { subject: 'Safety', A: report.survivalScore * 100 },
    { subject: 'Science', A: report.scientificValue * 100 },
    { subject: 'Efficiency', A: 100 - report.oxygenUsedPct },
    { subject: 'Speed', A: 70 },
    { subject: 'Objectives', A: (report.objectivesCompleted / report.objectivesTotal) * 100 },
  ]

  return (
    <div className="animate-fadeInUp">
      <PageHeader
        title="Mission Report"
        subtitle={report.title}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/game/missions')}>
            ← Missions
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
              <h3>Mission Summary</h3>
              <span className="badge badge-safe"><CheckCircle size={12} /> COMPLETE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {[
                { label: 'Duration', value: report.duration, icon: Clock, color: 'var(--clr-time)' },
                { label: 'Distance', value: `${report.distanceKm} km`, icon: Activity, color: 'var(--clr-ice-300)' },
                { label: 'O₂ Used', value: `${report.oxygenUsedPct}%`, icon: Zap, color: 'var(--clr-oxygen)' },
                { label: 'Radiation', value: `${report.radiationDoseMSv} mSv`, icon: Shield, color: 'var(--clr-radiation)' },
                { label: 'Max Slope', value: `${report.maxSlope}°`, icon: Target, color: 'var(--clr-warn)' },
                { label: 'Route', value: report.routeTaken, icon: Target, color: 'var(--clr-text-secondary)' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Icon size={12} style={{ color }} /> {label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Objectives</h4>
            {['Cross boulder field', 'Shoreline survey', 'Return to base'].map((obj, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--clr-border)' }}>
                <CheckCircle size={16} style={{ color: 'var(--clr-safe)', flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--text-sm)' }}>{obj}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Mid-Mission Decisions</h4>
            {report.choicesMade.map((c, i) => (
              <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--clr-surface-1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', borderLeft: '3px solid var(--clr-mars-400)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-mars-200)', marginBottom: 4 }}>
                  STEP {c.step} · {c.choice.toUpperCase()}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-secondary)' }}>{c.context}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-5)' }}>Performance Radar</h4>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--clr-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--clr-text-muted)', fontSize: 9 }} />
                <Radar name="Performance" dataKey="A" stroke="var(--clr-mars-200)" fill="var(--clr-mars-200)" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h4>XP Breakdown</h4>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-time)', fontSize: 'var(--text-xl)', fontWeight: 800 }}>+{report.xpEarned + report.bonusXP}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--clr-text-secondary)' }}>Mission Completion</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-time)' }}>+{report.xpEarned}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--clr-text-secondary)' }}>Bonus (Full Objectives)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-time)' }}>+{report.bonusXP}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Highlights</h4>
            {report.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--clr-text-secondary)' }}>
                <span style={{ color: 'var(--clr-safe)' }}>✦</span> {h}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
