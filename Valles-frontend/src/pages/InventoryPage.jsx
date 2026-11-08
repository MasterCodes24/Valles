import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { PageHeader } from '../components/ui/SharedComponents'
import { Package, Shield, Activity, Zap, Lock, CheckCircle, ShoppingCart, Info } from 'lucide-react'
import MartianPlayerViewer3D from '../components/game/MartianPlayerViewer3D'

// ─── Coin-based catalog ───────────────────────────────────────────────────────
const CATALOG = {
  suits: [
    {
      id: 'suit_base', name: 'Base EVA Suit', cost: 0, unlockLevel: 1,
      oxygenCapacity: 6, radiationShielding: 0.20, weight: 50,
      description: 'Standard NASA xEMU-class suit. Reliable but limited O₂ reserves.',
      bonus: 'Default loadout',
    },
    {
      id: 'suit_advanced', name: 'Advanced Explorer Suit', cost: 150, unlockLevel: 3,
      oxygenCapacity: 9, radiationShielding: 0.35, weight: 48,
      description: 'Enhanced PLSS with larger O₂ tanks. Significantly extends EVA duration.',
      bonus: '+50% O₂ duration · Better rad shielding',
    },
    {
      id: 'suit_radiation', name: 'Rad-Guard Suit', cost: 220, unlockLevel: 4,
      oxygenCapacity: 7, radiationShielding: 0.65, weight: 56,
      description: 'Heavy radiation shielding for extended high-exposure zones. Heavier but safer.',
      bonus: '+225% radiation protection',
    },
    {
      id: 'suit_elite', name: 'Elite Command Suit', cost: 480, unlockLevel: 6,
      oxygenCapacity: 12, radiationShielding: 0.55, weight: 52,
      description: 'Top-tier suit with maximum O₂ capacity and superior shielding. Commander class.',
      bonus: '+100% O₂ · Advanced everything',
    },
    {
      id: 'suit_prototype', name: 'Prototype Quantum Suit', cost: 900, unlockLevel: 9,
      oxygenCapacity: 18, radiationShielding: 0.80, weight: 45,
      description: 'Experimental suit with self-recycling O₂ and nano-layered radiation armor.',
      bonus: '+200% O₂ · Near-complete rad protection',
    },
  ],
  upgrades: [
    {
      id: 'upg_o2_tank_1', name: 'O₂ Tank Upgrade I', cost: 80, unlockLevel: 2,
      description: 'Adds a secondary oxygen canister. Extends EVA time by ~8 minutes.',
      effect: '+15% O₂ capacity',
      icon: '💨',
    },
    {
      id: 'upg_o2_tank_2', name: 'O₂ Tank Upgrade II', cost: 200, unlockLevel: 7,
      description: 'Advanced carbon-fiber O₂ tanks with molecular sieve recycling.',
      effect: '+35% O₂ capacity',
      icon: '💨',
    },
    {
      id: 'upg_battery_1', name: 'Battery Pack I', cost: 100, unlockLevel: 2,
      description: 'High-density lithium battery pack. Doubles power reserves.',
      effect: '+40% battery life',
      icon: '⚡',
    },
    {
      id: 'upg_battery_2', name: 'Battery Pack II', cost: 260, unlockLevel: 5,
      description: 'Solid-state supercapacitor + Li-ion hybrid. Near-infinite EVA power.',
      effect: '+90% battery life',
      icon: '⚡',
    },
    {
      id: 'upg_rad_shield_1', name: 'Radiation Shield I', cost: 120, unlockLevel: 3,
      description: 'Polyethylene-lined under-layer reduces GCR exposure.',
      effect: '-25% radiation accumulation rate',
      icon: '☢️',
    },
    {
      id: 'upg_rad_shield_2', name: 'Radiation Shield II', cost: 320, unlockLevel: 8,
      description: 'Active magnetic field shielding module. Near-complete GCR protection.',
      effect: '-55% radiation accumulation rate',
      icon: '☢️',
    },
    {
      id: 'upg_hud_enhanced', name: 'Enhanced HUD Module', cost: 60, unlockLevel: 1,
      description: 'Augmented reality overlay with extended range minimap and threat indicators.',
      effect: 'Expanded minimap · Hazard alerts',
      icon: '📡',
    },
    {
      id: 'upg_boots', name: 'Terrain Grip Boots', cost: 90, unlockLevel: 2,
      description: 'Magnetized gripper-sole boots for better traction on rocky Mars terrain.',
      effect: '+20% movement speed on slopes',
      icon: '👢',
    },
  ],
  consumables: [
    {
      id: 'cons_o2_canister', name: 'Emergency O₂ Canister', cost: 25, unlockLevel: 1,
      description: 'Single-use emergency oxygen boost. Refills 30% O₂ instantly.',
      effect: '+30% O₂ (one use)',
      icon: '🫧',
    },
    {
      id: 'cons_battery_cell', name: 'Portable Power Cell', cost: 20, unlockLevel: 1,
      description: 'Disposable battery cell. Instantly recharges suit power by 25%.',
      effect: '+25% battery (one use)',
      icon: '🔋',
    },
    {
      id: 'cons_rad_pill', name: 'Radiation Tablet Pack', cost: 35, unlockLevel: 2,
      description: 'Potassium iodide + novel compound tablet. Reduces radiation damage for 10 minutes.',
      effect: '-40% rad rate for 10 min (one use)',
      icon: '💊',
    },
    {
      id: 'cons_thermal_gel', name: 'Thermal Regulation Gel', cost: 40, unlockLevel: 3,
      description: 'Phase-change gel applied to suit interior. Reduces energy spent on temperature regulation.',
      effect: '-15% battery drain for one session',
      icon: '🧴',
    },
  ],
}

function ItemCard({ item, type, owned, onBuy, playerLevel, coins, onPreview, onPreviewEnd }) {
  const isLocked = item.unlockLevel > playerLevel
  const canAfford = coins >= item.cost
  const isFree = item.cost === 0

  return (
    <div style={{
      background: 'var(--grad-card)',
      border: `1px solid ${owned ? 'rgba(46,204,113,0.35)' : isLocked ? 'var(--clr-border)' : 'rgba(255,125,46,0.18)'}`,
      borderRadius: 14, padding: '20px 18px',
      opacity: isLocked ? 0.55 : 1,
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => {
        if (!isLocked) e.currentTarget.style.borderColor = owned ? 'rgba(46,204,113,0.6)' : 'rgba(255,125,46,0.4)'
        if (onPreview && type === 'suits') onPreview(item.id, item.name)
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = owned ? 'rgba(46,204,113,0.35)' : isLocked ? 'var(--clr-border)' : 'rgba(255,125,46,0.18)'
        if (onPreviewEnd) onPreviewEnd()
      }}
    >
      {owned && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--clr-safe)', borderRadius: '14px 14px 0 0' }} />}
      {!owned && !isLocked && item.cost > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,125,46,0.5)', borderRadius: '14px 14px 0 0' }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '8px', borderRadius: 10,
            background: owned ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.05)',
          }}>
            {type === 'suits' && <Shield size={20} style={{ color: owned ? 'var(--clr-safe)' : 'var(--clr-mars-200)' }} />}
            {type === 'upgrades' && <span style={{ fontSize: 20 }}>{item.icon}</span>}
            {type === 'consumables' && <span style={{ fontSize: 20 }}>{item.icon}</span>}
          </div>
          {isLocked && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--clr-text-muted)' }}>
              <Lock size={11} /> Lv{item.unlockLevel}
            </span>
          )}
          {owned && <CheckCircle size={16} style={{ color: 'var(--clr-safe)' }} />}
        </div>

        {!isFree && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: canAfford && !owned ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${canAfford && !owned ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 999, padding: '3px 10px',
            fontSize: 12, fontWeight: 700,
            color: canAfford && !owned ? '#f5c842' : 'var(--clr-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            🪙 {item.cost}
          </div>
        )}
        {isFree && <span style={{ fontSize: 10, color: 'var(--clr-safe)', fontFamily: 'var(--font-mono)' }}>FREE</span>}
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--clr-text-primary)' }}>{item.name}</div>
      <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{item.description}</div>

      {/* Stats / effect */}
      {type === 'suits' && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 12, fontSize: 10, color: 'var(--clr-text-secondary)',
        }}>
          <span>💨 O₂: {item.oxygenCapacity}h</span>
          <span>☢️ Rad: {(item.radiationShielding * 100).toFixed(0)}%</span>
          <span>⚖️ Weight: {item.weight}kg</span>
          <span style={{ color: 'var(--clr-mars-200)' }}>✦ {item.bonus}</span>
        </div>
      )}
      {(type === 'upgrades' || type === 'consumables') && (
        <div style={{
          background: 'rgba(255,125,46,0.06)', border: '1px solid rgba(255,125,46,0.15)',
          borderRadius: 8, padding: '6px 12px', marginBottom: 12, fontSize: 10, color: '#ffb380',
        }}>
          ✦ {item.effect}
        </div>
      )}

      {/* Action */}
      {owned ? (
        <button className="btn btn-sm btn-secondary" disabled style={{ width: '100%' }}>
          ✓ Owned
        </button>
      ) : isLocked ? (
        <button className="btn btn-sm" disabled style={{ width: '100%', opacity: 0.5 }}>
          <Lock size={13} /> Unlock at Level {item.unlockLevel}
        </button>
      ) : isFree ? (
        <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={() => onBuy(item, type)}>
          Equip Default
        </button>
      ) : !canAfford ? (
        <button className="btn btn-sm" disabled style={{ width: '100%', opacity: 0.6 }}>
          🪙 Need {item.cost - coins} more coins
        </button>
      ) : (
        <button
          id={`buy-${item.id}`}
          className="btn btn-sm btn-primary"
          style={{ width: '100%' }}
          onClick={() => onBuy(item, type)}
        >
          <ShoppingCart size={13} /> Purchase for 🪙 {item.cost}
        </button>
      )}
    </div>
  )
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('suits')
  const { playerState, user } = useApp()
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('valles_coins') || '0'))
  const [owned, setOwned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('valles_owned_items') || '["suit_base"]') }
    catch { return ['suit_base'] }
  })
  const [notification, setNotification] = useState(null)
  // Track which suit is being previewed in the try-on viewer (hover = try-on, null = show active suit)
  const [previewSuitId, setPreviewSuitId] = useState(null)
  const [previewSuitName, setPreviewSuitName] = useState(null)

  const handleBuy = (item, type) => {
    if (owned.includes(item.id)) return
    if (item.cost > 0) {
      if (coins < item.cost) return
      const newCoins = coins - item.cost
      setCoins(newCoins)
      localStorage.setItem('valles_coins', String(newCoins))
    }
    const newOwned = [...owned, item.id]
    setOwned(newOwned)
    localStorage.setItem('valles_owned_items', JSON.stringify(newOwned))
    setNotification({ text: `Purchased: ${item.name}!`, color: '#2ecc71' })
    setTimeout(() => setNotification(null), 3000)
  }

  const playerLevel = playerState?.level || 1
  const tabs = [
    { key: 'suits', label: 'Suits', icon: Shield },
    { key: 'upgrades', label: 'Upgrades', icon: Zap },
    { key: 'consumables', label: 'Consumables', icon: Package },
  ]
  const items = CATALOG[activeTab] || []

  return (
    <div className="animate-fadeInUp" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--clr-text-primary)', marginBottom: 4 }}>Inventory & Upgrades</h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: 13 }}>Purchase suits, upgrades, and consumables with coins earned in Explorer Mode</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.35)',
          borderRadius: 12, padding: '12px 20px',
        }}>
          <span style={{ fontSize: 22 }}>🪙</span>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(245,200,66,0.6)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>YOUR COINS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f5c842', fontFamily: 'var(--font-mono)' }}>{coins}</div>
          </div>
        </div>
      </div>

      {/* How to earn coins info */}
      <div style={{
        background: 'rgba(94,230,245,0.06)', border: '1px solid rgba(94,230,245,0.2)',
        borderRadius: 12, padding: '12px 20px', marginBottom: 24,
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <Info size={16} style={{ color: '#5ee6f5', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: '#5ee6f5' }}>Earn coins by:</strong>
          {' '}Walking 500m (🪙10) · 1km (🪙25) · 2.5km (🪙60) · 5km (🪙130) · 10km (🪙300) · 25km (🪙750) in Explorer Mode.
          {' '}Also from completing <strong>Missions</strong> and <strong>Weekly Challenges</strong>.
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{
          background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.4)',
          borderRadius: 10, padding: '12px 18px', marginBottom: 18,
          color: '#2ecc71', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={16} /> {notification.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--clr-border)', paddingBottom: 16 }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`tab-${key}`}
            className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={14} /> {label}
            <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({CATALOG[key].length})</span>
          </button>
        ))}
      </div>

      {/* Two-column layout: Player viewer (left) + Items grid (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Sticky try-on viewer */}
        <div style={{ position: 'sticky', top: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10, color: '#5ee6f5', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em', marginBottom: 4, fontWeight: 800,
            }}>
              ◉ SUIT TRY-ON VIEWER
            </div>
            <div style={{ fontSize: 11, color: previewSuitId ? '#ffb380' : 'rgba(240,237,232,0.5)', lineHeight: 1.5, transition: 'color 0.2s' }}>
              {previewSuitId ? `👁 Trying on: ${previewSuitName}` : 'Hover a suit to preview. Drag to rotate.'}
            </div>
          </div>

          <MartianPlayerViewer3D
            callsign={user?.callsign || playerState?.callsign || 'Commander'}
            level={playerLevel}
            suitName={previewSuitName || playerState?.suit?.name || 'xEMU Mark IV (Martian EVA Suit)'}
            suitId={previewSuitId || playerState?.suit?.id || 'suit_base'}
            isTryingOn={!!previewSuitId}
          />

          {/* Currently equipped suit badge */}
          <div style={{
            marginTop: 12,
            background: 'rgba(46,204,113,0.08)',
            border: '1px solid rgba(46,204,113,0.28)',
            borderRadius: 10,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <CheckCircle size={14} style={{ color: '#2ecc71', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: '#2ecc71', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                ACTIVE SUIT
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                {playerState?.suit?.name || 'Base EVA Suit'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Items grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              type={activeTab}
              owned={owned.includes(item.id)}
              playerLevel={playerLevel}
              coins={coins}
              onBuy={handleBuy}
              onPreview={activeTab === 'suits' ? (id, name) => { setPreviewSuitId(id); setPreviewSuitName(name) } : null}
              onPreviewEnd={activeTab === 'suits' ? () => { setPreviewSuitId(null); setPreviewSuitName(null) } : null}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
