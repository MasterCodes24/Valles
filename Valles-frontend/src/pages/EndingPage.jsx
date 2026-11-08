import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Star, CheckCircle } from 'lucide-react'
import './EndingPage.css'

const MESSAGES = [
  { delay: 0, from: 'JPL', text: 'ROVER-7, this is Dr. Chen at JPL. We read you.' },
  { delay: 2000, from: 'JPL', text: 'Your mission data has been received. What you\'ve mapped is extraordinary.' },
  { delay: 4500, from: 'ROVER-7', text: 'All objectives complete. Jezero thoroughly surveyed. Ready for extraction.' },
  { delay: 7000, from: 'JPL', text: 'Extraction vehicle is en route. ETA: 6 hours. Outstanding work, Commander.' },
  { delay: 9500, from: 'SYSTEM', text: '--- MISSION COMPLETE --- EXTRACTION AUTHORIZED ---' },
]

export default function EndingPage() {
  const [visibleMessages, setVisibleMessages] = useState([])
  const [showStats, setShowStats] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    MESSAGES.forEach(msg => {
      setTimeout(() => {
        setVisibleMessages(prev => [...prev, msg])
      }, msg.delay)
    })
    setTimeout(() => setShowStats(true), 11000)
  }, [])

  return (
    <div className="ending-page">
      <div className="ending-stars" />
      <div className="ending-mars-glow" />

      <div className="ending-content">
        {/* Terminal comms feed */}
        <div className="ending-terminal">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span /><span /><span />
            </div>
            <span className="terminal-title">INTER-PLANETARY COMMUNICATION FEED — SECURED</span>
          </div>
          <div className="terminal-body">
            {visibleMessages.map((msg, i) => (
              <div key={i} className={`terminal-line ${msg.from.toLowerCase()}`} style={{ animationDelay: `0ms` }}>
                <span className="terminal-sender">[{msg.from}]</span>
                <span className="terminal-text">{msg.text}</span>
              </div>
            ))}
            <div className="terminal-cursor" />
          </div>
        </div>

        {/* Stats + celebration */}
        {showStats && (
          <div className="ending-stats animate-fadeInUp">
            <div className="ending-medal">
              <Rocket size={56} className="medal-icon" />
              <div className="medal-rays" />
            </div>

            <h1 className="ending-title">Mission Complete</h1>
            <p className="ending-subtitle">You have successfully completed all 10 levels of Mars surface operations</p>

            <div className="ending-achievements">
              {[
                'Jezero Crater — fully mapped',
                '142.6 km of Mars surface traversed',
                '18 missions completed',
                '83% mission success rate',
                'Commander rank achieved',
              ].map((ach, i) => (
                <div key={i} className="ending-ach-item">
                  <CheckCircle size={18} style={{ color: 'var(--clr-safe)', flexShrink: 0 }} />
                  <span>{ach}</span>
                </div>
              ))}
            </div>

            <div className="ending-xp-banner">
              <Star size={20} style={{ color: 'var(--clr-battery)' }} />
              <span>Total XP Earned: <strong>25,000</strong></span>
              <span className="badge badge-mars">MAX LEVEL</span>
            </div>

            <button className="btn btn-primary btn-lg" onClick={() => navigate('/game/dashboard')} style={{ marginTop: 'var(--space-6)' }}>
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
