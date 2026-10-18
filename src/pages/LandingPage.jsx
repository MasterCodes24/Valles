import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Rocket, Map, Target, Zap, Shield, Radio, Star, ChevronRight, Play, Activity, Globe } from 'lucide-react'
import './LandingPage.css'

const STATS = [
  { value: '4', label: 'Mars Regions', suffix: '' },
  { value: '10', label: 'Mission Levels', suffix: '+' },
  { value: '4000', label: 'km of Canyon', suffix: '' },
  { value: '99', label: 'Route Safety AI', suffix: '%' },
]

const FEATURES = [
  {
    icon: Map,
    title: 'Dynamic Route Planning',
    desc: 'Plot paths across Jezero Crater, Hellas Basin, Valles Marineris & Olympus Mons using AI-assisted route optimization.',
    color: 'var(--clr-mars-200)',
  },
  {
    icon: Activity,
    title: 'Mission Simulation',
    desc: 'Step through tick-by-tick telemetry: oxygen, battery, radiation & comms — make critical mid-mission decisions.',
    color: 'var(--clr-oxygen)',
  },
  {
    icon: Shield,
    title: 'Hazard Intelligence',
    desc: 'Live hazard overlays, slope warnings, solar event alerts, and radiation spike detection protect your crew.',
    color: 'var(--clr-radiation)',
  },
  {
    icon: Radio,
    title: 'Earth Comms',
    desc: 'Exchange transmissions with JPL Mission Control with realistic 20-minute signal delays.',
    color: 'var(--clr-comms)',
  },
  {
    icon: Star,
    title: 'Weekly Challenges',
    desc: 'Compete in speed runs and survival challenges. Climb the leaderboard and earn exclusive badges.',
    color: 'var(--clr-battery)',
  },
  {
    icon: Zap,
    title: 'Mission Planner (Pro)',
    desc: 'A standalone professional analysis tool for authorized surface operations. Human approval required.',
    color: 'var(--clr-ice-300)',
  },
]

const REGIONS = [
  { id: 'jezero', name: 'Jezero Crater', desc: 'Ancient river delta', level: 1, color: '#ff7d2e' },
  { id: 'hellas', name: 'Hellas Basin', desc: 'Deepest crater on Mars', level: 3, color: '#f39c12' },
  { id: 'valles', name: 'Valles Marineris', desc: '4000 km canyon system', level: 6, color: '#e85d00' },
  { id: 'olympus', name: 'Olympus Mons', desc: 'Tallest volcano in the solar system', level: 8, color: '#c44a00' },
]

function StatCounter({ value, label, suffix }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const animated = useRef(false)
  const target = parseInt(value, 10)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const duration = 1200
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.round(eased * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} className="stat-counter">
      <div className="stat-number">{count}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Ambient background */}
      <div className="landing-bg">
        <div className="bg-planet" />
        <div className="bg-stars" />
        <div className="bg-glow-mars" />
        <div className="bg-glow-ice" />
      </div>

      {/* Nav */}
      <header className="landing-nav">
        <div className="nav-inner container">
          <div className="nav-brand">
            <Rocket size={22} className="brand-icon" />
            <span className="brand-name">VALLES</span>
            <span className="brand-badge badge badge-mars">BETA</span>
          </div>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#regions">Regions</a>
            <a href="/planner" target="_blank" rel="noopener noreferrer">Mission Planner</a>
          </nav>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-eyebrow">
            <span className="badge badge-mars">🚀 Mars Surface Operations Platform</span>
          </div>
          <h1 className="hero-title">
            Navigate the <span className="hero-accent">Red Planet.</span>
            <br />Survive the mission.
          </h1>
          <p className="hero-desc">
            Plan routes across Mars terrain, simulate missions with real-time telemetry, and make critical
            decisions under extreme conditions. From Jezero Crater to Valles Marineris.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              <Rocket size={18} />
              Begin Mission
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate('/login')}>
              <Play size={18} />
              Continue Mission
            </button>
          </div>

          {/* Hero telemetry card */}
          <div className="hero-card glass-bright animate-float">
            <div className="hero-card-header">
              <div className="hc-dot hc-dot-green" />
              <span>LIVE TELEMETRY — ROVER-7</span>
            </div>
            <div className="hero-card-stats">
              {[
                { label: 'O₂', value: '82%', color: 'var(--clr-oxygen)' },
                { label: 'BATTERY', value: '67%', color: 'var(--clr-battery)' },
                { label: 'COMMS', value: '94%', color: 'var(--clr-comms)' },
                { label: 'DIST', value: '4.2km', color: 'var(--clr-safe)' },
              ].map(s => (
                <div key={s.label} className="hc-stat">
                  <span className="hc-stat-label">{s.label}</span>
                  <span className="hc-stat-value" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="hero-card-bar">
              <div className="hc-bar-fill" />
            </div>
            <div className="hc-route-label">Balanced Route · Jezero Crater</div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="stats-strip">
        <div className="container">
          <div className="stats-grid">
            {STATS.map(s => (
              <StatCounter key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-mars">WHAT YOU GET</span>
            <h2 className="section-title">Everything you need to survive Mars</h2>
            <p className="section-desc">A fully featured simulation platform built for realism, tension, and scientific accuracy.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="feature-card card">
                <div className="feature-icon" style={{ color, background: `${color}15` }}>
                  <Icon size={24} />
                </div>
                <h4 className="feature-title">{title}</h4>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regions */}
      <section id="regions" className="regions-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-ice">EXPLORATION ZONES</span>
            <h2 className="section-title">Four hostile worlds await</h2>
            <p className="section-desc">Each region unlocks as you progress — and each one is more dangerous than the last.</p>
          </div>
          <div className="regions-grid">
            {REGIONS.map(r => (
              <div key={r.id} className="region-card" style={{ '--region-color': r.color }}>
                <div className="region-glow" />
                <div className="region-level badge badge-mars">LVL {r.level}+</div>
                <h3 className="region-name">{r.name}</h3>
                <p className="region-desc">{r.desc}</p>
                <div className="region-arrow">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planner CTA */}
      <section className="planner-cta-section">
        <div className="container">
          <div className="planner-cta-card glass-bright">
            <div className="planner-cta-icon">
              <Zap size={32} style={{ color: 'var(--clr-ice-300)' }} />
            </div>
            <div className="planner-cta-content">
              <span className="badge badge-ice" style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}>PRODUCT B — PROFESSIONAL TOOL</span>
              <h3>Mission Planner</h3>
              <p>
                A standalone surface operations analysis system for authorized mission planners.
                Runs best-case, nominal, and worst-case route forecasts. Human approval required before execution.
              </p>
            </div>
            <a href="/planner" target="_blank" rel="noopener noreferrer" className="btn btn-ice">
              Open Planner <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container final-cta-inner">
          <h2>Ready to set foot on Mars?</h2>
          <p>Create your commander profile and begin your first mission today.</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              <Rocket size={18} />
              Create Account
            </button>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Already a commander →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Rocket size={16} />
            <span>VALLES</span>
          </div>
          <p className="footer-copy">Mars Surface Operations Platform · For authorized mission planning use only</p>
          <div className="footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <a href="/planner" target="_blank">Planner</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
