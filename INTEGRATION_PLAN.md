PROJECT NAME: Mars Survival — Game & Mission-Planning Platform

═══════════════════════════════════════════════════════════
 0. AGENT INSTRUCTIONS — READ THIS FIRST, EVERY SESSION
═══════════════════════════════════════════════════════════
Before writing or changing any code, do the following, in order:

1. Check if a file named PROJECT_STATE.md exists in the repo root.
   - If it does NOT exist, create it now using the "PROJECT_STATE.md TEMPLATE"
     section near the bottom of this prompt. This file is the persistent
     memory of the project. It must always reflect current reality.
   - If it DOES exist, read it fully before doing anything else. It tells
     you what has already been built, what decisions were made, and what
     to do next. Treat it as more authoritative than your own assumptions
     or this prompt's defaults, if the two ever conflict (it means a
     decision was made later that overrides the default).

2. After completing any meaningful unit of work (a feature, a fixed bug,
   a new file, a decision made, a library chosen), update PROJECT_STATE.md
   immediately — what changed, what's next, and any decision made along
   the way. Do not wait until "the end" to update it. If the session ends
   abruptly, the file must still be accurate.

3. Never assume continuity from a previous chat/session. Always re-derive
   context from PROJECT_STATE.md and the codebase itself, not from memory
   of a prior conversation. This project may be picked up by a different
   model, a different account, or a different day — the repo and
   PROJECT_STATE.md are the only reliable source of truth.

4. If this prompt and PROJECT_STATE.md conflict, PROJECT_STATE.md wins —
   it represents decisions made after this prompt was written. If nothing
   in PROJECT_STATE.md addresses the conflict, this prompt wins.

5. Work in small, demonstrable increments. After each increment, the app
   should still run. Never leave the project in a broken, half-wired state
   at the end of a session — finish the increment or revert it.

═══════════════════════════════════════════════════════════
 1. PROJECT OVERVIEW
═══════════════════════════════════════════════════════════
This project has TWO distinct products sharing one underlying route-planning
engine. Build them as separate modes/apps within one repo, not as one blended
product.

PRODUCT A — "Mars Survival" (the game, primary deliverable, build this first)
A persistent, level-and-XP-based survival game. Players create an account,
explore Mars region by region, manage survival resources, complete missions,
and progress from Level 1 to Level 10, ending with an extraction sequence.

PRODUCT B — "Mission Planner" (the professional concept, build second,
can be a simplified/conceptual version for demo purposes)
A realistic decision-support tool concept for actual astronaut EVA
(extravehicular activity) route planning, emphasizing accuracy, safety
margins, and human-in-the-loop decision-making over gamification. This
does NOT need real NASA-grade validation for the demo — it needs to look
and function like a serious professional tool, clearly distinct in tone
and UI from the game.

Both products reuse the same core engine:
- A cost-grid representation of Martian terrain
- A* pathfinding over that grid
- A resource consumption simulation (oxygen, time, radiation, comms,
  battery)
The game wraps this engine in XP/levels/inventory/narrative. The planner
wraps it in a clinical, data-driven interface with safety thresholds and
human sign-off steps.

═══════════════════════════════════════════════════════════
 2. PRODUCT A: GAME — DETAILED SPEC
═══════════════════════════════════════════════════════════

2.1 Accounts & persistence
- Users register/log in (email+password at minimum; social login optional).
- Persistent per-user data: level, XP, unlocked suits, owned rover(s),
  inventory/upgrades, exploration history per region, weekly challenge
  status, in-progress mission state, Earth-communication log history.
- Autosave after: mission completion, any XP-earning event, exploration
  session end, weekly challenge progress update. Do not rely on manual
  save actions only.

2.2 Levels & XP
- 10 levels for the demo build (design the system so more could be added
  later without a rework — don't hardcode "10" everywhere, store it as a
  config constant MAX_LEVEL).
- XP sources: completing story missions, surviving exploration sessions,
  completing the weekly challenge, efficiency bonuses (oxygen saved,
  hazards avoided, no emergency rescue used).
- Each level-up unlocks something concrete (see 2.3). Maintain a single
  config table (e.g. levels.json or a DB table) mapping level -> unlocks,
  so balancing is a data change, not a code change.

2.3 Unlockable gear
- Suits: tiers with increasing oxygen capacity, radiation shielding, dust
  resistance. Base suit at Level 1.
- Rover: unlocked at a mid-level (default: Level 4, configurable). Enables
  much greater travel distance per session, consumes battery, limited by
  terrain roughness.
- Inventory upgrades: oxygen tank capacity, battery capacity, radiation
  shielding, water storage, suit repair kits. Purchased with an in-game
  currency earned from missions/exploration, or unlocked directly by level
  (your call — default to a hybrid: unlocked at a level, then upgraded
  further with currency).

2.4 World: multi-region Mars map
- Do NOT limit to Jezero Crater. Support multiple named regions (minimum
  for demo: Jezero Crater, Valles Marineris, Olympus Mons foothills — add
  more if time allows).
- Each region has: its own terrain cost grid (derived from real elevation
  data where feasible, synthetic/approximated if time-constrained), its
  own hazard mix, and a difficulty tier.
- Regions are gated by player level (default: Jezero available from Level
  1, each additional region unlocks at a higher level, hardest region
  reserved for Level 9-10).

2.5 Daily survival loop
- In-game time passes (define a day-length constant, e.g. 1 real minute =
  1 in-game hour, configurable). Time passing costs resources even outside
  active missions, UNLESS the player is at a safe base/rest point.
- This loop underlies both Exploration Mode and missions — all draw from
  and affect the same character resource state (oxygen, radiation
  accumulated, suit integrity).

2.6 Exploration Mode
- Free-roam within an unlocked region. No fixed objective.
- Still bounded by real constraints: oxygen, comms range, travel time,
  distance from base, radiation exposure.
- All discoveries, mapped terrain, and XP earned persist to the main save
  immediately (not just at session end).

2.7 Story missions
- Structured objectives within a region (reach a site, collect a sample,
  survive N in-game hours, return safely).
- On completion: generate a mission report (see 2.9) and award XP.

2.8 Weekly challenge
- One challenge live per week, shared across all players: travel to a
  specific dangerous region and survive there for a full in-game week.
- Track as a SEPARATE save-state from main campaign progress, so failure
  doesn't cost main-game progress.
- Needs a scheduler (server-side cron or equivalent) to rotate/reset the
  challenge weekly.

2.9 Earth communication / mission log
- Frame status updates and mission reports as transmissions to Earth
  (tone: "The Martian" style personal log), not dry data dumps.
- Two-way: Earth can also send messages to the player (e.g. "storm
  incoming," "resupply window open") — use this as the narrative delivery
  mechanism for in-game events.

2.10 Ending (Level 10)
- Reaching Level 10 and completing its mission triggers an extraction
  sequence: Earth sends a rocket/shuttle, player completes a final mission
  to reach the pickup site in time, game ends with a clear "you survived
  Mars" conclusion screen.

═══════════════════════════════════════════════════════════
 3. PRODUCT B: MISSION PLANNER — DETAILED SPEC
═══════════════════════════════════════════════════════════
Build this as conceptually realistic, not actually certified for real
missions. Clearly label it in the UI as a concept/demo tool. Do not claim
real operational accuracy anywhere in the UI copy.

3.1 Inputs
- Start location, destination, suit model (from a defined spec sheet, not
  the game's gamified suits), departure time, mission objective.

3.2 Processing (conceptual, can use simplified/mock data sources for demo)
- Terrain cost grid at higher simulated resolution than the game.
- Comms delay computed from Earth-Mars distance at the given date (this
  CAN be done for real — it's simple orbital math, not speculative. Use a
  real or simplified ephemeris calculation).
- Hazard data tagged with a confidence/uncertainty value, not treated as
  ground truth.
- Resource model calibrated to look like real suit specs (define
  plausible oxygen/CO2/thermal/battery figures and cite that they are
  illustrative, not validated).

3.3 Output
- A recommended route plus best-case and worst-case resource forecasts
  (can be a simplified Monte Carlo-style spread, not necessarily a full
  statistical model for the demo).
- Explicit abort thresholds, shown clearly, with anything close to a
  threshold flagged for human review rather than auto-decided.
- The system NEVER auto-commits to a decision — every output ends in a
  recommendation with a visible "awaiting human approval" state.

3.4 UI/tone
- Clinical, data-dense, high-contrast "mission control" aesthetic — the
  opposite of the game's playful tone. This contrast is itself part of the
  pitch (same engine, two very different applications).

═══════════════════════════════════════════════════════════
 4. SHARED ENGINE — TECHNICAL SPEC
═══════════════════════════════════════════════════════════

4.1 Terrain representation
- Each region is a grid of cells (game: ~20x20 per region is enough;
  planner: higher resolution if feasible).
- Each cell stores: elevation, slope, roughness, hazard type(s) and
  severity, radiation level, comms availability (line-of-sight boolean or
  signal strength), terrain type (for movement speed).

4.2 Cost function
cost(cell) = w_d * distance + w_s * slope + w_r * roughness
           + w_h * hazard + w_x * radiation + w_c * comms_gap
- Weights are configurable per "route profile" (fast / balanced / safe in
  the game; safety-biased default in the planner).

4.3 Pathfinding
- A* search over the grid from start to destination cell.
- Generate multiple routes by varying weights, not by running separate
  algorithms.

4.4 Resource simulation
- Time = distance / terrain-adjusted speed.
- Oxygen = base rate × terrain multiplier × distance (and × time if
  idle/resting costs oxygen too).
- Radiation = zone level × time spent in zone, accumulated.
- Battery (rover only) = distance × power per km × terrain multiplier.
- Comms = per-cell line-of-sight flag; track cumulative blackout time.

4.5 Rest-point / safety rule
- For any generated route, verify that from every point along it, a rest
  point (game) or abort-safe point (planner) is reachable with the oxygen
  remaining at that point. Flag or reject routes that fail this check.

4.6 Implementation note
- Build this engine as a standalone module/package (e.g. /engine or a
  separate internal library) with NO game-specific or planner-specific
  code inside it. Both products import and configure it. This is required
  — do not duplicate pathfinding/resource logic between the two products.

═══════════════════════════════════════════════════════════
 5. TECH STACK (use these unless PROJECT_STATE.md records a change)
═══════════════════════════════════════════════════════════
- Frontend: React, Tailwind CSS (or shadcn/ui), Zustand for state.
- Map: MapLibre GL JS or Leaflet, with a deck.gl overlay for hazard/heat
  layers.
- Charts: Recharts or Chart.js (oxygen curve, elevation profile).
- Game-feel polish (optional, lower priority): Framer Motion for
  level-up/unlock animations.
- Backend & DB: Supabase (Postgres + Auth + Edge Functions). Use Supabase
  Auth for login/register. Use Postgres tables for users, levels/XP,
  inventory, regions, missions, weekly_challenges, exploration_logs,
  earth_comms_log.
- Scheduled jobs (weekly challenge rotation): Supabase Edge Functions on a
  cron schedule, or pg_cron if available.
- Hosting: Vercel (frontend), Supabase (backend).
- Terrain data preprocessing (one-time, offline, not part of the live
  app): Python with NumPy/rasterio to convert MOLA/HiRISE elevation data
  into the grid format the engine consumes. Store output as static JSON/
  binary files the frontend loads per region — do not compute this live.
- If real elevation data integration proves too time-consuming, fall back
  to procedurally generated synthetic terrain with the same data shape,
  and record this fallback decision in PROJECT_STATE.md.

═══════════════════════════════════════════════════════════
 6. BUILD ORDER (work through these phases in sequence; do not skip
    ahead — update PROJECT_STATE.md after each phase)
═══════════════════════════════════════════════════════════
Phase 1: Repo scaffolding, Supabase project setup, auth (register/login),
         empty PROJECT_STATE.md initialized.
Phase 2: Shared engine module (grid representation, cost function, A*,
         resource simulation, rest-point check) with unit tests on a
         single synthetic test grid, independent of any UI.
Phase 3: One region (Jezero) wired end-to-end in the GAME: map display,
         start/destination selection, three route profiles, route
         comparison UI.
Phase 4: Game simulation screen — step-through resource tracking, alerts,
         mid-mission player choices (continue/rest/shelter/return).
Phase 5: Accounts persistence — level/XP, inventory, unlocks tied to
         level, autosave wiring.
Phase 6: Exploration Mode on Jezero, with persistent progress saving.
Phase 7: Second and third regions added, level-gated.
Phase 8: Weekly challenge system (separate save-state, scheduler).
Phase 9: Earth-communication log screen, mission report screens, ending
         sequence at Level 10.
Phase 10: Mission Planner (Product B) — can reuse the shared engine
          directly; build its distinct UI and output format.
Phase 11: Polish pass, full playtest, demo script rehearsal.

═══════════════════════════════════════════════════════════
 7. CODING CONVENTIONS
═══════════════════════════════════════════════════════════
- TypeScript everywhere (frontend and any Node-based backend code).
- The shared engine module must have zero dependencies on React or any
  UI framework — pure functions/classes only, so it's testable and
  reusable between the two products.
- Config values (MAX_LEVEL, day-length, default weights, etc.) live in a
  single config file per product, not scattered as magic numbers.
- Every new feature gets at least a minimal test if it touches the engine
  or resource math (correctness here matters more than UI polish).
- Commit in small, working increments; do not let the repo sit in a
  non-running state between commits.

═══════════════════════════════════════════════════════════
 8. PROJECT_STATE.md TEMPLATE (create this file if it doesn't exist)
═══════════════════════════════════════════════════════════
# Project State

## Current phase
(which phase from Section 6, and % complete)

## What's built and working
(bullet list, kept current)

## What's in progress
(bullet list)

## What's not started
(bullet list)

## Decisions made that override or extend this prompt
(e.g. "switched from Supabase to Firebase because X" — date each entry)

## Known issues / unfinished edges
(bullet list)

## Next recommended step
(single clear instruction for whoever/whatever picks this up next)

Last updated: (date)
═══════════════════════════════════════════════════════════
END OF PROMPT
═══════════════════════════════════════════════════════════