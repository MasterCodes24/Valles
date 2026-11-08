// ──────────────────────────────────────────────────────────
//  Valles Engine — Rest-Point / Safety Reachability Check
//  Implements Section 4.5 of the spec
// ──────────────────────────────────────────────────────────

import { TerrainGrid, GridPosition } from "./types";
import { CostWeights } from "./costFunction";
import { ResourceState, computeCellDelta } from "./resourceSim";
import { findPath } from "./pathfinder";

/**
 * Find all rest points in the grid.
 * A rest point is any cell with isRestPoint === true and !isImpassable.
 */
export function findRestPoints(grid: TerrainGrid): GridPosition[] {
  const result: GridPosition[] = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r * grid.cols + c];
      if (cell.isRestPoint && !cell.isImpassable) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

/**
 * Estimate the oxygen cost to reach a target from a position.
 * Uses a straight-line path approximation (not A*, intentionally cheap).
 * Returns Infinity if the target is unreachable.
 */
function estimateO2ToReach(
  grid: TerrainGrid,
  from: GridPosition,
  to: GridPosition,
  state: ResourceState
): number {
  // Use the engine's A* to get a real path, then sum O2 from it
  const weights: CostWeights = {
    w_distance: 0.5,
    w_slope: 3.0,
    w_roughness: 2.0,
    w_hazard: 5.0,
    w_radiation: 5.0,
    w_comms: 1.0,
  };
  const result = findPath(grid, from, to, weights);
  if (!result.found) return Infinity;

  let o2Used = 0;
  for (let i = 1; i < result.path.length; i++) {
    const pos = result.path[i];
    const prev = result.path[i - 1];
    const cell = grid.cells[pos.row * grid.cols + pos.col];
    const isDiag = prev.row !== pos.row && prev.col !== pos.col;
    const distMult = isDiag ? Math.SQRT2 : 1;
    const cellDistM = ((grid.cellWidthM + grid.cellHeightM) / 2) * distMult;
    const delta = computeCellDelta(cell, cellDistM, state.hasRover);
    o2Used += delta.oxygenL;
  }
  return o2Used;
}

/**
 * For a single position along a route, check whether the nearest rest point
 * is reachable with the remaining oxygen.
 *
 * @param grid        The terrain grid
 * @param position    The current position on the route
 * @param state       The resource state at this position
 * @param restPoints  List of rest/shelter points in the grid
 * @returns           true if at least one rest point is reachable
 */
export function canReachSafety(
  grid: TerrainGrid,
  position: GridPosition,
  state: ResourceState,
  restPoints: GridPosition[]
): boolean {
  if (restPoints.length === 0) return false;
  // 10 % safety margin on remaining oxygen
  const safeO2 = state.oxygenL * 0.9;

  for (const rp of restPoints) {
    const o2Needed = estimateO2ToReach(grid, position, rp, state);
    if (o2Needed <= safeO2) return true;
  }
  return false;
}

export interface SafetyCheckResult {
  /** true if every step of the route can reach a rest point */
  allStepsSafe: boolean;
  /** Indices of path steps that FAIL the safety check */
  unsafeStepIndices: number[];
  /** Summary message */
  summary: string;
}

/**
 * Check the entire path for rest-point reachability at each step.
 *
 * @param grid        The terrain grid
 * @param path        The route (from planRoute)
 * @param states      Resource states at each step (from simulatePath)
 * @param restPoints  Known rest/shelter points (from findRestPoints)
 */
export function checkRouteSafety(
  grid: TerrainGrid,
  path: GridPosition[],
  states: ResourceState[],
  restPoints: GridPosition[]
): SafetyCheckResult {
  const unsafeStepIndices: number[] = [];

  // states[i] corresponds to path[i+1] (first state is after step 0)
  for (let i = 0; i < states.length; i++) {
    const pos = path[i + 1];
    const safe = canReachSafety(grid, pos, states[i], restPoints);
    if (!safe) unsafeStepIndices.push(i + 1);
  }

  const allStepsSafe = unsafeStepIndices.length === 0;
  const summary = allStepsSafe
    ? "Route is safe: every step has a reachable shelter point."
    : `Route has ${unsafeStepIndices.length} step(s) where no shelter is reachable with remaining oxygen.`;

  return { allStepsSafe, unsafeStepIndices, summary };
}
