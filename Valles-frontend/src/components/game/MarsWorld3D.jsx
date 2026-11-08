import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createMartianAstronautModel } from './AstronautModel'

// ─── Real Mars EVA Physical Constants (NASA-calibrated) ──────────────────────
// Mars gravity: 3.72 m/s² (0.38g of Earth)
// Mars atmospheric pressure: ~610 Pa (0.088 psi — less than 1% of Earth's 101.3 kPa)
// Mars atmosphere: 95.3% CO₂, 2.6% N₂, 1.9% Ar, 0.13% O₂
const TERRAIN_SIZE = 2200
const TERRAIN_SEGS = 220
const PLAYER_HEIGHT = 1.85
const MOVE_SPEED = 5.4            // m/s walking (EVA suited pace)
const SPRINT_SPEED = 9.8          // m/s sprinting
const GRAVITY = 3.72              // Mars surface gravity (m/s²)
const JUMP_FORCE = 6.0            // High jumps due to low Martian gravity
const FOV = 72

// NASA PLSS Metabolic O₂ Consumption Modeling:
const O2_DRAIN_REST   = 0.08
const O2_DRAIN_WALK   = 0.18
const O2_DRAIN_SPRINT = 0.42
const BAT_DRAIN       = 0.04
const RAD_RATE        = (0.7 / 86400) * 1000

// ─── Photorealistic Mars Color Palette (Curiosity & Perseverance calibrated) ──
const MARS = {
  sky_zenith:  new THREE.Color(0x0a0402), // Deep burnt umber space transition
  sky_mid:     new THREE.Color(0xb04a1b), // Rusty butterscotch
  sky_horizon: new THREE.Color(0xe2823e), // Dusty salmon-amber glow
  sun_blue:    new THREE.Color(0x7ad4ff), // Mars sunset blue corona
  ground_deep: new THREE.Color(0x3e1306), // Basalt floor / depressions
  ground_low:  new THREE.Color(0x74270a), // Lower regolith
  ground_mid:  new THREE.Color(0xb8441c), // Primary oxidized iron regolith
  ground_high: new THREE.Color(0xd26f37), // High sand dunes & mesa
  ground_peak: new THREE.Color(0xe08b53), // Wind-swept ridge crests
  rock_basalt: new THREE.Color(0x220e06), // Volcanic basalt boulders
  rock_oxide:  new THREE.Color(0x943b24), // Iron-oxide pitted rocks
  dust_color:  0xd4753c,
}

// ─── Base Camp Location & Flat Bedrock Elevation ────────────────────────────
const HABITAT_POS = { x: -20, z: -30 }
const HABITAT_BASE_Y = 6.0 // Uniform level bedrock elevation for Base Camp compound

// ─── Geological Discovery Waypoints ──────────────────────────────────────────
const FLAG_SITES = [
  { x: 150,  z: 80,   name: 'Delta Deposit',    color: 0xff7d2e, desc: 'Ancient river delta sediment' },
  { x: -200, z: 150,  name: 'Esker Ridge',      color: 0xf5c842, desc: 'Glacial gravel ridge formation' },
  { x: 300,  z: -200, name: 'Ancient Shoreline',color: 0x4a9dc9, desc: 'Prehistoric ocean boundary' },
  { x: -100, z: -250, name: 'Lava Tube',        color: 0xf05aff, desc: 'Subsurface volcanic cavern' },
]

// ─── Multi-Harmonic Topography Noise (Jezero Crater Topography) ─────────────
function rawTerrainNoise(x, z) {
  const f1 = Math.sin(x * 0.007) * Math.cos(z * 0.005) * 62
  const f2 = Math.sin(x * 0.019 + 1.3) * Math.cos(z * 0.016 - 0.7) * 26
  const f3 = Math.sin(x * 0.052 + 2.1) * Math.sin(z * 0.045 + 1.4) * 11
  const f4 = Math.sin(x * 0.11) * Math.cos(z * 0.10 + 0.9) * 4.2
  const f5 = Math.sin(x * 0.28 + z * 0.22) * 1.6 // Wind ripple TARs

  // Craters with raised rims and depressed floors
  const crDist1 = Math.sqrt((x + 180)**2 + (z - 220)**2)
  const crater1 = crDist1 < 90 ? (Math.sin((crDist1 / 90) * Math.PI) * 8 - (1 - crDist1 / 90) * 48) : 0

  const crDist2 = Math.sqrt((x - 350)**2 + (z + 120)**2)
  const crater2 = crDist2 < 70 ? (Math.sin((crDist2 / 70) * Math.PI) * 6 - (1 - crDist2 / 70) * 34) : 0

  const crDist3 = Math.sqrt((x + 50)**2 + (z + 400)**2)
  const crater3 = crDist3 < 110 ? (Math.sin((crDist3 / 110) * Math.PI) * 9 - (1 - crDist3 / 110) * 58) : 0

  // Jezero Delta Fan Terrace & Mesa Formation
  const mesaDist = Math.sqrt((x - 280)**2 + (z - 300)**2)
  const mesa1 = Math.min(38, Math.max(0, 38 - mesaDist / 3.2))

  // Ridge formation
  const ridge1 = Math.max(0, 14 - Math.abs(x * 0.038 - z * 0.028 - 4.5)) * 0.85

  return f1 + f2 + f3 + f4 + f5 + crater1 + crater2 + crater3 + mesa1 + ridge1
}

// Terrain elevation with smoothed Base Camp plateau
function noiseH(x, z) {
  const rawY = rawTerrainNoise(x, z)
  const habDist = Math.sqrt((x - HABITAT_POS.x)**2 + (z - HABITAT_POS.z)**2)

  // Level the terrain under the Base Camp compound so nothing floats or clips
  if (habDist < 26) {
    return HABITAT_BASE_Y
  } else if (habDist < 42) {
    // Smooth cosine ease into surrounding natural terrain
    const t = (habDist - 26) / 16
    const smoothT = (1 - Math.cos(t * Math.PI)) * 0.5
    return HABITAT_BASE_Y * (1 - smoothT) + rawY * smoothT
  }
  return rawY
}

// ─── Exact Mesh Triangle Surface Height (Zero Polygon Clipping) ───────────────
function getMeshTerrainHeight(x, z) {
  const half = TERRAIN_SIZE / 2 // 1100
  const seg = TERRAIN_SIZE / TERRAIN_SEGS // 10
  const u = (x + half) / seg
  const v = (z + half) / seg
  const ix = Math.floor(u)
  const iz = Math.floor(v)
  if (ix < 0 || ix >= TERRAIN_SEGS || iz < 0 || iz >= TERRAIN_SEGS) {
    return noiseH(x, z)
  }
  const fx = u - ix
  const fz = v - iz
  const x0 = -half + ix * seg
  const x1 = x0 + seg
  const z0 = -half + iz * seg
  const z1 = z0 + seg
  const y00 = noiseH(x0, z0)
  const y10 = noiseH(x1, z0)
  const y01 = noiseH(x0, z1)
  const y11 = noiseH(x1, z1)

  // PlaneGeometry quad split diagonally:
  if (fx + fz <= 1) {
    return y00 + fx * (y10 - y00) + fz * (y01 - y00)
  } else {
    return y11 + (1 - fx) * (y01 - y11) + (1 - fz) * (y10 - y11)
  }
}

// True physical ground elevation at (x, z)
function getGroundHeight(x, z) {
  return Math.max(getMeshTerrainHeight(x, z), noiseH(x, z))
}

function generateTerrain(geo) {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, noiseH(pos.getX(i), pos.getZ(i)))
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function colorTerrain(geo) {
  const pos = geo.attributes.position
  const cols = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const slope = Math.abs(geo.attributes.normal?.getY(i) ?? 1)
    let c
    if (y < -25)      c = MARS.ground_deep.clone()
    else if (y < 0)   c = MARS.ground_deep.clone().lerp(MARS.ground_low, (y + 25) / 25)
    else if (y < 12)  c = MARS.ground_low.clone().lerp(MARS.ground_mid, y / 12)
    else if (y < 30)  c = MARS.ground_mid.clone().lerp(MARS.ground_high, (y - 12) / 18)
    else              c = MARS.ground_high.clone().lerp(MARS.ground_peak, Math.min(1, (y - 30) / 10))

    // Steep rocky cliff faces expose dark basalt bedrock
    if (slope < 0.72) {
      c.lerp(MARS.rock_basalt, (0.72 - slope) * 1.6)
    }

    // Micro-surface mineral variation
    const jitter = (Math.sin(i * 131.3 + 0.5) * 0.5 + Math.cos(i * 293.7) * 0.5) * 0.04
    cols[i * 3]     = Math.min(1, Math.max(0, c.r + jitter))
    cols[i * 3 + 1] = Math.min(1, Math.max(0, c.g + jitter * 0.6))
    cols[i * 3 + 2] = Math.min(1, Math.max(0, c.b + jitter * 0.3))
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  return geo
}

// ─── Procedural Regolith Surface Normal/Bump Map ─────────────────────────────
function createRegolithBumpMap() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(512, 512)
  const d = imgData.data

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4
      const n1 = Math.sin(x * 0.12) * Math.cos(y * 0.12) * 18
      const n2 = Math.sin(x * 0.35 + y * 0.28) * 10
      const grain = (Math.random() - 0.5) * 28
      const ripple = Math.sin((x + y * 0.5) * 0.09) * 14
      const val = Math.max(0, Math.min(255, 128 + n1 + n2 + grain + ripple))
      d[idx] = val
      d[idx + 1] = val
      d[idx + 2] = val
      d[idx + 3] = 255
    }
  }
  ctx.putImageData(imgData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(110, 110)
  return texture
}

// ─── Obstacle Collision Definitions ──────────────────────────────────────────
// Rock boulder coordinates across the crater
const ROCK_COORDS = [
  [45, 75], [-130, 55], [210, -140], [-75, 190], [170, 290],
  [-290, -75], [390, 110], [-210, -290], [95, -190], [290, -390],
  [-140, 340], [240, -45], [-340, 140], [85, 390], [-390, 290],
  [175, -270], [-240, 115], [315, 215], [-95, -340], [410, -190],
  [-55, 135], [225, -75], [-325, 305], [85, -430], [430, 270],
]

// ─── Radar Mini-Map Component ───────────────────────────────────────────────
function MiniMap({ playerX, playerZ, yaw, visitedFlags, activeObjective }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const RADAR_RADIUS = 360
    const SCALE = (W / 2 - 8) / RADAR_RADIUS

    ctx.clearRect(0, 0, W, H)

    // Dark HUD radar background
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, W / 2 - 2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(7, 3, 1, 0.94)'
    ctx.fill()
    ctx.clip()

    // Concentric range rings (100m, 200m, 300m)
    ;[100, 200, 300].forEach((r) => {
      ctx.beginPath()
      ctx.arc(cx, cy, r * SCALE, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 125, 46, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 125, 46, 0.25)'
    ctx.beginPath()
    ctx.moveTo(cx, 4)
    ctx.lineTo(cx, H - 4)
    ctx.moveTo(4, cy)
    ctx.lineTo(W - 4, cy)
    ctx.stroke()

    // Base Camp habitat marker
    const habX = cx + HABITAT_POS.x * SCALE
    const habZ = cy + HABITAT_POS.z * SCALE
    ctx.fillStyle = '#6ee7b7'
    ctx.beginPath()
    ctx.arc(habX, habZ, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a7f3d0'
    ctx.font = '7px monospace'
    ctx.fillText('BASE', habX + 5, habZ + 3)

    // Discovery flags
    FLAG_SITES.forEach(({ x, z, name, color }) => {
      const fx = cx + x * SCALE
      const fz = cy + z * SCALE
      const visited = visitedFlags.includes(name)
      const isTarget = activeObjective && activeObjective.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      const hex = '#' + color.toString(16).padStart(6, '0')

      if (isTarget) {
        ctx.beginPath()
        ctx.arc(fx, fz, 7, 0, Math.PI * 2)
        ctx.strokeStyle = '#f5c842'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      ctx.fillStyle = visited ? hex : 'rgba(180,180,180,0.5)'
      ctx.beginPath()
      ctx.arc(fx, fz, 3.5, 0, Math.PI * 2)
      ctx.fill()

      if (visited) {
        ctx.strokeStyle = hex
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(fx, fz, 5.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // Player direction arrow
    const px = cx + playerX * SCALE
    const pz = cy + playerZ * SCALE
    const arLen = 7
    ctx.save()
    ctx.translate(px, pz)
    ctx.rotate(yaw)
    ctx.beginPath()
    ctx.moveTo(0, -arLen)
    ctx.lineTo(-3, arLen * 0.4)
    ctx.lineTo(0, arLen * 0.1)
    ctx.lineTo(3, arLen * 0.4)
    ctx.closePath()
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.restore()

    // Player central dot
    ctx.fillStyle = '#ff7d2e'
    ctx.beginPath()
    ctx.arc(px, pz, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Cardinal directions
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '8px monospace'
    ctx.fillText('N', cx - 3, 11)
    ctx.fillText('S', cx - 3, H - 4)
    ctx.fillText('W', 4, cy + 3)
    ctx.fillText('E', W - 10, cy + 3)

    ctx.restore()

    // Outer border ring
    ctx.beginPath()
    ctx.arc(cx, cy, W / 2 - 1.5, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,125,46,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [playerX, playerZ, yaw, visitedFlags, activeObjective])

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={140}
      style={{ borderRadius: '50%', display: 'block' }}
    />
  )
}

// ─── Main 3D Mars Simulation Component ───────────────────────────────────────
export default function MarsWorld3D({
  onExit,
  onOpenComms,
  mode = 'free',
  activeMission = null,
  activeChallenge = null,
  realisticConditions = null,
}) {
  const mountRef    = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef   = useRef(null)
  const clockRef    = useRef(new THREE.Clock())
  const keysRef     = useRef({})
  const velRef      = useRef(new THREE.Vector3())
  const onGroundRef = useRef(true)
  const lockedRef   = useRef(false)
  const isDeadRef   = useRef(false)
  const nearHabRef  = useRef(false)
  const yawRef      = useRef(0)
  const pitchRef    = useRef(0)
  const frameRef    = useRef(null)
  const dustRef     = useRef(null)
  const antennaRef  = useRef(null)
  const strobeRef   = useRef(null)
  const flagsRef    = useRef([])

  // Camera Mode: 'first_person' | 'third_person'
  const [cameraMode, setCameraMode] = useState('first_person')
  const cameraModeRef = useRef('first_person')

  const [locked, setLocked] = useState(false)
  const [visitedFlags, setVisitedFlags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('valles_free_flags') || '[]') } catch { return [] }
  })
  const [miniPos, setMiniPos] = useState({ x: 0, z: 0, yaw: 0 })
  const [coins, setCoins] = useState(() => {
    try { return parseInt(localStorage.getItem('valles_coins') || '0') } catch { return 0 }
  })
  const [newMilestone, setNewMilestone] = useState(null)
  const [isSuffocating, setIsSuffocating] = useState(false)
  const [nearHabitat, setNearHabitat]     = useState(false)
  const [rechargeAlert, setRechargeAlert] = useState(false)
  const [missionCompletedAlert, setMissionCompletedAlert] = useState(null)

  const [hud, setHud] = useState({
    oxygen: '100.0',
    battery: '100.0',
    radiation: '0.000',
    speed: '0.0',
    altitude: '0.0',
    coords: { x: '0', z: '0' },
    time: 0,
    warning: null,
    flagsVisited: [],
    sessionDist: 0,
    totalDist: 0,
  })

  // Realistic Mode HUD state (conditions index advances over time)
  const [realisticHud, setRealisticHud] = useState(null)  // current ConditionPoint
  const realisticIdxRef = useRef(0)
  const realisticTimerRef = useRef(0)

  // Suit Recharge at Habitat Airlock
  const rechargeSuitRef = useRef(null)

  // Toggle Camera View method
  const toggleCameraMode = () => {
    const next = cameraModeRef.current === 'first_person' ? 'third_person' : 'first_person'
    cameraModeRef.current = next
    setCameraMode(next)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── WebGL Renderer with High-Fidelity Tone Mapping ─────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.30
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Scene & Mars Atmosphere Fog ────────────────────────────────────────
    const scene = new THREE.Scene()
    // Fog density adjusts live if Realistic Mode is active
    const baseFogDensity = realisticConditions ? Math.min(0.025, 0.002 + realisticConditions.conditions[0].dust_opacity * 0.004) : 0.0015
    const baseFogColor   = realisticConditions ? (realisticConditions.conditions[0].dust_opacity > 2 ? 0xd4844a : 0xc8642a) : 0xc8642a
    scene.fog = new THREE.FogExp2(baseFogColor, baseFogDensity)
    // Store fog ref for live update
    const fogRef = scene.fog

    // ── Player & Camera Position ───────────────────────────────────────────
    let startX = HABITAT_POS.x + 8
    let startZ = HABITAT_POS.z + 8
    if (mode === 'free') {
      try {
        const sv = JSON.parse(localStorage.getItem('valles_free_position') || 'null')
        if (sv && typeof sv.x === 'number') { startX = sv.x; startZ = sv.z }
      } catch {}
    }

    const playerPos = new THREE.Vector3(startX, noiseH(startX, startZ) + PLAYER_HEIGHT, startZ)
    const camera = new THREE.PerspectiveCamera(FOV, mount.clientWidth / mount.clientHeight, 0.1, 1600)
    camera.position.copy(playerPos)
    cameraRef.current = camera

    // ── Build 3D Martian Astronaut Model (For 3rd Person View & Shadows) ───
    const astronaut = createMartianAstronautModel({ castShadow: true, receiveShadow: true })
    astronaut.root.position.set(playerPos.x, playerPos.y - PLAYER_HEIGHT, playerPos.z)
    astronaut.root.visible = false // Invisible in 1st person, visible in 3rd person
    scene.add(astronaut.root)

    // ── Mars Sky Dome ──────────────────────────────────────────────────────
    const skyGeo = new THREE.SphereGeometry(1200, 32, 24)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        zenithColor:  { value: MARS.sky_zenith },
        midColor:     { value: MARS.sky_mid },
        horizonColor: { value: MARS.sky_horizon },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 zenithColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 sky;
          if (h < 0.22) {
            sky = mix(horizonColor, midColor, max(0.0, h) / 0.22);
          } else {
            sky = mix(midColor, zenithColor, (h - 0.22) / 0.78);
          }
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    })
    scene.add(new THREE.Mesh(skyGeo, skyMat))

    // ── Mars Sun with Blue Scattering Corona ───────────────────────────────
    const sunDir = new THREE.Vector3(380, 440, -480).normalize()
    const sunPos = sunDir.clone().multiplyScalar(1000)

    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfffbe8 })
    )
    sunDisc.position.copy(sunPos)
    scene.add(sunDisc)

    // Blue Corona Sprite
    const coronaCanvas = document.createElement('canvas')
    coronaCanvas.width = 128
    coronaCanvas.height = 128
    const cctx = coronaCanvas.getContext('2d')
    const cgrad = cctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    cgrad.addColorStop(0,   'rgba(125, 218, 255, 0.98)')
    cgrad.addColorStop(0.3, 'rgba(85, 185, 245, 0.55)')
    cgrad.addColorStop(0.7, 'rgba(215, 120, 50, 0.25)')
    cgrad.addColorStop(1,   'rgba(0, 0, 0, 0)')
    cctx.fillStyle = cgrad
    cctx.fillRect(0, 0, 128, 128)
    const coronaTexture = new THREE.CanvasTexture(coronaCanvas)
    const coronaMat = new THREE.SpriteMaterial({ map: coronaTexture, blending: THREE.AdditiveBlending })
    const coronaSprite = new THREE.Sprite(coronaMat)
    coronaSprite.scale.set(180, 180, 1)
    coronaSprite.position.copy(sunPos)
    scene.add(coronaSprite)

    // ── Directional Mars Sunlight & Atmospheric Lighting ───────────────────
    const dirLight = new THREE.DirectionalLight(0xffecd0, 2.8)
    dirLight.position.copy(sunPos)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 10
    dirLight.shadow.camera.far = 1200
    dirLight.shadow.camera.left = -250
    dirLight.shadow.camera.right = 250
    dirLight.shadow.camera.top = 250
    dirLight.shadow.camera.bottom = -250
    dirLight.shadow.bias = -0.0004
    scene.add(dirLight)

    const hemiLight = new THREE.HemisphereLight(0xdc7e3c, 0x421808, 0.95)
    scene.add(hemiLight)

    // ── High-Resolution Mars Terrain with Bump Mapping ─────────────────────
    const terrGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS)
    terrGeo.rotateX(-Math.PI / 2)
    generateTerrain(terrGeo)
    colorTerrain(terrGeo)

    const regolithBump = createRegolithBumpMap()
    const terrMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08,
      bumpMap: regolithBump,
      bumpScale: 0.35,
    })
    const terrain = new THREE.Mesh(terrGeo, terrMat)
    terrain.receiveShadow = true
    scene.add(terrain)

    // ── Solid Obstacles List for Physical Collision ────────────────────────
    const habX = HABITAT_POS.x, habZ = HABITAT_POS.z
    const habY = HABITAT_BASE_Y

    const obstacles = [
      // Habitat main dome
      { type: 'cylinder', x: habX, z: habZ, radius: 9.8, minY: habY, maxY: habY + 11.0 },
      // Airlock tunnel corridor
      { type: 'capsule', x1: habX, z1: habZ, x2: habX + 15, z2: habZ, radius: 2.6, minY: habY, maxY: habY + 4.1 },
      // Rover
      { type: 'cylinder', x: habX + 12, z: habZ - 10, radius: 2.8, minY: habY, maxY: habY + 2.5 },
    ]

    // ── Base Camp Concrete Blast Pad & Foundation (Zero air gaps!) ─────────

    const padGeo = new THREE.CylinderGeometry(25, 26, 0.5, 32)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.55,
      metalness: 0.45,
    })
    const pad = new THREE.Mesh(padGeo, padMat)
    pad.position.set(habX, habY - 0.2, habZ)
    pad.receiveShadow = true
    scene.add(pad)

    // Pad Safety Boundary Ring
    const padRing = new THREE.Mesh(
      new THREE.TorusGeometry(25.2, 0.12, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xff7d2e })
    )
    padRing.rotation.x = Math.PI / 2
    padRing.position.set(habX, habY + 0.06, habZ)
    scene.add(padRing)

    // ── Main Pressurized Habitat & Geodesic Dome ───────────────────────────
    const habMat   = new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.4, metalness: 0.3 })
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x90c5e8, transparent: true, opacity: 0.65, roughness: 0.1, metalness: 0.2 })
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x72787e, roughness: 0.3, metalness: 0.8 })
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x14284d, roughness: 0.2, metalness: 0.85 })

    const mainHab = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.0, 5.5, 24), habMat)
    mainHab.position.set(habX, habY + 2.75, habZ)
    mainHab.castShadow = true
    mainHab.receiveShadow = true
    scene.add(mainHab)

    const obsDome = new THREE.Mesh(new THREE.SphereGeometry(8.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat)
    obsDome.position.set(habX, habY + 5.5, habZ)
    scene.add(obsDome)

    const habInteriorLight = new THREE.PointLight(0xffe8ba, 2.5, 35)
    habInteriorLight.position.set(habX, habY + 6.0, habZ)
    scene.add(habInteriorLight)

    // Airlock Walkway Tunnel
    const airlock = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 14, 12), habMat)
    airlock.rotation.z = Math.PI / 2
    airlock.position.set(habX + 8, habY + 1.8, habZ)
    airlock.castShadow = true
    airlock.receiveShadow = true
    scene.add(airlock)

    // Airlock Exit Door Frame
    const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 8, 16), metalMat)
    doorFrame.rotation.y = Math.PI / 2
    doorFrame.position.set(habX + 15, habY + 1.8, habZ)
    scene.add(doorFrame)

    const airlockGlow = new THREE.PointLight(0x5ee6f5, 2.2, 18)
    airlockGlow.position.set(habX + 15, habY + 2.5, habZ)
    scene.add(airlockGlow)

    // Photovoltaic Solar Farm (Anchored deeply into the ground)
    for (let sp = 0; sp < 6; sp++) {
      const angle = (sp / 6) * Math.PI * 2
      const sx = habX + Math.cos(angle) * 20
      const sz = habZ + Math.sin(angle) * 20

      // Support post penetrates below surface so it never hangs in the air
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5.0, 8), metalMat)
      post.position.set(sx, habY + 1.5, sz)
      post.castShadow = true
      scene.add(post)

      const panel = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.15, 3.8), solarMat)
      panel.position.set(sx, habY + 3.4, sz)
      panel.rotation.set(0.3, angle + Math.PI / 2, 0)
      panel.castShadow = true
      scene.add(panel)

      obstacles.push({ type: 'cylinder', x: sx, z: sz, radius: 0.8, minY: habY - 1, maxY: habY + 4.5 })
    }

    // Communication Mast, Rotating Dish, and Beacon
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 16, 8), metalMat)
    mast.position.set(habX, habY + 13, habZ)
    scene.add(mast)

    const dish = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 14, 1, true), metalMat)
    dish.position.set(habX, habY + 21, habZ)
    dish.rotation.x = Math.PI / 3.2
    antennaRef.current = dish
    scene.add(dish)

    const strobe = new THREE.PointLight(0xff2222, 2.5, 45)
    strobe.position.set(habX, habY + 22.5, habZ)
    strobeRef.current = strobe
    scene.add(strobe)

    // ── 3D Exploration Rover (Squarely on base pad) ────────────────────────
    const roverGroup = new THREE.Group()
    const roverBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.4, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xded8cc, roughness: 0.4, metalness: 0.3 })
    )
    roverBody.position.y = 1.3
    roverBody.castShadow = true
    roverGroup.add(roverBody)

    const roverDeck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 2.2), solarMat)
    roverDeck.position.y = 2.05
    roverGroup.add(roverDeck)

    const roverMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), metalMat)
    roverMast.position.set(1.2, 3.1, 0)
    roverGroup.add(roverMast)

    const roverCam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), metalMat)
    roverCam.position.set(1.2, 4.2, 0)
    roverGroup.add(roverCam)

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 })
    const wheelPositions = [
      [1.4, 0.5, 1.4],  [0, 0.5, 1.5],  [-1.4, 0.5, 1.4],
      [1.4, 0.5, -1.4], [0, 0.5, -1.5], [-1.4, 0.5, -1.4],
    ]
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.45, 14), wheelMat)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(wx, wy, wz)
      roverGroup.add(wheel)
    })

    const roverX = habX + 12, roverZ = habZ - 10
    roverGroup.position.set(roverX, habY, roverZ)
    roverGroup.rotation.y = 0.8
    scene.add(roverGroup)

    // ── Rock Formations (Basalt Boulders embedded firmly in regolith) ───────
    const rockMatBasalt = new THREE.MeshStandardMaterial({ color: MARS.rock_basalt, roughness: 0.9, flatShading: true })
    const rockMatOxide  = new THREE.MeshStandardMaterial({ color: MARS.rock_oxide, roughness: 0.85, flatShading: true })

    ROCK_COORDS.forEach(([rx, rz], idx) => {
      const scale = 2.0 + Math.abs(Math.sin(idx * 43.7)) * 8.5
      let geo
      if (idx % 3 === 0) geo = new THREE.DodecahedronGeometry(scale, 0)
      else if (idx % 3 === 1) geo = new THREE.IcosahedronGeometry(scale, 0)
      else geo = new THREE.OctahedronGeometry(scale, 0)

      const rock = new THREE.Mesh(geo, idx % 2 === 0 ? rockMatBasalt : rockMatOxide)
      const ty = noiseH(rx, rz)
      // Embed rock 25% into regolith so it never floats
      rock.position.set(rx, ty + scale * 0.18, rz)
      rock.rotation.set(Math.random() * Math.PI, idx * 1.5, Math.random() * Math.PI)
      rock.castShadow = true
      rock.receiveShadow = true
      scene.add(rock)

      // Add physical obstacle collision for this rock (full bounding coverage)
      obstacles.push({
        type: 'cylinder',
        x: rx,
        z: rz,
        radius: scale * 0.92,
        minY: ty - scale * 0.25,
        maxY: ty + scale * 0.95,
      })

      // Cluster satellite rocks
      for (let s = 0; s < 3; s++) {
        const sc = 0.5 + Math.abs(Math.sin(s * 29.1)) * 2.2
        const srock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(sc, 0),
          idx % 2 === 0 ? rockMatOxide : rockMatBasalt
        )
        const ox = rx + Math.sin(s * 73.1) * 12
        const oz = rz + Math.cos(s * 59.3) * 12
        const soy = noiseH(ox, oz)
        srock.position.set(ox, soy + sc * 0.12, oz)
        srock.castShadow = true
        scene.add(srock)

        // Collision for satellite rocks to prevent walking into or through them
        obstacles.push({
          type: 'cylinder',
          x: ox,
          z: oz,
          radius: sc * 0.90,
          minY: soy - sc * 0.2,
          maxY: soy + sc * 0.92,
        })
      }
    })

    // ── Geological Discovery Waypoint Flags ─────────────────────────────────
    const flagMeshes = []
    FLAG_SITES.forEach(({ x, z, color, name }) => {
      const fy = noiseH(x, z)
      // Collision for flag poles
      obstacles.push({
        type: 'cylinder',
        x,
        z,
        radius: 0.45,
        minY: fy,
        maxY: fy + 10,
      })
      // Flag pole extends 1.5m below surface to anchor into bedrock
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 11, 8), metalMat)
      pole.position.set(x, fy + 4.0, z)
      scene.add(pole)

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 2.2),
        new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.6 })
      )
      flag.position.set(x + 1.75, fy + 8.5, z)
      scene.add(flag)
      flagMeshes.push(flag)

      // Ground beacon ring
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(4, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
      )
      glow.rotation.x = -Math.PI / 2
      glow.position.set(x, fy + 0.12, z)
      scene.add(glow)
    })
    flagsRef.current = flagMeshes

    // ── Blowing Regolith Dust Particles ────────────────────────────────────
    const DUST_COUNT = 1800
    const dustGeo = new THREE.BufferGeometry()
    const dPos = new Float32Array(DUST_COUNT * 3)
    const dVel = new Float32Array(DUST_COUNT * 3)
    for (let i = 0; i < DUST_COUNT; i++) {
      const px = playerPos.x + (Math.random() - 0.5) * 350
      const pz = playerPos.z + (Math.random() - 0.5) * 350
      const py = noiseH(px, pz) + 0.5 + Math.random() * 20
      dPos[i * 3]     = px
      dPos[i * 3 + 1] = py
      dPos[i * 3 + 2] = pz
      dVel[i * 3]     = (Math.random() - 0.5) * 0.8
      dVel[i * 3 + 1] = (Math.random() - 0.5) * 0.10
      dVel[i * 3 + 2] = (Math.random() - 0.5) * 0.8
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
    const dustMesh = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: MARS.dust_color,
        size: 0.55,
        transparent: true,
        opacity: 0.40,
        sizeAttenuation: true,
      })
    )
    dustRef.current = { mesh: dustMesh, vel: dVel }
    scene.add(dustMesh)

    // Phobos
    const phobos = new THREE.Mesh(
      new THREE.SphereGeometry(6, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a7a6c, roughness: 0.9 })
    )
    phobos.position.set(-450, 480, -750)
    scene.add(phobos)

    // ── Window Resize ──────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Pointer Lock & Mouse Look ──────────────────────────────────────────
    const canvas = renderer.domElement
    const onPLC = () => {
      const isLocked = document.pointerLockElement === canvas
      lockedRef.current = isLocked
      setLocked(isLocked)
    }
    document.addEventListener('pointerlockchange', onPLC)
    canvas.addEventListener('click', () => {
      if (!lockedRef.current && !isDeadRef.current) canvas.requestPointerLock()
    })

    const onMM = (e) => {
      if (!lockedRef.current || isDeadRef.current) return
      yawRef.current   -= e.movementX * 0.0015
      pitchRef.current -= e.movementY * 0.0015
      pitchRef.current  = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitchRef.current))
    }
    document.addEventListener('mousemove', onMM)

    // ── Suit State Initialization & Coin Rates ─────────────────────────────
    let savedO2 = 100, savedBat = 100, savedRad = 0, savedDist = 0
    if (mode === 'free') {
      try {
        const sv = JSON.parse(localStorage.getItem('valles_free_suit') || 'null')
        if (sv) {
          savedO2  = typeof sv.oxygen === 'number' ? sv.oxygen : 100
          savedBat = typeof sv.battery === 'number' ? sv.battery : 100
          savedRad = typeof sv.radiation === 'number' ? sv.radiation : 0
        }
        savedDist = parseFloat(localStorage.getItem('valles_total_dist_m') || '0')
      } catch {}
    }

    // ── Realistic Mode init ───────────────────────────────────────────────
    if (realisticConditions?.conditions?.length) {
      realisticIdxRef.current = 0
      realisticTimerRef.current = 0
      setRealisticHud(realisticConditions.conditions[0])
    }

    let o2 = savedO2, bat = savedBat, rad = savedRad, missionTime = 0
    let autoSave = 0, sessionDistM = 0, totalDistM = savedDist
    let localVisited = [...visitedFlags]
    let lastAwardedKm = Math.floor(totalDistM / 1000)
    let missionFinished = false
    let challengeFinished = false

    const doRecharge = () => {
      o2  = 100
      bat = 100
      rad = 0
      setRechargeAlert(true)
      setTimeout(() => setRechargeAlert(false), 3000)
    }
    rechargeSuitRef.current = doRecharge

    // ── Keyboard Controls ──────────────────────────────────────────────────
    const onKD = (e) => {
      keysRef.current[e.code] = true

      // Tab key: Exit exploration
      if (e.code === 'Tab') {
        e.preventDefault()
        if (document.pointerLockElement) document.exitPointerLock()
        onExit()
      }

      // Key V: Toggle Camera View (1st Person vs 3rd Person)
      if (e.code === 'KeyV') {
        e.preventDefault()
        toggleCameraMode()
      }

      // Key C: Open Earth Communications modal
      if (e.code === 'KeyC') {
        e.preventDefault()
        if (document.pointerLockElement) document.exitPointerLock()
        onOpenComms?.()
      }

      // Key E: Recharge suit at Habitat airlock
      if (e.code === 'KeyE') {
        if (nearHabRef.current) doRecharge()
      }
    }

    const onKU = (e) => { keysRef.current[e.code] = false }
    document.addEventListener('keydown', onKD)
    document.addEventListener('keyup', onKU)

    // ── Obstacle Collision Resolution ──────────────────────────────────────
    function resolveCollisions(pos, playerRadius = 0.55) {
      const playerFeet = pos.y - PLAYER_HEIGHT
      const playerHead = pos.y

      for (const obs of obstacles) {
        const obsMinY = obs.minY ?? -9999
        const obsMaxY = obs.maxY ?? 9999

        // 1. Landing / jumping onto obstacle top
        if (playerFeet >= obsMaxY - 0.35) {
          let onTop = false
          if (obs.type === 'cylinder') {
            const dx = pos.x - obs.x
            const dz = pos.z - obs.z
            if (dx * dx + dz * dz <= obs.radius * obs.radius) onTop = true
          } else if (obs.type === 'capsule') {
            const l2 = (obs.x2 - obs.x1)**2 + (obs.z2 - obs.z1)**2
            if (l2 > 0.0001) {
              let t = ((pos.x - obs.x1) * (obs.x2 - obs.x1) + (pos.z - obs.z1) * (obs.z2 - obs.z1)) / l2
              t = Math.max(0, Math.min(1, t))
              const projX = obs.x1 + t * (obs.x2 - obs.x1)
              const projZ = obs.z1 + t * (obs.z2 - obs.z1)
              const dx = pos.x - projX
              const dz = pos.z - projZ
              if (dx * dx + dz * dz <= obs.radius * obs.radius) onTop = true
            }
          }
          if (onTop && pos.y < obsMaxY + PLAYER_HEIGHT) {
            pos.y = obsMaxY + PLAYER_HEIGHT
            if (velRef.current.y < 0) velRef.current.y = 0
            onGroundRef.current = true
          }
          continue
        }

        // 2. Horizontal obstacle collision — blocks player from walking inside or under opaque objects
        if (playerHead > obsMinY && playerFeet < obsMaxY) {
          if (obs.type === 'cylinder') {
            const dx = pos.x - obs.x
            const dz = pos.z - obs.z
            const dist2 = dx * dx + dz * dz
            const minDist = obs.radius + playerRadius
            if (dist2 < minDist * minDist && dist2 > 0.00001) {
              const dist = Math.sqrt(dist2)
              const push = (minDist - dist) / dist
              pos.x += dx * push
              pos.z += dz * push
              const nx = dx / dist, nz = dz / dist
              const dot = velRef.current.x * nx + velRef.current.z * nz
              if (dot < 0) {
                velRef.current.x -= dot * nx
                velRef.current.z -= dot * nz
              }
            }
          } else if (obs.type === 'capsule') {
            const l2 = (obs.x2 - obs.x1)**2 + (obs.z2 - obs.z1)**2
            if (l2 < 0.00001) continue
            let t = ((pos.x - obs.x1) * (obs.x2 - obs.x1) + (pos.z - obs.z1) * (obs.z2 - obs.z1)) / l2
            t = Math.max(0, Math.min(1, t))
            const projX = obs.x1 + t * (obs.x2 - obs.x1)
            const projZ = obs.z1 + t * (obs.z2 - obs.z1)
            const dx = pos.x - projX
            const dz = pos.z - projZ
            const dist2 = dx * dx + dz * dz
            const minDist = obs.radius + playerRadius
            if (dist2 < minDist * minDist && dist2 > 0.00001) {
              const dist = Math.sqrt(dist2)
              const push = (minDist - dist) / dist
              pos.x += dx * push
              pos.z += dz * push
              const nx = dx / dist, nz = dz / dist
              const dot = velRef.current.x * nx + velRef.current.z * nz
              if (dot < 0) {
                velRef.current.x -= dot * nx
                velRef.current.z -= dot * nz
              }
            }
          }
        }
      }
    }

    // ── Primary 60 FPS Game Loop ───────────────────────────────────────────
    const tick = () => {
      frameRef.current = requestAnimationFrame(tick)
      const dt = Math.min(clockRef.current.getDelta(), 0.05)
      missionTime += dt
      autoSave    += dt

      const cam  = cameraRef.current
      const keys = keysRef.current
      const vel  = velRef.current

      // Strobe beacon & dish animation
      if (strobeRef.current) {
        strobeRef.current.intensity = (Math.sin(missionTime * 6) > 0.4) ? 3.0 : 0.2
      }
      if (antennaRef.current) {
        antennaRef.current.rotation.y = Math.sin(missionTime * 0.2) * 0.4
      }

      // Flag flutter in thin Martian atmosphere
      flagsRef.current.forEach((flag, idx) => {
        flag.rotation.y = Math.sin(missionTime * 3.5 + idx) * 0.15
        flag.rotation.z = Math.cos(missionTime * 2.8 + idx) * 0.08
      })

      // If player suffocated, halt and render
      if (isDeadRef.current) {
        vel.set(0, 0, 0)
        renderer.render(scene, cam)
        return
      }

      // ── Movement & Controls ──────────────────────────────────────────────
      const fwd = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current))
      const rgt = new THREE.Vector3( Math.cos(yawRef.current), 0, -Math.sin(yawRef.current))
      const sprint = keys['ShiftLeft'] || keys['ShiftRight']
      const spd = sprint ? SPRINT_SPEED : MOVE_SPEED
      const dir = new THREE.Vector3()

      if (keys['KeyW'] || keys['ArrowUp'])    dir.add(fwd)
      if (keys['KeyS'] || keys['ArrowDown'])  dir.sub(fwd)
      if (keys['KeyA'] || keys['ArrowLeft'])  dir.sub(rgt)
      if (keys['KeyD'] || keys['ArrowRight']) dir.add(rgt)

      const moving = dir.length() > 0
      if (moving) {
        dir.normalize()
        vel.x += dir.x * spd * dt * 5
        vel.z += dir.z * spd * dt * 5
      }
      vel.x *= 0.80
      vel.z *= 0.80
      const hs = Math.sqrt(vel.x**2 + vel.z**2)
      if (hs > spd) { vel.x = (vel.x / hs) * spd; vel.z = (vel.z / hs) * spd }

      // Mars Gravity
      vel.y -= GRAVITY * dt
      if (keys['Space'] && onGroundRef.current) {
        vel.y = JUMP_FORCE
        onGroundRef.current = false
        bat = Math.max(0, bat - 0.12)
      }

      const prevPos = playerPos.clone()
      playerPos.x += vel.x * dt
      playerPos.y += vel.y * dt
      playerPos.z += vel.z * dt

      // Physical obstacle collision — run twice for stable depenetration
      resolveCollisions(playerPos, 0.55)
      resolveCollisions(playerPos, 0.55)

      // Distance tracking
      const moved = playerPos.distanceTo(prevPos)
      if (moved > 0.01 && moved < 3.5) {
        sessionDistM += moved
        totalDistM   += moved
      }

      // Terrain Boundary Clamping
      playerPos.x = Math.max(-TERRAIN_SIZE / 2 + 5, Math.min(TERRAIN_SIZE / 2 - 5, playerPos.x))
      playerPos.z = Math.max(-TERRAIN_SIZE / 2 + 5, Math.min(TERRAIN_SIZE / 2 - 5, playerPos.z))

      // ── Ground Clamping — sample true mesh elevation at current XZ ────────
      const surfaceY = getGroundHeight(playerPos.x, playerPos.z)
      const groundY  = surfaceY + PLAYER_HEIGHT

      if (playerPos.y <= groundY) {
        playerPos.y = groundY
        if (vel.y < 0) vel.y = 0
        onGroundRef.current = true
      } else {
        // "On ground" within a tiny epsilon so single-frame rounding can't slip through
        onGroundRef.current = (playerPos.y - groundY) < 0.12
      }

      // Concrete blast pad elevation support (radius 26, surface at HABITAT_BASE_Y + 0.05)
      const habDx = playerPos.x - HABITAT_POS.x
      const habDz = playerPos.z - HABITAT_POS.z
      const habDistXZ = Math.sqrt(habDx * habDx + habDz * habDz)
      if (habDistXZ <= 25.5) {
        const padTopY = HABITAT_BASE_Y + PLAYER_HEIGHT
        if (playerPos.y < padTopY) {
          playerPos.y = padTopY
          if (vel.y < 0) vel.y = 0
          onGroundRef.current = true
        }
      }

      // ── Third Person vs First Person Camera Logic ────────────────────────
      const is3rdPerson = cameraModeRef.current === 'third_person'

      if (is3rdPerson) {
        // Show astronaut model
        astronaut.root.visible = true
        astronaut.root.position.set(playerPos.x, playerPos.y - PLAYER_HEIGHT, playerPos.z)
        astronaut.root.rotation.y = yawRef.current

        // Update astronaut walking / running animation
        astronaut.update(dt, {
          isMoving: moving,
          isSprinting: sprint,
          isJumping: !onGroundRef.current,
          speed: hs,
        })

        // Position camera behind player based on yaw & pitch
        const camDist = 3.8
        const camHeightOffset = 1.5
        const cosPitch = Math.cos(pitchRef.current)
        const sinPitch = Math.sin(pitchRef.current)
        const sinYaw   = Math.sin(yawRef.current)
        const cosYaw   = Math.cos(yawRef.current)

        const backX = sinYaw * cosPitch * camDist
        const backY = -sinPitch * camDist + camHeightOffset
        const backZ = cosYaw * cosPitch * camDist

        let targetCamX = playerPos.x + backX
        let targetCamY = playerPos.y + backY
        let targetCamZ = playerPos.z + backZ

        // Camera Ground Collision: Ensure camera NEVER goes below the terrain!
        const camTerrainY = getGroundHeight(targetCamX, targetCamZ)
        if (targetCamY < camTerrainY + 0.75) {
          targetCamY = camTerrainY + 0.75
        }

        // Camera Obstacle Collision: Prevent camera from clipping inside rocks or buildings
        for (const obs of obstacles) {
          if (obs.type === 'cylinder') {
            const dx = targetCamX - obs.x
            const dz = targetCamZ - obs.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            const safeR = obs.radius + 0.6
            if (dist < safeR && dist > 0.001) {
              const obsMinY = obs.minY ?? -9999
              const obsMaxY = obs.maxY ?? 9999
              if (targetCamY >= obsMinY && targetCamY <= obsMaxY + 0.5) {
                targetCamX = obs.x + (dx / dist) * safeR
                targetCamZ = obs.z + (dz / dist) * safeR
              }
            }
          }
        }

        cam.position.set(targetCamX, targetCamY, targetCamZ)
        cam.lookAt(playerPos.x, playerPos.y - 0.2, playerPos.z)
      } else {
        // First Person View
        astronaut.root.visible = false
        cam.position.copy(playerPos)
        cam.rotation.order = 'YXZ'
        cam.rotation.y = yawRef.current
        cam.rotation.x = pitchRef.current
      }

      // ── Dust Particles ────────────────────────────────────────────────────
      if (dustRef.current) {
        const { mesh, vel: dv } = dustRef.current
        const dp = mesh.geometry.attributes.position
        for (let i = 0; i < DUST_COUNT; i++) {
          dp.array[i * 3]     += dv[i * 3] * dt * 2.2
          dp.array[i * 3 + 1] += dv[i * 3 + 1] * dt
          dp.array[i * 3 + 2] += dv[i * 3 + 2] * dt * 2.2

          const dx = dp.array[i * 3] - playerPos.x
          const dz = dp.array[i * 3 + 2] - playerPos.z
          const localGround = noiseH(dp.array[i * 3], dp.array[i * 3 + 2])

          // Anchor dust to ground level so none floats high in the air
          if (Math.abs(dx) > 180 || Math.abs(dz) > 180 || dp.array[i * 3 + 1] > localGround + 24 || dp.array[i * 3 + 1] < localGround) {
            const rx = playerPos.x + (Math.random() - 0.5) * 320
            const rz = playerPos.z + (Math.random() - 0.5) * 320
            dp.array[i * 3]     = rx
            dp.array[i * 3 + 1] = noiseH(rx, rz) + 0.4 + Math.random() * 18
            dp.array[i * 3 + 2] = rz
          }
        }
        dp.needsUpdate = true
      }

      // ── NASA Life Support Drain ──────────────────────────────────────────
      const drainFactor = mode === 'mission' ? 0.35 : 1.0
      const motionO2Drain = sprint ? O2_DRAIN_SPRINT : moving ? O2_DRAIN_WALK : O2_DRAIN_REST
      o2  = Math.max(0, o2 - motionO2Drain * dt * drainFactor)
      bat = Math.max(0, bat - BAT_DRAIN * dt * drainFactor)
      rad += RAD_RATE * dt

      // Suffocation Failure Check
      if (o2 <= 0.0 || bat <= 0.0) {
        isDeadRef.current = true
        if (document.pointerLockElement) document.exitPointerLock()
        setIsSuffocating(true)
      }

      // Habitat Proximity (Recharge Station)
      const distToHab = Math.sqrt((playerPos.x - HABITAT_POS.x)**2 + (playerPos.z - HABITAT_POS.z)**2)
      const isNearHab = distToHab < 22
      nearHabRef.current = isNearHab
      setNearHabitat(isNearHab)

      // Discovery Flag Logging
      FLAG_SITES.forEach(({ x, z, name }) => {
        const d = Math.sqrt((playerPos.x - x)**2 + (playerPos.z - z)**2)
        if (d < 24 && !localVisited.includes(name)) {
          localVisited = [...localVisited, name]
          setVisitedFlags([...localVisited])
          try { localStorage.setItem('valles_free_flags', JSON.stringify(localVisited)) } catch {}
        }
      })

      // Active Mission Completion
      if (activeMission && !missionFinished) {
        const targetSite = FLAG_SITES.find(f =>
          activeMission.title?.toLowerCase().includes(f.name.toLowerCase().split(' ')[0]) ||
          activeMission.objectives?.some(obj => obj.toLowerCase().includes(f.name.toLowerCase().split(' ')[0]))
        )
        const targetDist = targetSite
          ? Math.sqrt((playerPos.x - targetSite.x)**2 + (playerPos.z - targetSite.z)**2)
          : (activeMission.title?.toLowerCase().includes('mesa')
              ? Math.sqrt((playerPos.x - 280)**2 + (playerPos.z - 300)**2)
              : Math.sqrt((playerPos.x - HABITAT_POS.x)**2 + (playerPos.z - HABITAT_POS.z)**2))

        if (targetDist < 26) {
          missionFinished = true
          const earnedCoins = activeMission.coinReward || 150
          const earnedXp = activeMission.xpReward || 350
          const curCoins = parseInt(localStorage.getItem('valles_coins') || '0')
          const updatedCoins = curCoins + earnedCoins
          localStorage.setItem('valles_coins', String(updatedCoins))
          setCoins(updatedCoins)

          try {
            const completedList = JSON.parse(localStorage.getItem('valles_completed_missions') || '[]')
            if (!completedList.includes(activeMission.id)) {
              completedList.push(activeMission.id)
              localStorage.setItem('valles_completed_missions', JSON.stringify(completedList))
            }
          } catch {}

          setMissionCompletedAlert({ title: activeMission.title, coins: earnedCoins, xp: earnedXp })
          setTimeout(() => setMissionCompletedAlert(null), 8000)
        }
      }

      // Active Challenge Completion
      if (activeChallenge && !challengeFinished) {
        const allVisited = FLAG_SITES.every(f => localVisited.includes(f.name))
        if (allVisited) {
          challengeFinished = true
          const cCoins = activeChallenge.coinReward || 800
          const cXp = activeChallenge.xpReward || 2500
          const curCoins = parseInt(localStorage.getItem('valles_coins') || '0')
          const updatedCoins = curCoins + cCoins
          localStorage.setItem('valles_coins', String(updatedCoins))
          setCoins(updatedCoins)

          try {
            localStorage.setItem('valles_weekly_challenge', JSON.stringify({
              id: activeChallenge.id,
              status: 'completed',
              completedAt: Date.now(),
            }))
          } catch {}

          setMissionCompletedAlert({ title: `WEEKLY CHALLENGE: ${activeChallenge.title}`, coins: cCoins, xp: cXp })
          setTimeout(() => setMissionCompletedAlert(null), 9000)
        }
      }

      // ── Traverse Coins: 10 Coins per Kilometer (1,000m) ──────────────────
      const currentKm = Math.floor(totalDistM / 1000)
      if (currentKm > lastAwardedKm) {
        const kmDelta = currentKm - lastAwardedKm
        const payout = kmDelta * 10
        lastAwardedKm = currentKm
        const prevCoins = parseInt(localStorage.getItem('valles_coins') || '0')
        const updatedCoins = prevCoins + payout
        localStorage.setItem('valles_coins', String(updatedCoins))
        setCoins(updatedCoins)
        setNewMilestone({ label: `${currentKm} KM Mars Traverse`, coins: payout })
        setTimeout(() => setNewMilestone(null), 4500)
      }

      // Auto-save every 15s
      if (autoSave > 15) {
        autoSave = 0
        if (mode === 'free') {
          try {
            localStorage.setItem('valles_free_position', JSON.stringify({ x: playerPos.x, z: playerPos.z }))
            localStorage.setItem('valles_free_suit', JSON.stringify({ oxygen: o2, battery: bat, radiation: rad }))
          } catch {}
        }
        localStorage.setItem('valles_total_dist_m', String(totalDistM))
      }

      // ── Realistic Mode: advance conditions time series ───────────────────────
      if (realisticConditions?.conditions?.length) {
        realisticTimerRef.current += dt
        if (realisticTimerRef.current >= 60) {  // advance 1 Martian minute every real 60s
          realisticTimerRef.current = 0
          const nextIdx = Math.min(realisticIdxRef.current + 1, realisticConditions.conditions.length - 1)
          realisticIdxRef.current = nextIdx
          const cond = realisticConditions.conditions[nextIdx]
          setRealisticHud(cond)
          // Live fog update: more dust = denser fog
          const newDensity = Math.min(0.025, 0.002 + cond.dust_opacity * 0.004)
          if (fogRef) fogRef.density = newDensity
        }
      }

      // HUD Sync
      const altitude = playerPos.y - noiseH(playerPos.x, playerPos.z)
      const warning = o2 < 12 ? 'CRITICAL O₂ EXHAUSTION IMMINENT — SUIT PRESSURE DROPPING!'
        : o2 < 25 ? 'WARNING: LOW OXYGEN — RETURN TO BASE OR AIRLOCK'
        : bat < 10 ? 'CRITICAL BATTERY LEVEL!'
        : bat < 22 ? 'LOW BATTERY WARNING'
        : null

      setHud({
        oxygen: o2.toFixed(1),
        battery: bat.toFixed(1),
        radiation: rad.toFixed(3),
        speed: hs.toFixed(1),
        altitude: altitude.toFixed(1),
        coords: { x: playerPos.x.toFixed(0), z: playerPos.z.toFixed(0) },
        time: missionTime.toFixed(0),
        warning,
        flagsVisited: localVisited,
        sessionDist: sessionDistM,
        totalDist: totalDistM,
      })
      setMiniPos({ x: playerPos.x, z: playerPos.z, yaw: yawRef.current })

      renderer.render(scene, cam)
    }
    tick()

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('pointerlockchange', onPLC)
      document.removeEventListener('mousemove', onMM)
      document.removeEventListener('keydown', onKD)
      document.removeEventListener('keyup', onKU)
      if (document.pointerLockElement) document.exitPointerLock()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [mode, onExit, onOpenComms, activeMission, activeChallenge, realisticConditions])

  // Respawn from Oxygen Depletion at Base Camp
  const handleRescueRespawn = () => {
    isDeadRef.current = false
    setIsSuffocating(false)
    const cam = cameraRef.current
    if (cam) {
      cam.position.set(HABITAT_POS.x + 8, PLAYER_HEIGHT + HABITAT_BASE_Y, HABITAT_POS.z + 8)
    }
    rechargeSuitRef.current?.()
    try {
      localStorage.setItem('valles_free_position', JSON.stringify({ x: HABITAT_POS.x + 8, z: HABITAT_POS.z + 8 }))
      localStorage.setItem('valles_free_suit', JSON.stringify({ oxygen: 100, battery: 100, radiation: 0 }))
    } catch {}
  }

  const o2Num = parseFloat(hud.oxygen)
  const o2Color = o2Num > 50 ? '#2ecc71' : o2Num > 25 ? '#f39c12' : '#ff3b3b'
  const batNum = parseFloat(hud.battery)
  const batColor = batNum > 50 ? '#5ee6f5' : batNum > 25 ? '#f39c12' : '#ff3b3b'

  const fmtDist = (m) => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const modeLabel = mode === 'free' ? 'JEZERO FREE ROAM' : mode === 'realistic' ? 'REALISTIC MODE · REMS' : 'MISSION OBJECTIVES'
  const modeColor = mode === 'free' ? '#5ee6f5' : mode === 'realistic' ? '#2ecc71' : '#ff7d2e'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none', background: '#050200' }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ── HUD OVERLAY CONTAINER (Clean, Responsive, Zero Overlaps) ───────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 20px',
      }}>
        {/* ── TOP BAR: Mode, Coordinates, Coins, Camera Toggle & Actions ────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          {/* Mode & Objective */}
          <div style={{
            background: 'rgba(5,2,0,0.85)', backdropFilter: 'blur(16px)',
            border: `1px solid ${modeColor}50`, borderRadius: 12, padding: '10px 16px',
            display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180,
          }}>
            <div style={{ color: modeColor, fontSize: 9, letterSpacing: '0.14em', fontWeight: 800 }}>◉ {modeLabel}</div>
            <div style={{ color: '#ffb380', fontSize: 12, fontWeight: 700 }}>
              {activeMission?.title || activeChallenge?.title || 'JEZERO CRATER EVA'}
            </div>
            <div style={{ color: 'rgba(240,237,232,0.45)', fontSize: 9 }}>EVA TIME: {fmtTime(hud.time)}</div>
          </div>

          {/* Coordinates & Traversed Distance */}
          <div style={{
            background: 'rgba(5,2,0,0.85)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,125,46,0.3)', borderRadius: 12,
            padding: '10px 18px', textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,125,46,0.7)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 2 }}>TRAVERSED · BOUNTY</div>
            <div style={{ color: '#f5c842', fontSize: 13, fontWeight: 800 }}>
              {fmtDist(hud.totalDist || 0)} · <span style={{ color: '#ffb380' }}>🪙 {coins.toLocaleString()}</span>
            </div>
            <div style={{ color: 'rgba(240,237,232,0.4)', fontSize: 9, marginTop: 2 }}>
              X: {hud.coords.x} · Z: {hud.coords.z} · ALT: {hud.altitude}m
            </div>
          </div>

          {/* Action Buttons: Camera View Toggle, Earth Comms, Exit */}
          <div style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
            {/* Camera View Switcher (Requirement 7) */}
            <button
              onClick={toggleCameraMode}
              title="Toggle between First-Person and Third-Person View (Key: V)"
              style={{
                background: cameraMode === 'third_person' ? 'rgba(245,200,66,0.22)' : 'rgba(94,230,245,0.18)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${cameraMode === 'third_person' ? '#f5c842' : '#5ee6f5'}`,
                borderRadius: 10,
                color: cameraMode === 'third_person' ? '#f5c842' : '#5ee6f5',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.08em', padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800,
                transition: 'all 0.2s',
              }}
            >
              📷 VIEW: {cameraMode === 'first_person' ? '1ST PERSON' : '3RD PERSON'} <span style={{ fontSize: 8, opacity: 0.7 }}>[V]</span>
            </button>

            {/* Earth Comms Button */}
            <button
              onClick={() => {
                if (document.pointerLockElement) document.exitPointerLock()
                onOpenComms?.()
              }}
              title="Open Earth Communications (Key: C)"
              style={{
                background: 'rgba(94,230,245,0.15)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(94,230,245,0.45)', borderRadius: 10,
                color: '#5ee6f5', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.08em', padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700,
              }}
            >
              📡 COMMS <span style={{ fontSize: 8, opacity: 0.7 }}>[C]</span>
            </button>

            {/* Exit Button */}
            <button
              onClick={() => {
                if (document.pointerLockElement) document.exitPointerLock()
                onExit()
              }}
              title="Exit Exploration (Key: TAB)"
              style={{
                background: 'rgba(5,2,0,0.85)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,59,59,0.45)', borderRadius: 10,
                color: '#ff6b6b', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.08em', padding: '10px 14px', cursor: 'pointer',
              }}
            >
              ✕ EXIT <span style={{ fontSize: 8, opacity: 0.6 }}>[TAB]</span>
            </button>
          </div>
        </div>

        {/* ── ALERTS & NOTIFICATIONS (Centered, non-overlapping) ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: 'auto 0' }}>
          {/* Near Habitat Airlock Recharge Prompt */}
          {nearHabitat && (
            <div
              onClick={() => rechargeSuitRef.current?.()}
              style={{
                background: 'rgba(46,204,113,0.22)', border: '1px solid rgba(46,204,113,0.7)',
                borderRadius: 12, padding: '11px 26px', color: '#2ecc71',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
                pointerEvents: 'all', cursor: 'pointer', backdropFilter: 'blur(14px)',
                boxShadow: '0 0 28px rgba(46,204,113,0.35)',
              }}
            >
              ⚡ [E] PRESS TO RECHARGE SUIT & REFILL O₂ AT HABITAT AIRLOCK
            </div>
          )}

          {/* Recharge Alert Banner */}
          {rechargeAlert && (
            <div style={{
              background: 'rgba(46,204,113,0.25)', border: '1px solid #2ecc71',
              borderRadius: 10, padding: '10px 24px', color: '#2ecc71',
              fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
              animation: 'fadeInUp 0.3s ease',
            }}>
              ✓ SUIT RECHARGED: OXYGEN 100% · BATTERY 100% · RADIATION CLEARED
            </div>
          )}

          {/* Warning Banner */}
          {hud.warning && (
            <div style={{
              background: 'rgba(255,40,40,0.25)', border: '1px solid rgba(255,40,40,0.8)',
              borderRadius: 8, padding: '9px 24px',
              color: '#ff3030', fontSize: 13, letterSpacing: '0.12em', fontWeight: 800,
              animation: 'pulse 0.8s ease-in-out infinite',
            }}>
              ⚠ {hud.warning}
            </div>
          )}

          {/* Distance Milestone Popup (Requirement 5) */}
          {newMilestone && (
            <div style={{
              background: 'rgba(245,200,66,0.22)', border: '1px solid #f5c842',
              borderRadius: 12, padding: '12px 28px',
              color: '#f5c842', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
              boxShadow: '0 0 30px rgba(245,200,66,0.3)',
              animation: 'fadeInUp 0.3s ease',
            }}>
              🏅 {newMilestone.label}! +{newMilestone.coins} 🪙 COINS EARNED (+10/km)!
            </div>
          )}

          {/* Mission Completion Alert */}
          {missionCompletedAlert && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,200,66,0.25), rgba(46,204,113,0.25))',
              border: '2px solid #f5c842', borderRadius: 14, padding: '16px 32px',
              textAlign: 'center', backdropFilter: 'blur(16px)',
              boxShadow: '0 0 35px rgba(245,200,66,0.4)',
              animation: 'fadeInUp 0.4s ease',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🏆 MISSION ACCOMPLISHED!</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#f5c842', marginBottom: 6 }}>
                {missionCompletedAlert.title}
              </div>
              <div style={{ fontSize: 13, color: '#fff' }}>
                +{missionCompletedAlert.xp} XP · +{missionCompletedAlert.coins} 🪙 COINS CREDITED
              </div>
            </div>
          )}
        </div>


        {/* ── REALISTIC MODE: REMS CONDITIONS HUD ──────────────────────────── */}
        {mode === 'realistic' && realisticHud && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8,
            background: 'rgba(5,2,0,0.82)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(46,204,113,0.3)', borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: '#2ecc71', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontWeight: 800 }}>
                {'\u25c9'} REMS CONDITIONS {'\u00b7'} {realisticConditions?.scenario?.season?.toUpperCase()} {'\u00b7'} LST {String(Math.floor(realisticHud.lst_hour)).padStart(2,'0')}:{String(Math.round((realisticHud.lst_hour % 1) * 60)).padStart(2,'0')}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(46,204,113,0.5)', fontFamily: 'var(--font-mono)' }}>GALE CRATER {'\u00b7'} REMS MODRDR</span>
            </div>
            {[
              { label: 'AIR TEMP',  val: realisticHud.air_temp_c + '\u00b0C',    color: '#5ee6f5', tip: realisticHud.source_notes?.air_temp },
              { label: 'GND TEMP',  val: realisticHud.ground_temp_c + '\u00b0C', color: '#ff7d2e', tip: realisticHud.source_notes?.ground_temp },
              { label: 'PRESSURE',  val: realisticHud.pressure_pa + ' Pa',       color: '#f5c842', tip: realisticHud.source_notes?.pressure },
              { label: 'UV',        val: realisticHud.uv_wm2 + ' W/m\u00b2',    color: '#ff3b3b', tip: realisticHud.source_notes?.uv },
              { label: 'WIND',      val: realisticHud.wind_ms + ' m/s',          color: '#b388ff', tip: realisticHud.source_notes?.wind },
              { label: 'DUST \u03c4', val: String(realisticHud.dust_opacity),    color: '#ff9d3d', tip: realisticHud.source_notes?.dust },
              { label: 'RAD',       val: realisticHud.radiation_mgy_day + ' mGy/d', color: '#f05aff', tip: realisticHud.source_notes?.radiation },
            ].map(({ label, val, color, tip }) => (
              <div key={label} title={tip || ''} style={{
                background: color + '12', border: `1px solid ${color}30`,
                borderRadius: 8, padding: '5px 10px', cursor: tip ? 'help' : 'default',
              }}>
                <div style={{ fontSize: 8, color: color + 'aa', fontFamily: 'var(--font-mono)', marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{val}</div>
              </div>
            ))}
          </div>
        )}
        {/* ── BOTTOM ROW: SUIT TELEMETRY, RADAR, SPEED & CONTROLS GUIDE ────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          {/* Suit Telemetry Card */}
          <div style={{
            background: 'rgba(5,2,0,0.88)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,125,46,0.25)', borderRadius: 13,
            padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220,
          }}>
            <div style={{ color: 'rgba(255,125,46,0.7)', fontSize: 9, letterSpacing: '0.12em' }}>
              xEMU SUIT TELEMETRY · {mode === 'mission' ? 'TRAINING EVA' : 'SURFACE EVA'}
            </div>

            {/* O2 Level */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: o2Color, fontSize: 9, letterSpacing: '0.08em', fontWeight: 700 }}>O₂ OXYGEN (PLSS)</span>
                <span style={{ color: o2Color, fontSize: 11, fontWeight: 800 }}>{hud.oxygen}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${hud.oxygen}%`, borderRadius: 4, background: `linear-gradient(90deg, #1a5577, ${o2Color})`, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Battery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: batColor, fontSize: 9, letterSpacing: '0.08em', fontWeight: 700 }}>SUIT BATTERY</span>
                <span style={{ color: batColor, fontSize: 11, fontWeight: 800 }}>{hud.battery}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${hud.battery}%`, borderRadius: 4, background: `linear-gradient(90deg, #7a5f00, ${batColor})`, transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Radiation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#f05aff', fontSize: 9, letterSpacing: '0.08em', fontWeight: 700 }}>GCR RADIATION</span>
                <span style={{ color: '#f05aff', fontSize: 11, fontWeight: 800 }}>{hud.radiation} mSv</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${Math.min(100, parseFloat(hud.radiation) * 60)}%`, borderRadius: 4, background: 'linear-gradient(90deg, #6b0088, #f05aff)', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>

          {/* Jezero Mini-Map Radar */}
          <div style={{
            background: 'rgba(5,2,0,0.85)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,125,46,0.3)', borderRadius: '50%',
            padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 0 24px rgba(255,125,46,0.15)',
          }}>
            <MiniMap
              playerX={miniPos.x}
              playerZ={miniPos.z}
              yaw={miniPos.yaw}
              visitedFlags={hud.flagsVisited || []}
              activeObjective={activeMission?.title || activeChallenge?.title}
            />
            <div style={{ fontSize: 8, color: 'rgba(255,125,46,0.6)', letterSpacing: '0.1em', marginTop: 4 }}>
              JEZERO RADAR
            </div>
          </div>

          {/* Speed Card & Controls Legend (Neatly aligned on right, no overlapping button!) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <div style={{
              background: 'rgba(5,2,0,0.85)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,125,46,0.22)', borderRadius: 10,
              padding: '8px 14px', textAlign: 'center',
            }}>
              <div style={{ color: 'rgba(255,125,46,0.6)', fontSize: 8, letterSpacing: '0.1em' }}>TRAVERSE SPEED</div>
              <div style={{ color: '#ff7d2e', fontSize: 20, fontWeight: 800 }}>{hud.speed} <span style={{ fontSize: 9, opacity: 0.6 }}>m/s</span></div>
            </div>

            <div style={{
              background: 'rgba(5,2,0,0.88)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
              padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ color: 'rgba(255,125,46,0.7)', fontSize: 8, letterSpacing: '0.1em', marginBottom: 2 }}>CONTROLS GUIDE</div>
              {[
                ['WASD', 'Traverse'],
                ['SHIFT', 'Sprint (fast O₂)'],
                ['SPACE', 'Low-G Jump'],
                ['V', 'Toggle 1st/3rd View'],
                ['C', 'Earth Comms'],
                ['E', 'Recharge at Hab'],
                ['TAB', 'Exit EVA'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '1px 5px', fontSize: 8, color: '#ffb380', fontWeight: 800 }}>{k}</span>
                  <span style={{ color: 'rgba(240,237,232,0.5)', fontSize: 8 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EMERGENCY OXYGEN DEPLETION MODAL ───────────────────────────────── */}
      {isSuffocating && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(25, 4, 2, 0.94)', backdropFilter: 'blur(18px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            maxWidth: 500, background: 'rgba(11, 13, 18, 0.96)', border: '2px solid #ff3b3b',
            borderRadius: 20, padding: '32px 28px', textAlign: 'center',
            boxShadow: '0 0 50px rgba(255, 59, 59, 0.4)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🚨</div>
            <h2 style={{ color: '#ff4a4a', fontSize: 21, fontWeight: 900, marginBottom: 8 }}>
              EVA EMERGENCY ABORT PROTOCOL
            </h2>
            <div style={{
              background: 'rgba(255,59,59,0.12)', border: '1px solid rgba(255,59,59,0.3)',
              borderRadius: 8, padding: '6px 14px', color: '#ff8080', fontSize: 11,
              fontFamily: 'var(--font-mono)', display: 'inline-block', marginBottom: 16,
            }}>
              SUIT LIFE SUPPORT EXHAUSTION DETECTED
            </div>
            <p style={{ color: 'rgba(240,237,232,0.7)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Telemetry confirmed oxygen starvation on the Martian surface. Your suit emergency beacon alerted Jezero Base Camp.
              Robotic retrieval recovered you safely to the pressurized Base Habitat airlock.
            </p>
            <div style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
              ✓ Oxygen and Battery replenished to 100% · Radiation cleared
            </div>
            <button
              onClick={handleRescueRespawn}
              style={{
                background: 'linear-gradient(135deg, rgba(200,74,0,0.9), rgba(255,125,46,0.9))',
                border: 'none', borderRadius: 12, padding: '13px 26px', color: '#fff',
                fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)',
                cursor: 'pointer', letterSpacing: '0.06em',
                boxShadow: '0 4px 20px rgba(255,125,46,0.4)',
              }}
            >
              🔄 RESUME EVA AT BASE CAMP
            </button>
          </div>
        </div>
      )}

      {/* ── CLICK TO LOCK POINTER OVERLAY ──────────────────────────────────── */}
      {!locked && !isSuffocating && (
        <div
          onClick={() => mountRef.current?.querySelector('canvas')?.requestPointerLock()}
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,2,0,0.78)', backdropFilter: 'blur(8px)', cursor: 'pointer',
          }}
        >
          <div style={{
            border: `1px solid ${modeColor}55`, borderRadius: 20,
            padding: '36px 48px', textAlign: 'center', background: 'rgba(11,13,18,0.80)',
            boxShadow: `0 0 40px ${modeColor}22`, maxWidth: 520,
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>{mode === 'free' ? '🌍' : '🎯'}</div>
            <div style={{ color: modeColor, fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              {mode === 'free' ? 'MARS 3D EXPLORATION' : 'EVA MISSION MODE'}
            </div>
            {activeMission && <div style={{ color: '#ffb380', fontSize: 12, marginBottom: 4 }}>Mission: {activeMission.title}</div>}
            {activeChallenge && <div style={{ color: '#f5c842', fontSize: 12, marginBottom: 4 }}>Challenge: {activeChallenge.title}</div>}
            <div style={{ color: 'rgba(240,237,232,0.5)', fontSize: 13, marginBottom: 16 }}>
              Click anywhere to lock pointer and enter 3D Mars EVA
            </div>

            <div style={{
              background: 'rgba(255,125,46,0.1)', border: '1px solid rgba(255,125,46,0.25)',
              borderRadius: 10, padding: '10px 16px', fontSize: 11, color: '#ffb380', marginBottom: 16, textAlign: 'left',
            }}>
              <div>• 📷 <strong>1st & 3rd Person Views:</strong> Press [V] to toggle camera and see your Martian suit in 3D!</div>
              <div>• 💨 <strong>Realistic O₂ Limits:</strong> Oxygen drains in real-time. Recharge at Base Camp airlock!</div>
              <div>• 🪙 <strong>Bounties:</strong> 10 coins awarded per 1 kilometer completed (5 km = 50 coins)!</div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11, color: modeColor + 'cc' }}>
              {[
                ['WASD', 'Move'],
                ['Shift', 'Sprint'],
                ['Space', 'Jump'],
                ['V', '1st/3rd View'],
                ['C', 'Comms'],
                ['Tab', 'Exit'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ background: modeColor + '20', border: `1px solid ${modeColor}50`, borderRadius: 6, padding: '3px 8px', fontWeight: 800 }}>{k}</div>
                  <div style={{ color: 'rgba(240,237,232,0.4)', fontSize: 8 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
