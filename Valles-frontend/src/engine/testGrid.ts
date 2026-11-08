// ──────────────────────────────────────────────────────────
//  Valles Engine — Synthetic Test Grid Factory
//  Used by unit tests — does NOT require real data.
//  Member 2 can use this for mock/stub data too.
// ──────────────────────────────────────────────────────────

import { TerrainGrid, GridCell, GridPosition } from "./types";

/** Preset cell configurations for testing */
export const CELL_PRESETS = {
  open_flat: {
    elevationM: 0,
    slopeDeg: 2,
    roughness: 0.1,
    hazard: "none" as const,
    hazardSeverity: 0,
    radiationLevel: 0.05,
    commsAvailable: true,
    commsStrength: 1.0,
    terrainType: "basalt" as const,
    isRestPoint: false,
    isImpassable: false,
  },
  steep_slope: {
    elevationM: 200,
    slopeDeg: 40,
    roughness: 0.5,
    hazard: "steep_slope" as const,
    hazardSeverity: 0.6,
    radiationLevel: 0.1,
    commsAvailable: true,
    commsStrength: 0.8,
    terrainType: "rock" as const,
    isRestPoint: false,
    isImpassable: false,
  },
  radiation_zone: {
    elevationM: 50,
    slopeDeg: 5,
    roughness: 0.2,
    hazard: "radiation_spike" as const,
    hazardSeverity: 0.8,
    radiationLevel: 0.7,
    commsAvailable: false,
    commsStrength: 0.2,
    terrainType: "dust_plain" as const,
    isRestPoint: false,
    isImpassable: false,
  },
  rest_point: {
    elevationM: 10,
    slopeDeg: 1,
    roughness: 0.05,
    hazard: "none" as const,
    hazardSeverity: 0,
    radiationLevel: 0.02,
    commsAvailable: true,
    commsStrength: 1.0,
    terrainType: "basalt" as const,
    isRestPoint: true,
    isImpassable: false,
  },
  impassable: {
    elevationM: 1000,
    slopeDeg: 89,
    roughness: 1.0,
    hazard: "steep_slope" as const,
    hazardSeverity: 1.0,
    radiationLevel: 0,
    commsAvailable: false,
    commsStrength: 0,
    terrainType: "canyon_wall" as const,
    isRestPoint: false,
    isImpassable: true,
  },
  comms_blackout: {
    elevationM: 30,
    slopeDeg: 8,
    roughness: 0.3,
    hazard: "comms_dead_zone" as const,
    hazardSeverity: 0.2,
    radiationLevel: 0.05,
    commsAvailable: false,
    commsStrength: 0,
    terrainType: "basalt" as const,
    isRestPoint: false,
    isImpassable: false,
  },
} satisfies Record<string, Omit<GridCell, "row" | "col">>;

type PresetKey = keyof typeof CELL_PRESETS;

/**
 * Create a full GridCell from a preset, filling in row/col.
 */
function makeCell(row: number, col: number, preset: PresetKey): GridCell {
  return { row, col, ...CELL_PRESETS[preset] };
}

/**
 * Build a synthetic TerrainGrid from a 2D array of preset keys.
 *
 * Example:
 *   buildGridFromPresets("test", 100, 100, [
 *     ["open_flat", "open_flat", "rest_point"],
 *     ["open_flat", "radiation_zone", "open_flat"],
 *     ["rest_point", "open_flat", "open_flat"],
 *   ])
 *
 * @param regionId      Identifier for the region
 * @param cellWidthM    Cell width in metres
 * @param cellHeightM   Cell height in metres
 * @param layout        2D array of preset keys (outer = rows, inner = cols)
 */
export function buildGridFromPresets(
  regionId: string,
  cellWidthM: number,
  cellHeightM: number,
  layout: PresetKey[][]
): TerrainGrid {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const cells: GridCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(makeCell(r, c, layout[r][c]));
    }
  }
  return { regionId, rows, cols, cellWidthM, cellHeightM, cells };
}

/**
 * Create a uniform grid filled with a single preset.
 */
export function buildUniformGrid(
  regionId: string,
  rows: number,
  cols: number,
  cellWidthM: number,
  cellHeightM: number,
  preset: PresetKey = "open_flat"
): TerrainGrid {
  const layout: PresetKey[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => preset)
  );
  return buildGridFromPresets(regionId, cellWidthM, cellHeightM, layout);
}

// ── Standard 5×5 test grid (used by unit tests) ───────────
//
//  Legend:  F=open_flat  R=rest_point  Z=radiation_zone  X=impassable  S=steep_slope
//
//    col: 0  1  2  3  4
//  row 0: F  F  F  F  F
//  row 1: F  X  X  X  F
//  row 2: F  X  R  X  F
//  row 3: F  X  X  X  F
//  row 4: F  F  Z  F  F
//
//  Start = (0,0), Goal = (4,4)
//  Safe path MUST go around the impassable wall OR via (4,2) radiation zone.
//  Rest point at (2,2) can only be reached from within the inner ring, which is surrounded by impassable — 
//  this forces the planner to route around it.

export const TEST_GRID_5X5 = buildGridFromPresets("test_5x5", 100, 100, [
  ["open_flat", "open_flat", "open_flat", "open_flat", "open_flat"],
  ["open_flat", "impassable", "impassable", "impassable", "open_flat"],
  ["open_flat", "impassable", "rest_point", "impassable", "open_flat"],
  ["open_flat", "impassable", "impassable", "impassable", "open_flat"],
  ["open_flat", "open_flat", "radiation_zone", "open_flat", "open_flat"],
]);

// ── Larger 10×10 test grid ────────────────────────────────
// Mix of terrain types for integration tests

export function buildIntegrationTestGrid(): TerrainGrid {
  const L: PresetKey[][] = [
    ["rest_point","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat"],
    ["open_flat","open_flat","steep_slope","steep_slope","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat"],
    ["open_flat","open_flat","steep_slope","steep_slope","open_flat","open_flat","radiation_zone","radiation_zone","open_flat","open_flat"],
    ["open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","radiation_zone","radiation_zone","open_flat","open_flat"],
    ["open_flat","open_flat","open_flat","comms_blackout","comms_blackout","open_flat","open_flat","open_flat","open_flat","open_flat"],
    ["open_flat","open_flat","open_flat","comms_blackout","comms_blackout","open_flat","open_flat","open_flat","open_flat","open_flat"],
    ["open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","impassable","impassable","open_flat"],
    ["open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","impassable","impassable","open_flat"],
    ["open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat"],
    ["open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","open_flat","rest_point"],
  ];
  return buildGridFromPresets("test_10x10", 200, 200, L);
}

/** Position aliases for tests */
export const TEST_POSITIONS = {
  topLeft: { row: 0, col: 0 } satisfies GridPosition,
  topRight: { row: 0, col: 4 } satisfies GridPosition,
  bottomRight: { row: 4, col: 4 } satisfies GridPosition,
  bottomLeft: { row: 4, col: 0 } satisfies GridPosition,
  center: { row: 2, col: 2 } satisfies GridPosition,
};
