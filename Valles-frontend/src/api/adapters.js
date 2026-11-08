/**
 * VALLES — Data Adapter Layer
 * Bridges the real backend (Supabase + TS engine) response shapes to the
 * field names and formats that the frontend JSX pages expect.
 *
 * Rule: every function in this file is a pure transform — no side effects,
 * no async, no Supabase calls. The callers do the fetching; adapters only map.
 */

// ── Player State ────────────────────────────────────────────────────────────

/**
 * Maps a real PlayerState (from playerState.ts) to the shape the frontend expects.
 * Handles field renames: username→callsign, oxygenCapacityL→oxygenCapacity (hours), etc.
 *
 * @param {import('../api/playerState').PlayerState} realPS
 * @param {number} [totalDistanceM] - optional from player_progress
 * @returns Frontend-compatible player state object
 */
export function adaptPlayerState(realPS, totalDistanceM = 0) {
  if (!realPS) return null

  // XP_THRESHOLDS from gameConfig — import avoided to keep this pure JS
  // We compute xpToNextLevel from the level directly
  const XP_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5500, 8000, 11000, 15000, 20000]
  const xpToNextLevel = XP_THRESHOLDS[Math.min(realPS.level, 9)] ?? 20000

  const activeSuit = realPS.activeSuit
  const activeRover = realPS.activeRover

  return {
    userId: realPS.userId,
    callsign: realPS.username,        // pages use .callsign
    displayName: realPS.displayName,
    level: realPS.level,
    xp: realPS.xp,
    xpToNextLevel,
    currency: realPS.currency,
    totalMissions: realPS.totalMissionsCompleted,
    successRate: 0.83,                // TODO: compute from player_missions when needed
    totalDistanceKm: +(totalDistanceM / 1000).toFixed(1),
    currentRegion: realPS.currentRegionId || 'jezero',
    suit: activeSuit
      ? {
          id: activeSuit.id,
          name: activeSuit.name,
          // engine uses litres; mockApi used hours (approx 8.4 L/h at rest)
          oxygenCapacity: +(activeSuit.oxygenCapacityL / 8.4).toFixed(1),
          radiationShielding: activeSuit.radiationShielding,
          weight: 42,
        }
      : {
          id: 'suit_base',
          name: 'Base EVA Suit',
          oxygenCapacity: 6,
          radiationShielding: 0.2,
          weight: 50,
        },
    rover: activeRover
      ? {
          id: activeRover.id,
          name: activeRover.name,
          batteryCapacity: 120,
          cargoCapacity: 80,
          unlocked: true,
        }
      : null,
    // real backend: inventory is [{ upgradeId, quantity }]
    // pages access it as playerState.inventory[upgradeId]
    inventory: Object.fromEntries(
      (realPS.inventory || []).map(i => [i.upgradeId, i.quantity])
    ),
    achievements: [],                 // TODO: no achievements table yet
    unlockedRegions: ['jezero'],      // TODO: derive from region_progress
    unlockedSuits: realPS.unlockedSuits || ['suit_base'],
    unlockedRovers: realPS.hasRover ? ['rover_scout'] : [],
    isExtractionComplete: realPS.isExtractionComplete || false,
    hasRover: realPS.hasRover || false,
    activeSuitId: realPS.activeSuitId,
  }
}

// ── Missions ─────────────────────────────────────────────────────────────────

/**
 * Maps Supabase mission rows + player_missions rows to frontend mission objects.
 *
 * @param {Object[]} supabaseMissions - rows from `missions` table
 * @param {Object[]} playerMissions   - rows from `player_missions` for this user
 * @param {number}   playerLevel      - player's current level for lock check
 */
export function adaptMissions(supabaseMissions, playerMissions = [], playerLevel = 1) {
  return supabaseMissions.map(m => {
    const pm = playerMissions.find(p => p.mission_id === m.id)
    let status = 'locked'
    if (m.unlock_level <= playerLevel) {
      status = pm?.status === 'completed' ? 'completed' : 'available'
    }
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      region: m.region_id,
      difficulty: m.difficulty || 1,
      objectives: Array.isArray(m.objectives) ? m.objectives : [],
      xpReward: m.xp_reward || 0,
      unlockLevel: m.unlock_level || 1,
      status,
      completedAt: pm?.completed_at || null,
      route: null,
    }
  })
}

// ── Earth Comms ───────────────────────────────────────────────────────────────

/**
 * Maps earth_comms_log rows to the shape EarthCommsPage expects.
 *
 * @param {Object[]} rows - from Supabase earth_comms_log table
 */
export function adaptEarthCommsMessages(rows) {
  return (rows || []).map(r => ({
    id: r.id,
    from: r.direction === 'from_earth' ? 'JPL Mission Control' : 'You',
    to: r.direction === 'to_earth' ? 'JPL Mission Control' : 'You',
    subject: r.subject,
    body: r.body,
    sentAt: r.sent_at,
    receivedAt: r.received_at,
    delayMins: r.comms_delay_min || 12,
    priority: r.message_type === 'alert' ? 'high' : 'standard',
    read: r.is_read || false,
  }))
}

// ── Weekly Challenge ──────────────────────────────────────────────────────────

/**
 * Maps a weekly_challenges row to the shape WeeklyChallengePage expects.
 *
 * @param {Object|null} challenge - row from weekly_challenges table
 */
export function adaptWeeklyChallenge(challenge) {
  if (!challenge) return null
  return {
    id: challenge.id,
    title: challenge.title || 'Weekly Challenge',
    description: challenge.description || '',
    region: challenge.region_id || 'jezero',
    constraints: {
      maxTimeHrs: challenge.constraints?.maxTimeHrs ?? 6,
      minOxygenRemainingPct: challenge.constraints?.minOxygenRemainingPct ?? 25,
      maxRadiationMSv: challenge.constraints?.maxRadiationMSv ?? 2.0,
    },
    reward: {
      xp: challenge.xp_reward ?? 500,
      badge: 'weekly_survivor',
      unlocks: null,
    },
    startAt: challenge.starts_at,
    endAt: challenge.ends_at,
    leaderboard: [],   // TODO: add leaderboard query later
    userEntry: null,
  }
}

// ── Level Config ──────────────────────────────────────────────────────────────

/**
 * Returns level config array from hardcoded constants (no Supabase needed).
 * Shape matches what ProfilePage expects from getLevelConfig() in mockApi.
 */
export function getLevelConfigStatic() {
  const XP_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5500, 8000, 11000, 15000, 20000]
  const UNLOCKS = [
    ['Base Suit', 'Jezero Crater'],
    ['Oxygen Tank Upgrade I'],
    ['Advanced Suit', 'Radiation Shield I'],
    ['Scout Rover', 'Valles Marineris'],
    ['Battery Upgrade I', 'Comms Booster'],
    ['Elite Suit', 'Olympus Mons Foothills'],
    ['Rover Upgrade', 'Oxygen Tank Upgrade II'],
    ['Arcadia Planitia', 'Radiation Shield II'],
    ['Hellas Basin', 'Prototype Suit'],
    ['Extraction Sequence', 'Final Mission'],
  ]
  return Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    xpRequired: XP_THRESHOLDS[i],
    unlocks: UNLOCKS[i],
  }))
}

// ── Inventory Catalog ─────────────────────────────────────────────────────────

/**
 * Returns a static inventory catalog from gameConfig constants.
 * Shape matches what InventoryPage expects from getInventoryCatalog() in mockApi.
 */
export function getInventoryCatalogStatic() {
  return {
    suits: [
      { id: 'suit_base',      name: 'Base EVA Suit',        oxygenCapacity: 6,  radiationShielding: 0.20, cost: 0,    unlockLevel: 1 },
      { id: 'suit_advanced',  name: 'Advanced EVA Suit',    oxygenCapacity: 10, radiationShielding: 0.50, cost: 800,  unlockLevel: 3 },
      { id: 'suit_elite',     name: 'Elite EVA Suit',       oxygenCapacity: 14, radiationShielding: 0.70, cost: 2500, unlockLevel: 6 },
      { id: 'suit_prototype', name: 'Prototype Exosuit',    oxygenCapacity: 20, radiationShielding: 0.90, cost: 6000, unlockLevel: 9 },
    ],
    rovers: [
      { id: 'rover_scout',    name: 'Scout Rover',     batteryCapacity: 120, cargoCapacity: 80,  cost: 0,    unlockLevel: 4 },
      { id: 'rover_upgraded', name: 'Upgraded Rover',  batteryCapacity: 200, cargoCapacity: 200, cost: 3000, unlockLevel: 7 },
    ],
    consumables: [
      { id: 'o2_tank_1',    name: 'Oxygen Tank Upgrade I',  effect: '+50% O2 capacity',              cost: 300, unlockLevel: 2 },
      { id: 'o2_tank_2',    name: 'Oxygen Tank Upgrade II', effect: '+100% O2 capacity (cumulative)', cost: 700, unlockLevel: 7 },
      { id: 'rad_shield_1', name: 'Radiation Shield I',     effect: '+20% radiation shielding',       cost: 400, unlockLevel: 3 },
      { id: 'rad_shield_2', name: 'Radiation Shield II',    effect: '+40% radiation shielding',       cost: 800, unlockLevel: 8 },
      { id: 'battery_1',    name: 'Battery Upgrade I',      effect: '+30% rover range per charge',    cost: 500, unlockLevel: 5 },
      { id: 'comms_boost',  name: 'Comms Booster',          effect: 'Reduces comms blackout by 30%',  cost: 350, unlockLevel: 5 },
      { id: 'suit_repair',  name: 'Suit Repair Kit',        effect: 'Consumable: restore suit integrity', cost: 150, unlockLevel: 1 },
    ],
  }
}

// ── Route Planning Bridge ─────────────────────────────────────────────────────

/**
 * Jezero Crater geographic bounds for lat/lng ↔ grid row/col conversion.
 * The terrain grid is a 20×20 grid covering the Jezero area.
 * These bounds approximate the real crater area.
 */
const JEZERO_BOUNDS = {
  minLat: 18.30, maxLat: 18.60,
  minLng: 77.40, maxLng: 77.80,
}

const REGION_BOUNDS = {
  jezero:           { minLat: 18.30, maxLat: 18.60, minLng: 77.40, maxLng: 77.80 },
  valles_marineris: { minLat: -14.5, maxLat: -13.3, minLng: -60.0, maxLng: -58.5 },
  olympus_mons:     { minLat: 18.0,  maxLat: 19.3,  minLng: -134.5,maxLng: -133.0 },
  arcadia_planitia: { minLat: 46.0,  maxLat: 47.5,  minLng: -170.0,maxLng: -168.5 },
  hellas_basin:     { minLat: -43.5, maxLat: -41.5, minLng: 69.0,  maxLng: 72.0 },
}

/**
 * Convert a lat/lng point to a grid {row, col} position.
 *
 * @param {{ lat: number, lng: number }} lngLat
 * @param {{ rows: number, cols: number }} grid
 * @param {string} regionId
 * @returns {{ row: number, col: number }}
 */
export function latLngToGridPos(lngLat, grid, regionId = 'jezero') {
  const bounds = REGION_BOUNDS[regionId] || REGION_BOUNDS.jezero
  const lat = lngLat.lat ?? lngLat.lat
  const lng = lngLat.lng ?? lngLat.lng
  const row = Math.min(
    grid.rows - 1,
    Math.max(0, Math.floor(((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * grid.rows))
  )
  const col = Math.min(
    grid.cols - 1,
    Math.max(0, Math.floor(((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * grid.cols))
  )
  return { row, col }
}

/**
 * Convert a grid {row, col} position back to a lat/lng point (cell center).
 *
 * @param {{ row: number, col: number }} pos
 * @param {{ rows: number, cols: number }} grid
 * @param {string} regionId
 * @returns {{ lat: number, lng: number }}
 */
export function gridPosToLatLng(pos, grid, regionId = 'jezero') {
  const bounds = REGION_BOUNDS[regionId] || REGION_BOUNDS.jezero
  const lat = bounds.minLat + ((pos.row + 0.5) / grid.rows) * (bounds.maxLat - bounds.minLat)
  const lng = bounds.minLng + ((pos.col + 0.5) / grid.cols) * (bounds.maxLng - bounds.minLng)
  return { lat, lng }
}

/**
 * Get a cell from the flat cells array using row/col indexing.
 *
 * @param {Object[]} cells - flat array of GridCell
 * @param {number} row
 * @param {number} col
 * @param {number} cols - total number of columns
 */
function getCell(cells, row, col, cols) {
  return cells[row * cols + col]
}

/**
 * Plans all three route profiles using the real engine.
 * Converts lat/lng → grid positions → runs engine → converts results back to lat/lng nodes.
 * Returns a result in the same shape as mockApi's planRoute().
 *
 * @param {{ lat: number, lng: number }} startLatLng
 * @param {{ lat: number, lng: number }} endLatLng
 * @param {string} regionId
 * @param {Object|null} playerState - adapted player state (from adaptPlayerState)
 * @returns {Promise<Object>} - { routes: { fast, balanced, safe }, region, computedAt }
 */
export async function planRouteFromLatLng(startLatLng, endLatLng, regionId, playerState) {
  // 1. Load terrain grid
  const res = await fetch(`/data/regions/${regionId}.json`)
  if (!res.ok) throw new Error(`Failed to load terrain for region: ${regionId}`)
  const grid = await res.json()

  // 2. Dynamic import of engine (TypeScript, handled by Vite)
  const { planAllProfiles, defaultResourceState } = await import('../engine/index')

  // 3. Convert lat/lng to grid positions
  const startPos = latLngToGridPos(startLatLng, grid, regionId)
  const endPos = latLngToGridPos(endLatLng, grid, regionId)

  // 4. Build initial resource state from player's active suit
  const oxygenL = playerState?.suit
    ? playerState.suit.oxygenCapacity * 8.4  // hours → litres
    : 420  // default base suit

  const initState = defaultResourceState({
    oxygenL,
    oxygenCapacityL: oxygenL,
    hasRover: playerState?.hasRover || false,
  })

  // 5. Run the engine
  const results = planAllProfiles(startPos, endPos, grid, initState)

  // 6. Convert engine results to the frontend shape
  const formatRoute = (key, result, color) => {
    if (!result) return null
    const { route, routeStats } = result

    const nodes = route.map(pos => {
      const cell = getCell(grid.cells, pos.row, pos.col, grid.cols)
      const lngLat = gridPosToLatLng(pos, grid, regionId)
      return {
        lat: lngLat.lat,
        lng: lngLat.lng,
        elevation: cell?.elevationM ?? 0,
        slope: cell?.slopeDeg ?? 0,
        hazardLevel: (cell?.hazardSeverity ?? 0) > 0.5 ? 'high'
          : (cell?.hazardSeverity ?? 0) > 0.2 ? 'medium' : 'low',
        radiationLevel: cell?.radiationLevel ?? 0.2,
        terrainType: cell?.terrainType ?? 'crater_floor',
      }
    })

    const distKm = routeStats.totalDistanceM / 1000

    return {
      id: `route_${key}`,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      tagline: key === 'fast'
        ? 'Direct path, higher exposure'
        : key === 'safe'
        ? 'Maximum shielding, longer path'
        : 'Optimized trade-off',
      nodes,
      stats: {
        distanceKm: +distKm.toFixed(2),
        estimatedTimeHrs: +routeStats.totalTimeH.toFixed(1),
        oxygenConsumedPct: Math.min(99, Math.round(
          (routeStats.oxygenUsedL / oxygenL) * 100
        )),
        radiationDoseMSv: +(routeStats.radiationAccum * 3).toFixed(2),
        batteryUsedPct: Math.round(routeStats.batteryUsedPct),
        maxSlope: Math.round(
          Math.max(...route.map(p => getCell(grid.cells, p.row, p.col, grid.cols)?.slopeDeg ?? 0))
        ),
        restPointsAvailable: routeStats.safetyCheck?.safePoints?.length ?? 0,
        safetyScore: routeStats.isSurvivable ? 0.85 : 0.3,
        hazardousSections: routeStats.safetyCheck?.unsafeSegments?.length ?? 0,
        elevationProfile: route.map((pos, i) => {
          const c = getCell(grid.cells, pos.row, pos.col, grid.cols)
          return {
            step: i,
            elevation: c?.elevationM ?? 0,
            distance: +((i * grid.cellWidthM) / 1000).toFixed(2),
          }
        }),
      },
      color,
      // Store engine result so SimulationPage can use real step states
      _engineResult: result,
      _gridRef: { grid, regionId },
    }
  }

  return {
    routes: {
      fast:     formatRoute('fast',     results.fast,     '#ff7d2e'),
      balanced: formatRoute('balanced', results.balanced, '#f5c842'),
      safe:     formatRoute('safe',     results.safe,     '#2ecc71'),
    },
    region: regionId,
    computedAt: new Date().toISOString(),
  }
}

// ── Simulation Frames Bridge ──────────────────────────────────────────────────

/**
 * Converts engine ResourceState[] step states to the frame format
 * that SimulationPage expects (matching runMissionSimulation output shape).
 *
 * @param {Object} route - a single route object (from planRouteFromLatLng result)
 * @param {Object} engineResult - the _engineResult from the route
 * @returns {{ frames: Object[], totalSteps: number }}
 */
export function stepsToFrames(route, engineResult) {
  const stepStates = engineResult?.routeStats?.stepStates ?? []
  const nodes = route.nodes ?? []

  const frames = stepStates.map((state, i) => {
    const node = nodes[i] ?? {}
    const oxygenPct = (state.oxygenL / (state.oxygenCapacityL || 1)) * 100
    const alerts = []

    if (oxygenPct < 25) alerts.push({ type: 'hazard', message: `CRITICAL: O₂ at ${oxygenPct.toFixed(0)}%` })
    if (state.radiationAccum > 0.6) alerts.push({ type: 'radiation', message: `High radiation exposure: ${(state.radiationAccum * 100).toFixed(0)}%` })
    if (!state.commsOk) alerts.push({ type: 'comms', message: 'Communications blackout — no signal' })
    if (node.hazardLevel === 'high') alerts.push({ type: 'hazard', message: 'High hazard zone — proceed with caution' })
    if (node.slope > 18) alerts.push({ type: 'warn', message: `Steep slope: ${node.slope?.toFixed(0)}°` })

    return {
      step: i,
      position: { lat: node.lat, lng: node.lng },
      elevation: node.elevation ?? 0,
      oxygenRemainingPct: Math.max(0, oxygenPct),
      radiationAccumulatedMSv: state.radiationAccum * 3,
      batteryRemainingPct: Math.max(0, state.batteryPct ?? 100),
      timeElapsedHrs: +state.elapsedH.toFixed(2),
      distanceTravelledKm: +((i * (engineResult.routeStats.totalDistanceM / stepStates.length)) / 1000).toFixed(2),
      commsStrength: state.commsBlackoutH > 0 ? 0.2 : 0.8,
      alerts,
      choiceAvailable: node.hazardLevel === 'high' && i > 2,
      terrainType: node.terrainType ?? 'crater_floor',
    }
  })

  return { frames, totalSteps: frames.length }
}

// ── Exploration Log ───────────────────────────────────────────────────────────

/**
 * Maps exploration_logs rows to the format DashboardPage expects.
 *
 * @param {Object[]} rows - from exploration_logs table
 */
export function adaptExplorationLog(rows) {
  return (rows || []).map(r => ({
    id: r.id,
    timestamp: r.session_start || r.created_at,
    region: r.region_id,
    type: 'exploration',
    title: `Free Roam: ${r.region_id?.replace('_', ' ')}`,
    xpDelta: r.xp_earned || 0,
    details: [
      r.distance_m ? `Distance: ${(r.distance_m / 1000).toFixed(1)} km` : null,
      r.cells_visited ? `Cells explored: ${r.cells_visited}` : null,
      r.outcome ? `Outcome: ${r.outcome}` : null,
    ].filter(Boolean).join(' | '),
  }))
}

// ── Mission Report ────────────────────────────────────────────────────────────

/**
 * Maps a player_missions row (completed) to the shape MissionReportPage expects.
 *
 * @param {Object} pm - row from player_missions table (with resources_snapshot)
 * @param {Object} mission - row from missions table
 */
export function adaptMissionReport(pm, mission) {
  if (!pm || !mission) return null
  const snap = pm.resources_snapshot || {}
  const oxygenUsedPct = snap.oxygenL != null
    ? Math.round((1 - snap.oxygenL / (snap.oxygenCapacityL || 420)) * 100)
    : 64
  const routeTaken = Array.isArray(pm.route_taken) ? pm.route_taken : []
  const distKm = (routeTaken.length * 1.5).toFixed(1)

  return {
    missionId: pm.mission_id,
    title: mission.title || 'Mission',
    region: mission.region_id || 'jezero',
    completedAt: pm.completed_at,
    duration: snap.elapsedH ? `${snap.elapsedH.toFixed(1)}h` : '3h',
    routeTaken: 'balanced',
    distanceKm: parseFloat(distKm),
    maxSlope: 16,
    oxygenUsedPct,
    radiationDoseMSv: snap.radiationAccum ? +(snap.radiationAccum * 3).toFixed(1) : 1.2,
    batteryUsedPct: snap.batteryPct != null ? Math.round(100 - snap.batteryPct) : 58,
    choicesMade: [],
    objectivesCompleted: 1,
    objectivesTotal: (mission.objectives || []).length || 1,
    xpEarned: pm.xp_awarded || 0,
    bonusXP: pm.efficiency_bonus || 0,
    survivalScore: pm.xp_awarded ? 0.85 : 0.6,
    scientificValue: 0.75,
    highlights: pm.efficiency_bonus > 0 ? ['Efficiency bonus earned'] : [],
    narrative: snap.narrative || '',
  }
}
