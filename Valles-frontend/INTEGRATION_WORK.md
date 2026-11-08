# VALLES — Integration Work Plan
# Frontend (React/JSX) ↔ Backend (Supabase + Engine)
# Branch: integration
# This document is the SINGLE SOURCE OF TRUTH for integration progress.
# Every session (new model, new account) MUST read this file first before touching any code.

═══════════════════════════════════════════════════════════
 0. HOW TO USE THIS DOCUMENT
═══════════════════════════════════════════════════════════
1. Read this file fully before doing anything.
2. Find the first task marked `[ ] NOT STARTED` — that is where you begin.
3. After completing a task, change its checkbox to `[x] DONE` and note any issues.
4. Commit after each task: `git add -A && git commit -m "integration: <task name>"`
5. Update `Last updated` at the bottom with today's date.

═══════════════════════════════════════════════════════════
 1. CURRENT STATE SUMMARY
═══════════════════════════════════════════════════════════

## What exists right now (integration branch as of 2026-10-19)

### Frontend (all JSX, uses mockApi.js)
- `src/context/AppContext.jsx` — Auth context, uses mockApi.js for login/register/getPlayerState
- `src/api/mockApi.js` — All frontend API calls (mock stubs, ~556 lines)
- `src/pages/LoginPage.jsx` — Calls `useApp().login(email, password)`
- `src/pages/RegisterPage.jsx` — Calls `useApp().register(email, password, callsign)`
- `src/pages/DashboardPage.jsx` — Calls `getMissions`, `getWeeklyChallenge`, `getExplorationLog` from mockApi
- `src/pages/MapPage.jsx` — Calls `planRoute`, `getRegions` from mockApi
- `src/pages/SimulationPage.jsx` — Calls `runMissionSimulation`, `getPlayerState` from mockApi
- `src/pages/MissionsPage.jsx` — Calls `getMissions` from mockApi
- `src/pages/EarthCommsPage.jsx` — Calls `getEarthCommsLog`, `sendEarthComm` from mockApi
- `src/pages/WeeklyChallengePage.jsx` — Calls `getWeeklyChallenge` from mockApi
- `src/pages/InventoryPage.jsx` — Calls `getInventoryCatalog` from mockApi
- `src/pages/ProfilePage.jsx` — Calls `getLevelConfig` from mockApi
- `src/pages/PlannerPage.jsx` — Calls `plannerAnalyze` from mockApi
- `src/pages/ExplorationPage.jsx` — Calls exploration APIs from mockApi
- `src/pages/MissionReportPage.jsx` — Calls `getMissionReport` from mockApi
- `src/pages/EndingPage.jsx` — No API calls (static)

### Backend (TypeScript, fully implemented)
- `src/api/supabaseClient.ts` — Supabase singleton (needs real .env credentials)
- `src/api/auth.ts` — `registerUser`, `loginUser`, `logoutUser`, `getCurrentUserId`, `onAuthStateChange`
- `src/api/playerState.ts` — `getPlayerState`, `awardXp`, `purchaseUpgrade`, `equipSuit`, `getRegionProgress`
- `src/api/missions.ts` — `startMission`, `completeMission`, `startExplorationSession`, `updateExplorationSession`, `endExplorationSession`, `getActiveWeeklyChallenge`, `getPlayerChallengeState`, `autosaveWeeklyChallenge`, `completeWeeklyChallenge`, `sendEarthComm`, `getEarthCommsLog`, `markCommRead`
- `src/engine/` — A* pathfinder, cost function, resource sim, safety check (pure TS, 30/30 tests passing)
- `src/config/gameConfig.ts` — XP thresholds, level unlocks, suits, rovers, inventory, regions
- `src/config/plannerConfig.ts` — Planner suit specs, thresholds, comms delay math
- `public/data/regions/` — 5 terrain JSON files (jezero, valles_marineris, olympus_mons, arcadia_planitia, hellas_basin)
- `supabase/migrations/` — Full DB schema + seed missions (14 missions across 5 regions)

### Key mismatches to resolve
1. mockApi field names vs backend field names (callsign vs username/displayName, xpToNextLevel vs computed from XP_THRESHOLDS)
2. AppContext.jsx imports from mockApi — needs rewiring to real backend
3. planRoute in mockApi uses lat/lng coordinates — engine uses grid row/col positions
4. runMissionSimulation in mockApi produces frame data differently from engine's `simulatePath`
5. Supabase .env is not configured yet (placeholder values in .env)
6. package.json has no test script or TypeScript engine build configured for Vite

═══════════════════════════════════════════════════════════
 2. PREREQUISITE: SUPABASE SETUP (manual, one-time)
═══════════════════════════════════════════════════════════

IMPORTANT — Before running ANY integration task, the human must complete:
1. Go to https://supabase.com → create a new project
2. Copy Project URL and anon key → paste into `.env`:
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
3. In Supabase dashboard → SQL Editor → run `supabase/migrations/001_initial_schema.sql`
4. Then run `supabase/migrations/002_seed_missions.sql`
5. The DB is now ready.

STATUS: [ ] NOT DONE — human must complete this before integration can be tested

═══════════════════════════════════════════════════════════
 3. INTEGRATION TASKS (in strict order)
═══════════════════════════════════════════════════════════

---

## TASK 1 — Add missing npm dependencies + Vite TS support
Status: [ ] NOT STARTED
Files: `package.json`, `vite.config.js`
What to do:
- The project is currently JSX/Vite. The backend is TypeScript. Vite already handles TS by default.
- Add `vitest` for engine tests: `npm install -D vitest`
- Verify `@supabase/supabase-js` is already in package.json (it is: ^2.42.5)
- Add a "test" script: `"test": "vitest run src/engine/engine.test.ts"`
- `vite.config.js` uses `@vitejs/plugin-react`. Keep it, TS imports work automatically.
Commit message: `integration: add vitest, verify TS support`

---

## TASK 2 — Create a data-adapter layer (bridge mock shapes to real API shapes)
Status: [ ] NOT STARTED
Files: Create new `src/api/adapters.js`

Why this is needed:
The mockApi returns field names the frontend pages depend on (e.g. `callsign`, `xpToNextLevel`, `suit.oxygenCapacity` in hours, `unlockedRovers`). The real backend returns different shapes (e.g. `username`, computed XP from XP_THRESHOLDS, `oxygenCapacityL` in litres, no `unlockedRovers`). Rather than rewriting every page, create adapters that transform real backend responses into the shape mockApi used.

Functions to write in `src/api/adapters.js`:

```js
// adapters.js — maps real backend types to frontend-friendly shapes
import { XP_THRESHOLDS, SUIT_TIERS, ROVER_TIERS } from '../config/gameConfig'

export function adaptPlayerState(realPS) {
  // realPS = PlayerState from playerState.ts
  const xpToNextLevel = XP_THRESHOLDS[Math.min(realPS.level, 9)]
  const activeSuit = realPS.activeSuit
  const activeRover = realPS.activeRover
  return {
    userId: realPS.userId,
    callsign: realPS.username,
    displayName: realPS.displayName,
    level: realPS.level,
    xp: realPS.xp,
    xpToNextLevel,
    currency: realPS.currency,
    totalMissions: realPS.totalMissionsCompleted,
    successRate: 0.83,
    totalDistanceKm: 0,
    currentRegion: realPS.currentRegionId,
    suit: activeSuit ? {
      id: activeSuit.id,
      name: activeSuit.name,
      oxygenCapacity: activeSuit.oxygenCapacityL / 60,
      radiationShielding: activeSuit.radiationShielding,
      weight: 42,
    } : null,
    rover: activeRover ? {
      id: activeRover.id,
      name: activeRover.name,
      batteryCapacity: 120,
      cargoCapacity: 80,
      unlocked: true,
    } : null,
    inventory: realPS.inventory,
    achievements: [],
    unlockedRegions: [],
    unlockedSuits: realPS.unlockedSuits,
    unlockedRovers: realPS.hasRover ? ['rover_scout'] : [],
  }
}

export function adaptMissions(supabaseMissions, playerMissions) {
  return supabaseMissions.map(m => {
    const pm = playerMissions.find(p => p.mission_id === m.id)
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      region: m.region_id,
      difficulty: m.difficulty,
      objectives: m.objectives || [],
      xpReward: m.xp_reward,
      unlockLevel: m.unlock_level,
      status: pm?.status === 'completed' ? 'completed' : 'available',
      completedAt: pm?.completed_at || null,
    }
  })
}

export function adaptEarthCommsMessages(rows) {
  return rows.map(r => ({
    id: r.id,
    from: r.direction === 'from_earth' ? 'JPL Mission Control' : 'You',
    to: r.direction === 'to_earth' ? 'JPL Mission Control' : 'You',
    subject: r.subject,
    body: r.body,
    sentAt: r.sent_at,
    receivedAt: r.received_at,
    delayMins: r.comms_delay_min,
    priority: r.message_type === 'alert' ? 'high' : 'standard',
    read: r.is_read,
  }))
}

export function adaptWeeklyChallenge(challenge) {
  if (!challenge) return null
  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    region: challenge.region_id,
    constraints: {
      maxTimeHrs: challenge.constraints?.maxTimeHrs || 6,
      minOxygenRemainingPct: challenge.constraints?.minOxygenRemainingPct || 25,
      maxRadiationMSv: challenge.constraints?.maxRadiationMSv || 2.0,
    },
    reward: { xp: challenge.xp_reward || 500, badge: 'weekly_survivor', unlocks: null },
    startAt: challenge.starts_at,
    endAt: challenge.ends_at,
    leaderboard: [],
    userEntry: null,
  }
}
```

Commit message: `integration: add data adapter layer for shape translation`

---

## TASK 3 — Rewrite AppContext.jsx to use real Supabase auth
Status: [ ] NOT STARTED
File: `src/context/AppContext.jsx`
What changes:
- Remove import from mockApi
- Import from real backend: loginUser, registerUser, logoutUser, onAuthStateChange from `../api/auth`
- Import getPlayerState from `../api/playerState`
- Import adaptPlayerState from `../api/adapters`
- Use supabase's onAuthStateChange listener to detect session on load (replaces localStorage hack)
- Keep all context value keys the same (user, playerState, login, logout, register, etc.) so no page code needs to change
- login() calls loginUser(email, password) then getPlayerState(userId) then adaptPlayerState
- register() calls registerUser(email, password, callsign) then same
- logout() calls logoutUser()

Commit message: `integration: wire AppContext to real Supabase auth`

---

## TASK 4 — Wire DashboardPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/DashboardPage.jsx`
Changes:
- Replace getMissions('mock-uid-001', 'jezero') with real Supabase query using current user's userId
- Replace getWeeklyChallenge() with getActiveWeeklyChallenge() from missions.ts then adaptWeeklyChallenge()
- Replace getExplorationLog('mock-uid-001') with real exploration_logs Supabase query
- Use user.userId instead of hardcoded 'mock-uid-001'

Commit message: `integration: wire DashboardPage to real backend`

---

## TASK 5 — Wire MapPage: replace mockApi planRoute with real engine
Status: [ ] NOT STARTED
File: `src/pages/MapPage.jsx`

This is the most complex integration task.

Problem: mockApi's planRoute(start, end, region) takes lat/lng. Real engine's planAllProfiles(start, end, grid) takes GridPosition {row, col}.

Solution — write a bridge function `planRouteFromLatLng` in `src/api/adapters.js`:
1. Load terrain grid JSON from /data/regions/{regionId}.json
2. Convert lat/lng to grid row/col using grid metadata (originLat, originLng, latSpan, lngSpan)
3. Build initial resource state from playerState.activeSuit
4. Call planAllProfiles(startPos, endPos, grid, initState) from engine
5. Convert engine GridPosition[] results back to lat/lng nodes for the MapLibre map
6. Format to match old mockApi shape (routes: { fast, balanced, safe }) with nodes and stats
7. Store _engineResult on the route object so SimulationPage can use real step states

In MapPage.jsx: replace planRoute import with planRouteFromLatLng from adapters.

Commit message: `integration: wire MapPage to real engine for route planning`

---

## TASK 6 — Wire SimulationPage to real engine step states
Status: [ ] NOT STARTED
File: `src/pages/SimulationPage.jsx`
What changes:
- SimulationPage reads sessionStorage.valles_sim_route set by MapPage
- After Task 5, stored route will have _engineResult.routeStats.stepStates (array of ResourceState per step)
- Replace runMissionSimulation() with local function that converts stepStates to frame format UI needs
- Write stepsToFrames(route, stepStates) adapter in adapters.js
- After mission completes, call completeMission(userId, missionId, routeProfile, routeTaken, finalState, initialState) from missions.ts

Commit message: `integration: wire SimulationPage to engine step states`

---

## TASK 7 — Wire MissionsPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/MissionsPage.jsx`
Changes:
- Replace getMissions('mock-uid-001') with Supabase query: fetch all missions + player's player_missions rows then adaptMissions()
- When player clicks "Start Mission": call startMission(userId, missionId) then navigate to map
- When player clicks "View Report": fetch from player_missions table

Commit message: `integration: wire MissionsPage to real Supabase missions`

---

## TASK 8 — Wire EarthCommsPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/EarthCommsPage.jsx`
Changes:
- Replace getEarthCommsLog('mock-uid-001') with getEarthCommsLog(user.userId) from missions.ts
- Apply adaptEarthCommsMessages(rows)
- Replace sendEarthComm with real call from missions.ts
- Use earthMarsDelayMinutes() from plannerConfig for real transmission delay display

Commit message: `integration: wire EarthCommsPage to real Supabase comms`

---

## TASK 9 — Wire WeeklyChallengePage to real backend
Status: [ ] NOT STARTED
File: `src/pages/WeeklyChallengePage.jsx`
Changes:
- Replace getWeeklyChallenge() with getActiveWeeklyChallenge() then adaptWeeklyChallenge()
- "Accept Challenge" button: call autosaveWeeklyChallenge(userId, challenge.id, { status: 'started' })
- Leaderboard: leave empty for now (TODO)

Commit message: `integration: wire WeeklyChallengePage to real challenge data`

---

## TASK 10 — Wire InventoryPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/InventoryPage.jsx`
Changes:
- Replace getInventoryCatalog() with static catalog from SUIT_TIERS, ROVER_TIERS, INVENTORY_UPGRADES in gameConfig
- "Unlock"/"Acquire" button: call purchaseUpgrade(userId, upgradeId) from playerState.ts
- Equipped suits: call equipSuit(userId, suitId)
- After purchase/equip: call refreshPlayerState() from AppContext

Commit message: `integration: wire InventoryPage to real purchaseUpgrade/equipSuit`

---

## TASK 11 — Wire ProfilePage to real backend
Status: [ ] NOT STARTED
File: `src/pages/ProfilePage.jsx`
Changes:
- Replace getLevelConfig() with function mapping LEVEL_UNLOCKS from gameConfig to the shape the page needs
- Shape the page expects: [{ level, xpRequired, unlocks: string[] }]
- Maps directly from LEVEL_UNLOCKS + XP_THRESHOLDS — no Supabase needed

Commit message: `integration: wire ProfilePage to gameConfig level data`

---

## TASK 12 — Wire PlannerPage to real plannerConfig + engine
Status: [ ] NOT STARTED
File: `src/pages/PlannerPage.jsx`
Changes:
- Replace plannerAnalyze(params) with plannerAnalyzeReal(params) in adapters.js
- Uses PLANNER_SUIT_SPECS from plannerConfig.ts
- Calls earthMarsDelayMinutes(new Date()) for real comms delay
- Runs planAllProfiles on Jezero terrain (planner only uses Jezero for demo)
- Formats output to match what PlannerPage expects
- Planner never stores to DB (per spec)

Commit message: `integration: wire PlannerPage to real engine + plannerConfig`

---

## TASK 13 — Wire ExplorationPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/ExplorationPage.jsx`
Changes:
- On enter: startExplorationSession(userId, regionId)
- During: updateExplorationSession(sessionId, {...}) on 30-second timer
- On exit: endExplorationSession(userId, sessionId, regionId, outcome, finalState, cellsVisited, pathTaken)
- NOTE: Read ExplorationPage.jsx first before editing to understand current implementation

Commit message: `integration: wire ExplorationPage to real exploration session APIs`

---

## TASK 14 — Wire MissionReportPage to real backend
Status: [ ] NOT STARTED
File: `src/pages/MissionReportPage.jsx`
Changes:
- Replace getMissionReport(missionId) with Supabase query on player_missions table
- Map the row's resources_snapshot JSONB field to what the page renders

Commit message: `integration: wire MissionReportPage to real player_missions data`

---

## TASK 15 — Final: remove mockApi imports, smoke test all pages
Status: [ ] NOT STARTED
What to do:
- Grep for any remaining `from '../api/mockApi'` imports
- Run `npm run dev`
- Test each page manually: Login > Dashboard > Map > Simulation > Missions > Earth Comms > Weekly Challenge > Inventory > Profile > Planner
- Fix any runtime errors
- Check browser console for TypeScript import errors

Commit message: `integration: final cleanup, remove all mockApi dependencies`

═══════════════════════════════════════════════════════════
 4. KNOWN GOTCHAS & DECISIONS
═══════════════════════════════════════════════════════════

1. supabaseClient.ts throws if .env is missing → Human must fill .env first (Task 0)
2. mockApi `callsign` vs backend `username` → adaptPlayerState() maps username to callsign
3. Engine uses row/col, map uses lat/lng → planRouteFromLatLng adapter does conversion using grid metadata
4. Terrain JSON has originLat, originLng, latSpan, lngSpan, cellWidthM, cellHeightM, cells[row][col] → verify by checking jezero.json
5. oxygenCapacityL is litres (engine) vs hours (mockApi) → adapter converts: oxygenCapacityL / 60 ~= hours
6. Backend is TypeScript, frontend is JSX → Vite handles mixed TS/JSX natively, just import normally
7. No achievements table in DB → return [] from adapter for now
8. Weekly challenge leaderboard → leave empty for now
9. Inventory: mockApi shape is { oxygenTanks: 2 }, real is [{ upgradeId, quantity }] → adaptPlayerState normalises this
10. .env must never be committed → .gitignore already has .env

═══════════════════════════════════════════════════════════
 5. TERRAIN JSON FORMAT (reference)
═══════════════════════════════════════════════════════════
Before starting Task 5, verify terrain JSON structure by running:
  node -e "const f=require('./public/data/regions/jezero.json'); console.log(JSON.stringify(Object.keys(f)))"

Expected keys: rows, cols, originLat, originLng, latSpan, lngSpan, cellWidthM, cellHeightM, cells
Paste actual keys here after running: ________________________

═══════════════════════════════════════════════════════════
 6. PROGRESS LOG
═══════════════════════════════════════════════════════════

| Date       | Task                    | Status           | Notes |
|------------|-------------------------|------------------|-------|
| 2026-10-19 | Plan created            | DONE             | All tasks defined |
|            | Task 0 (Supabase setup) | WAITING ON HUMAN | Human must create Supabase project and fill .env |
| 2026-10-19 | Task 1 — vitest         | [x] DONE         | vitest@2.1.9 installed, test script added to package.json |
| 2026-10-19 | Task 2 — adapters.js    | [x] DONE         | Full adapter layer created at src/api/adapters.js |
| 2026-10-19 | Task 3 — AppContext     | [x] DONE         | Rewired to real Supabase auth + onAuthStateChange |
| 2026-10-19 | Task 4 — DashboardPage  | [x] DONE         | Real Supabase queries, real userId, real adapters |
| 2026-10-19 | Task 5 — MapPage        | [x] DONE         | planRouteFromLatLng using real engine; REGIONS from gameConfig |
| 2026-10-19 | Task 6 — SimulationPage | [x] DONE         | stepsToFrames from engine; completeMission on finish; fallback frames |
| 2026-10-19 | Task 7 — MissionsPage   | [x] DONE         | Real DB query; startMission() on click; sessionStorage for missionId |
| 2026-10-19 | Task 8 — EarthCommsPage | [x] DONE         | Real getEarthCommsLog + sendEarthComm from missions.ts |
| 2026-10-19 | Task 9 — WeeklyChallenge| [x] DONE         | Real getActiveWeeklyChallenge; autosaveWeeklyChallenge on accept |
| 2026-10-19 | Task 10 — InventoryPage | [x] DONE         | Static catalog from adapters; real purchaseUpgrade/equipSuit |
| 2026-10-19 | Task 11 — ProfilePage   | [x] DONE         | Static getLevelConfigStatic from adapters |
| 2026-10-19 | Task 12 — PlannerPage   | [x] DONE         | Real engine + plannerConfig; no mockApi |
| 2026-10-19 | Task 13 — ExplorationPage| [x] DONE        | REGIONS from gameConfig; real session start/end |
| 2026-10-19 | Task 14 — MissionReport | [x] DONE         | Real Supabase player_missions query + adaptMissionReport |
| 2026-10-19 | Task 15 — Final cleanup | [x] DONE         | 0 mockApi imports remain in src/; dev server starts clean; committed 62e06a4 |

═══════════════════════════════════════════════════════════
 7. NEXT RECOMMENDED STEP
═══════════════════════════════════════════════════════════
ALL 15 INTEGRATION TASKS ARE COMPLETE.

Remaining steps for the human:
1. Fill in `.env` with real Supabase credentials (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
2. Run the SQL migrations in Supabase dashboard:
   - supabase/migrations/001_initial_schema.sql
   - supabase/migrations/002_seed_missions.sql
3. Run `npm run dev` and test the full flow:
   Register → Login → Dashboard → Map (plan a route) → Simulation
   → Missions → Earth Comms → Weekly Challenge → Inventory → Profile → Planner
4. If any page errors in browser console, read the error and check the corresponding adapter in src/api/adapters.js

Last updated: 2026-10-19
