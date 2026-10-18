import React from 'react'
import { RouteTag } from '../ui/SharedComponents'
import { Clock, Zap, Shield, Activity } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function StatRow({ label, value, icon: Icon, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--clr-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-ui)' }}>
        {Icon && <Icon size={13} style={{ color }} />}
        {label}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: color || 'var(--clr-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function RouteCard({ route, routeKey, selected, onSelect }) {
  const stats = route.stats
  const elevData = stats.elevationProfile?.slice(0, 12) || []

  return (
    <div
      onClick={() => onSelect(routeKey)}
      id={`route-card-${routeKey}`}
      style={{
        flex: 1,
        background: selected
          ? `linear-gradient(145deg, rgba(17,21,32,0.95), rgba(23,28,46,0.95))`
          : 'var(--grad-card)',
        border: selected ? `2px solid ${route.color}` : '1px solid var(--clr-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        cursor: 'pointer',
        transition: 'all var(--duration-normal) var(--ease-smooth)',
        boxShadow: selected ? `0 0 20px ${route.color}33` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: route.color,
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <RouteTag type={routeKey} />
          <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>{route.tagline}</div>
        </div>
        {selected && (
          <span style={{
            padding: '2px 8px', background: `${route.color}22`, border: `1px solid ${route.color}55`,
            borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
            color: route.color, fontWeight: 700,
          }}>SELECTED</span>
        )}
      </div>

      {/* Mini elevation chart */}
      {elevData.length > 0 && (
        <div style={{ height: 60, marginBottom: 'var(--space-4)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={elevData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${routeKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={route.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={route.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="elevation" stroke={route.color} strokeWidth={2}
                fill={`url(#grad-${routeKey})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <StatRow label="Distance" value={`${stats.distanceKm} km`} icon={Activity} color="var(--clr-text-secondary)" />
        <StatRow label="Time" value={`${stats.estimatedTimeHrs}h`} icon={Clock} color="var(--clr-time)" />
        <StatRow label="O₂ Used" value={`${stats.oxygenConsumedPct?.toFixed(0)}%`} icon={Zap} color="var(--clr-oxygen)" />
        <StatRow label="Radiation" value={`${stats.radiationDoseMSv?.toFixed(2)} mSv`} icon={Shield} color="var(--clr-radiation)" />
      </div>

      {/* Safety score bar */}
      <div style={{ marginTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4 }}>
          <span>Safety Score</span>
          <span style={{ color: route.color, fontFamily: 'var(--font-mono)' }}>
            {(stats.safetyScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="stat-bar">
          <div style={{ width: `${(stats.safetyScore * 100)}%`, height: '100%', background: route.color, borderRadius: 'var(--radius-full)', transition: 'width 0.6s var(--ease-spring)' }} />
        </div>
      </div>
    </div>
  )
}

export default function RouteComparisonCards({ routes, selectedRoute, onSelect }) {
  if (!routes) return null
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
      {Object.entries(routes).map(([key, route]) => (
        <RouteCard
          key={key}
          route={route}
          routeKey={key}
          selected={selectedRoute === key}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
