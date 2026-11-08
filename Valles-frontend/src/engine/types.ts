// ──────────────────────────────────────────────────────────
//  Valles Engine — Grid & Cell Types
//  Pure TypeScript, zero UI or framework dependencies
// ──────────────────────────────────────────────────────────

/** Terrain type IDs used across the engine and data pipeline */
export type TerrainType =
  | "basalt"
  | "sand"
  | "rock"
  | "ice"
  | "crater_floor"
  | "canyon_wall"
  | "highland"
  | "lava_field"
  | "dust_plain";

/** Hazard classification for a cell */
export type HazardType =
  | "none"
  | "dust_devil"
  | "radiation_spike"
  | "unstable_ground"
  | "steep_slope"
  | "comms_dead_zone"
  | "thermal_vent"
  | "boulder_field";

/**
 * A single cell in the terrain grid.
 * All numeric values are normalised to [0, 1] unless noted.
 */
export interface GridCell {
  /** Row index within the grid (0-based) */
  row: number;
  /** Column index within the grid (0-based) */
  col: number;
  /** Elevation in metres above MOLA datum (not normalised) */
  elevationM: number;
  /** Slope magnitude in degrees [0, 90] */
  slopeDeg: number;
  /** Surface roughness [0, 1]; 0 = smooth hardpan, 1 = extreme boulder field */
  roughness: number;
  /** Primary hazard present in this cell */
  hazard: HazardType;
  /** Hazard severity [0, 1]; 0 = minimal, 1 = lethal */
  hazardSeverity: number;
  /** Accumulated radiation level [0, 1] relative to safe threshold */
  radiationLevel: number;
  /** Whether ground comms line-of-sight is available (true = good comms) */
  commsAvailable: boolean;
  /** Comms signal strength [0, 1]; 0 = blackout, 1 = full strength */
  commsStrength: number;
  /** Broad terrain classification for movement-speed lookup */
  terrainType: TerrainType;
  /** true if this cell contains a rest/shelter point */
  isRestPoint: boolean;
  /** true if traversal is completely impossible (cliff face, etc.) */
  isImpassable: boolean;
}

/**
 * A rectangular grid of cells representing one Mars region.
 */
export interface TerrainGrid {
  /** Human-readable region name */
  regionId: string;
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Real-world width of one cell in metres */
  cellWidthM: number;
  /** Real-world height of one cell in metres */
  cellHeightM: number;
  /** Flat array, row-major: cells[row * cols + col] */
  cells: GridCell[];
}

/** Identifies a position in the grid */
export interface GridPosition {
  row: number;
  col: number;
}
