// ──────────────────────────────────────────────────────────
//  Valles Engine — Cost Function
//  Implements Section 4.2 of the spec
// ──────────────────────────────────────────────────────────

import { GridCell } from "./types";

/**
 * Weight set for a route profile.
 * All weights should be non-negative; larger = more costly.
 */
export interface CostWeights {
  /** Weight on distance contribution (always 1 cell = 1 distance unit) */
  w_distance: number;
  /** Weight on slope (slopeDeg / 90 normalised to [0,1]) */
  w_slope: number;
  /** Weight on surface roughness [0,1] */
  w_roughness: number;
  /** Weight on hazard severity [0,1] */
  w_hazard: number;
  /** Weight on radiation level [0,1] */
  w_radiation: number;
  /** Weight on comms gap (1 - commsStrength) */
  w_comms: number;
}

/** Built-in route profiles per the spec (fast / balanced / safe) */
export const ROUTE_PROFILES: Record<string, CostWeights> = {
  fast: {
    w_distance: 1.0,
    w_slope: 0.5,
    w_roughness: 0.5,
    w_hazard: 0.3,
    w_radiation: 0.3,
    w_comms: 0.1,
  },
  balanced: {
    w_distance: 1.0,
    w_slope: 1.0,
    w_roughness: 1.0,
    w_hazard: 1.0,
    w_radiation: 1.0,
    w_comms: 0.5,
  },
  safe: {
    w_distance: 0.5,
    w_slope: 2.0,
    w_roughness: 2.0,
    w_hazard: 5.0,
    w_radiation: 5.0,
    w_comms: 3.0,
  },
  /** Safety-biased default for the Mission Planner (Product B) */
  planner_default: {
    w_distance: 0.5,
    w_slope: 3.0,
    w_roughness: 3.0,
    w_hazard: 10.0,
    w_radiation: 10.0,
    w_comms: 5.0,
  },
};

/**
 * Compute the traversal cost of entering a cell.
 *
 * cost(cell) = w_d * 1  +  w_s * (slopeDeg/90)
 *            + w_r * roughness
 *            + w_h * hazardSeverity
 *            + w_x * radiationLevel
 *            + w_c * (1 - commsStrength)
 *
 * Returns Infinity for impassable cells.
 */
export function cellCost(cell: GridCell, weights: CostWeights): number {
  if (cell.isImpassable) return Infinity;

  const slopeNorm = Math.min(cell.slopeDeg / 90, 1);
  const commsGap = 1 - cell.commsStrength;

  return (
    weights.w_distance * 1 +
    weights.w_slope * slopeNorm +
    weights.w_roughness * cell.roughness +
    weights.w_hazard * cell.hazardSeverity +
    weights.w_radiation * cell.radiationLevel +
    weights.w_comms * commsGap
  );
}
