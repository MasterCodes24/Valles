import * as THREE from 'three'

/**
 * Procedurally creates a high-detail 3D Martian EVA Astronaut model
 * styled after the EVA suit in Ridley Scott's "The Martian" (Mark Watney / NASA xEMU).
 *
 * Features:
 * - High-tech composite pressure suit with procedural micro-weave & paneling textures
 * - Aerodynamic helmet with golden-amber reflective/semi-transparent visor
 * - Internal oxygen mask over the face with breathing tubes and interior visor HUD glow
 * - DCM (Display & Control Module) chest telemetry unit with illuminated live HUD and LEDs
 * - Dual-tank PLSS (Portable Life Support System) backpack with high-gain antenna
 * - Left-arm wrist telemetry tactical radar display
 * - Articulated arms with wrist telemetry monitors and heavy EVA gloves
 * - Reinforced knee-pad trousers and planetary treaded EVA boots
 * - Dynamic suit re-skinning (setSuit: 'suit_base' | 'suit_advanced' | 'suit_radiation' | 'suit_elite' | 'suit_prototype')
 * - Built-in animation method: idle breathing, walking, sprinting, and jumping kinematics
 */

export const SUIT_THEMES = {
  suit_base: {
    name: 'Base EVA Suit',
    fabricBase: '#eeeeee',
    fabricWeave: 'rgba(160,160,160,0.2)',
    greyBase: '#24272c',
    accentGrad: ['#ff7028', '#ff6422', '#e85010'],
    accentScratch: 'rgba(255,210,160,0.12)',
    metalColor: 0xa0a8b0,
    visorColor: 0xecb236,
    visorRoughness: 0.07,
    visorMetalness: 0.92,
    visorTransmission: 0.28,
    led1: 0x2ecc71,
    led2: 0x4df2ff,
    led3: 0xff8533,
    innerVisorGlow: 0x5ee6f5,
  },
  suit_advanced: {
    name: 'Advanced Explorer Suit',
    fabricBase: '#e4ebf5',
    fabricWeave: 'rgba(80,140,200,0.22)',
    greyBase: '#15202e',
    accentGrad: ['#00e5ff', '#00b0ff', '#0077c2'],
    accentScratch: 'rgba(180,240,255,0.25)',
    metalColor: 0xb0c4de,
    visorColor: 0x40c4ff,
    visorRoughness: 0.05,
    visorMetalness: 0.95,
    visorTransmission: 0.25,
    led1: 0x00e5ff,
    led2: 0x4df2ff,
    led3: 0x2979ff,
    innerVisorGlow: 0x00e5ff,
  },
  suit_radiation: {
    name: 'Rad-Guard Suit',
    fabricBase: '#2a2c30',
    fabricWeave: 'rgba(20,20,25,0.4)',
    greyBase: '#16181b',
    accentGrad: ['#ffb300', '#f57f17', '#ff8f00'],
    accentScratch: 'rgba(255,238,88,0.25)',
    metalColor: 0xd4af37,
    visorColor: 0xffb300,
    visorRoughness: 0.10,
    visorMetalness: 0.96,
    visorTransmission: 0.20,
    led1: 0xffd600,
    led2: 0xff9100,
    led3: 0xff3d00,
    innerVisorGlow: 0xffab00,
  },
  suit_elite: {
    name: 'Elite Command Suit',
    fabricBase: '#16171a',
    fabricWeave: 'rgba(40,40,45,0.35)',
    greyBase: '#0d0e10',
    accentGrad: ['#ff1744', '#d50000', '#b71c1c'],
    accentScratch: 'rgba(255,138,128,0.2)',
    metalColor: 0x8a9ba8,
    visorColor: 0x9b111e,
    visorRoughness: 0.06,
    visorMetalness: 0.94,
    visorTransmission: 0.22,
    led1: 0xff1744,
    led2: 0x00e676,
    led3: 0xffab00,
    innerVisorGlow: 0xff1744,
  },
  suit_prototype: {
    name: 'Prototype Quantum Suit',
    fabricBase: '#dce1e9',
    fabricWeave: 'rgba(150,120,200,0.25)',
    greyBase: '#1d152b',
    accentGrad: ['#b388ff', '#7c4dff', '#651fff'],
    accentScratch: 'rgba(209,196,233,0.3)',
    metalColor: 0x80d8ff,
    visorColor: 0x7c4dff,
    visorRoughness: 0.04,
    visorMetalness: 0.98,
    visorTransmission: 0.30,
    led1: 0x7c4dff,
    led2: 0x00e5ff,
    led3: 0xff4081,
    innerVisorGlow: 0xb388ff,
  },
}

export function createMartianAstronautModel({ suitId = 'suit_base', castShadow = true, receiveShadow = true } = {}) {
  const root = new THREE.Group()

  // ── Procedural Texture Helpers ────────────────────────────────────────────
  function makeCanvasTexture(w, h, drawFn) {
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    drawFn(ctx, w, h)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }

  function createFabricTexture(fabricBase, fabricWeave) {
    const tex = makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = fabricBase
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const v = Math.floor(Math.sin(x * 0.7 + y * 0.9) * 8 + Math.cos(x * 1.3) * 4)
          ctx.fillStyle = `rgba(255,255,255,${0.04 + (v > 0 ? 0.03 : 0)})`
          ctx.fillRect(x, y, 2, 2)
        }
      }
      ctx.strokeStyle = fabricWeave
      ctx.lineWidth = 0.8
      for (let i = 0; i < w; i += 8) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke()
      }
      for (let j = 0; j < h; j += 8) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke()
      }
    })
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 3)
    return tex
  }

  function createAccentTexture(accentGrad, accentScratch) {
    return makeCanvasTexture(128, 128, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0,   accentGrad[0])
      grad.addColorStop(0.5, accentGrad[1])
      grad.addColorStop(1,   accentGrad[2])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = accentScratch
      ctx.lineWidth = 1
      for (let i = 0; i < 10; i++) {
        const rx = Math.floor(Math.sin(i * 73.1) * w * 0.5 + w * 0.5)
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 4, h); ctx.stroke()
      }
    })
  }

  // Charcoal panel texture — riveted structural panels
  const greyPanelTex = makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#24272c'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(90,100,112,0.35)'
    ctx.lineWidth = 1
    for (let i = 16; i < w; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke()
    }
    for (let j = 16; j < h; j += 16) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(70,80,92,0.75)'
    for (let ry = 8; ry < h; ry += 16) {
      for (let rx = 8; rx < w; rx += 16) {
        ctx.beginPath(); ctx.arc(rx, ry, 1.5, 0, Math.PI * 2); ctx.fill()
      }
    }
  })

  // Boot tread sole texture — Mars regolith-grip pattern
  const bootTex = makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#16181c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#202428'
    for (let ry = 0; ry < h; ry += 10) {
      const offset = (Math.floor(ry / 10) % 2) * 5
      for (let rx = offset; rx < w; rx += 10) {
        ctx.fillRect(rx, ry, 7, 7)
      }
    }
  })
  bootTex.wrapS = bootTex.wrapT = THREE.RepeatWrapping

  // Mission Insignia Patch (Valles Expedition EVA-01)
  const patchTex = makeCanvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#ff7028'
    ctx.lineWidth = 3
    ctx.strokeRect(2, 2, w - 4, h - 4)
    // Red Mars disc
    ctx.fillStyle = '#d94819'
    ctx.beginPath()
    ctx.arc(32, 32, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText('VALLES', 54, 26)
    ctx.font = 'bold 10px monospace'
    ctx.fillStyle = '#5ee6f5'
    ctx.fillText('EVA-01', 54, 44)
  })

  // Chest DCM Display screen texture with live biometric waveforms
  const dcmScreenTex = makeCanvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#051419'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#4df2ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(4, 34)
    ctx.lineTo(24, 34)
    ctx.lineTo(34, 14)
    ctx.lineTo(44, 52)
    ctx.lineTo(54, 28)
    ctx.lineTo(64, 38)
    ctx.lineTo(74, 34)
    ctx.lineTo(124, 34)
    ctx.stroke()
    ctx.fillStyle = '#2ecc71'
    ctx.font = 'bold 9px monospace'
    ctx.fillText('O2: 100%', 6, 14)
    ctx.fillStyle = '#f5c842'
    ctx.fillText('BAT: 100%', 70, 14)
  })

  // Forearm Tactical Radar Screen
  const wristScreenTex = makeCanvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#05121b'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#5ee6f5'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(32, 32, 26, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(32, 32, 16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#ff7028'
    ctx.beginPath()
    ctx.arc(32, 32, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(94, 230, 245, 0.4)'
    ctx.beginPath()
    ctx.moveTo(32, 6); ctx.lineTo(32, 58)
    ctx.moveTo(6, 32); ctx.lineTo(58, 32)
    ctx.stroke()
  })

  // Initial theme
  const initialTheme = SUIT_THEMES[suitId] || SUIT_THEMES.suit_base

  // ── Materials ─────────────────────────────────────────────────────────────
  const suitWhiteMat = new THREE.MeshStandardMaterial({
    map: createFabricTexture(initialTheme.fabricBase, initialTheme.fabricWeave),
    color: 0xffffff,
    roughness: 0.50,
    metalness: 0.08,
  })

  const suitGreyMat = new THREE.MeshStandardMaterial({
    map: greyPanelTex,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.22,
  })

  const suitOrangeMat = new THREE.MeshStandardMaterial({
    map: createAccentTexture(initialTheme.accentGrad, initialTheme.accentScratch),
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.10,
  })

  const metalMat = new THREE.MeshStandardMaterial({
    color: initialTheme.metalColor,
    roughness: 0.16,
    metalness: 0.94,
    envMapIntensity: 1.3,
  })

  const darkMetalMat = new THREE.MeshStandardMaterial({
    map: bootTex,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.58,
  })

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: initialTheme.visorColor,
    metalness: initialTheme.visorMetalness,
    roughness: initialTheme.visorRoughness,
    transmission: initialTheme.visorTransmission,
    transparent: true,
    opacity: 0.90,
    reflectivity: 0.98,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.6,
  })

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd89d7a,
    roughness: 0.62,
    metalness: 0.0,
  })
  const maskMat = new THREE.MeshStandardMaterial({
    color: 0x30353d,
    roughness: 0.42,
    metalness: 0.38,
  })
  const maskStrapMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d20,
    roughness: 0.85,
  })
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0x4a7a96,
    roughness: 0.32,
    metalness: 0.42,
  })

  // DCM Display & Radar Materials
  const dcmScreenMat = new THREE.MeshBasicMaterial({ map: dcmScreenTex })
  const patchMat = new THREE.MeshBasicMaterial({ map: patchTex })
  const wristScreenMat = new THREE.MeshBasicMaterial({ map: wristScreenTex })

  // Illuminated DCM LEDs and helmet lights
  const ledCyanMat = new THREE.MeshBasicMaterial({ color: initialTheme.led1 })
  const ledGreenMat = new THREE.MeshBasicMaterial({ color: initialTheme.led2 })
  const ledOrangeMat = new THREE.MeshBasicMaterial({ color: initialTheme.led3 })

  // ── Central Body Pivot (Centered at ground origin) ────────────────────────
  const body = new THREE.Group()
  root.add(body)

  // ── Pelvis & Utility Harness (y: ~0.95m) ──────────────────────────────────
  const pelvisGroup = new THREE.Group()
  pelvisGroup.position.set(0, 0.95, 0)
  body.add(pelvisGroup)

  const pelvisGeo = new THREE.BoxGeometry(0.38, 0.22, 0.26)
  const pelvisMesh = new THREE.Mesh(pelvisGeo, suitGreyMat)
  pelvisGroup.add(pelvisMesh)

  // Utility belt & buckle
  const beltGeo = new THREE.BoxGeometry(0.40, 0.07, 0.28)
  const beltMesh = new THREE.Mesh(beltGeo, suitOrangeMat)
  pelvisGroup.add(beltMesh)

  const buckleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.29)
  const buckleMesh = new THREE.Mesh(buckleGeo, metalMat)
  pelvisGroup.add(buckleMesh)

  // Equipment pouches on hips
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.14), suitGreyMat)
  pouchL.position.set(-0.21, -0.02, 0)
  pelvisGroup.add(pouchL)

  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.14), suitGreyMat)
  pouchR.position.set(0.21, -0.02, 0)
  pelvisGroup.add(pouchR)

  // ── Torso (y: 1.05 to 1.50) ───────────────────────────────────────────────
  const torsoGroup = new THREE.Group()
  torsoGroup.position.set(0, 1.05, 0)
  body.add(torsoGroup)

  // Upper chest & abdomen
  const abdomenGeo = new THREE.BoxGeometry(0.40, 0.22, 0.26)
  const abdomen = new THREE.Mesh(abdomenGeo, suitWhiteMat)
  abdomen.position.set(0, 0.11, 0)
  torsoGroup.add(abdomen)

  const chestGeo = new THREE.BoxGeometry(0.46, 0.30, 0.30)
  const chest = new THREE.Mesh(chestGeo, suitWhiteMat)
  chest.position.set(0, 0.34, 0)
  torsoGroup.add(chest)

  // Orange shoulder/chest safety harness stripes
  const harnessL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.31), suitOrangeMat)
  harnessL.position.set(-0.14, 0.34, 0)
  torsoGroup.add(harnessL)

  const harnessR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.31), suitOrangeMat)
  harnessR.position.set(0.14, 0.34, 0)
  torsoGroup.add(harnessR)

  // Charcoal rib protector side pads
  const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.28), suitGreyMat)
  ribL.position.set(-0.23, 0.32, 0)
  torsoGroup.add(ribL)

  const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.28), suitGreyMat)
  ribR.position.set(0.23, 0.32, 0)
  torsoGroup.add(ribR)

  // NASA Mission Patch on upper right chest
  const patchGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02)
  const patch = new THREE.Mesh(patchGeo, patchMat)
  patch.position.set(0.13, 0.40, 0.155)
  torsoGroup.add(patch)

  // ── DCM (Display and Control Module) on front of chest ───────────────────
  const dcmGroup = new THREE.Group()
  dcmGroup.position.set(0, 0.30, 0.17)
  torsoGroup.add(dcmGroup)

  const dcmBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.06), suitGreyMat)
  dcmGroup.add(dcmBox)

  // DCM Digital Telemetry Display screen
  const dcmScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.01), dcmScreenMat)
  dcmScreen.position.set(0, 0.025, 0.031)
  dcmGroup.add(dcmScreen)

  // Telemetry status LEDs (O2, Power, Comms)
  const led1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.01), ledGreenMat)
  led1.position.set(-0.05, 0.025, 0.038)
  dcmGroup.add(led1)

  const led2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.01), ledCyanMat)
  led2.position.set(0, 0.025, 0.038)
  dcmGroup.add(led2)

  const led3 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.01), ledOrangeMat)
  led3.position.set(0.05, 0.025, 0.038)
  dcmGroup.add(led3)

  // Rotary valves on DCM
  const valve1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), metalMat)
  valve1.rotation.x = Math.PI / 2
  valve1.position.set(-0.06, -0.045, 0.032)
  dcmGroup.add(valve1)

  const valve2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), suitOrangeMat)
  valve2.rotation.x = Math.PI / 2
  valve2.position.set(0.06, -0.045, 0.032)
  dcmGroup.add(valve2)

  // ── PLSS (Portable Life Support System) Backpack ───────────────────────────
  const plssGroup = new THREE.Group()
  plssGroup.position.set(0, 0.32, -0.22)
  torsoGroup.add(plssGroup)

  const plssMain = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.18), suitWhiteMat)
  plssGroup.add(plssMain)

  // Dual Oxygen Pressure Cylinders
  const o2TankL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.44, 16), suitWhiteMat)
  o2TankL.position.set(-0.12, 0.02, -0.08)
  plssGroup.add(o2TankL)

  const o2TankR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.44, 16), suitWhiteMat)
  o2TankR.position.set(0.12, 0.02, -0.08)
  plssGroup.add(o2TankR)

  // Metallic tank valve caps
  const capL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), metalMat)
  capL.position.set(-0.12, 0.24, -0.08)
  plssGroup.add(capL)

  const capR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), metalMat)
  capR.position.set(0.12, 0.24, -0.08)
  plssGroup.add(capR)

  // Sublimator heat exchanger radiator grill (top of pack)
  const radGrill = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.14), darkMetalMat)
  radGrill.position.set(0, 0.28, 0)
  plssGroup.add(radGrill)

  // Telemetry Whip Antenna
  const plssAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), metalMat)
  plssAntenna.position.set(0.17, 0.45, -0.05)
  plssGroup.add(plssAntenna)

  // Emergency safety beacon on top of antenna
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), ledCyanMat)
  beacon.position.set(0.17, 0.66, -0.05)
  plssGroup.add(beacon)

  // ── Neck Ring & Martian Helmet (y: 1.50 to 1.85) ──────────────────────────
  const headGroup = new THREE.Group()
  headGroup.position.set(0, 0.54, 0)
  torsoGroup.add(headGroup)

  // Metallic Neck Locking Ring (Martian suit helmet disconnect collar)
  const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.175, 0.06, 24), metalMat)
  neckRing.position.set(0, 0.02, 0)
  headGroup.add(neckRing)

  // Outer Helmet Shell (Aerodynamic spherical bubble)
  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 20), suitWhiteMat)
  helmetShell.position.set(0, 0.20, -0.01)
  helmetShell.scale.set(1.0, 1.05, 1.05)
  headGroup.add(helmetShell)

  // Helmet side lights / NavCams (like The Martian helmet spot lights)
  const spotL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.07), suitGreyMat)
  spotL.position.set(-0.21, 0.22, 0.06)
  headGroup.add(spotL)
  const spotBulbL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledCyanMat)
  spotBulbL.position.set(-0.21, 0.22, 0.095)
  headGroup.add(spotBulbL)

  const spotR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.07), suitGreyMat)
  spotR.position.set(0.21, 0.22, 0.06)
  headGroup.add(spotR)
  const spotBulbR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledCyanMat)
  spotBulbR.position.set(0.21, 0.22, 0.095)
  headGroup.add(spotBulbR)

  // ── Interior Face & Oxygen Mask (Visible through Visor) ───────────────────
  const faceGroup = new THREE.Group()
  faceGroup.position.set(0, 0.19, 0.02)
  headGroup.add(faceGroup)

  // Commander Head & Forehead
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat)
  headMesh.scale.set(0.9, 1.05, 0.95)
  faceGroup.add(headMesh)

  // Communications Cap / Snoopy Cap (dark fabric covering head)
  const commCap = new THREE.Mesh(new THREE.SphereGeometry(0.133, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), maskStrapMat)
  faceGroup.add(commCap)

  // Oxygen Mask covering nose and mouth (Detailed Martian EVA rebreather mask)
  const oxyMask = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.09, 12), maskMat)
  oxyMask.rotation.x = -Math.PI / 2.3
  oxyMask.position.set(0, -0.03, 0.12)
  faceGroup.add(oxyMask)

  // Oxygen delivery tubes connecting mask to suit collar
  const oxyTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), tubeMat)
  oxyTubeL.rotation.z = 0.6
  oxyTubeL.rotation.x = 0.3
  oxyTubeL.position.set(-0.06, -0.09, 0.09)
  faceGroup.add(oxyTubeL)

  const oxyTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), tubeMat)
  oxyTubeR.rotation.z = -0.6
  oxyTubeR.rotation.x = 0.3
  oxyTubeR.position.set(0.06, -0.09, 0.09)
  faceGroup.add(oxyTubeR)

  // Interior Visor HUD Light (Soft sci-fi glow illuminating Commander's face)
  const innerVisorLight = new THREE.PointLight(0x5ee6f5, 0.6, 0.45)
  innerVisorLight.position.set(0, 0.22, 0.14)
  headGroup.add(innerVisorLight)

  // ── Martian Gold Reflective Visor (Curved Panoramic Shield) ───────────────
  const visorGeo = new THREE.SphereGeometry(0.205, 24, 20, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.12, Math.PI * 0.68)
  const visor = new THREE.Mesh(visorGeo, visorMat)
  visor.position.set(0, 0.20, 0.03)
  visor.scale.set(1.02, 1.05, 1.08)
  headGroup.add(visor)

  // ── Arms ──────────────────────────────────────────────────────────────────
  function buildArm(isLeft) {
    const armRoot = new THREE.Group()
    const sign = isLeft ? -1 : 1

    armRoot.position.set(sign * 0.27, 0.40, 0)

    // Shoulder articulation ring
    const shoulderRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 8, 16), suitOrangeMat)
    shoulderRing.rotation.y = Math.PI / 2
    armRoot.add(shoulderRing)

    // Upper Arm
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.28, 14), suitWhiteMat)
    upperArm.position.set(0, -0.14, 0)
    armRoot.add(upperArm)

    // Lateral Orange Armband
    const armBand = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.072, 0.06, 14), suitOrangeMat)
    armBand.position.set(0, -0.12, 0)
    armRoot.add(armBand)

    // Elbow Joint / Pad
    const elbow = new THREE.Group()
    elbow.position.set(0, -0.28, 0)
    armRoot.add(elbow)

    const elbowPad = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), suitGreyMat)
    elbow.add(elbowPad)

    // Forearm
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.24, 14), suitWhiteMat)
    forearm.position.set(0, -0.13, 0)
    elbow.add(forearm)

    // Wrist Telemetry Computer (on Left Wrist)
    if (isLeft) {
      const wristComp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.04), suitGreyMat)
      wristComp.position.set(0, -0.18, 0.05)
      elbow.add(wristComp)

      const wristScreen = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.01), wristScreenMat)
      wristScreen.position.set(0, -0.18, 0.072)
      elbow.add(wristScreen)
    }

    // Heavy EVA Glove with metallic palm grip
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), suitGreyMat)
    glove.position.set(0, -0.29, 0)
    elbow.add(glove)

    const fingerRing = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.03, 0.092), metalMat)
    fingerRing.position.set(0, -0.26, 0)
    elbow.add(fingerRing)

    return { root: armRoot, elbow }
  }

  const leftArm = buildArm(true)
  const rightArm = buildArm(false)
  torsoGroup.add(leftArm.root)
  torsoGroup.add(rightArm.root)

  // ── Legs ──────────────────────────────────────────────────────────────────
  function buildLeg(isLeft) {
    const legRoot = new THREE.Group()
    const sign = isLeft ? -1 : 1

    legRoot.position.set(sign * 0.14, 0.88, 0)

    // Thigh with lateral orange strip
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.40, 14), suitWhiteMat)
    thigh.position.set(0, -0.20, 0)
    legRoot.add(thigh)

    const thighStripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.17), suitOrangeMat)
    thighStripe.position.set(sign * 0.085, -0.20, 0)
    legRoot.add(thighStripe)

    // Knee Group
    const knee = new THREE.Group()
    knee.position.set(0, -0.40, 0)
    legRoot.add(knee)

    // Reinforced Knee Pad (facet armored for Martian kneeling)
    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.07), suitGreyMat)
    kneePad.position.set(0, 0, 0.06)
    knee.add(kneePad)

    // Shin / Lower Leg
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.38, 14), suitWhiteMat)
    shin.position.set(0, -0.19, 0)
    knee.add(shin)

    // Planetary EVA Boot (Heavy treaded sole)
    const bootGroup = new THREE.Group()
    bootGroup.position.set(0, -0.40, 0)
    knee.add(bootGroup)

    const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.22), suitGreyMat)
    bootUpper.position.set(0, 0.05, 0.03)
    bootGroup.add(bootUpper)

    const bootOrangeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.154, 0.04, 0.224), suitOrangeMat)
    bootOrangeTrim.position.set(0, 0.08, 0.03)
    bootGroup.add(bootOrangeTrim)

    // Deep-tread sole for Martian regolith traction
    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.26), darkMetalMat)
    bootSole.position.set(0, -0.02, 0.04)
    bootGroup.add(bootSole)

    return { root: legRoot, knee, boot: bootGroup }
  }

  const leftLeg = buildLeg(true)
  const rightLeg = buildLeg(false)
  body.add(leftLeg.root)
  body.add(rightLeg.root)

  // ── Shadow Casting / Receiving ────────────────────────────────────────────
  root.traverse(child => {
    if (child.isMesh) {
      child.castShadow = castShadow
      child.receiveShadow = receiveShadow
    }
  })

  // ── Kinematic Animation State Machine ─────────────────────────────────────
  let walkPhase = 0

  function update(delta, { isMoving = false, isSprinting = false, isJumping = false, speed = 0 } = {}) {
    // 1. Idle Breathing Motion
    const idleTime = performance.now() * 0.0018
    const breathOffset = Math.sin(idleTime) * 0.008
    chest.scale.set(1.0 + breathOffset * 1.5, 1.0 + breathOffset, 1.0 + breathOffset * 2.0)
    headGroup.position.y = 0.54 + Math.sin(idleTime * 0.8) * 0.004
    headGroup.rotation.y = Math.sin(idleTime * 0.5) * 0.04

    // Subtle beacon pulse
    beacon.scale.setScalar(0.9 + Math.sin(idleTime * 4) * 0.2)

    if (isJumping) {
      // Jumping / Low-G leap pose
      leftLeg.root.rotation.x = -0.35
      rightLeg.root.rotation.x = -0.45
      leftLeg.knee.rotation.x = 0.55
      rightLeg.knee.rotation.x = 0.70

      leftArm.root.rotation.x = -0.6
      rightArm.root.rotation.x = -0.6
      leftArm.root.rotation.z = -0.4
      rightArm.root.rotation.z = 0.4
      body.position.y = 0.1
      return
    }

    if (isMoving) {
      // Walking / Sprinting stride cycle
      const cycleSpeed = isSprinting ? 9.5 : 5.8
      walkPhase += delta * cycleSpeed

      const swing = Math.sin(walkPhase)
      const maxAngle = isSprinting ? 0.75 : 0.52

      // Legs swing in opposite phases
      leftLeg.root.rotation.x = swing * maxAngle
      rightLeg.root.rotation.x = -swing * maxAngle

      // Knees bend during back-swing for natural locomotion
      leftLeg.knee.rotation.x = Math.max(0, -swing * maxAngle * 1.2)
      rightLeg.knee.rotation.x = Math.max(0, swing * maxAngle * 1.2)

      // Arms counter-swing opposite to legs
      const armSwing = isSprinting ? 0.65 : 0.42
      leftArm.root.rotation.x = -swing * armSwing
      rightArm.root.rotation.x = swing * armSwing

      leftArm.elbow.rotation.x = -Math.abs(swing) * 0.3 - 0.2
      rightArm.elbow.rotation.x = -Math.abs(swing) * 0.3 - 0.2

      // Subtle pelvis sway & vertical step bounce
      pelvisGroup.rotation.y = -swing * 0.1
      torsoGroup.rotation.y = swing * 0.1
      body.position.y = Math.abs(Math.sin(walkPhase * 2)) * (isSprinting ? 0.06 : 0.035)
    } else {
      // Return smoothly to idle stance
      leftLeg.root.rotation.x *= 0.82
      rightLeg.root.rotation.x *= 0.82
      leftLeg.knee.rotation.x *= 0.82
      rightLeg.knee.rotation.x *= 0.82

      leftArm.root.rotation.x = THREE.MathUtils.lerp(leftArm.root.rotation.x, 0.08, 0.1)
      rightArm.root.rotation.x = THREE.MathUtils.lerp(rightArm.root.rotation.x, 0.08, 0.1)
      leftArm.root.rotation.z = THREE.MathUtils.lerp(leftArm.root.rotation.z, -0.06, 0.1)
      rightArm.root.rotation.z = THREE.MathUtils.lerp(rightArm.root.rotation.z, 0.06, 0.1)

      body.position.y = THREE.MathUtils.lerp(body.position.y, 0, 0.1)
      pelvisGroup.rotation.y *= 0.85
      torsoGroup.rotation.y *= 0.85
    }
  }

  // Dynamic Suit Re-Skinning (Allows trying on any suit in Inventory / Dashboard / Profile)
  function applySuitTheme(id) {
    const theme = SUIT_THEMES[id] || SUIT_THEMES.suit_base

    suitWhiteMat.map = createFabricTexture(theme.fabricBase, theme.fabricWeave)
    suitWhiteMat.needsUpdate = true

    suitOrangeMat.map = createAccentTexture(theme.accentGrad, theme.accentScratch)
    suitOrangeMat.needsUpdate = true

    metalMat.color.setHex(theme.metalColor)
    metalMat.needsUpdate = true

    visorMat.color.setHex(theme.visorColor)
    visorMat.roughness = theme.visorRoughness
    visorMat.metalness = theme.visorMetalness
    visorMat.transmission = theme.visorTransmission
    visorMat.needsUpdate = true

    ledCyanMat.color.setHex(theme.led1)
    ledGreenMat.color.setHex(theme.led2)
    ledOrangeMat.color.setHex(theme.led3)

    if (innerVisorLight) {
      innerVisorLight.color.setHex(theme.innerVisorGlow)
    }
  }

  return {
    root,
    body,
    head: headGroup,
    visor,
    innerVisorLight,
    torso: torsoGroup,
    leftArm: leftArm.root,
    rightArm: rightArm.root,
    leftLeg: leftLeg.root,
    rightLeg: rightLeg.root,
    update,
    setSuit: applySuitTheme,
  }
}
