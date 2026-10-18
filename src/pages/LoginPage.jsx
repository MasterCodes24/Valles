import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Rocket, Eye, EyeOff, AlertCircle } from 'lucide-react'
import './AuthPages.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const { error: err } = await login(email, password)
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
          <h1 className="auth-title">Mission Login</h1>
          <p className="auth-subtitle">Authenticate to access your expedition profile</p>
        </div>

        {error && (
          <div className="alert alert-hazard" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="label" htmlFor="login-email">Commander ID (Email)</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="commander@jpl.nasa.gov"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="login-password">Access Code</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-muted)' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary w-full btn-lg"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {loading ? (
              <><div className="btn-spinner" />Authenticating...</>
            ) : (
              <><Rocket size={18} />Launch Mission</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>New to VALLES? <Link to="/register">Register as Commander</Link></p>
          <Link to="/planner" className="planner-link-small" style={{ marginTop: 'var(--space-3)', display: 'inline-block' }}>→ Mission Planner (no account needed)</Link>
        </div>

        {/* Demo hint */}
        <div className="demo-hint">
          <span>Demo: any email / any password</span>
        </div>
      </div>
    </div>
  )
}
