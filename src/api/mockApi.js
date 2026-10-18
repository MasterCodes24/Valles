/**
 * VALLES — Mock Data & API Stubs
 * Member 2 builds against this interface.
 * All functions mirror the signatures Member 1 will implement.
 * Replace function bodies with real Supabase / engine calls when ready.
 */

// ─── Simulated latency helper ──────────────────────────────────────────────
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function register({ email, password, callsign }) {
  await delay(800)
  const user = { id: 'mock-uid-001', email, callsign, createdAt: new Date().toISOString() }
  return { user, error: null }
}

export async function login({ email, password }) {
  await delay(600)
  if (email === 'error@test.com') return { user: null, error: 'Invalid credentials' }
  const user = { id: 'mock-uid-001', email, callsign: 'ROVER-7', createdAt: '2025-01-01T00:00:00Z' }
  return { user, error: null }
}

export async function logout() {
  await delay(200)
  return { error: null }
}

// ─── Player State ──────────────────────────────────────────────────────────
/** getPlayerState(userId) → PlayerState */
export async function getPlayerState(userId) {
  await delay(400)
  return {
    userId,
    callsign: 'ROVER-7',
    level: 4,
    xp: 2340,
    xpToNextLevel: 3000,
    totalMissions: 18,
    successRate: 0.83,
    totalDistanceKm: 142.6,
    currentRegion: 'jezero',
    suit: {
      id: 'suit_mk2',
      name: 'Mk II Exploration Suit',
      oxygenCapacity: 8,    // hours
      radiationShielding: 0.65,
      weight: 42,           // kg
      unlocked: true,
    },
    rover: {
      id: 'rover_scout',
      name: 'Scout Rover',
      batteryCapacity: 120, // km range
      cargoCapacity: 80,    // kg
      unlocked: true,
    },
    inventory: {
      oxygenTanks: 2,
      emergencyBeacons: 1,
      radiationMeds: 3,
      repairKits: 1,
    },
    achievements: ['first_mission', 'safe_return', 'jezero_explorer'],
    unlockedRegions: ['jezero'],
    unlockedSuits: ['suit_mk1', 'suit_mk2'],
    unlockedRovers: ['rover_scout'],
  }
}

// ─── Route Planning ────────────────────────────────────────────────────────
/**
 * planRoute(start, end, region, weights) → { route, routeStats }
 * start/end: { lat, lng } or grid { row, col }
 * weights: { time, safety, radiation }  (sum to 1)
 */
export async function planRoute(start, end, region = 'jezero', weights = { time: 0.4, safety: 0.4, radiation: 0.2 }) {
  await delay(1200)

  const makeRoute = (bias) => {
    const nodes = []
    const steps = 14 + Math.floor(Math.random() * 8)
    let lat = start.lat ?? 18.38
    let lng = start.lng ?? 77.58
    let elev = 800 + Math.random() * 200
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const targetLat = end.lat ?? 18.52
      const targetLng = end.lng ?? 77.74
      lat = lat + (targetLat - lat) * 0.08 + (Math.random() - 0.5) * 0.01 * bias
      lng = lng + (targetLng - lng) * 0.08 + (Math.random() - 0.5) * 0.01 * bias
      elev = elev + (Math.random() - 0.5) * 60
      nodes.push({
        lat, lng,
        elevation: elev,
        slope: Math.random() * 15,
        hazardLevel: Math.random() < 0.15 ? 'medium' : 'low',
        radiationLevel: 0.2 + Math.random() * 0.4,
        terrainType: ['regolith','boulder_field','delta_deposit','crater_rim'][Math.floor(Math.random()*4)],
      })
    }
    return nodes
  }

  const fastNodes = makeRoute(1.6)
  const balancedNodes = makeRoute(0.8)
  const safeNodes = makeRoute(0.3)

  const calcStats = (nodes, timeMulti, radMulti, oxyMulti) => ({
    distanceKm: (8 + Math.random() * 4).toFixed(2) * timeMulti,
    estimatedTimeHrs: (3.2 + Math.random() * 2).toFixed(1) * timeMulti,
    oxygenConsumedPct: Math.min(95, (28 + Math.random() * 20) * oxyMulti),
    radiationDoseMSv: (0.8 + Math.random() * 0.6) * radMulti,
    batteryUsedPct: Math.min(90, (35 + Math.random() * 20) * timeMulti),
    maxSlope: (10 + Math.random() * 15).toFixed(1),
    restPointsAvailable: Math.floor(Math.random() * 3),
    safetyScore: Math.random() * 0.3 + 0.7 * (1 / timeMulti),
    hazardousSections: Math.floor(Math.random() * 3 * timeMulti),
    elevationProfile: nodes.map((n, i) => ({ step: i, elevation: n.elevation, distance: (i * 0.6).toFixed(2) })),
  })

  return {
    routes: {
      fast: {
        id: 'route_fast',
        label: 'Fast',
        tagline: 'Direct path, higher exposure',
        nodes: fastNodes,
        stats: calcStats(fastNodes, 0.75, 1.4, 1.2),
        color: '#ff7d2e',
      },
      balanced: {
        id: 'route_balanced',
        label: 'Balanced',
        tagline: 'Optimized trade-off',
        nodes: balancedNodes,
        stats: calcStats(balancedNodes, 1.0, 1.0, 1.0),
        color: '#f5c842',
      },
      safe: {
        id: 'route_safe',
        label: 'Safe',
        tagline: 'Maximum shielding, longer path',
        nodes: safeNodes,
        stats: calcStats(safeNodes, 1.4, 0.65, 0.85),
        color: '#2ecc71',
      },
    },
    region,
    computedAt: new Date().toISOString(),
  }
}

// ─── Simulation ────────────────────────────────────────────────────────────
/**
 * Returns tick-by-tick simulation frames for step-through UI.
 */
export async function runMissionSimulation(routeId, route, playerState) {
  await delay(800)
  const frames = route.nodes.map((node, i) => {
    const pct = i / (route.nodes.length - 1)
    return {
      step: i,
      position: { lat: node.lat, lng: node.lng },
      elevation: node.elevation,
      oxygenRemainingPct: Math.max(5, 100 - pct * route.stats.oxygenConsumedPct * 1.1),
      radiationAccumulatedMSv: pct * route.stats.radiationDoseMSv,
      batteryRemainingPct: Math.max(5, 100 - pct * route.stats.batteryUsedPct),
      timeElapsedHrs: (pct * route.stats.estimatedTimeHrs).toFixed(2),
      distanceTravelledKm: (pct * route.stats.distanceKm).toFixed(2),
      commsStrength: 0.4 + Math.sin(pct * Math.PI) * 0.5,
      alerts: generateAlerts(node, pct),
      choiceAvailable: node.hazardLevel === 'medium' && i > 2,
      terrainType: node.terrainType,
    }
  })
  return { frames, totalSteps: frames.length }
}

function generateAlerts(node, pct) {
  const alerts = []
  if (node.slope > 18) alerts.push({ type: 'warn', message: `Steep slope ahead: ${node.slope.toFixed(0)}°` })
  if (node.hazardLevel === 'medium') alerts.push({ type: 'hazard', message: 'Entering boulder field — reduce speed' })
  if (pct > 0.6 && node.radiationLevel > 0.55) alerts.push({ type: 'radiation', message: 'Solar event: radiation spike detected' })
  if (pct > 0.5 && pct < 0.55) alerts.push({ type: 'comms', message: 'Comms signal degrading — relay booster active' })
  return alerts
}

// ─── Regions ───────────────────────────────────────────────────────────────
export async function getRegions() {
  await delay(300)
  return [
    {
      id: 'jezero',
      name: 'Jezero Crater',
      description: 'Ancient river delta — primary science target. Perseverance rover landing site.',
      centerLat: 18.447,
      centerLng: 77.591,
      zoom: 11,
      unlockLevel: 1,
      hazardProfile: 'moderate',
      thumbnail: null,
      stats: { area: '45 km diameter', avgTemp: '-63°C', maxSlope: '28°', terrainComplexity: 'high' },
    },
    {
      id: 'hellas',
      name: 'Hellas Basin',
      description: 'Deepest crater on Mars. Extreme winds, high pressure anomaly.',
      centerLat: -42.5,
      centerLng: 70.5,
      zoom: 8,
      unlockLevel: 3,
      hazardProfile: 'severe',
      thumbnail: null,
      stats: { area: '2300 km diameter', avgTemp: '-40°C', maxSlope: '35°', terrainComplexity: 'extreme' },
    },
    {
      id: 'valles',
      name: 'Valles Marineris',
      description: 'The Grand Canyon of Mars. 4000 km long, 7 km deep canyon system.',
      centerLat: -13.9,
      centerLng: -59.2,
      zoom: 7,
      unlockLevel: 6,
      hazardProfile: 'extreme',
      thumbnail: null,
      stats: { area: '4000×200 km', avgTemp: '-55°C', maxSlope: '45°', terrainComplexity: 'extreme' },
    },
    {
      id: 'olympus',
      name: 'Olympus Mons',
      description: 'Tallest volcano in the solar system. Thin atmosphere, radiation exposure.',
      centerLat: 18.65,
      centerLng: -133.8,
      zoom: 8,
      unlockLevel: 8,
      hazardProfile: 'extreme',
      thumbnail: null,
      stats: { area: '600 km diameter', avgTemp: '-70°C', maxSlope: '5° avg', terrainComplexity: 'moderate' },
    },
  ]
}

// ─── Missions ──────────────────────────────────────────────────────────────
export async function getMissions(userId, region = null) {
  await delay(400)
  const all = [
    {
      id: 'mission_001',
      title: 'First Steps',
      description: 'Navigate from the landing site to the delta edge. Collect baseline telemetry.',
      region: 'jezero',
      difficulty: 1,
      objectives: ['Reach delta waypoint', 'Collect terrain samples', 'Deploy comm relay'],
      xpReward: 250,
      unlockLevel: 1,
      status: 'completed',
      route: null,
      completedAt: '2025-03-12T10:20:00Z',
    },
    {
      id: 'mission_002',
      title: 'The Boulder Field',
      description: 'Cross the eastern boulder field and survey the ancient lake shoreline.',
      region: 'jezero',
      difficulty: 2,
      objectives: ['Cross boulder field', 'Shoreline survey', 'Return to base'],
      xpReward: 400,
      unlockLevel: 2,
      status: 'completed',
      completedAt: '2025-03-20T14:05:00Z',
    },
    {
      id: 'mission_003',
      title: 'Crater Rim Recon',
      description: 'Ascend to the crater rim for a full panoramic survey. High slope warning.',
      region: 'jezero',
      difficulty: 3,
      objectives: ['Ascend crater rim', 'Deploy panoramic array', 'Hazard mapping'],
      xpReward: 600,
      unlockLevel: 3,
      status: 'available',
      completedAt: null,
    },
    {
      id: 'mission_004',
      title: 'Night Traverse',
      description: 'Emergency resupply run at night. Battery conservation critical.',
      region: 'jezero',
      difficulty: 4,
      objectives: ['Reach supply cache', 'Conserve <40% battery', 'Avoid radiation peaks'],
      xpReward: 850,
      unlockLevel: 4,
      status: 'available',
      completedAt: null,
    },
    {
      id: 'mission_005',
      title: 'Hellas Descent',
      description: 'First descent into Hellas Basin. Suit pressure calibration required.',
      region: 'hellas',
      difficulty: 6,
      objectives: ['Descend 2km', 'Pressure equilibration', 'Atmospheric sample'],
      xpReward: 1200,
      unlockLevel: 6,
      status: 'locked',
      completedAt: null,
    },
  ]
  return region ? all.filter(m => m.region === region) : all
}

export async function getMissionReport(missionId) {
  await delay(500)
  return {
    missionId,
    title: 'The Boulder Field',
    region: 'jezero',
    completedAt: '2025-03-20T14:05:00Z',
    duration: '4h 22m',
    routeTaken: 'balanced',
    distanceKm: 9.4,
    maxSlope: 16.2,
    oxygenUsedPct: 64,
    radiationDoseMSv: 1.2,
    batteryUsedPct: 58,
    choicesMade: [
      { step: 6, choice: 'continue', context: 'Boulder obstruction detected — chose to navigate around' },
      { step: 11, choice: 'rest', context: 'Oxygen at 40% — took 20-min rest at shelter cache' },
    ],
    objectivesCompleted: 3,
    objectivesTotal: 3,
    xpEarned: 400,
    bonusXP: 80,
    survivalScore: 0.91,
    scientificValue: 0.78,
    highlights: ['No hazard incidents', 'Optimal route selection', 'Full objective completion'],
  }
}

// ─── Weekly Challenge ──────────────────────────────────────────────────────
export async function getWeeklyChallenge() {
  await delay(300)
  return {
    id: 'wc_2025_w12',
    title: 'Speed Run: Delta Crossing',
    description: 'Complete the delta crossing route under 3 hours with oxygen remaining >30%.',
    region: 'jezero',
    constraints: { maxTimeHrs: 3, minOxygenRemainingPct: 30, maxRadiationMSv: 1.5 },
    reward: { xp: 1500, badge: 'speed_demon', unlocks: null },
    startAt: '2025-03-17T00:00:00Z',
    endAt: '2025-03-24T00:00:00Z',
    leaderboard: [
      { rank: 1, callsign: 'ALPHA-9', time: '2h 41m', oxygenLeft: 42 },
      { rank: 2, callsign: 'BRAVO-3', time: '2h 55m', oxygenLeft: 38 },
      { rank: 3, callsign: 'DELTA-1', time: '3h 01m', oxygenLeft: 33 },
    ],
    userEntry: null,
  }
}

// ─── Exploration Log ───────────────────────────────────────────────────────
export async function getExplorationLog(userId) {
  await delay(350)
  return [
    {
      id: 'exp_001', timestamp: '2025-03-20T14:00:00Z',
      region: 'jezero', type: 'mission', title: 'Completed: The Boulder Field',
      xpDelta: 480, details: 'Route: Balanced | Distance: 9.4km | Score: 91%',
    },
    {
      id: 'exp_002', timestamp: '2025-03-20T17:30:00Z',
      region: 'jezero', type: 'exploration', title: 'Free Roam: Eastern Shore',
      xpDelta: 120, details: 'Discovered new terrain feature: Esker ridge +50 XP',
    },
    {
      id: 'exp_003', timestamp: '2025-03-21T09:10:00Z',
      region: 'jezero', type: 'challenge', title: 'Weekly Challenge Attempt',
      xpDelta: 0, details: 'DNF — oxygen depleted at step 11/14',
    },
    {
      id: 'exp_004', timestamp: '2025-03-22T11:00:00Z',
      region: 'jezero', type: 'comms', title: 'Earth Transmission Received',
      xpDelta: 50, details: 'Mission update from JPL command',
    },
  ]
}

// ─── Earth Comms Log ───────────────────────────────────────────────────────
export async function getEarthCommsLog(userId) {
  await delay(400)
  return [
    {
      id: 'comms_001',
      from: 'JPL Mission Control',
      to: 'ROVER-7',
      subject: 'Mission Update — Delta Survey Authorization',
      body: 'ROVER-7, your request to extend survey perimeter has been approved. Exercise caution near grid sector E-7. New hazard data incoming. Stay safe out there. — Dr. Chen, Mission Director',
      sentAt: '2025-03-20T22:14:00Z',
      receivedAt: '2025-03-21T00:36:00Z',
      delayMins: 142,
      priority: 'standard',
      read: true,
    },
    {
      id: 'comms_002',
      from: 'ROVER-7',
      to: 'JPL Mission Control',
      subject: 'RE: Mission Update + Hazard Report',
      body: 'Acknowledged, Dr. Chen. Sector E-7 noted. Boulder field traversal complete. Radiation spike detected at 14:22 local — attaching telemetry. Request new suit firmware update. — ROVER-7',
      sentAt: '2025-03-21T06:00:00Z',
      receivedAt: '2025-03-21T08:28:00Z',
      delayMins: 148,
      priority: 'standard',
      read: true,
    },
    {
      id: 'comms_003',
      from: 'JPL Mission Control',
      to: 'ROVER-7',
      subject: 'PRIORITY: Solar Event Advisory',
      body: 'ALERT: X-class solar flare detected. Expected arrival: 18h from now. Recommend shelter protocol. All surface operations to reduce to essential only. Firmware update attached.',
      sentAt: '2025-03-22T03:00:00Z',
      receivedAt: '2025-03-22T05:22:00Z',
      delayMins: 142,
      priority: 'high',
      read: false,
    },
  ]
}

// ─── Level / XP Config ─────────────────────────────────────────────────────
export async function getLevelConfig() {
  await delay(200)
  return Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    xpRequired: [0, 500, 1200, 2500, 4000, 6000, 8500, 11500, 15000, 19500, 25000][i],
    unlocks: [
      ['Basic suit', 'Jezero Crater', 'Scout Rover'],
      ['Mk II Suit', 'Advanced route planning'],
      ['Hellas Basin access', 'Radiation shield upgrade'],
      ['Night vision module', 'Extended oxygen pack'],
      ['Valles Marineris access', 'Cargo rover'],
      ['Olympus Mons access', 'Deep space comms'],
      ['Mk III Suit', 'Drone scout module'],
      ['Full region unlock', 'Heavy rover'],
      ['Commander rank', 'All inventory'],
      ['EXTRACTION — Mission Complete'],
    ][i],
  }))
}

// ─── Inventory / Upgrades ──────────────────────────────────────────────────
export async function getInventoryCatalog() {
  await delay(300)
  return {
    suits: [
      { id: 'suit_mk1', name: 'Mk I Basic Suit', oxygenCapacity: 6, radiationShielding: 0.4, cost: 0, unlockLevel: 1 },
      { id: 'suit_mk2', name: 'Mk II Exploration Suit', oxygenCapacity: 8, radiationShielding: 0.65, cost: 800, unlockLevel: 2 },
      { id: 'suit_mk3', name: 'Mk III Advanced Suit', oxygenCapacity: 12, radiationShielding: 0.85, cost: 2500, unlockLevel: 7 },
    ],
    rovers: [
      { id: 'rover_scout', name: 'Scout Rover', batteryCapacity: 120, cargoCapacity: 80, cost: 0, unlockLevel: 1 },
      { id: 'rover_cargo', name: 'Cargo Rover', batteryCapacity: 200, cargoCapacity: 300, cost: 3000, unlockLevel: 5 },
      { id: 'rover_heavy', name: 'Heavy Rover', batteryCapacity: 350, cargoCapacity: 600, cost: 8000, unlockLevel: 8 },
    ],
    consumables: [
      { id: 'o2_tank', name: 'Oxygen Tank', effect: '+2h oxygen', cost: 150 },
      { id: 'rad_med', name: 'Radiation Meds', effect: '-30% radiation damage', cost: 200 },
      { id: 'repair_kit', name: 'Repair Kit', effect: 'Fix rover damage', cost: 300 },
      { id: 'beacon', name: 'Emergency Beacon', effect: 'Emergency extraction', cost: 500 },
    ],
  }
}

// ─── Save / Autosave ───────────────────────────────────────────────────────
export async function saveMissionCompletion(userId, missionId, stats) {
  await delay(600)
  console.log('[MOCK] Saving mission completion:', { userId, missionId, stats })
  return { success: true, xpAwarded: stats.xpEarned + (stats.bonusXP || 0) }
}

export async function saveExplorationSession(userId, sessionData) {
  await delay(400)
  console.log('[MOCK] Saving exploration session:', { userId, sessionData })
  return { success: true }
}

export async function sendEarthComm(userId, message) {
  await delay(500)
  const delayMins = 140 + Math.floor(Math.random() * 20)
  return {
    success: true,
    messageId: `comms_${Date.now()}`,
    estimatedDeliveryMins: delayMins,
    estimatedReplyMins: delayMins * 2 + 10,
  }
}

// ─── Planner (Product B) ───────────────────────────────────────────────────
/**
 * plannerAnalyze(params) → PlannerReport
 * Strictly computed — no game elements.
 */
export async function plannerAnalyze({ start, destination, suit, departureTime, objective, constraints }) {
  await delay(1500)

  const makeForecast = (label, timeMulti, radMulti) => ({
    label,
    estimatedTimeHrs: (4.5 * timeMulti).toFixed(1),
    oxygenConsumptionPct: Math.min(99, 55 * timeMulti).toFixed(0),
    radiationDoseMSv: (1.4 * radMulti).toFixed(2),
    batteryUsedPct: Math.min(99, 60 * timeMulti).toFixed(0),
    successProbability: (0.95 / timeMulti).toFixed(2),
  })

  const abortThresholds = {
    oxygenPct: 35,
    radiationMSv: 2.5,
    batteryPct: 20,
    commsLossMinutes: 45,
    slopeMaxDeg: 22,
  }

  const flags = []
  if (constraints?.maxTimeHrs && 4.5 > constraints.maxTimeHrs) flags.push({ level: 'warn', message: 'Estimated duration exceeds constraint' })
  if (constraints?.maxRadiationMSv && 1.4 > constraints.maxRadiationMSv) flags.push({ level: 'critical', message: 'Radiation exposure approaches limit' })

  return {
    requestId: `pr_${Date.now()}`,
    status: 'awaiting_approval',
    analyzedAt: new Date().toISOString(),
    start,
    destination,
    suit,
    objective,
    recommendedRoute: {
      type: 'balanced',
      waypoints: 12,
      distanceKm: 9.8,
      description: 'Avoids high-radiation sector E-7. Crosses stable regolith field.',
    },
    forecasts: {
      best: makeForecast('Best Case', 0.82, 0.75),
      nominal: makeForecast('Nominal', 1.0, 1.0),
      worst: makeForecast('Worst Case', 1.35, 1.4),
    },
    abortThresholds,
    flags,
    humanApprovalRequired: flags.some(f => f.level === 'critical'),
    approvedBy: null,
    approvedAt: null,
  }
}
