# Project State — Valles: Interplanetary Survival Guide

## Current phase
Phase 1–2 COMPLETE (Repo scaffolding + Shared Engine)

## What's built and working

### Core Engine (`src/engine/`) ✅
- `types.ts` — GridCell, TerrainGrid, GridPosition type definitions
- `costFunction.ts` — cellCost() with configurable weights; ROUTE_PROFILES (fast/balanced/safe/planner_default)
- `pathfinder.ts` — findPath() A* with 8-directional movement, binary min-heap, diagonal cost correction
- `resourceSim.ts` — simulatePath(), computeCellDelta(), defaultResourceState(), pathIsSurvivable()
- `safetyCheck.ts` — checkRouteSafety(), findRestPoints(), canReachSafety()
- `testGrid.ts` — buildUniformGrid(), buildGridFromPresets(), buildIntegrationTestGrid(), TEST_GRID_5X5
- `index.ts` — planRoute(), planAllProfiles() public API

### Unit Tests ✅ (30/30 passing)
- costFunction: 5 tests
- pathfinder: 6 tests (impassable avoidance, bounds check, trivial path, connected path)
- resourceSim: 11 tests
- safetyCheck: 3 tests
- planRoute API: 5 tests

### Config Tables (`src/config/`) ✅
- `gameConfig.ts` — MAX_LEVEL=10, XP_THRESHOLDS, LEVEL_UNLOCKS, SUIT_TIERS, ROVER_TIERS, INVENTORY_UPGRADES, REGIONS
- `plannerConfig.ts` — PLANNER_SUIT_SPECS (3 suits), PLANNER_THRESHOLDS, earthMarsDelayMinutes()

### Data Pipeline (`data-pipeline/`) ✅
- `generate_terrain.py` — procedural FBM terrain generator for all 5 regions
- `hazard_zones.json` — structured hazard data (not hardcoded)
- Generated terrain JSON files: jezero.json, valles_marineris.json, olympus_mons.json, arcadia_planitia.json, hellas_basin.json (all in public/data/regions/)

### Backend API (`src/api/`) ✅
- `supabaseClient.ts` — Supabase singleton
- `auth.ts` — registerUser(), loginUser(), logoutUser(), onAuthStateChange()
- `playerState.ts` — getPlayerState(), awardXp(), purchaseUpgrade(), equipSuit(), getRegionProgress()
- `missions.ts` — startMission(), completeMission() with autosave, exploration session autosave, weekly challenge, earth_comms_log, generateMissionNarrative()

### Supabase Schema (`supabase/`) ✅
- `001_initial_schema.sql` — all 12 tables with RLS policies, triggers, indexes
- `002_seed_missions.sql` — 14 story missions across all 5 regions including Level 10 finale
- `functions/rotate-weekly-challenge/index.ts` — Edge Function with cron, challenge rotation, Earth comms broadcast

### Handoff Docs ✅
- `API_SPEC.md` — complete Member 2 API specification with code examples, all signatures, stub data

## What's in progress
- Nothing. Phase 1–2 complete. Ready for Phase 3.

## What's not started
- Phase 3: Jezero region wired end-to-end in the game UI (Member 2 owns)
- Phase 4: Game simulation screen (Member 2 owns)
- Phase 5: Accounts persistence UI (Member 2 owns)
- Phase 6: Exploration Mode (Member 2 owns)
- Phase 7: Multi-region support (Member 2 owns)
- Phase 8: Weekly challenge system UI (Member 2 owns)
- Phase 9: Earth-comms log / mission reports / ending sequence (Member 2 owns)
- Phase 10: Mission Planner UI (Member 2 owns)
- Phase 11: Polish / playtest / demo
- Supabase project creation (requires manual setup on supabase.io dashboard)

## Decisions made that override or extend this prompt
- 2026-10-17: Member 1 is building engine + backend only; Member 2 builds all UI/frontend against API_SPEC.md
- 2026-10-17: TypeScript engine written in /src/engine (pure functions, zero UI deps)
- 2026-10-17: Data pipeline in Python — uses procedurally-generated synthetic terrain (real MOLA data deferred)
- 2026-10-17: Supabase for auth + DB; schema written as SQL migrations in /supabase/migrations
- 2026-10-17: Vitest for engine unit tests (30 tests, all passing)
- 2026-10-17: Grid resolution: 20×20 per region (spec allows this); cell sizes vary by region real-world area

## Known issues / unfinished edges
- Supabase project needs manual creation at supabase.io → add credentials to .env (copy .env.example)
- Weekly challenge Edge Function needs to be deployed: `supabase functions deploy rotate-weekly-challenge`
- Edge Function cron schedule needs to be set in Supabase Dashboard → Edge Functions → rotate-weekly-challenge
- Real MOLA/HiRISE elevation data not yet integrated (using procedural terrain — recorded decision)
- vite.config.ts tsconfig.node.json path needed if anyone runs `tsc --noEmit` on node config

## Next recommended step (Member 1)
- Set up Supabase project on supabase.io, add credentials to .env
- Run `supabase db push` to apply migrations
- Deploy Edge Function: `supabase functions deploy rotate-weekly-challenge`
- Respond to any integration questions from Member 2

## Next recommended step (Member 2)
- Read API_SPEC.md fully
- Set up project with `npm install && npm run dev`
- Build login/register screen against auth.ts (Phase 3 start)
- Use mock stub data from API_SPEC.md Section 7 until Supabase is connected

Last updated: 2026-10-17
