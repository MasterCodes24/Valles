import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createMartianAstronautModel } from './AstronautModel'
import { Shield, RotateCw, Sparkles, Activity, Zap } from 'lucide-react'

export default function MartianPlayerViewer3D({
  callsign = 'Commander',
  level = 1,
  suitName = 'xEMU Mark IV EVA Suit',
  suitId = 'suit_base',
  isTryingOn = false,
}) {
  const mountRef = useRef(null)
  const astronautRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [rotationDeg, setRotationDeg] = useState(0)
  const [inspectMode, setInspectMode] = useState(false)

  const isDraggingRef = useRef(false)
  const prevMouseXRef = useRef(0)
  const targetYawRef = useRef(-0.25) // Slightly angled initial pose
  const currentYawRef = useRef(-0.25)

  // Live suit re-skinning when trying on or changing suits
  useEffect(() => {
    if (astronautRef.current?.setSuit) {
      astronautRef.current.setSuit(suitId)
    }
  }, [suitId])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 400
    const height = mount.clientHeight || 520

    // ── WebGL Renderer with High-Fidelity Tone Mapping ─────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    // ── Scene & Camera ─────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50)
    camera.position.set(0, 1.25, 3.4)
    camera.lookAt(0, 1.05, 0)

    // ── Cinematic Studio / Mars Air-lock Lighting ──────────────────────────
    // Warm Mars directional sunlight (Key light)
    const keyLight = new THREE.DirectionalLight(0xffdfb0, 3.2)
    keyLight.position.set(2.8, 4.0, 2.5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    keyLight.shadow.bias = -0.001
    scene.add(keyLight)

    // Cool cyan/blue fill light (Jezero atmosphere / HUD bounce)
    const fillLight = new THREE.DirectionalLight(0x78d4f8, 1.4)
    fillLight.position.set(-3.0, 2.0, 1.8)
    scene.add(fillLight)

    // Dramatic warm orange rim light (Backlight silhouette)
    const rimLight = new THREE.DirectionalLight(0xff6a1e, 4.0)
    rimLight.position.set(0, 3.0, -3.2)
    scene.add(rimLight)

    // Ambient room light
    const ambientLight = new THREE.AmbientLight(0x281812, 1.8)
    scene.add(ambientLight)

    // Floor spotlight on the airlock staging deck
    const floorSpot = new THREE.SpotLight(0x5ee6f5, 1.8, 6, Math.PI / 3, 0.5)
    floorSpot.position.set(0, 0.1, 0)
    floorSpot.target.position.set(0, 1.2, 0)
    scene.add(floorSpot)
    scene.add(floorSpot.target)

    // ── Staging Platform (Mars Airlock Staging Deck) ────────────────────────
    const deckGroup = new THREE.Group()
    scene.add(deckGroup)

    // Hexagonal metal airlock pad
    const padGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.12, 6)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1f2329,
      roughness: 0.4,
      metalness: 0.7,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.y = -0.06
    pad.receiveShadow = true
    deckGroup.add(pad)

    // Glowing cyan boundary ring
    const ringGeo = new THREE.TorusGeometry(1.25, 0.02, 12, 48)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x4df2ff })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.005
    deckGroup.add(ring)

    // Outer Mars regolith ground plane
    const floorGeo = new THREE.PlaneGeometry(8, 8)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x5a210b,
      roughness: 0.9,
      metalness: 0.05,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.065
    floor.receiveShadow = true
    deckGroup.add(floor)

    // Floating atmospheric dust motes
    const DUST_COUNT = 120
    const dustGeo = new THREE.BufferGeometry()
    const dPos = new Float32Array(DUST_COUNT * 3)
    for (let i = 0; i < DUST_COUNT; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * 3
      dPos[i * 3 + 1] = Math.random() * 2.5
      dPos[i * 3 + 2] = (Math.random() - 0.5) * 3
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
    const dustPoints = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffb380,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
      })
    )
    scene.add(dustPoints)

    // ── Build & Insert 3D Martian Astronaut ─────────────────────────────────
    const astronaut = createMartianAstronautModel({ suitId, castShadow: true, receiveShadow: true })
    astronaut.root.position.set(0, 0, 0)
    scene.add(astronaut.root)
    astronautRef.current = astronaut

    // ── Mouse / Drag Rotation Controls ─────────────────────────────────────
    const onMouseDown = (e) => {
      isDraggingRef.current = true
      setIsDragging(true)
      prevMouseXRef.current = e.clientX || (e.touches && e.touches[0]?.clientX) || 0
    }

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0
      const deltaX = clientX - prevMouseXRef.current
      prevMouseXRef.current = clientX
      targetYawRef.current += deltaX * 0.009
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
    }

    const domEl = renderer.domElement
    domEl.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    domEl.addEventListener('touchstart', onMouseDown, { passive: true })
    window.addEventListener('touchmove', onMouseMove, { passive: true })
    window.addEventListener('touchend', onMouseUp)

    // ── Animation Loop ─────────────────────────────────────────────────────
    let frameId
    let clock = new THREE.Clock()

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      // Smooth damping rotation
      currentYawRef.current = THREE.MathUtils.lerp(currentYawRef.current, targetYawRef.current, 0.1)
      astronaut.root.rotation.y = currentYawRef.current

      // Update rotation degrees state for UI compass
      const deg = Math.round(((currentYawRef.current * 180 / Math.PI) % 360 + 360) % 360)
      setRotationDeg(deg)

      // Run astronaut idle breathing & micro-movements
      astronaut.update(delta, { isMoving: false })

      // Animate dust motes gently drifting
      const positions = dustPoints.geometry.attributes.position.array
      for (let i = 0; i < DUST_COUNT; i++) {
        positions[i * 3 + 1] += 0.001
        positions[i * 3] += Math.sin(positions[i * 3 + 1] * 2) * 0.0005
        if (positions[i * 3 + 1] > 2.6) positions[i * 3 + 1] = 0.05
      }
      dustPoints.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize Handler ─────────────────────────────────────────────────────
    const handleResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      domEl.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      domEl.removeEventListener('touchstart', onMouseDown)
      window.removeEventListener('touchmove', onMouseMove)
      window.removeEventListener('touchend', onMouseUp)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  const resetView = () => {
    targetYawRef.current = -0.25
  }

  const rotateBy = (radians) => {
    targetYawRef.current += radians
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: 520,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 20%, #1c0d06 0%, #0c0604 60%, #050201 100%)',
      border: '1px solid rgba(255, 125, 46, 0.3)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1,
        }}
      />

      {/* Top Overlay: Call of Duty style Operator Bar */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        {/* Left: Commander Identity */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 125, 46, 0.15)',
            border: '1px solid rgba(255, 125, 46, 0.35)',
            borderRadius: 999,
            padding: '3px 12px',
            marginBottom: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#ff8a3d',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#2ecc71',
              display: 'inline-block',
              boxShadow: '0 0 8px #2ecc71',
            }} />
            EVA SUIT ACTIVE · JEZERO BASE CAMP
          </div>

          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            margin: '0 0 4px 0',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}>
            {callsign}
          </h2>

          <div style={{
            display: 'flex',
            gap: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'rgba(240, 237, 232, 0.6)',
          }}>
            <span>RANK: <strong style={{ color: '#ffb380' }}>LEVEL {level}</strong></span>
            <span>·</span>
            <span>SPEC: <strong style={{ color: '#5ee6f5' }}>xEMU MARK IV (MARTIAN)</strong></span>
          </div>
        </div>

        {/* Right: Inspect Toggle & Quick Action */}
        <div style={{ pointerEvents: 'all', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setInspectMode(!inspectMode)}
            style={{
              background: inspectMode ? 'rgba(94, 230, 245, 0.25)' : 'rgba(15, 18, 24, 0.75)',
              border: `1px solid ${inspectMode ? '#5ee6f5' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: 8,
              padding: '6px 14px',
              color: inspectMode ? '#5ee6f5' : 'rgba(240, 237, 232, 0.8)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={13} />
            {inspectMode ? 'CLOSE SPECS' : 'INSPECT SUIT'}
          </button>
        </div>
      </div>

      {/* Inspect Mode Details Overlay Drawer */}
      {inspectMode && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: 24,
          zIndex: 15,
          maxWidth: 310,
          background: 'rgba(11, 14, 20, 0.88)',
          border: '1px solid rgba(94, 230, 245, 0.35)',
          borderRadius: 14,
          padding: '16px 18px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.25s ease',
        }}>
          <div style={{
            fontSize: 10,
            color: '#5ee6f5',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            marginBottom: 8,
            fontWeight: 800,
          }}>
            ◉ NASA-MARTIAN SUIT BLUEPRINT
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11 }}>
            <div>
              <div style={{ color: '#ffb380', fontWeight: 700 }}>Dual-Stage Visor & Oxygen Mask</div>
              <div style={{ color: 'rgba(240,237,232,0.6)', fontSize: 10, lineHeight: 1.4 }}>
                Gold-vapor reflective outer visor for UV/radiation protection + internal oral-nasal silicone mask with real-time O₂ feed.
              </div>
            </div>

            <div>
              <div style={{ color: '#ffb380', fontWeight: 700 }}>DCM Chest Telemetry Module</div>
              <div style={{ color: 'rgba(240,237,232,0.6)', fontSize: 10, lineHeight: 1.4 }}>
                Digital telemetry status lights, pressure regulators, and manual oxygen purge valve.
              </div>
            </div>

            <div>
              <div style={{ color: '#ffb380', fontWeight: 700 }}>High-Capacity PLSS Backpack</div>
              <div style={{ color: 'rgba(240,237,232,0.6)', fontSize: 10, lineHeight: 1.4 }}>
                Twin 100% O₂ composite cylinders, sublimator cooling grill, and high-gain satellite antenna.
              </div>
            </div>

            <div>
              <div style={{ color: '#ffb380', fontWeight: 700 }}>Surface EVA Boots</div>
              <div style={{ color: 'rgba(240,237,232,0.6)', fontSize: 10, lineHeight: 1.4 }}>
                Multi-layer thermal insulation gaiters with high-traction basalt cleats for Jezero regolith.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar: Call of Duty style operator rotation controls */}
      <div style={{
        marginTop: 'auto',
        position: 'relative',
        zIndex: 10,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to top, rgba(5,2,1,0.92) 0%, rgba(5,2,1,0.4) 60%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        {/* Rotation indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(240,237,232,0.5)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
        }}>
          <RotateCw size={12} style={{ color: '#ff8a3d' }} />
          <span>DRAG TO ROTATE · {rotationDeg}°</span>
        </div>

        {/* Quick Rotation Buttons */}
        <div style={{ pointerEvents: 'all', display: 'flex', gap: 6 }}>
          <button
            onClick={() => rotateBy(-Math.PI / 4)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 6,
              padding: '5px 10px',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            ⟲ -45°
          </button>
          <button
            onClick={() => rotateBy(Math.PI / 4)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 6,
              padding: '5px 10px',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            ⟳ +45°
          </button>
          <button
            onClick={resetView}
            style={{
              background: 'rgba(255, 125, 46, 0.15)',
              border: '1px solid rgba(255, 125, 46, 0.4)',
              borderRadius: 6,
              padding: '5px 10px',
              color: '#ff8a3d',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            FRONT
          </button>
        </div>
      </div>
    </div>
  )
}
