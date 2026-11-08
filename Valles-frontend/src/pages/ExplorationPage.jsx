import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getEarthCommsLog, sendEarthComm } from '../api/missions'
import { adaptEarthCommsMessages } from '../api/adapters'
import MarsWorld3D from '../components/game/MarsWorld3D'
import RealisticModePanel from '../components/game/RealisticModePanel'
import { Radio, Send, Clock, Inbox, Target, Globe, Zap, Shield, Wind, Map, ChevronRight } from 'lucide-react'

// ─── Default Realistic Earth Transmissions (NASA JPL lore) ────────────────────
const DEFAULT_COMMS = [
  {
    id: 'comm_init_001',
    from: 'Dr. Sarah Chen, JPL Flight Director',
    to: 'Commander (Jezero Base)',
    subject: 'Sol 12 — Welcome to Jezero Station & Operations Order',
    body: 'Commander, telemetry from your EVA suit and Jezero Base Camp is confirmed online at NASA Goldstone and Madrid DSN antennas via Mars Reconnaissance Orbiter (MRO). Remember: atmospheric surface pressure is ~610 Pa (under 1% of Earth). Never exceed suit safe envelope. Monitor your O₂ and battery reserves constantly. All scientific discoveries log mission bounties to your requisition inventory. Good luck. Earth is with you.',
    sentAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    receivedAt: new Date(Date.now() - 3600000 * 2.6).toISOString(),
    delayMins: 142,
    priority: 'standard',
    read: true,
  },
  {
    id: 'comm_init_002',
    from: 'Marcus Vance, EVA Systems Lead (JSC)',
    to: 'Commander (Jezero Base)',
    subject: 'CRITICAL: Suit O₂ Limits & Habitat Airlock Couplings',
    body: 'Vance here from Johnson Space Center. Your xEMU suit is calibrated for Jezero Crater terrain. Base habitat airlock at coordinates (-20, -30) is equipped with automated rapid-recharge couplings — when you stand near the habitat airlock, press [E] to replenish your oxygen, battery, and scrub radiation to zero. If O₂ drops below 20%, abort immediately and return to base. If emergency exhaustion occurs, the autonomous transponder will trigger, but do not risk asphyxiation.',
    sentAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    receivedAt: new Date(Date.now() - 3600000 * 0.6).toISOString(),
    delayMins: 142,
    priority: 'high',
    read: true,
  },
  {
    id: 'comm_init_003',
    from: 'Dr. Priya Patel, Senior Planetary Geologist',
    to: 'Commander (Jezero Base)',
    subject: 'Science Priority: Jezero Delta & Ancient Shoreline Stratigraphy',
    body: 'Commander Patel here. Satellite spectrometer sweeps show high concentrations of phyllosilicates and carbonates near the western delta deposit (~X:150, Z:80) and ancient shoreline (~X:300, Z:-200). If you make EVA passes nearby, tag those waypoints. Every discovery milestone logged credits 🪙 mission research bounty directly to your requisitions inventory.',
    sentAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    receivedAt: new Date(Date.now() - 3600000 * 0.2).toISOString(),
    delayMins: 145,
    priority: 'standard',
    read: false,
  },
  {
    id: 'comm_init_004',
    from: 'NOAA Space Weather Prediction Center',
    to: 'Commander (Jezero Base)',
    subject: 'ADVISORY: Solar Particle Event (Coronal Mass Ejection)',
    body: 'ALERT: Moderate coronal mass ejection detected heading toward Martian orbital sector 4. Expected surface cosmic radiation elevation: +0.4 to +1.2 mSv/day over baseline. Recommend avoiding prolonged stays at high altitude mesa summits during daylight hours. Seek habitat shelter if radiation gauge crosses yellow threshold.',
    sentAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    receivedAt: new Date().toISOString(),
    delayMins: 140,
    priority: 'high',
    read: false,
  },
]

// ─── Earth Comms Panel (inline, inside Explorer) ─────────────────────────────
function EarthCommsPanel({ user, onClose }) {
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem('valles_earth_comms_log')
      if (stored) return JSON.parse(stored)
    } catch {}
    localStorage.setItem('valles_earth_comms_log', JSON.stringify(DEFAULT_COMMS))
    return DEFAULT_COMMS
  })
  const [selected, setSelected] = useState(() => messages[0] || null)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [transmissionStatus, setTransmissionStatus] = useState(null)

  // Save changes to localStorage whenever messages change
  const saveMessages = (updated) => {
    setMessages(updated)
    try { localStorage.setItem('valles_earth_comms_log', JSON.stringify(updated)) } catch {}
  }

  const handleSelect = (msg) => {
    setSelected(msg)
    setComposing(false)
    if (!msg.read) {
      const updated = messages.map(m => m.id === msg.id ? { ...m, read: true } : m)
      saveMessages(updated)
    }
  }

  const handleReply = (msg) => {
    setDraft({
      subject: msg.subject.startsWith('RE:') ? msg.subject : `RE: ${msg.subject}`,
      body: `\n\n--- In reply to ${msg.from} ---\n> ${msg.body.slice(0, 100)}...`,
    })
    setComposing(true)
  }

  const handleSend = () => {
    if (!draft.subject.trim() || !draft.body.trim()) return
    setSending(true)
    setTransmissionStatus('Uplinking to Mars Reconnaissance Orbiter (MRO)...')

    const newMsg = {
      id: `comm_user_${Date.now()}`,
      from: user?.email ? `Commander (${user.email.split('@')[0]})` : 'Commander (You)',
      to: 'JPL Mission Control, Pasadena',
      subject: draft.subject,
      body: draft.body,
      sentAt: new Date().toISOString(),
      receivedAt: new Date(Date.now() + 142 * 60 * 1000).toISOString(),
      delayMins: 142,
      priority: 'standard',
      read: true,
      outgoing: true,
    }

    const updated = [newMsg, ...messages]
    saveMessages(updated)
    setSelected(newMsg)

    // Also attempt Supabase send if authenticated, safely
    if (user?.userId) {
      sendEarthComm(user.userId, {
        direction: 'to_earth',
        subject: draft.subject,
        body: draft.body,
        commsDelayMin: 142,
      }).catch(err => console.warn('[EarthComms] Supabase sync skipped:', err))
    }

    // Step 2: DSN Deep Space Network confirmation
    setTimeout(() => {
      setTransmissionStatus('Signal confirmed: Deep Space Network Madrid & Goldstone arrays locked. Signal travel: 142 minutes.')
    }, 1200)

    // Step 3: Simulated Mission Control reply after 3.5s
    setTimeout(() => {
      setSending(false)
      setComposing(false)
      setDraft({ subject: '', body: '' })

      const replySubject = draft.subject.startsWith('RE:') ? draft.subject : `RE: ${draft.subject}`
      let replyBody = `Commander, transmission received at JPL Mission Control. Telemetry packet analyzed: EVA life support systems within operational boundaries. Mission Director acknowledges: "${draft.body.slice(0, 90)}...". Continue exploration objectives and monitor O₂ rate. Chen out.`
      if (draft.subject.toLowerCase().includes('o2') || draft.body.toLowerCase().includes('oxygen')) {
        replyBody = `Commander, EVA Systems desk acknowledged your oxygen report. Base habitat airlock (-20, -30) is ready for immediate recharge if O₂ drops below 20%. Remember that sprinting increases O₂ burn by 2.5×. Maintain walk pace when returning.`
      } else if (draft.subject.toLowerCase().includes('sample') || draft.body.toLowerCase().includes('rock') || draft.body.toLowerCase().includes('delta')) {
        replyBody = `Dr. Patel here. Received your geological observations! Sedimentary data from Jezero Delta is extraordinary. Any flagged discovery coordinates reward credits directly to your inventory requisitions.`
      }

      const replyMsg = {
        id: `comm_jpl_reply_${Date.now()}`,
        from: 'Dr. Sarah Chen, JPL Mission Director',
        to: 'Commander (Jezero Base)',
        subject: replySubject,
        body: replyBody,
        sentAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        delayMins: 142,
        priority: 'high',
        read: false,
      }

      const withReply = [replyMsg, ...JSON.parse(localStorage.getItem('valles_earth_comms_log') || '[]')]
      saveMessages(withReply)
      setSelected(replyMsg)
      setTransmissionStatus(null)
    }, 3200)
  }

  const unreadCount = messages.filter(m => !m.read).length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(5,2,0,0.94)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-ui)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px', borderBottom: '1px solid rgba(255,125,46,0.25)',
        background: 'rgba(11,13,18,0.85)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(94,230,245,0.15)', border: '1px solid rgba(94,230,245,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={20} style={{ color: '#5ee6f5' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--clr-text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              Earth Communications
              {unreadCount > 0 && (
                <span style={{
                  background: '#ff3b3b', color: '#fff', borderRadius: 999,
                  padding: '2px 8px', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
                }}>
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Deep Space Network Relay · Mars Reconnaissance Orbiter (MRO) · Light Delay: ~142 min
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => { setComposing(true); setSelected(null); setTransmissionStatus(null) }}
            style={{
              background: 'linear-gradient(135deg, rgba(94,230,245,0.25), rgba(74,157,201,0.25))',
              border: '1px solid rgba(94,230,245,0.4)',
              color: '#5ee6f5', borderRadius: 10, padding: '9px 20px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Send size={13} /> Compose Transmission
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,59,59,0.15)', border: '1px solid rgba(255,59,59,0.35)',
              color: '#ff6b6b', borderRadius: 10, padding: '9px 20px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Inbox list */}
        <div style={{
          width: 320, borderRight: '1px solid rgba(255,125,46,0.15)',
          display: 'flex', flexDirection: 'column', background: 'rgba(8,10,14,0.6)',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: 10, color: 'rgba(255,125,46,0.7)', letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span>TRANSMISSIONS ({messages.length})</span>
            {unreadCount > 0 && <span style={{ color: '#5ee6f5' }}>{unreadCount} UNREAD</span>}
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.4, gap: 8 }}>
                <Inbox size={32} style={{ color: 'var(--clr-text-muted)' }} />
                <div style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>No transmissions received</div>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => handleSelect(msg)}
                style={{
                  padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selected?.id === msg.id ? 'rgba(255,125,46,0.12)' : 'transparent',
                  borderLeft: selected?.id === msg.id ? '3px solid #ff7d2e' : '3px solid transparent',
                  opacity: msg.read ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: msg.read ? 600 : 800, color: msg.read ? 'var(--clr-text-secondary)' : '#5ee6f5' }}>
                    {msg.from}
                  </span>
                  {msg.priority === 'high' && (
                    <span style={{ fontSize: 9, color: '#ff3b3b', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      PRIORITY
                    </span>
                  )}
                  {msg.outgoing && (
                    <span style={{ fontSize: 9, color: '#f5c842', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      OUTGOING
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--clr-text-primary)', marginBottom: 4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: msg.read ? 500 : 700,
                }}>
                  {msg.subject}
                </div>
                <div style={{ fontSize: 10, color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={9} /> {new Date(msg.sentAt || msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {!msg.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5ee6f5', marginLeft: 6 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message view / compose */}
        <div style={{ flex: 1, padding: '32px 40px', overflow: 'auto', background: 'rgba(5,2,0,0.4)' }}>
          {composing ? (
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Radio size={20} style={{ color: '#5ee6f5' }} />
                <h3 style={{ color: 'var(--clr-text-primary)', fontSize: 20, margin: 0 }}>
                  Transmit to JPL Mission Control
                </h3>
              </div>
              <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
                <Clock size={11} /> Mars-to-Earth light travel time: ~142 min · Uplink via Mars Reconnaissance Orbiter
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--clr-text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                  TRANSMISSION SUBJECT
                </label>
                <input
                  className="input"
                  placeholder="e.g. Sol 12 Status: Jezero Delta Exploration..."
                  value={draft.subject}
                  onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: 'rgba(23,28,46,0.6)',
                    border: '1px solid rgba(255,125,46,0.25)', borderRadius: 8, padding: '10px 14px',
                    color: '#fff', fontSize: 13,
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--clr-text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                  MESSAGE CONTENT (LOGGED IN JPL PERMANENT ARCHIVE)
                </label>
                <textarea
                  className="input"
                  rows={8}
                  placeholder="Report your EVA discoveries, terrain hazards, life support telemetry, or requests to Mission Control..."
                  value={draft.body}
                  onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: 'rgba(23,28,46,0.6)',
                    border: '1px solid rgba(255,125,46,0.25)', borderRadius: 8, padding: '12px 14px',
                    color: '#fff', fontSize: 13, resize: 'vertical', lineHeight: 1.7,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={sending || !draft.subject.trim() || !draft.body.trim()}
                  style={{
                    background: 'linear-gradient(135deg, rgba(200,74,0,0.9), rgba(255,125,46,0.9))',
                    border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff',
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {sending ? 'Transmitting to DSN...' : <><Send size={14} /> Send Transmission</>}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setComposing(false); setTransmissionStatus(null) }}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '10px 18px', color: 'var(--clr-text-muted)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>

              {transmissionStatus && (
                <div style={{
                  marginTop: 20, background: 'rgba(94,230,245,0.1)', border: '1px solid rgba(94,230,245,0.3)',
                  borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center',
                  color: '#5ee6f5', fontSize: 12, fontFamily: 'var(--font-mono)',
                }}>
                  <Radio size={16} style={{ animation: 'spin 2s linear infinite' }} />
                  <div>{transmissionStatus}</div>
                </div>
              )}
            </div>
          ) : selected ? (
            <div style={{ maxWidth: 700 }}>
              {selected.priority === 'high' && (
                <div style={{
                  display: 'inline-block', background: 'rgba(255,59,59,0.15)', border: '1px solid rgba(255,59,59,0.4)',
                  borderRadius: 999, padding: '3px 12px', fontSize: 10, color: '#ff3b3b',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 14,
                }}>
                  ⚠ PRIORITY TRANSMISSION
                </div>
              )}
              {selected.outgoing && (
                <div style={{
                  display: 'inline-block', background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)',
                  borderRadius: 999, padding: '3px 12px', fontSize: 10, color: '#f5c842',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 14,
                }}>
                  📡 SENT OUTGOING TRANSMISSION
                </div>
              )}

              <h2 style={{ marginBottom: 12, color: 'var(--clr-text-primary)', fontSize: 22, fontWeight: 800 }}>
                {selected.subject}
              </h2>

              <div style={{
                display: 'flex', gap: 24, fontSize: 11, color: 'var(--clr-text-muted)',
                fontFamily: 'var(--font-mono)', marginBottom: 20, paddingBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap',
              }}>
                <span><strong style={{ color: '#ff7d2e' }}>FROM:</strong> {selected.from}</span>
                <span><strong style={{ color: '#5ee6f5' }}>TO:</strong> {selected.to}</span>
                <span><strong style={{ color: '#f5c842' }}>DELAY:</strong> {selected.delayMins || 142} min</span>
              </div>

              <div style={{
                fontSize: 14, lineHeight: 1.85, color: 'var(--clr-text-secondary)',
                whiteSpace: 'pre-line', background: 'rgba(15,18,26,0.4)', borderRadius: 12,
                padding: '20px 24px', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {selected.body}
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  onClick={() => handleReply(selected)}
                  style={{
                    background: 'rgba(94,230,245,0.15)', border: '1px solid rgba(94,230,245,0.35)',
                    color: '#5ee6f5', borderRadius: 8, padding: '10px 20px', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Send size={13} /> Reply to Transmission
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: 12 }}>
              <Inbox size={52} />
              <div style={{ fontSize: 14, color: 'var(--clr-text-muted)' }}>Select a transmission to read</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mode selection card ─────────────────────────────────────────────────────
function ModeCard({ icon, title, subtitle, description, features, color, badge, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        background: 'rgba(23,28,46,0.7)', backdropFilter: 'blur(16px)',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : color + '33'}`,
        borderRadius: 20, padding: '32px 28px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.25s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = color + '77'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${color}18` } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = disabled ? 'rgba(255,255,255,0.06)' : color + '33'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: disabled ? 'rgba(255,255,255,0.1)' : `linear-gradient(90deg, ${color}, ${color}88)` }} />

      {badge && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: color + '20', border: `1px solid ${color}44`,
          borderRadius: 999, padding: '3px 10px',
          fontSize: 9, color, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em',
        }}>{badge}</div>
      )}

      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: disabled ? 'var(--clr-text-muted)' : 'var(--clr-text-primary)', marginBottom: 6 }}>{title}</h3>
      <div style={{ fontSize: 11, color, fontFamily: 'var(--font-mono)', marginBottom: 12, fontWeight: 700, letterSpacing: '0.08em' }}>{subtitle}</div>
      <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', lineHeight: 1.7, marginBottom: 20 }}>{description}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--clr-text-secondary)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>

      {!disabled && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color, fontSize: 13, fontWeight: 700,
        }}>
          <span>Launch {title}</span>
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  )
}

// ─── Main ExplorationPage ────────────────────────────────────────────────────
export default function ExplorationPage() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [inGame, setInGame] = useState(false)
  const [gameMode, setGameMode] = useState(null) // 'free' | 'mission' | 'realistic'
  const [showRealisticPanel, setShowRealisticPanel] = useState(false)
  const [realisticConditions, setRealisticConditions] = useState(null)
  const [showComms, setShowComms] = useState(false)

  // Read active mission/challenge from localStorage
  const [activeMission] = useState(() => {
    try { return JSON.parse(localStorage.getItem('valles_active_explorer_mission') || 'null') } catch { return null }
  })
  const [activeChallenge] = useState(() => {
    try { return JSON.parse(localStorage.getItem('valles_active_explorer_challenge') || 'null') } catch { return null }
  })

  const handleExit = () => {
    setInGame(false)
    setGameMode(null)
  }

  const handleLaunch = (mode) => {
    setGameMode(mode)
    setInGame(true)
  }

  // ── Full-screen 3D game mode ─────────────────────────────────────────────
  if (inGame) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#050200' }}>
          <MarsWorld3D
            onExit={handleExit}
            onOpenComms={() => setShowComms(true)}
            mode={gameMode}
            activeMission={gameMode === 'mission' ? activeMission : null}
            activeChallenge={gameMode === 'mission' ? activeChallenge : null}
            realisticConditions={gameMode === 'realistic' ? realisticConditions : null}
          />
        </div>

        {showComms && <EarthCommsPanel user={user} onClose={() => setShowComms(false)} />}
      </>
    )
  }

  // ── Launch screen ────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '80vh', padding: '40px 20px',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 700, margin: '0 auto 48px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(200,74,0,0.15)', border: '1px solid rgba(200,74,0,0.3)',
          borderRadius: 999, padding: '4px 16px', marginBottom: 24,
          color: 'var(--clr-mars-200)', fontSize: 11, fontFamily: 'var(--font-mono)',
          letterSpacing: '0.12em',
        }}>
          ◉ 3D EXPLORER — JEZERO CRATER
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800,
          background: 'linear-gradient(135deg, #ff7d2e, #ffb380)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', lineHeight: 1.1, marginBottom: 16,
        }}>
          Walk on Mars
        </h1>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          Choose your experience. Free Roam lets you explore with realistic suit limits and persistent saves.
          Mission Mode loads your active mission objectives into the HUD.
        </p>
      </div>

      {/* Active mission / challenge banners */}
      {(activeMission || activeChallenge) && (
        <div style={{
          maxWidth: 900, margin: '0 auto 32px', width: '100%',
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          {activeMission && (
            <div style={{
              flex: 1, background: 'rgba(255,125,46,0.08)', border: '1px solid rgba(255,125,46,0.3)',
              borderRadius: 12, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <Target size={20} style={{ color: '#ff7d2e', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,125,46,0.6)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>ACTIVE MISSION</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-text-primary)' }}>{activeMission.title}</div>
              </div>
              <button
                onClick={() => localStorage.removeItem('valles_active_explorer_mission')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14 }}
              >✕</button>
            </div>
          )}
          {activeChallenge && (
            <div style={{
              flex: 1, background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.3)',
              borderRadius: 12, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(245,200,66,0.6)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>ACTIVE CHALLENGE</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-text-primary)' }}>{activeChallenge.title}</div>
              </div>
              <button
                onClick={() => localStorage.removeItem('valles_active_explorer_challenge')}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14 }}
              >✕</button>
            </div>
          )}
        </div>
      )}

      {/* Mode cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24, maxWidth: 900, margin: '0 auto', width: '100%',
      }}>
        <ModeCard
          icon="🌍"
          title="Free Roam"
          subtitle="OPEN EXPLORATION · PROGRESS SAVED"
          description="Explore Mars freely with realistic suit constraints. Your O₂, battery, and radiation all drain in real-time. Your position and suit status are auto-saved every 10 seconds — pick up right where you left off."
          features={[
            'Oxygen & battery drain in real-time',
            'Position auto-saved every 10 seconds',
            'Radiation accumulates — manage carefully',
            'Track discovery sites freely',
            'Earth Comms accessible from EVA suit',
            'No mission time limit',
          ]}
          color="#5ee6f5"
          badge="AUTO-SAVE"
          onClick={() => handleLaunch('free')}
        />
        <ModeCard
          icon="🛰"
          title="Realistic Mode"
          subtitle="REMS DATA · AI-PARSED · GALE CRATER"
          description="Describe your Mars EVA scenario in plain English. Gemini 2.5 Flash parses your intent into a structured query, then every environmental value — temperature, pressure, UV, wind — is drawn from real NASA REMS measurements by the Curiosity rover."
          features={[
            'Air temp, pressure, UV & wind from real REMS data',
            'Gemini parses intent — never invents numbers',
            'Dust storm conditions from observed storm periods',
            'Live HUD with REMS source citation per value',
            'Mission briefing generated from confirmed data',
            'Gale Crater, Mars (Curiosity REMS MODRDR v1.0)',
          ]}
          color="#5ee6f5"
          badge="NASA DATA"
          onClick={() => setShowRealisticPanel(true)}
        />
        <ModeCard
          icon="🎯"
          title="Mission Mode"
          subtitle="ACTIVE OBJECTIVES · NO RESOURCE DRAIN"
          description="Focus on completing missions and challenges without worrying about suit resources. Your active mission or weekly challenge objectives are displayed in the HUD. Perfect for practicing routes and completing goals."
          features={[
            'Active mission loaded in HUD',
            'Weekly challenge objectives tracked',
            'No oxygen or battery drain',
            'Focus purely on exploration goals',
            'Earth Comms accessible any time',
            activeMission ? `Current: ${activeMission.title}` : activeChallenge ? `Challenge: ${activeChallenge.title}` : 'No active mission — load one from Missions',
          ]}
          color="#ff7d2e"
          badge={activeMission ? 'MISSION ACTIVE' : activeChallenge ? 'CHALLENGE ACTIVE' : undefined}
          onClick={() => handleLaunch('mission')}
        />
      </div>

      {/* Controls reference */}
      <div style={{
        maxWidth: 900, margin: '32px auto 0', width: '100%',
        background: 'rgba(11,13,18,0.8)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,125,46,0.15)', borderRadius: 16,
        padding: '20px 32px', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <div style={{ color: 'rgba(255,125,46,0.6)', fontSize: 10, letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
          CONTROLS
        </div>
        {[
          ['W A S D', 'Move'],
          ['Mouse', 'Look'],
          ['Space', 'Jump'],
          ['Shift + W', 'Sprint'],
          ['TAB', 'Exit EVA'],
          ['ESC', 'Unlock cursor'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              background: 'rgba(255,125,46,0.1)', border: '1px solid rgba(255,125,46,0.3)',
              borderRadius: 7, padding: '5px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ffb380', fontWeight: 700,
            }}>{k}</div>
            <div style={{ color: 'rgba(240,237,232,0.4)', fontSize: 10 }}>{v}</div>
          </div>
        ))}

        {/* Quick Earth Comms access from landing */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowComms(true)}
            style={{
              background: 'rgba(94,230,245,0.1)', border: '1px solid rgba(94,230,245,0.3)',
              borderRadius: 10, padding: '10px 18px', color: '#5ee6f5',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Radio size={13} /> Earth Comms
          </button>
        </div>
      </div>

      {/* Back button */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button
          onClick={() => navigate('/game/dashboard')}
          style={{
            background: 'rgba(23,28,46,0.7)', backdropFilter: 'blur(12px)',
            color: 'var(--clr-text-secondary)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '12px 28px', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-ui)', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          ← Back to Base
        </button>
      </div>

      {showComms && <EarthCommsPanel user={user} onClose={() => setShowComms(false)} />}

      {showRealisticPanel && (
        <RealisticModePanel
          onClose={() => setShowRealisticPanel(false)}
          onLaunch={(conditions) => {
            setRealisticConditions(conditions)
            setShowRealisticPanel(false)
            setGameMode('realistic')
            setInGame(true)
          }}
        />
      )}
    </div>
  )
}
