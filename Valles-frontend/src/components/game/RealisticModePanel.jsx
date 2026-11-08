/**
 * RealisticModePanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen setup panel for Realistic Mode.
 * Flow:
 *   1. Text input → "Parse with AI" → shows parsed scenario for review/edit
 *   2. "Generate Conditions" → shows time series summary + mission briefing
 *   3. "Launch in 3D" → calls onLaunch(conditions)
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  checkBackendHealth, buildFallbackConditions,
  generateConditions, parseScenario,
} from '../../api/realisticMode'

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEASON_LABELS    = { spring: '🌱 Spring (Ls 0–90°)', summer: '❄️ Summer (Ls 90–180°)', autumn: '🌪 Autumn (Ls 180–270°)', winter: '☀️ Winter (Ls 270–360°)' }
const TOD_LABELS       = { dawn: '🌅 Dawn (05–08 LST)', morning: '🌤 Morning (08–11)', midday: '☀️ Midday (11–14)', afternoon: '🌞 Afternoon (14–17)', dusk: '🌇 Dusk (17–20)', night: '🌙 Night (20–05)' }
const SEV_LABELS       = { typical: '📊 Typical (median)', harsh: '⚠️ Harsh (p05/p95)', extreme: '🔴 Extreme (observed limits)' }
const DUST_LABELS      = { none: '✨ Clear (τ < 0.3)', low: '🌫 Low (τ 0.3–0.8)', moderate: '🏜 Moderate (τ 0.8–2)', high: '🌪 High / Regional Storm', storm: '🔴 Global Dust Storm' }
const TASK_LABELS      = { routine_eva: '🧑‍🚀 Routine EVA', sample_collection: '🔬 Sample Collection', surveying: '📡 Surveying', base_construction: '🏗 Base Construction', traverse: '🚶 Traverse', emergency: '🚨 Emergency' }
const EXP_LABELS       = { novice: '🟢 Novice', intermediate: '🟡 Intermediate', expert: '🔴 Expert' }
const SUIT_LABELS      = { suit_base: 'Base EVA Suit', suit_advanced: 'Advanced Explorer', suit_radiation: 'Rad-Guard', suit_elite: 'Elite Command', suit_prototype: 'Prototype Quantum' }

const EXAMPLE_PROMPTS = [
  'A 90-minute afternoon sample collection EVA during a moderate dust storm in autumn.',
  'Night-time emergency traverse back to base during the coldest winter period on Mars.',
  'Routine morning EVA on a clear spring day, intermediate astronaut, standard suit.',
  'Worst-case scenario: global dust storm at Gale Crater, 2-hour mission, expert crew.',
  'Solar noon geology survey in the warmest season possible, low dust, 45 minutes.',
]

const mono = 'var(--font-mono, monospace)'

function Tag({ label, color = '#5ee6f5' }) {
  return (
    <span style={{
      background: color + '18', border: `1px solid ${color}44`,
      borderRadius: 999, padding: '2px 10px',
      fontSize: 10, color, fontFamily: mono, fontWeight: 700,
    }}>{label}</span>
  )
}

function FieldRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 130, fontSize: 11, color: 'rgba(240,237,232,0.5)', fontFamily: mono, flexShrink: 0 }}>
        {label}
      </div>
      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'rgba(15,18,28,0.9)', border: '1px solid rgba(255,125,46,0.3)',
            borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12,
            fontFamily: mono, cursor: 'pointer',
          }}
        >
          {Object.entries(options).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            flex: 1, background: 'rgba(15,18,28,0.9)', border: '1px solid rgba(255,125,46,0.3)',
            borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 12, fontFamily: mono,
          }}
        />
      )}
    </div>
  )
}

function ConditionCard({ label, value, unit, source, color = '#5ee6f5' }) {
  const [showSource, setShowSource] = useState(false)
  return (
    <div
      style={{
        background: 'rgba(11,13,20,0.9)', border: `1px solid ${color}30`,
        borderRadius: 10, padding: '12px 14px', position: 'relative',
      }}
    >
      <div style={{ fontSize: 9, color: color + 'aa', fontFamily: mono, marginBottom: 3, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: mono, color }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4, opacity: 0.7 }}>{unit}</span>
      </div>
      {source && (
        <div
          onClick={() => setShowSource(s => !s)}
          style={{ marginTop: 4, fontSize: 9, color: 'rgba(240,237,232,0.3)', cursor: 'pointer' }}
        >
          {showSource ? source : '📎 source'}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RealisticModePanel({ onLaunch, onClose }) {
  const [step, setStep]           = useState('input')   // 'input' | 'review' | 'generated'
  const [text, setText]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [backendOk, setBackendOk] = useState(null)      // null=checking, true/false
  const [parsed, setParsed]       = useState(null)       // ParseResponse
  const [result, setResult]       = useState(null)       // GenerateResponse
  const [scenario, setScenario]   = useState(null)       // editable ScenarioQuery
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`
  }, [text])

  // Backend health check on mount
  useEffect(() => {
    checkBackendHealth().then(ok => setBackendOk(ok))
  }, [])

  const setField = (key) => (val) => setScenario(s => ({ ...s, [key]: val }))

  // ── Step 1: Parse ──────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (backendOk) {
        const res = await parseScenario(text)
        setParsed(res)
        setScenario(res.scenario)
        setStep('review')
      } else {
        // Fallback: skip AI, use default scenario
        const def = {
          season: 'spring', time_of_day: 'afternoon', duration_minutes: 60,
          severity: 'typical', dust_level: 'none', task_type: 'routine_eva',
          experience: 'intermediate', suit: 'suit_base', notes: text.slice(0, 120),
          assumptions: ['Backend not reachable — AI parsing skipped. Using defaults. Edit fields below.'],
        }
        setParsed({ scenario: def, assumptions: def.assumptions, warnings: [] })
        setScenario(def)
        setStep('review')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Generate ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (backendOk) {
        res = await generateConditions(scenario)
      } else {
        res = buildFallbackConditions(scenario, scenario.duration_minutes)
      }
      setResult(res)
      setStep('generated')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Launch ─────────────────────────────────────────────────────────
  const handleLaunch = () => {
    onLaunch({
      scenario: result.scenario,
      conditions: result.conditions,
      briefing: result.briefing,
      dataSource: result.data_source,
      caveats: result.caveats,
    })
  }

  const start = result?.conditions?.[0]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(4,2,8,0.97)', backdropFilter: 'blur(24px)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px', borderBottom: '1px solid rgba(94,230,245,0.18)',
        background: 'rgba(8,10,18,0.9)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(94,230,245,0.25), rgba(74,120,220,0.25))',
            border: '1px solid rgba(94,230,245,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🛰</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              Realistic Mode
              <Tag label="NASA REMS DATA" color="#5ee6f5" />
              {backendOk === false && <Tag label="OFFLINE MODE" color="#f5c842" />}
              {backendOk === true  && <Tag label="AI PARSING ACTIVE" color="#2ecc71" />}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,237,232,0.4)', fontFamily: mono }}>
              Gemini parses your intent · Every number comes from real Curiosity REMS measurements
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,59,59,0.12)', border: '1px solid rgba(255,59,59,0.3)',
          color: '#ff6b6b', borderRadius: 10, padding: '9px 20px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>✕ Close</button>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,10,18,0.5)',
      }}>
        {[['input', '1', 'Describe Scenario'], ['review', '2', 'Review & Edit'], ['generated', '3', 'Mission Briefing']].map(([s, n, label]) => {
          const active = step === s
          const done   = (s === 'input' && (step === 'review' || step === 'generated')) ||
                         (s === 'review' && step === 'generated')
          return (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', fontSize: 12, fontWeight: 700,
              color: active ? '#5ee6f5' : done ? '#2ecc71' : 'rgba(240,237,232,0.3)',
              borderBottom: active ? '2px solid #5ee6f5' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: active ? '#5ee6f5' : done ? '#2ecc71' : 'rgba(255,255,255,0.1)',
                color: active || done ? '#000' : 'rgba(240,237,232,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
              }}>{done ? '✓' : n}</div>
              {label}
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>

        {/* ── STEP 1: Input ──────────────────────────────────────────────── */}
        {step === 'input' && (
          <div style={{ flex: 1, padding: '32px', maxWidth: 760, margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: '#fff', marginBottom: 8 }}>Describe your Mars EVA scenario</h2>
            <p style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              Write in plain English. Mention season, time of day, duration, dust conditions, task.
              {backendOk
                ? ' Gemini 2.5 Flash will parse your words into a structured scenario — it will never invent any numbers.'
                : ' (Backend offline — AI parsing skipped; you\'ll edit fields manually.)'}
            </p>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. A 90-minute afternoon sample collection EVA during a moderate dust storm in Martian autumn, harsh conditions, intermediate astronaut with the advanced suit."
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: 120,
                background: 'rgba(15,18,28,0.9)', border: '1px solid rgba(94,230,245,0.3)',
                borderRadius: 12, padding: '16px 18px', color: '#fff', fontSize: 14,
                fontFamily: 'var(--font-ui)', lineHeight: 1.7, resize: 'none',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#5ee6f5' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(94,230,245,0.3)' }}
            />

            {error && (
              <div style={{
                marginTop: 12, background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
                borderRadius: 8, padding: '10px 14px', color: '#ff8080', fontSize: 12,
              }}>{error}</div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                style={{
                  background: 'linear-gradient(135deg, rgba(94,230,245,0.3), rgba(60,120,220,0.3))',
                  border: '1px solid rgba(94,230,245,0.5)',
                  borderRadius: 10, padding: '12px 28px', color: '#5ee6f5',
                  fontFamily: mono, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  opacity: (loading || !text.trim()) ? 0.5 : 1,
                  letterSpacing: '0.08em',
                }}
              >
                {loading ? '⏳ Parsing…' : backendOk ? '🤖 Parse with Gemini →' : '→ Continue to Review'}
              </button>
            </div>

            {/* Example prompts */}
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.35)', fontFamily: mono, marginBottom: 10, letterSpacing: '0.08em' }}>
                EXAMPLE PROMPTS — click to use
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {EXAMPLE_PROMPTS.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => setText(p)}
                    style={{
                      background: 'rgba(255,125,46,0.05)', border: '1px solid rgba(255,125,46,0.15)',
                      borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'rgba(240,237,232,0.6)',
                      cursor: 'pointer', lineHeight: 1.5, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,125,46,0.4)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,125,46,0.15)'; e.currentTarget.style.color = 'rgba(240,237,232,0.6)' }}
                  >
                    "{p}"
                  </div>
                ))}
              </div>
            </div>

            {/* Data notice */}
            <div style={{
              marginTop: 28, background: 'rgba(94,230,245,0.05)', border: '1px solid rgba(94,230,245,0.15)',
              borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16 }}>📡</span>
              <div style={{ fontSize: 11, color: 'rgba(240,237,232,0.5)', lineHeight: 1.6 }}>
                <strong style={{ color: '#5ee6f5' }}>Data source:</strong> REMS MODRDR v1.0 (MSL/Curiosity rover, Gale Crater).
                All environmental values are real NASA measurements — Gemini only maps your words to scenario parameters.
                <br />⚠️ <strong style={{ color: '#ffb380' }}>Gale Crater only.</strong> Conditions at other Mars landing sites will differ.
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review ─────────────────────────────────────────────── */}
        {step === 'review' && scenario && (
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', marginBottom: 4 }}>Review Parsed Scenario</h2>
            <p style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13, marginBottom: 20 }}>
              {backendOk ? 'Gemini interpreted your description. Edit any field before generating conditions.' : 'Set your scenario parameters below.'}
            </p>

            {/* Assumptions list */}
            {parsed?.assumptions?.length > 0 && (
              <div style={{
                background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 10, color: '#f5c842', fontFamily: mono, marginBottom: 6, letterSpacing: '0.08em' }}>AI ASSUMPTIONS</div>
                {parsed.assumptions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(245,200,66,0.8)', marginBottom: 3 }}>• {a}</div>
                ))}
              </div>
            )}
            {parsed?.warnings?.length > 0 && (
              <div style={{
                background: 'rgba(255,59,59,0.06)', border: '1px solid rgba(255,59,59,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              }}>
                {parsed.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#ff8080' }}>⚠ {w}</div>
                ))}
              </div>
            )}

            {/* Editable fields */}
            <div style={{
              background: 'rgba(11,13,20,0.8)', border: '1px solid rgba(255,125,46,0.15)',
              borderRadius: 14, padding: '20px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,125,46,0.6)', fontFamily: mono, marginBottom: 16, letterSpacing: '0.1em' }}>
                SCENARIO PARAMETERS
              </div>
              <FieldRow label="Season"       value={scenario.season}           onChange={setField('season')}           options={Object.fromEntries(Object.entries(SEASON_LABELS).map(([k,v])=>[k,v]))} />
              <FieldRow label="Time of Day"  value={scenario.time_of_day}      onChange={setField('time_of_day')}      options={TOD_LABELS} />
              <FieldRow label="Duration (min)" value={scenario.duration_minutes} onChange={setField('duration_minutes')} />
              <FieldRow label="Severity"     value={scenario.severity}         onChange={setField('severity')}         options={SEV_LABELS} />
              <FieldRow label="Dust Level"   value={scenario.dust_level}       onChange={setField('dust_level')}       options={DUST_LABELS} />
              <FieldRow label="Task"         value={scenario.task_type}        onChange={setField('task_type')}        options={TASK_LABELS} />
              <FieldRow label="Experience"   value={scenario.experience}       onChange={setField('experience')}       options={EXP_LABELS} />
              <FieldRow label="Suit"         value={scenario.suit}             onChange={setField('suit')}             options={SUIT_LABELS} />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
                borderRadius: 8, padding: '10px 14px', color: '#ff8080', fontSize: 12,
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('input')} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '12px 24px', color: 'rgba(240,237,232,0.5)',
                fontSize: 12, cursor: 'pointer',
              }}>← Back</button>
              <button onClick={handleGenerate} disabled={loading} style={{
                background: 'linear-gradient(135deg, rgba(255,125,46,0.3), rgba(200,74,0,0.3))',
                border: '1px solid rgba(255,125,46,0.5)', borderRadius: 10,
                padding: '12px 28px', color: '#ffb380', fontFamily: mono,
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                opacity: loading ? 0.5 : 1, letterSpacing: '0.08em',
              }}>
                {loading ? '⏳ Generating…' : '📡 Generate REMS Conditions →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Generated ──────────────────────────────────────────── */}
        {step === 'generated' && result && start && (
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', marginBottom: 4 }}>Mission Briefing</h2>
            <p style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13, marginBottom: 20 }}>
              Conditions derived from {result.isFallback ? 'static REMS median values' : 'REMS lookup'} — every number is traceable to NASA data.
            </p>

            {/* Conditions at start */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
              <ConditionCard label="AIR TEMP"      value={start.air_temp_c}    unit="°C"      color="#5ee6f5" source={start.source_notes?.air_temp} />
              <ConditionCard label="GROUND TEMP"   value={start.ground_temp_c} unit="°C"      color="#ff7d2e" source={start.source_notes?.ground_temp} />
              <ConditionCard label="PRESSURE"      value={start.pressure_pa}   unit="Pa"      color="#f5c842" source={start.source_notes?.pressure} />
              <ConditionCard label="UV"            value={start.uv_wm2}        unit="W/m²"    color="#ff3b3b" source={start.source_notes?.uv} />
              <ConditionCard label="WIND"          value={start.wind_ms}       unit="m/s"     color="#b388ff" source={start.source_notes?.wind} />
              <ConditionCard label="DUST τ"        value={start.dust_opacity}  unit=""        color="#ff7d2e" source={start.source_notes?.dust} />
              <ConditionCard label="RADIATION"     value={start.radiation_mgy_day} unit="mGy/d" color="#ff3b3b" source={start.source_notes?.radiation} />
              <ConditionCard label="LOCAL TIME"    value={`${Math.floor(start.lst_hour)}:${String(Math.round((start.lst_hour % 1) * 60)).padStart(2,'0')}`} unit="LST" color="#2ecc71" />
            </div>

            {/* Briefing text */}
            <div style={{
              background: 'rgba(11,13,20,0.9)', border: '1px solid rgba(94,230,245,0.2)',
              borderRadius: 12, padding: '20px 24px', marginBottom: 20,
              fontSize: 13, lineHeight: 1.85, color: 'rgba(240,237,232,0.8)',
              whiteSpace: 'pre-line',
            }}>
              <div style={{ fontSize: 10, color: '#5ee6f5', fontFamily: mono, marginBottom: 10, letterSpacing: '0.1em' }}>
                📋 NASA-STYLE MISSION BRIEFING
              </div>
              {result.briefing}
            </div>

            {/* Data source */}
            <div style={{
              background: 'rgba(94,230,245,0.04)', border: '1px solid rgba(94,230,245,0.12)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 16,
              fontSize: 11, color: 'rgba(240,237,232,0.4)', fontFamily: mono,
            }}>
              📡 {result.data_source}
            </div>

            {/* Caveats */}
            {result.caveats?.length > 0 && (
              <div style={{
                background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.15)',
                borderRadius: 10, padding: '10px 16px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 9, color: '#f5c842', fontFamily: mono, marginBottom: 6, letterSpacing: '0.08em' }}>CAVEATS & LIMITS</div>
                {result.caveats.map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'rgba(245,200,66,0.65)', marginBottom: 3 }}>• {c}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('review')} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '12px 24px', color: 'rgba(240,237,232,0.5)',
                fontSize: 12, cursor: 'pointer',
              }}>← Back</button>
              <button onClick={handleLaunch} style={{
                background: 'linear-gradient(135deg, rgba(200,74,0,0.9), rgba(255,125,46,0.9))',
                border: 'none', borderRadius: 10, padding: '13px 32px', color: '#fff',
                fontFamily: mono, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                letterSpacing: '0.08em', boxShadow: '0 4px 24px rgba(255,125,46,0.3)',
              }}>
                🌍 Launch in 3D Explorer →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

