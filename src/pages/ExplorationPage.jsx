import React, { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/ui/SharedComponents'
import { Globe, Map, Zap } from 'lucide-react'
import { getRegions } from '../api/mockApi'

export default function ExplorationPage() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [regions, setRegions] = useState([])
  const [selectedRegion, setSelectedRegion] = useState('jezero')
  const [discovered, setDiscovered] = useState(['delta_north', 'esker_ridge'])

  useEffect(() => { getRegions().then(setRegions) }, [])

  useEffect(() => {
    let map
    const init = async () => {
      const maplibregl = await import('maplibre-gl')
      if (!mapContainer.current) return

      map = new maplibregl.default.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 },
          },
          layers: [{
            id: 'osm', type: 'raster', source: 'osm',
            paint: { 'raster-saturation': -0.8, 'raster-contrast': 0.2, 'raster-hue-rotate': 20 },
          }],
        },
        center: [77.591, 18.447],
        zoom: 10,
      })
      mapRef.current = map

      map.on('load', () => {
        // Add points of interest
        const pois = [
          { id: 'delta_north', name: 'Delta Deposit North', coords: [77.62, 18.46], discovered: true },
          { id: 'esker_ridge', name: 'Esker Ridge', coords: [77.55, 18.51], discovered: true },
          { id: 'ancient_shore', name: 'Ancient Shoreline', coords: [77.60, 18.38], discovered: false },
          { id: 'lava_tube', name: 'Lava Tube Entrance', coords: [77.68, 18.44], discovered: false },
        ]

        pois.forEach(poi => {
          const el = document.createElement('div')
          el.style.cssText = `
            width: 12px; height: 12px; border-radius: 50%;
            background: ${poi.discovered ? 'var(--clr-mars-200, #ff7d2e)' : 'rgba(90,85,80,0.6)'};
            border: 2px solid ${poi.discovered ? 'var(--clr-mars-300, #e85d00)' : 'rgba(90,85,80,0.4)'};
            box-shadow: ${poi.discovered ? '0 0 8px rgba(255,125,46,0.4)' : 'none'};
            cursor: pointer;
          `
          new maplibregl.default.Marker({ element: el })
            .setLngLat(poi.coords)
            .setPopup(new maplibregl.default.Popup({ offset: 20 }).setHTML(
              `<div style="font-family: var(--font-ui, sans-serif); padding: 4px;">
                <strong>${poi.name}</strong><br/>
                <small style="color: ${poi.discovered ? '#ff7d2e' : '#5a5550'}">${poi.discovered ? '✓ Discovered' : '? Unknown'}</small>
              </div>`
            ))
            .addTo(map)
        })
      })
    }

    init()
    return () => { if (map) map.remove() }
  }, [])

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Exploration Mode"
        subtitle="Free roam the Martian terrain — discover new features and earn bonus XP"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--clr-time)', fontFamily: 'var(--font-mono)' }}>
            <Globe size={16} /> {discovered.length} / 4 locations discovered
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 'var(--space-4)', height: 520 }}>
        {/* Map */}
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--clr-border)', position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          <div style={{
            position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)',
            background: 'rgba(11,13,18,0.8)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--clr-border-bright)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)', color: 'var(--clr-mars-200)',
          }}>
            FREE ROAM MODE — Click markers to explore
          </div>
        </div>

        {/* Sidebar: POI list */}
        <div className="glass-bright" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflow: 'auto' }}>
          <div className="label">POINTS OF INTEREST</div>
          {[
            { id: 'delta_north', name: 'Delta Deposit North', xp: 150, done: true },
            { id: 'esker_ridge', name: 'Esker Ridge', xp: 120, done: true },
            { id: 'ancient_shore', name: 'Ancient Shoreline', xp: 200, done: false },
            { id: 'lava_tube', name: 'Lava Tube Entrance', xp: 350, done: false },
          ].map(poi => (
            <div key={poi.id} style={{
              padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
              background: poi.done ? 'rgba(200,74,0,0.08)' : 'var(--clr-surface-1)',
              border: `1px solid ${poi.done ? 'rgba(200,74,0,0.2)' : 'var(--clr-border)'}`,
              opacity: poi.done ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', fontWeight: 600, color: poi.done ? 'var(--clr-mars-200)' : 'var(--clr-text-muted)' }}>
                  {poi.done ? '✓' : '?'} {poi.name}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--clr-time)' }}>+{poi.xp} XP</span>
            </div>
          ))}

          <div className="divider" />
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
            Explore all locations to unlock the region completion badge and bonus XP.
          </div>
        </div>
      </div>
    </div>
  )
}
