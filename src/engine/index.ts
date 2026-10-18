// ──────────────────────────────────────────────────────────
//  Valles Engine — Public API Surface
//  All functions Member 2 calls against; Member 1 implements.
// ──────────────────────────────────────────────────────────

import { TerrainGrid, GridPosition } from "./types";
import { CostWeights, ROUTE_PROFILES } from "./costFunction";
import { findPath, PathResult } from "./pathfinder";
import {
  ResourceState,
  simulatePath,
  defaultResourceState,
  pathIsSurvivable,
} from "./resourceSim";
import {
  findRestPoints,
  checkRouteSafety,
  SafetyCheckResult,
} from "./safetyCheck";

// ── Route planning result ─────────────────────────────────

/** Statistics summarising a route for display */
export interface RouteStats {
  /** Total real-world distance in metres */
  totalDistanceM: number;
  /** Estimated total in-game time in hours */
  totalTimeH: number;
  /** Total oxygen consumed in litres */
  oxygenUsedL: number;
  /** Total radiation accumulated [0,1] */
  radiationAccum: number;
  /** Battery used in percentage points (0 if no rover) */
  batteryUsedPct: number;
  /** Total comms blackout time in hours */
  commsBlackoutH: number;
  /** Safety check results */
  safetyCheck: SafetyCheckResult;
  /** Resource states at each step (for step-through simulation) */
  stepStates: ResourceState[];
  /** true if the player can survive the full route */
  isSurvivable: boolean;
}

export interface PlanRouteResult {
  route: GridPosition[];
  routeStats: RouteStats;
}

/**
 * Plan a route between two cells on a terrain grid.
 *
 * @param start       Start grid position
 * @param end         Destination grid position
 * @param grid        The terrain grid for the region
 * @param weights     Cost weight profile (use ROUTE_PROFILES or custom)
 * @param initState   Player resource state at departure
 * @returns           { route, routeStats } or null if no path exists
 */
export function planRoute(
  start: GridPosition,
  end: GridPosition,
  grid: TerrainGrid,
  weights: CostWeights,
  initState?: Partial<ResourceState>
): PlanRouteResult | null {
  const pathResult: PathResult = findPath(grid, start, end, weights);
  if (!pathResult.found) return null;

  const initial = defaultResourceState(initState);
  const stepStates = simulatePath(grid, pathResult.path, initial);
  const restPoints = findRestPoints(grid);
  const safetyCheck = checkRouteSafety(
    grid,
    pathResult.path,
    stepStates,
    restPoints
  );

  // Aggregate stats from last step state
  const last = stepStates[stepStates.length - 1] ?? initial;
  const avgCellDist = (grid.cellWidthM + grid.cellHeightM) / 2;

  // Approximate real-world distance
  let totalDistanceM = 0;
  for (let i = 1; i < pathResult.path.length; i++) {
    const prev = pathResult.path[i - 1];
    const curr = pathResult.path[i];
    const isDiag = prev.row !== curr.row && prev.col !== curr.col;
    totalDistanceM += isDiag ? avgCellDist * Math.SQRT2 : avgCellDist;
  }

  const routeStats: RouteStats = {
    totalDistanceM,
    totalTimeH: last.elapsedH,
    oxygenUsedL: initial.oxygenL - last.oxygenL,
    radiationAccum: last.radiationAccum,
    batteryUsedPct:
      initial.hasRover ? initial.batteryPct - last.batteryPct : 0,
    commsBlackoutH: last.commsBlackoutH,
    safetyCheck,
    stepStates,
    isSurvivable: pathIsSurvivable(stepStates),
  };

  return { route: pathResult.path, routeStats };
}

/**
 * Plan all three standard route profiles and return them together.
 * Generates fast / balanced / safe routes by varying cost weights.
 *
 * @param start     Start position
 * @param end       Destination position
 * @param grid      Terrain grid
 * @param initState Player resource state at departure
 */
export function planAllProfiles(
  start: GridPosition,
  end: GridPosition,
  grid: TerrainGrid,
  initState?: Partial<ResourceState>
): Record<"fast" | "balanced" | "safe", PlanRouteResult | null> {
  return {
    fast: planRoute(start, end, grid, ROUTE_PROFILES.fast, initState),
    balanced: planRoute(start, end, grid, ROUTE_PROFILES.balanced, initState),
    safe: planRoute(start, end, grid, ROUTE_PROFILES.safe, initState),
  };
}

// ── Re-exports for convenience ────────────────────────────

export { ROUTE_PROFILES } from "./costFunction";
export { defaultResourceState } from "./resourceSim";
export { findRestPoints } from "./safetyCheck";
export type { TerrainGrid, GridPosition } from "./types";
export type { CostWeights } from "./costFunction";
export type { ResourceState } from "./resourceSim";
export type { SafetyCheckResult } from "./safetyCheck";
