import React, { useEffect, useState } from 'react'
import { getInventoryCatalog } from '../api/mockApi'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/SharedComponents'
import { Package, Shield, Activity, Zap, Lock, CheckCircle } from 'lucide-react'

function ItemCard({ item, owned, type }) {
  const canAfford = true // mock: always true for demo

  return (
    <div className="card" style={{
      opacity: item.unlockLevel > 4 ? 0.5 : 1,
      borderColor: owned ? 'rgba(46,204,113,0.3)' : 'var(--clr-border)',
    }}>
      {owned && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--clr-safe)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div style={{ padding: 'var(--space-2)', background: owned ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)' }}>
          {type === 'suits' && <Shield size={20} style={{ color: owned ? 'var(--clr-safe)' : 'var(--clr-mars-200)' }} />}
          {type === 'rovers' && <Activity size={20} style={{ color: owned ? 'var(--clr-safe)' : 'var(--clr-ice-300)' }} />}
          {type === 'consumables' && <Package size={20} style={{ color: 'var(--clr-battery)' }} />}
        </div>
        {item.unlockLevel > 4 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
            <Lock size={12} /> Lvl {item.unlockLevel}
          </span>
        )}
        {owned && <CheckCircle size={18} style={{ color: 'var(--clr-safe)' }} />}
      </div>

      <h5 style={{ marginBottom: 'var(--space-2)' }}>{item.name}</h5>

      {type === 'suits' && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>O₂ Capacity: {item.oxygenCapacity}h</span>
          <span>Radiation Shield: {(item.radiationShielding * 100).toFixed(0)}%</span>
        </div>
      )}
      {type === 'rovers' && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>Range: {item.batteryCapacity} km</span>
          <span>Cargo: {item.cargoCapacity} kg</span>
        </div>
      )}
      {type === 'consumables' && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-4)' }}>
          {item.effect}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {item.cost > 0 ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--clr-time)' }}>
            {item.cost.toLocaleString()} XP
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-safe)' }}>Free</span>
        )}
        {!owned && item.unlockLevel <= 4 && (
          <button
            id={`buy-${item.id}`}
            className="btn btn-sm btn-primary"
            disabled={!canAfford}
          >
            {type === 'consumables' ? 'Acquire' : 'Unlock'}
          </button>
        )}
        {owned && (
          <button className="btn btn-sm btn-secondary" disabled>Equipped</button>
        )}
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [catalog, setCatalog] = useState(null)
  const [activeTab, setActiveTab] = useState('suits')
  const { playerState } = useApp()

  useEffect(() => {
    getInventoryCatalog().then(setCatalog)
  }, [])

  if (!catalog || !playerState) return null

  const tabs = [
    { key: 'suits', label: 'Suits', icon: Shield },
    { key: 'rovers', label: 'Rovers', icon: Activity },
    { key: 'consumables', label: 'Consumables', icon: Package },
  ]

  const ownedSuits = playerState.unlockedSuits
  const ownedRovers = playerState.unlockedRovers

  const isOwned = (item, type) => {
    if (type === 'suits') return ownedSuits.includes(item.id)
    if (type === 'rovers') return ownedRovers.includes(item.id)
    if (type === 'consumables') return (playerState.inventory[item.id] || 0) > 0
    return false
  }

  const items = catalog[activeTab] || []

  return (
    <div className="animate-fadeInUp">
      <PageHeader
        title="Inventory & Upgrades"
        subtitle="Equipment, suits, and consumables"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            <Zap size={16} style={{ color: 'var(--clr-time)' }} />
            <span style={{ color: 'var(--clr-time)' }}>{playerState.xp.toLocaleString()} XP available</span>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--clr-border)', paddingBottom: 'var(--space-4)' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`tab-${key}`}
            className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)', position: 'relative' }}>
        {items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            type={activeTab}
            owned={isOwned(item, activeTab)}
          />
        ))}
      </div>
    </div>
  )
}
