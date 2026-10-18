import React, { useState } from 'react'
import { plannerAnalyze } from '../api/mockApi'
import { Loader } from '../components/ui/SharedComponents'
import {
  AlertTriangle, CheckCircle, Clock, Shield, Zap, Activity,
  MapPin, User, Target, ChevronRight, AlertCircle, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import './PlannerPage.css'

const SUITS = ['Mk I Basic Suit', 'Mk II Exploration Suit', 'Mk III Advanced Suit']
const OBJECTIVES = ['Scientific Survey', 'Resupply Run', 'Emergency Extraction', 'Reconnaissance', 'Equipment Deployment']

const INITIAL_FORM = {
  start: '',
  destination: '',
  suit: SUITS[1],
  departureTime: '',
  objective: OBJECTIVES[0],
  maxTimeHrs: '',
  maxRadiationMSv: '',
}

function ForecastBar({ label, value, max, color, unit }) {
  const pct = Math.min(100, (parseFloat(value) / max) * 100)
  return (
    <div className="forecast-bar-row">
      <span className="fbr-label">{label}</span>
      <div className="fbr-track">
        <div className="fbr-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="fbr-value" style={{ color }}>{value}{unit}</span>
    </div>
  )
}

function ForecastCard({ scenario, data, highlight }) {
  const colors = {
    'Best Case': 'var(--clr-safe)',
    'Nominal': 'var(--clr-accent)',
    'Worst Case': 'var(--clr-hazard)',
  }
  const color = colors[data.label] || 'var(--clr-accent)'

  return (
    <div className={`forecast-card ${highlight ? 'forecast-card-highlight' : ''}`} style={{ '--fc-color': color }}>
      <div className="fc-header">
        <span className="fc-label" style={{ color }}>{data.label}</span>
        <span className="fc-prob" style={{ color }}>{(parseFloat(data.successProbability) * 100).toFixed(0)}% success</span>
      </div>
      <ForecastBar label="Est. Time" value={data.estimatedTimeHrs} max={10} color={color} unit="h" />
      <ForecastBar label="O₂ Consumed" value={data.oxygenConsumptionPct} max={100} color={color} unit="%" />
      <ForecastBar label="Radiation" value={data.radiationDoseMSv} max={5} color={color} unit=" mSv" />
      <ForecastBar label="Battery" value={data.batteryUsedPct} max={100} color={color} unit="%" />
    </div>
  )
}

function AbortThresholds({ thresholds }) {
  return (
    <div className="abort-grid">
      {Object.entries(thresholds).map(([key, val]) => (
        <div key={key} className="abort-item">
          <span className="abort-key">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
          <span className="abort-val">{val}{key.includes('Pct') ? '%' : key.includes('Deg') ? '°' : key.includes('Msv') ? ' mSv' : ' min'}</span>
        </div>
      ))}
    </div>
  )
}

export default function PlannerPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [approved, setApproved] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.start.trim()) e.start = 'Start location required'
    if (!form.destination.trim()) e.destination = 'Destination required'
    if (!form.departureTime) e.departureTime = 'Departure time required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setReport(null)
    setApproved(false)
    try {
      const result = await plannerAnalyze({
        start: form.start,
        destination: form.destination,
        suit: form.suit,
        departureTime: form.departureTime,
        objective: form.objective,
        constraints: {
          maxTimeHrs: form.maxTimeHrs ? parseFloat(form.maxTimeHrs) : null,
          maxRadiationMSv: form.maxRadiationMSv ? parseFloat(form.maxRadiationMSv) : null,
        },
      })
      setReport(result)
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, type = 'text', options = null) => (
    <div className="form-group" key={key}>
      <label className="label">{label}</label>
      {options ? (
        <select
          className="select"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          className={`input ${errors[key] ? 'input-error' : ''}`}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={type === 'datetime-local' ? '' : `Enter ${label.toLowerCase()}...`}
        />
      )}
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </div>
  )

  // Chart data for comparison
  const chartData = report ? [
    { name: 'Best', time: parseFloat(report.forecasts.best.estimatedTimeHrs), oxygen: parseFloat(report.forecasts.best.oxygenConsumptionPct), radiation: parseFloat(report.forecasts.best.radiationDoseMSv) * 20 },
    { name: 'Nominal', time: parseFloat(report.forecasts.nominal.estimatedTimeHrs), oxygen: parseFloat(report.forecasts.nominal.oxygenConsumptionPct), radiation: parseFloat(report.forecasts.nominal.radiationDoseMSv) * 20 },
    { name: 'Worst', time: parseFloat(report.forecasts.worst.estimatedTimeHrs), oxygen: parseFloat(report.forecasts.worst.oxygenConsumptionPct), radiation: parseFloat(report.forecasts.worst.radiationDoseMSv) * 20 },
  ] : []

  const hasCritical = report?.flags?.some(f => f.level === 'critical')
  const hasWarnings = report?.flags?.some(f => f.level === 'warn')

  return (
    <div className="planner-page animate-fadeIn">
      <div className="planner-grid">

        {/* ── Form Panel ── */}
        <div className="planner-form-panel">
          <div className="panel-header">
            <Target size={16} className="panel-icon" />
            <span>MISSION PARAMETERS</span>
          </div>

          <form onSubmit={handleSubmit} className="planner-form">
            <div className="form-section">
              <div className="form-section-title">Route</div>
              {field('start', 'Start Location')}
              {field('destination', 'Destination')}
            </div>

            <div className="form-section">
              <div className="form-section-title">Mission Config</div>
              {field('suit', 'Pressure Suit', 'text', SUITS)}
              {field('objective', 'Primary Objective', 'text', OBJECTIVES)}
              {field('departureTime', 'Departure Time (UTC)', 'datetime-local')}
            </div>

            <div className="form-section">
              <div className="form-section-title">Constraints (Optional)</div>
              {field('maxTimeHrs', 'Max Duration (hours)', 'number')}
              {field('maxRadiationMSv', 'Max Radiation (mSv)', 'number')}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading
                ? <><div className="btn-spinner" />Analyzing...</>
                : <><BarChart2 size={16} />Run Analysis</>
              }
            </button>
          </form>
        </div>

        {/* ── Results Panel ── */}
        <div className="planner-results-panel">
          {!report && !loading && (
            <div className="planner-empty">
              <div className="pe-icon">
                <Target size={48} />
              </div>
              <h3>Enter mission parameters</h3>
              <p>Configure your route and constraints on the left, then run the analysis to generate scenario forecasts.</p>
              <div className="pe-hint">
                <AlertTriangle size={13} />
                <span>All operations require human approval before surface execution</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="planner-loading">
              <Loader size={44} label="RUNNING SCENARIO ANALYSIS..." />
              <div className="loading-steps">
                {['Loading terrain data', 'Computing route options', 'Calculating hazard exposure', 'Generating forecasts'].map((step, i) => (
                  <div key={step} className="loading-step" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className="loading-step-dot" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report && !loading && (
            <div className="planner-report animate-fadeInUp">
              {/* Report header */}
              <div className="report-header">
                <div className="report-meta">
                  <div className="report-id">REQUEST ID: {report.requestId}</div>
                  <div className="report-time">Analyzed: {new Date(report.analyzedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                </div>
                <div className={`report-status ${hasCritical ? 'status-critical' : hasWarnings ? 'status-warn' : 'status-nominal'}`}>
                  {hasCritical ? <><AlertCircle size={14} /> CRITICAL FLAGS</> : hasWarnings ? <><AlertTriangle size={14} /> WARNINGS</> : <><CheckCircle size={14} /> NOMINAL</>}
                </div>
              </div>

              {/* Flags */}
              {report.flags.length > 0 && (
                <div className="report-flags">
                  {report.flags.map((f, i) => (
                    <div key={i} className={`alert alert-${f.level === 'critical' ? 'hazard' : 'warn'}`} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)' }}>
                      <AlertTriangle size={13} />
                      <strong>{f.level.toUpperCase()}:</strong> {f.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended Route */}
              <div className="report-section">
                <div className="report-section-title">
                  <MapPin size={14} />
                  RECOMMENDED ROUTE
                </div>
                <div className="rec-route-card">
                  <div className="rr-type badge badge-ice">{report.recommendedRoute.type.toUpperCase()}</div>
                  <div className="rr-stats">
                    <span><Activity size={12} /> {report.recommendedRoute.distanceKm} km</span>
                    <span><MapPin size={12} /> {report.recommendedRoute.waypoints} waypoints</span>
                  </div>
                  <p className="rr-desc">{report.recommendedRoute.description}</p>
                </div>
              </div>

              {/* Scenario Forecasts */}
              <div className="report-section">
                <div className="report-section-title">
                  <BarChart2 size={14} />
                  SCENARIO FORECASTS
                </div>
                <div className="forecasts-grid">
                  <ForecastCard scenario="best" data={report.forecasts.best} />
                  <ForecastCard scenario="nominal" data={report.forecasts.nominal} highlight />
                  <ForecastCard scenario="worst" data={report.forecasts.worst} />
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="report-section">
                <div className="report-section-title">
                  <BarChart2 size={14} />
                  SCENARIO COMPARISON
                </div>
                <div className="comparison-chart">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }} barSize={22}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--clr-text-muted)', fontSize: 10, fontFamily: 'Space Mono' }} />
                      <YAxis tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border-bright)', borderRadius: 8, fontSize: 11 }}
                      />
                      <Bar dataKey="time" name="Time (h)" fill="var(--clr-accent)" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={['var(--clr-safe)', 'var(--clr-accent)', 'var(--clr-hazard)'][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Abort Thresholds */}
              <div className="report-section">
                <div className="report-section-title">
                  <Shield size={14} />
                  ABORT THRESHOLDS
                </div>
                <AbortThresholds thresholds={report.abortThresholds} />
              </div>

              {/* Human Approval */}
              <div className="approval-section">
                {report.humanApprovalRequired && !approved && (
                  <div className="approval-required">
                    <div className="approval-required-header">
                      <AlertCircle size={20} style={{ color: 'var(--clr-hazard)' }} />
                      <strong>HUMAN APPROVAL REQUIRED</strong>
                    </div>
                    <p>Critical flags detected. This route plan requires sign-off from an authorized mission director before surface execution can proceed.</p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 'var(--space-4)', background: 'linear-gradient(135deg, #0e2840, #1a4a6e)' }}
                      onClick={() => setApproved(true)}
                    >
                      <CheckCircle size={16} />
                      Approve as Mission Director
                    </button>
                  </div>
                )}

                {(!report.humanApprovalRequired || approved) && (
                  <div className="approval-granted">
                    <div className="approval-status-row">
                      <CheckCircle size={18} style={{ color: 'var(--clr-safe)' }} />
                      <span>
                        {approved ? 'Mission Director Approval Granted' : 'No Approval Required'} ·
                        Status: <strong>AWAITING EXECUTION</strong>
                      </span>
                    </div>
                    <div className="approval-detail">
                      Route plan is cleared for surface operation scheduling.
                      Forward to Operations for crew briefing and pre-mission checklist.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
