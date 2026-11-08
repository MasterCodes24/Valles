// ──────────────────────────────────────────────────────────
//  Valles Engine — Resource Simulation
//  Implements Section 4.4 of the spec
// ──────────────────────────────────────────────────────────

import { GridCell, GridPosition, TerrainGrid } from "./types";
import { TerrainType } from "./types";

// ── Movement speed table ──────────────────────────────────

/** Metres per in-game hour by terrain type (foot traverse) */
const FOOT_SPEED_MH: Record<TerrainType, number> = {
  basalt: 3000,
  sand: 1500,
  rock: 2000,
  ice: 1200,
  crater_floor: 2500,
  canyon_wall: 800,
  highland: 2200,
  lava_field: 1000,
  dust_plain: 1800,
};

/** Rover speed multiplier over foot speed */
const ROVER_SPEED_MULT = 4.0;

// ── Resource model parameters ─────────────────────────────

/**
 * Base oxygen consumption in litres per in-game hour.
 * Affected by terrain and exertion.
 */
const O2_BASE_L_PER_H = 8.4; // ~0.14 L/min at rest/light activity

/** Terrain exertion multipliers on O2 consumption */
const O2_TERRAIN_MULT: Record<TerrainType, number> = {
  basalt: 1.0,
  sand: 1.4,
  rock: 1.2,
  ice: 1.3,
  crater_floor: 1.0,
  canyon_wall: 1.8,
  highland: 1.1,
  lava_field: 1.6,
  dust_plain: 1.1,
};

/** Additional slope exertion factor (applied at slopeDeg > 15) */
function slopeO2Multiplier(slopeDeg: number): number {
  if (slopeDeg <= 15) return 1.0;
  if (slopeDeg <= 30) return 1.2;
  if (slopeDeg <= 45) return 1.5;
  return 2.0;
}

/** Radiation accumulation rate (normalised units per in-game hour in zone) */
const RAD_RATE_PER_H = 0.05; // per radiation level unit

/** Battery drain rate for rover (% per km of travel) */
const ROVER_BATTERY_PCT_PER_KM = 1.2;

/** Terrain roughness penalty on rover battery */
const ROVER_ROUGHNESS_MULT_MAX = 2.5; // at roughness = 1.0

// ── Public types ──────────────────────────────────────────

/** The current state of all survival resources for a player/sim */
export interface ResourceState {
  /** Remaining oxygen in litres */
  oxygenL: number;
  /** Maximum oxygen capacity in litres (suit + tank upgrades) */
  oxygenCapacityL: number;
  /** Accumulated radiation (normalised [0,1]; 1 = lethal dose) */
  radiationAccum: number;
  /** Battery remaining percentage [0, 100] (rover only; -1 if no rover) */
  batteryPct: number;
  /** Elapsed in-game time in hours */
  elapsedH: number;
  /** Total comms blackout time in in-game hours */
  commsBlackoutH: number;
  /** Whether the player is using a rover on this leg */
  hasRover: boolean;
}

/** Summary of resources consumed traversing a single cell */
export interface CellResourceDelta {
  timeH: number;
  oxygenL: number;
  radiationDelta: number;
  batteryPctDelta: number;
  commsBlackoutH: number;
}

// ── Core simulation functions ─────────────────────────────

/**
 * Compute the time in in-game hours to traverse one cell.
 *
 * @param cell        The cell being traversed
 * @param cellDistM   Real-world distance across the cell in metres
 * @param hasRover    Whether the player is in a rover
 */
export function cellTraversalTimeH(
  cell: GridCell,
  cellDistM: number,
  hasRover: boolean
): number {
  if (cell.isImpassable) return Infinity;
  const baseSpeed = FOOT_SPEED_MH[cell.terrainType] ?? 2000;
  const speed = hasRover ? baseSpeed * ROVER_SPEED_MULT : baseSpeed;
  return cellDistM / speed;
}

/**
 * Compute all resource deltas for traversing one cell.
 *
 * @param cell        The cell
 * @param cellDistM   Real-world traversal distance in metres
 * @param hasRover    Whether a rover is being used
 */
export function computeCellDelta(
  cell: GridCell,
  cellDistM: number,
  hasRover: boolean
): CellResourceDelta {
  const timeH = cellTraversalTimeH(cell, cellDistM, hasRover);

  const o2TerrainMult = O2_TERRAIN_MULT[cell.terrainType] ?? 1.0;
  const o2SlopeMult = slopeO2Multiplier(cell.slopeDeg);
  const oxygenL = O2_BASE_L_PER_H * o2TerrainMult * o2SlopeMult * timeH;

  const radiationDelta = cell.radiationLevel * RAD_RATE_PER_H * timeH;

  let batteryPctDelta = 0;
  if (hasRover) {
    const distKm = cellDistM / 1000;
    const roughnessMult =
      1 + cell.roughness * (ROVER_ROUGHNESS_MULT_MAX - 1);
    batteryPctDelta = ROVER_BATTERY_PCT_PER_KM * distKm * roughnessMult;
  }

  const commsBlackoutH = cell.commsAvailable ? 0 : timeH;

  return { timeH, oxygenL, radiationDelta, batteryPctDelta, commsBlackoutH };
}

/**
 * Apply a cell delta to a resource state, returning the new state.
 * Does NOT mutate the input state.
 */
export function applyDelta(
  state: ResourceState,
  delta: CellResourceDelta
): ResourceState {
  return {
    ...state,
    oxygenL: Math.max(0, state.oxygenL - delta.oxygenL),
    radiationAccum: Math.min(1, state.radiationAccum + delta.radiationDelta),
    batteryPct:
      state.hasRover
        ? Math.max(0, state.batteryPct - delta.batteryPctDelta)
        : state.batteryPct,
    elapsedH: state.elapsedH + delta.timeH,
    commsBlackoutH: state.commsBlackoutH + delta.commsBlackoutH,
  };
}

/**
 * Simulate resource consumption along a full path.
 *
 * @param grid      The terrain grid
 * @param path      Ordered list of grid positions (from planRoute)
 * @param initial   Starting resource state
 * @returns         Array of resource states (one per step, starting after step 0)
 */
export function simulatePath(
  grid: TerrainGrid,
  path: GridPosition[],
  initial: ResourceState
): ResourceState[] {
  const states: ResourceState[] = [];
  let state = { ...initial };

  for (let i = 1; i < path.length; i++) {
    const pos = path[i];
    const cell = grid.cells[pos.row * grid.cols + pos.col];

    // Diagonal moves are √2 × cell dimension
    const prev = path[i - 1];
    const isDiag = prev.row !== pos.row && prev.col !== pos.col;
    const distMult = isDiag ? Math.SQRT2 : 1;
    const cellDistM =
      ((grid.cellWidthM + grid.cellHeightM) / 2) * distMult;

    const delta = computeCellDelta(cell, cellDistM, state.hasRover);
    state = applyDelta(state, delta);
    states.push({ ...state });
  }

  return states;
}

/** Returns true if the player has survived the entire path */
export function pathIsSurvivable(states: ResourceState[]): boolean {
  return states.every(
    (s) => s.oxygenL > 0 && s.radiationAccum < 1 && s.batteryPct !== 0
  );
}

/** Create a default initial resource state */
export function defaultResourceState(overrides?: Partial<ResourceState>): ResourceState {
  return {
    oxygenL: 840, // 100-litre equivalent at 8.4 L/h ≈ 100h endurance baseline
    oxygenCapacityL: 840,
    radiationAccum: 0,
    batteryPct: 100,
    elapsedH: 0,
    commsBlackoutH: 0,
    hasRover: false,
    ...overrides,
  };
}
