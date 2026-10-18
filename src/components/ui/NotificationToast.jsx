import React from 'react'

export default function NotificationToast({ notifications }) {
  if (!notifications?.length) return null
  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px',
    }}>
      {notifications.map(n => (
        <div key={n.id} className={`alert alert-${n.type || 'info'}`}
          style={{ animation: 'slideInRight 0.3s var(--ease-spring) both', backdropFilter: 'blur(16px)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{n.title}</div>
            {n.message && <div style={{ fontSize: 'var(--text-xs)', marginTop: '2px', opacity: 0.8 }}>{n.message}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
