import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Rocket, User, AlertCircle } from 'lucide-react'
import './AuthPages.css'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', callsign: '' })
  const [error, setError] = useState('')
  const { register, loading } = useApp()
  const navigate = useNavigate()

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.callsign.length < 3) { setError('Callsign must be at least 3 characters'); return }
    const { error: err } = await register(form.email, form.password, form.callsign)
    if (err) setError(err)
    else navigate('/game/dashboard')
  }

  return (
    <div className="auth-bg">
      <div className="auth-glow" />
      <div className="auth-stars" />
      <div className="auth-card">
        <div className="auth-logo">
          <Rocket size={28} className="auth-logo-icon" />
          <span className="auth-logo-text">VALLES</span>
        </div>

        <div className="auth-header-text">
          <h1 className="auth-title">Commander Registration</h1>
          <p className="auth-subtitle">Join the Mars Surface Operations Program</p>
        </div>

        {error && (
          <div className="alert alert-hazard" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label" htmlFor="reg-callsign">Commander Callsign</label>
            <input
              id="reg-callsign"
              type="text"
              className="input"
              placeholder="e.g. ROVER-7, ALPHA-3"
              value={form.callsign}
              onChange={update('callsign')}
              required
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="commander@jpl.nasa.gov"
              value={form.email}
              onChange={update('email')}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="reg-password">Access Code (Password)</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
            />
          </div>

          <div className="recruit-perks">
            {['Start in Jezero Crater — Perseverance landing site', 'Full mission simulation & route planning', 'Track oxygen, radiation, and battery in real-time'].map(p => (
              <div key={p} className="recruit-perk">
                <span className="perk-dot">✦</span>
                <span>{p}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            id="register-submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? (
              <><div className="btn-spinner" />Initializing Profile...</>
            ) : (
              <><User size={18} />Begin Mission Program</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already registered? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  )
}
