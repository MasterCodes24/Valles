# Valles — Member 2 API Specification
## Engine & Backend Handoff Document

> **Status:** All engine functions are implemented and tested. All API functions are implemented against Supabase. Use mock/stub data until the Supabase project is connected — all interfaces are defined below.

---

## Quick-Start for Member 2

```ts
// 1. Import engine functions
import { planRoute, planAllProfiles, ROUTE_PROFILES, defaultResourceState } from "@engine/index";

// 2. Import API functions  
import { loginUser, registerUser, getPlayerState, awardXp } from "@api/auth";
import { completeMission, getEarthCommsLog, sendEarthComm } from "@api/missions";

// 3. Load terrain data for a region
const jezeroGrid = await fetch("/data/regions/jezero.json").then(r => r.json());

// 4. Plan a route
const result = planAllProfiles({ row: 0, col: 0 }, { row: 19, col: 19 }, jezeroGrid);
// result.fast, result.balanced, result.safe — each is PlanRouteResult | null
```

---

## Section 1: Shared Engine (`src/engine/`)

> Pure TypeScript — no UI dependencies. Usable in unit tests and directly in the browser.

### `planRoute(start, end, grid, weights, initState?)` → `PlanRouteResult | null`

Plan a single route using specific cost weights.

```ts
import { planRoute, ROUTE_PROFILES, defaultResourceState } from "@engine/index";

const result = planRoute(
  { row: 0, col: 0 },                    // GridPosition: start
  { row: 19, col: 19 },                  // GridPosition: end
  jezeroGrid,                            // TerrainGrid (loaded from JSON)
  ROUTE_PROFILES.balanced,               // CostWeights
  { hasRover: false, oxygenL: 630 }      // Partial<ResourceState> — optional
);

// Returns null if no path exists (completely blocked)
if (result === null) { /* handle no-path */ }

// result.route          — GridPosition[] (ordered path)
// result.routeStats     — RouteStats object (see below)
```

**`RouteStats` fields:**
| Field | Type | Description |
|-------|------|-------------|
| `totalDistanceM` | `number` | Total route distance in metres |
| `totalTimeH` | `number` | Estimated in-game hours |
| `oxygenUsedL` | `number` | Litres of O2 consumed |
| `radiationAccum` | `number` | Radiation accumulated [0–1] |
| `batteryUsedPct` | `number` | Battery % used (0 if no rover) |
| `commsBlackoutH` | `number` | Hours without comms |
| `safetyCheck` | `SafetyCheckResult` | Safety check results |
| `stepStates` | `ResourceState[]` | Resource state at each step |
| `isSurvivable` | `boolean` | Can the player complete this route alive? |

---

### `planAllProfiles(start, end, grid, initState?)` → `{ fast, balanced, safe }`

Plan all three route profiles at once. Use this for the route comparison UI.

```ts
const routes = planAllProfiles(
  { row: 0, col: 0 },
  { row: 19, col: 19 },
  jezeroGrid
);

routes.fast     // PlanRouteResult | null — shortest time, ignores hazards
routes.balanced // PlanRouteResult | null — balanced trade-offs
routes.safe     // PlanRouteResult | null — avoids hazards strongly
```

---

### `ROUTE_PROFILES` — Cost Weight Presets

```ts
import { ROUTE_PROFILES } from "@engine/index";

ROUTE_PROFILES.fast            // Speed-biased
ROUTE_PROFILES.balanced        // Balanced
ROUTE_PROFILES.safe            // Hazard-averse (heavy hazard/radiation penalty)
ROUTE_PROFILES.planner_default // Mission Planner ultra-safe mode
```

You can also pass a custom `CostWeights` object to `planRoute`.

---

### `defaultResourceState(overrides?)` → `ResourceState`

Create an initial resource state. Override any fields.

```ts
const state = defaultResourceState({
  oxygenL: 630,           // active suit's capacity
  oxygenCapacityL: 630,
  hasRover: true,
  batteryPct: 100,
});
```

**`ResourceState` fields:**
| Field | Type | Description |
|-------|------|-------------|
| `oxygenL` | `number` | Remaining O2 in litres |
| `oxygenCapacityL` | `number` | Max O2 capacity |
| `radiationAccum` | `number` | Accumulated radiation [0–1] |
| `batteryPct` | `number` | Battery remaining % (–1 = no rover) |
| `elapsedH` | `number` | In-game hours elapsed |
| `commsBlackoutH` | `number` | Cumulative comms blackout hours |
| `hasRover` | `boolean` | Whether rover is active |

---

### `GridPosition` Type

```ts
interface GridPosition { row: number; col: number; }
```

---

### `TerrainGrid` Type (from JSON)

Loaded from `/public/data/regions/<regionId>.json`. Matches this interface exactly:

```ts
interface TerrainGrid {
  regionId: string;
  rows: number;      // 20
  cols: number;      // 20
  cellWidthM: number;
  cellHeightM: number;
  cells: GridCell[]; // row-major: cells[row * cols + col]
}
```

**`GridCell` fields:**
| Field | Type | Description |
|-------|------|-------------|
| `row`, `col` | `number` | Grid position |
| `elevationM` | `number` | Elevation in metres |
| `slopeDeg` | `number` | Slope in degrees [0–90] |
| `roughness` | `number` | Surface roughness [0–1] |
| `hazard` | `HazardType` | Dominant hazard type |
| `hazardSeverity` | `number` | Hazard severity [0–1] |
| `radiationLevel` | `number` | Radiation level [0–1] |
| `commsAvailable` | `boolean` | Ground comms line-of-sight |
| `commsStrength` | `number` | Signal strength [0–1] |
| `terrainType` | `TerrainType` | Terrain classification |
| `isRestPoint` | `boolean` | Safe shelter/rest point |
| `isImpassable` | `boolean` | Cannot be traversed |

---

### Step-through Simulation

Use `routeStats.stepStates` for the simulation screen — it's a `ResourceState[]` where index `i` is the state after visiting `route[i+1]`.

```ts
const result = planRoute(start, end, grid, ROUTE_PROFILES.balanced);
const { route, routeStats } = result!;

for (let step = 0; step < routeStats.stepStates.length; step++) {
  const position = route[step + 1];          // current cell
  const resources = routeStats.stepStates[step]; // resource state here
  // update your UI
}
```

---

## Section 2: Auth API (`src/api/auth.ts`)

### `registerUser(email, password, username)` → `{ userId, error }`

```ts
const { userId, error } = await registerUser("commander@mars.gov", "password123", "Cmdr_Lewis");
```

### `loginUser(email, password)` → `{ userId, error }`

```ts
const { userId, error } = await loginUser("commander@mars.gov", "password123");
```

### `logoutUser()` → `{ error }`

```ts
await logoutUser();
```

### `onAuthStateChange(callback)` → Unsubscribe function

```ts
const { data: { subscription } } = onAuthStateChange((userId) => {
  if (userId) {
    // User logged in → load player state
  } else {
    // User logged out → show login screen
  }
});
// Call subscription.unsubscribe() on component unmount
```

---

## Section 3: Player State API (`src/api/playerState.ts`)

### `getPlayerState(userId)` → `PlayerState | null`

**Primary call after login.** Returns everything needed to initialise the game.

```ts
const state = await getPlayerState(userId);
```

**`PlayerState` fields:**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | UUID |
| `username` | `string` | Login username |
| `displayName` | `string` | Display name |
| `level` | `number` | Current level [1–10] |
| `xp` | `number` | Total XP |
| `currency` | `number` | In-game currency |
| `activeSuitId` | `string` | Active suit ID |
| `activeSuit` | `SuitTier` | Full suit spec |
| `hasRover` | `boolean` | Rover unlocked |
| `activeRover` | `RoverStats \| null` | Rover spec if available |
| `currentRegionId` | `string` | Current region |
| `inventory` | `InventoryItem[]` | Owned upgrades |
| `unlockedSuits` | `string[]` | Suit IDs the player has |
| `totalMissionsCompleted` | `number` | Career stat |
| `isExtractionComplete` | `boolean` | Level 10 ending done |

### `awardXp(userId, amount, source, description?)` → `AwardXpResult`

```ts
const result = await awardXp(userId, 300, "mission_complete", "Jezero Mission 1");
// result.leveledUp — boolean
// result.newLevel  — number
// result.newUnlocks — string[] (what unlocked, for celebration UI)
```

### `purchaseUpgrade(userId, upgradeId)` → `{ success, error }`

```ts
const { success, error } = await purchaseUpgrade(userId, "o2_tank_1");
```

### `equipSuit(userId, suitId)` → `{ success, error }`

```ts
await equipSuit(userId, "suit_advanced");
```

### `getRegionProgress(userId, regionId)` → `RegionProgress | null`

```ts
const progress = await getRegionProgress(userId, "jezero");
// progress.cellsExplored, .totalDistanceM, .discoveredRestPts, etc.
```

---

## Section 4: Missions API (`src/api/missions.ts`)

### `startMission(userId, missionId)` → `{ success, error }`

Call when player confirms mission and departs.

```ts
await startMission(userId, "jezero_m1");
```

### `completeMission(userId, missionId, routeProfile, routeTaken, finalState, initialState)` → `{ report, error }`

**Primary autosave trigger.** Awards XP, currency, generates report, sends Earth comm.

```ts
const { report, error } = await completeMission(
  userId,
  "jezero_m1",
  "balanced",       // routeProfile
  routeTaken,       // GridPosition[] — from planRoute result
  finalState,       // ResourceState at mission end
  initialState,     // ResourceState at mission start
);

// report.narrative    — "Martian"-style log text, ready to display
// report.efficiencyScore — 0–100 for efficiency badge
// report.xpAwarded, report.bonusXp
```

### Exploration Session

```ts
// Start session
const { sessionId } = await startExplorationSession(userId, "jezero");

// Autosave during exploration (call regularly)
await updateExplorationSession(sessionId, {
  distanceM: 1200,
  cellsVisited: 8,
  oxygenUsedL: 42,
  radiationAccum: 0.03,
  pathTaken: [...],
});

// End session
await endExplorationSession(
  userId, sessionId, "jezero",
  "safe_return",   // outcome: "safe_return" | "rescue" | "timeout"
  finalState,
  cellsVisited,
  pathTaken
);
```

### `getActiveWeeklyChallenge()` → `{ challenge, error }`

```ts
const { challenge } = await getActiveWeeklyChallenge();
// challenge.title, .description, .objective, .xp_reward, .week_end
```

### `autosaveWeeklyChallenge(userId, challengeId, challengeSave)` → `void`

Call during weekly challenge to persist isolated save state.

### `completeWeeklyChallenge(userId, challengeId, xpReward)` → `void`

### Earth Comms

```ts
// Get log (most recent first)
const { messages } = await getEarthCommsLog(userId, 50);
// message.direction — "to_earth" | "from_earth"
// message.subject, .body, .sent_at, .received_at
// message.is_read, .message_type

// Send a personal log entry
await sendEarthComm(userId, {
  direction: "to_earth",
  subject: "Day 42 Log",
  body: "The dust storm passed. I'm still alive...",
  messageType: "personal",
});

// Mark as read
await markCommRead(messageId);
```

---

## Section 5: Config Tables (`src/config/gameConfig.ts`)

All data Member 2 needs for display — imported directly, no API call needed.

```ts
import {
  MAX_LEVEL, XP_THRESHOLDS, XP_AWARDS,
  LEVEL_UNLOCKS, SUIT_TIERS, ROVER_TIERS,
  INVENTORY_UPGRADES, REGIONS,
  levelFromXp, xpForLevel,
} from "@config/gameConfig";

// Level-up display
const unlocks = LEVEL_UNLOCKS.find(u => u.level === newLevel)?.unlocks ?? [];

// XP bar
const xpForNext = xpForLevel(currentLevel + 1);
const progress = currentXp / xpForNext;

// Suit display
const suitSpec = SUIT_TIERS.find(s => s.id === activeSuitId);

// Region list with lock status
const availableRegions = REGIONS.filter(r => r.unlockLevel <= playerLevel);
```

---

## Section 6: Terrain Data Files

**Location:** `/public/data/regions/<regionId>.json`

All 5 regions are pre-generated. Load with `fetch`:

```ts
const grid = await fetch(`/data/regions/${regionId}.json`).then(r => r.json());
```

| Region ID | Name | Difficulty | Unlock Level |
|-----------|------|------------|--------------|
| `jezero` | Jezero Crater | 1 | 1 |
| `valles_marineris` | Valles Marineris | 3 | 4 |
| `olympus_mons` | Olympus Mons Foothills | 4 | 6 |
| `arcadia_planitia` | Arcadia Planitia | 4 | 8 |
| `hellas_basin` | Hellas Basin | 5 | 9 |

Grid coordinates: row 0 = top, col 0 = left. All grids are 20×20.

---

## Section 7: Stub Data for Development

Use the test grid factory to generate mock data before Supabase is connected:

```ts
import { buildUniformGrid, buildIntegrationTestGrid, TEST_GRID_5X5 } from "@engine/testGrid";

// Quick flat grid
const mockGrid = buildUniformGrid("jezero", 20, 20, 1500, 1500);

// Complex test grid with hazards
const testGrid = buildIntegrationTestGrid();
```

### Mock PlayerState stub

```ts
const mockPlayerState: PlayerState = {
  userId: "mock-user-1",
  username: "Commander",
  displayName: "Commander Lewis",
  level: 3,
  xp: 1800,
  currency: 450,
  activeSuitId: "suit_advanced",
  activeSuit: SUIT_TIERS[1],
  hasRover: false,
  activeRover: null,
  currentRegionId: "jezero",
  inventory: [{ upgradeId: "o2_tank_1", quantity: 1 }],
  unlockedSuits: ["suit_base", "suit_advanced"],
  totalMissionsCompleted: 4,
  isExtractionComplete: false,
};
```

---

## Section 8: Mission Planner (Product B) — Additional APIs

### Earth-Mars Comms Delay

```ts
import { earthMarsDelayMinutes } from "@config/plannerConfig";

const delayMin = earthMarsDelayMinutes(); // for current date
// → e.g. 12.4 (minutes one-way)
```

### Planner Suit Specs

```ts
import { PLANNER_SUIT_SPECS, PLANNER_THRESHOLDS } from "@config/plannerConfig";

// Suits for planner input form dropdown
PLANNER_SUIT_SPECS.forEach(suit => { /* suit.name, suit.nominalEvaH, etc. */ });

// Abort thresholds for output display
PLANNER_THRESHOLDS.o2AbortFraction  // 0.25
PLANNER_THRESHOLDS.maxSlopeDeg      // 30
```

### Planner route (use planner_default weights)

```ts
import { ROUTE_PROFILES } from "@engine/index";

const plannerResult = planRoute(start, end, grid, ROUTE_PROFILES.planner_default, initState);
// Same PlanRouteResult interface — safety check is always included
```

---

## Section 9: Environment Setup

Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Until Supabase is set up, all API calls will fail gracefully. Use mock data stubs for your screens.

---

## Section 10: File Structure Reference

```
src/
├── engine/
│   ├── types.ts          — GridCell, TerrainGrid, GridPosition
│   ├── costFunction.ts   — cellCost(), ROUTE_PROFILES
│   ├── pathfinder.ts     — findPath()
│   ├── resourceSim.ts    — simulatePath(), computeCellDelta()
│   ├── safetyCheck.ts    — checkRouteSafety(), findRestPoints()
│   ├── testGrid.ts       — buildUniformGrid(), TEST_GRID_5X5
│   └── index.ts          — planRoute(), planAllProfiles() (public API)
├── api/
│   ├── supabaseClient.ts — supabase singleton
│   ├── auth.ts           — register/login/logout
│   ├── playerState.ts    — getPlayerState(), awardXp(), etc.
│   └── missions.ts       — completeMission(), exploration, comms
└── config/
    ├── gameConfig.ts     — all game constants and config tables
    └── plannerConfig.ts  — planner suit specs, thresholds, comms delay

public/data/regions/
├── jezero.json
├── valles_marineris.json
├── olympus_mons.json
├── arcadia_planitia.json
└── hellas_basin.json

supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_seed_missions.sql
└── functions/
    └── rotate-weekly-challenge/index.ts
```
