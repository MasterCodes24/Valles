import React from 'react'

export function StatCard({ label, value, unit, icon: Icon, color = 'var(--clr-mars-200)', trend }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-muted)' }}>{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
        <span style={{ fontSize: 'var(--text-3xl)', fontFamily: 'var(--font-ui)', fontWeight: 800, color }}>{value}</span>
        {unit && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>{unit}</span>}
      </div>
      {trend && (
        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: trend > 0 ? 'var(--clr-safe)' : 'var(--clr-hazard)' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last mission
        </div>
      )}
    </div>
  )
}

export function ResourceBar({ label, value, max, colorClass, icon }) {
  const pct = Math.min(100, (value / max) * 100)
  const isLow = pct < 25
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--clr-text-muted)', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700,
          color: isLow ? 'var(--clr-hazard)' : 'var(--clr-text-primary)',
          animation: isLow ? 'pulse-glow 1s ease-in-out infinite' : 'none'
        }}>
          {value.toFixed(0)}<span style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>/{max}</span>
        </span>
      </div>
      <div className="stat-bar">
        <div className={`stat-bar-fill ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--text-base)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
      {accent && <div style={{ width: 3, height: 20, background: 'var(--clr-mars-300)', borderRadius: 'var(--radius-full)' }} />}
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{children}</h3>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-16)', gap: 'var(--space-4)', textAlign: 'center' }}>
      {Icon && <Icon size={48} style={{ color: 'var(--clr-text-muted)', opacity: 0.4 }} />}
      <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--clr-text-secondary)' }}>{title}</h3>
      {description && <p style={{ maxWidth: 400 }}>{description}</p>}
      {action}
    </div>
  )
}

export function Loader({ size = 32, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-8)' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: '3px solid var(--clr-surface-3)',
        borderTopColor: 'var(--clr-mars-300)',
        animation: 'spin 1s linear infinite'
      }} />
      {label && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', letterSpacing: '0.08em' }}>{label}</p>}
    </div>
  )
}

export function RouteTag({ type }) {
  const config = {
    fast: { label: 'FAST', color: 'var(--clr-mars-200)', bg: 'rgba(200,74,0,0.15)' },
    balanced: { label: 'BALANCED', color: 'var(--clr-battery)', bg: 'rgba(245,200,66,0.15)' },
    safe: { label: 'SAFE', color: 'var(--clr-safe)', bg: 'rgba(46,204,113,0.15)' },
  }
  const c = config[type] || config.balanced
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700,
      letterSpacing: '0.08em', color: c.color, background: c.bg,
    }}>{c.label}</span>
  )
}
