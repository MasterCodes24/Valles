import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { planRouteFromLatLng } from '../api/adapters'
import { REGIONS } from '../config/gameConfig'
import { PageHeader, Loader, RouteTag } from '../components/ui/SharedComponents'
import { Map as MapIcon, Crosshair, Layers, Play, RotateCcw, Info, ChevronDown } from 'lucide-react'
import RouteComparisonCards from '../components/map/RouteComparisonCards'
import './MapPage.css'

const MAPTILER_KEY = 'get_your_own_OpIi9ZULNHzrESv6T2vL'

export default function MapPage() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [regions, setRegions] = useState([])
  const [selectedRegion, setSelectedRegion] = useState('jezero')
  const [startPin, setStartPin] = useState(null)
  const [endPin, setEndPin] = useState(null)
  const [clickMode, setClickMode] = useState(null) // 'start' | 'end' | null
  const [routes, setRoutes] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState('balanced')
  const [loading, setLoading] = useState(false)
  const [hazardLayer, setHazardLayer] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const { playerState } = useApp()
  const navigate = useNavigate()

  const startMarkRef = useRef(null)
  const endMarkRef = useRef(null)
  const routeLayersRef = useRef([])

  // Load MapLibre dynamically
  useEffect(() => {
    let map
    let isMounted = true

    const initMap = async () => {
      const maplibregl = await import('maplibre-gl')

      if (!mapContainer.current || !isMounted) return

      // NASA Mars Trek WMTS — CTX (Context Camera) mosaic — actual Mars imagery
      const MARS_WMTS = (layer) =>
        `https://trek.nasa.gov/tiles/Mars/EQ/${layer}/{z}/{x}/{y}.png`

      map = new maplibregl.default.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'mars-ctx': {
              type: 'raster',
              // NASA Mars CTX Mosaic — grayscale high-res Mars surface
              tiles: [MARS_WMTS('Mars_Viking_MDIM21_ClrMosaic_global_232m')],
              tileSize: 256,
              attribution: 'NASA / JPL-Caltech / MSSS — Mars CTX Mosaic',
              minzoom: 0,
              maxzoom: 8,
            },
          },
          layers: [{
            id: 'mars-ctx',
            type: 'raster',
            source: 'mars-ctx',
            paint: {
              // Tint reddish-orange to look like Mars
              'raster-saturation': 0.4,
              'raster-hue-rotate': 20,
              'raster-brightness-min': 0.12,
              'raster-contrast': 0.15,
            },
          }],
        },
        // Jezero Crater, Mars (18.38°N, 77.58°E)
        center: [77.58, 18.38],
        zoom: 10,
        maxZoom: 14,
        attributionControl: false,
      })

      mapRef.current = map

      map.on('load', () => {
        if (!isMounted) return
        setMapLoaded(true)

        // Add simulated hazard zones
        map.addSource('hazards', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { level: 'high', label: '☢ Radiation Hotspot — Lava Tube Area' },
                geometry: { type: 'Point', coordinates: [77.48, 18.26] },
              },
              {
                type: 'Feature',
                properties: { level: 'high', label: '☢ Cosmic Ray Peak — Mesa Summit' },
                geometry: { type: 'Point', coordinates: [77.73, 18.52] },
              },
              {
                type: 'Feature',
                properties: { level: 'medium', label: '⚠ Boulder Field — NW Crater Rim' },
                geometry: { type: 'Point', coordinates: [77.43, 18.47] },
              },
              {
                type: 'Feature',
                properties: { level: 'medium', label: '⚠ Steep Slope Zone — Delta Edge' },
                geometry: { type: 'Point', coordinates: [77.62, 18.32] },
              },
              {
                type: 'Feature',
                properties: { level: 'low', label: '✓ Base Camp — Safe Zone' },
                geometry: { type: 'Point', coordinates: [77.58, 18.38] },
              },
              {
                type: 'Feature',
                properties: { level: 'medium', label: '⚠ Dust Devil Alley' },
                geometry: { type: 'Point', coordinates: [77.67, 18.44] },
              },
            ],
          },
        })

        map.addLayer({
          id: 'hazard-circles',
          type: 'circle',
          source: 'hazards',
          paint: {
            'circle-radius': 18,
            'circle-color': [
              'match', ['get', 'level'],
              'high', 'rgba(255,59,59,0.3)',
              'medium', 'rgba(243,156,18,0.25)',
              'rgba(46,204,113,0.2)'
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': [
              'match', ['get', 'level'],
              'high', '#ff3b3b',
              'medium', '#f39c12',
              '#2ecc71'
            ],
            'circle-blur': 0.3,
          },
        })

        // Add route source placeholder
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f5c842', 'line-width': 3, 'line-dasharray': [2, 1] },
        })
      })

      map.on('click', (e) => {
        if (!isMounted) return
        handleMapClick(e.lngLat, maplibregl.default)
      })
    }

    initMap()

    return () => {
      isMounted = false
      if (map) map.remove()
    }
  }, [])

  // Load regions from gameConfig (no Supabase needed — it's static config)
  useEffect(() => {
    setRegions(REGIONS.map(r => ({
      id: r.id,
      name: r.name,
      unlockLevel: r.unlockLevel,
    })))
  }, [])

  const handleMapClick = useCallback(async (lngLat, maplibregl) => {
    const map = mapRef.current
    if (!map) return

    setClickMode(prev => {
      if (prev === 'start') {
        // Place start marker
        if (startMarkRef.current) startMarkRef.current.remove()
        const el = document.createElement('div')
        el.className = 'map-marker start-marker'
        el.innerHTML = '<div class="marker-pulse"></div><span>S</span>'
        startMarkRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
        setStartPin(lngLat)
        return 'end'
      } else if (prev === 'end') {
        if (endMarkRef.current) endMarkRef.current.remove()
        const el = document.createElement('div')
        el.className = 'map-marker end-marker'
        el.innerHTML = '<span>D</span>'
        endMarkRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
        setEndPin(lngLat)
        return null
      }
      return prev
    })
  }, [])

  const handlePlanRoute = async () => {
    if (!startPin || !endPin) return
    setLoading(true)
    try {
      const result = await planRouteFromLatLng(
        { lat: startPin.lat, lng: startPin.lng },
        { lat: endPin.lat, lng: endPin.lng },
        selectedRegion,
        playerState
      )
      setRoutes(result.routes)

      // Draw selected route on map
      const map = mapRef.current
      if (map && result.routes[selectedRoute]) {
        drawRoute(result.routes[selectedRoute], map)
      }
    } catch (err) {
      console.error('[MapPage] Route planning failed:', err)
    }
    setLoading(false)
  }

  const drawRoute = (route, map) => {
    if (!map || !map.getSource('route')) return
    const coords = route.nodes.map(n => [n.lng, n.lat])
    map.getSource('route').setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
      }],
    })
    map.setPaintProperty('route-line', 'line-color', route.color)
  }

  const handleSelectRoute = (routeKey) => {
    setSelectedRoute(routeKey)
    if (routes && mapRef.current) {
      drawRoute(routes[routeKey], mapRef.current)
    }
  }

  const handleReset = () => {
    setStartPin(null)
    setEndPin(null)
    setRoutes(null)
    setClickMode(null)
    if (startMarkRef.current) { startMarkRef.current.remove(); startMarkRef.current = null }
    if (endMarkRef.current) { endMarkRef.current.remove(); endMarkRef.current = null }
    if (mapRef.current?.getSource('route')) {
      mapRef.current.getSource('route').setData({ type: 'FeatureCollection', features: [] })
    }
  }

  const toggleHazard = () => {
    setHazardLayer(v => {
      const newVal = !v
      const map = mapRef.current
      if (map && map.getLayer('hazard-circles')) {
        map.setLayoutProperty('hazard-circles', 'visibility', newVal ? 'visible' : 'none')
      }
      return newVal
    })
  }

  const handleSimulate = () => {
    if (!routes) return
    sessionStorage.setItem('valles_sim_route', JSON.stringify({
      route: routes[selectedRoute],
      routeKey: selectedRoute,
    }))
    navigate('/game/simulation')
  }

  return (
    <div className="map-page animate-fadeIn">
      <PageHeader
        title="Mission Map — Mars"
        subtitle={`Planning EVA routes for ${selectedRegion === 'jezero' ? 'Jezero Crater, Mars' : selectedRegion} · NASA CTX Imagery`}
        actions={
          <select
            className="select"
            style={{ width: 200 }}
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
          >
            {regions.map(r => (
              <option key={r.id} value={r.id} disabled={r.unlockLevel > 4}>
                {r.name} {r.unlockLevel > 4 ? `(Lv${r.unlockLevel})` : ''}
              </option>
            ))}
          </select>
        }
      />

      <div className="map-workspace">
        {/* Control Panel */}
        <div className="map-controls glass-bright">
          <div className="controls-section">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Set Waypoints</div>
            <div className="waypoint-btns">
              <button
                id="set-start-btn"
                className={`btn btn-sm ${clickMode === 'start' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClickMode('start')}
              >
                <Crosshair size={14} />
                {startPin ? '✓ Start Set' : 'Set Start'}
              </button>
              <button
                id="set-end-btn"
                className={`btn btn-sm ${clickMode === 'end' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClickMode('end')}
                disabled={!startPin}
              >
                <Crosshair size={14} />
                {endPin ? '✓ Dest Set' : 'Set Destination'}
              </button>
            </div>
            {clickMode && (
              <div className="click-hint">
                Click on the map to set {clickMode === 'start' ? 'start' : 'destination'} point
              </div>
            )}
          </div>

          <div className="controls-section">
            <div className="label" style={{ marginBottom: 'var(--space-3)' }}>Layers</div>
            <label className="toggle-row">
              <span>Hazard Zones</span>
              <div
                className={`toggle ${hazardLayer ? 'active' : ''}`}
                onClick={toggleHazard}
                id="hazard-toggle"
              />
            </label>
          </div>

          <div className="controls-actions">
            <button
              id="plan-route-btn"
              className="btn btn-primary w-full"
              onClick={handlePlanRoute}
              disabled={!startPin || !endPin || loading}
            >
              {loading ? <><div className="btn-spinner" />Computing...</> : <><MapIcon size={16} />Plan Routes</>}
            </button>
            <button className="btn btn-ghost w-full btn-sm" onClick={handleReset}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {routes && (
            <div className="controls-actions" style={{ marginTop: 0 }}>
              <button
                id="simulate-btn"
                className="btn btn-ice w-full"
                onClick={handleSimulate}
              >
                <Play size={16} /> Simulate Mission
              </button>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="map-container-wrapper">
          <div ref={mapContainer} className="maplibre-container" />
          {!mapLoaded && (
            <div className="map-loading">
              <Loader size={36} label="LOADING NASA MARS IMAGERY..." />
            </div>
          )}
          {/* Map overlay: legend */}
          <div className="map-legend glass">
            <div className="legend-item"><span className="legend-dot" style={{ background: '#ff3b3b' }} />High Hazard</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#f39c12' }} />Medium</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#2ecc71' }} />Safe Zone</div>
          </div>
        </div>
      </div>

      {/* Route Comparison Cards */}
      {routes && (
        <div className="route-results animate-fadeInUp">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <h3>Route Options</h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>Select a route to preview on map</span>
          </div>
          <RouteComparisonCards
            routes={routes}
            selectedRoute={selectedRoute}
            onSelect={handleSelectRoute}
          />
        </div>
      )}
    </div>
  )
}
