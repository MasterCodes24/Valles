// ──────────────────────────────────────────────────────────
//  Valles Engine — Unit Tests
//  Run with: npm test
//  All tests operate on the synthetic test grids — no real data needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { cellCost, ROUTE_PROFILES } from "./costFunction";
import { findPath } from "./pathfinder";
import {
  computeCellDelta,
  simulatePath,
  defaultResourceState,
  pathIsSurvivable,
} from "./resourceSim";
import {
  findRestPoints,
  checkRouteSafety,
} from "./safetyCheck";
import {
  TEST_GRID_5X5,
  TEST_POSITIONS,
  buildUniformGrid,
  buildIntegrationTestGrid,
  CELL_PRESETS,
} from "./testGrid";
import { planRoute, planAllProfiles } from "./index";
import type { GridCell } from "./types";

// ─────────────────────────────────────────────────────────
//  1. Cost Function
// ─────────────────────────────────────────────────────────

describe("costFunction", () => {
  const balanced = ROUTE_PROFILES.balanced;

  const makeCell = (overrides: Partial<GridCell>): GridCell => ({
    row: 0, col: 0,
    elevationM: 0,
    slopeDeg: 0,
    roughness: 0,
    hazard: "none",
    hazardSeverity: 0,
    radiationLevel: 0,
    commsAvailable: true,
    commsStrength: 1,
    terrainType: "basalt",
    isRestPoint: false,
    isImpassable: false,
    ...overrides,
  });

  it("returns Infinity for impassable cells", () => {
    const cell = makeCell({ isImpassable: true });
    expect(cellCost(cell, balanced)).toBe(Infinity);
  });

  it("base cost of a perfect cell = w_distance * 1", () => {
    const cell = makeCell({});
    // slope=0 → norm=0; roughness=0; hazard=0; rad=0; commsGap=0
    expect(cellCost(cell, balanced)).toBeCloseTo(balanced.w_distance);
  });

  it("higher slope increases cost", () => {
    const low = makeCell({ slopeDeg: 5 });
    const high = makeCell({ slopeDeg: 45 });
    expect(cellCost(high, balanced)).toBeGreaterThan(cellCost(low, balanced));
  });

  it("safe profile penalises hazards more than fast profile", () => {
    const cell = makeCell({ hazardSeverity: 0.5, hazard: "dust_devil" });
    expect(cellCost(cell, ROUTE_PROFILES.safe)).toBeGreaterThan(
      cellCost(cell, ROUTE_PROFILES.fast)
    );
  });

  it("comms gap correctly computed", () => {
    const cell = makeCell({ commsStrength: 0.4, commsAvailable: false });
    const cost = cellCost(cell, balanced);
    const expected = balanced.w_distance + balanced.w_comms * (1 - 0.4);
    expect(cost).toBeCloseTo(expected);
  });
});

// ─────────────────────────────────────────────────────────
//  2. A* Pathfinder
// ─────────────────────────────────────────────────────────

describe("pathfinder", () => {
  it("finds a path from corner to corner on a uniform grid", () => {
    const grid = buildUniformGrid("u", 5, 5, 100, 100, "open_flat");
    const result = findPath(grid, { row: 0, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.balanced);
    expect(result.found).toBe(true);
    expect(result.path[0]).toEqual({ row: 0, col: 0 });
    expect(result.path[result.path.length - 1]).toEqual({ row: 4, col: 4 });
  });

  it("avoids impassable cells", () => {
    // On 5×5 test grid the inner wall is impassable — path must go around
    const result = findPath(TEST_GRID_5X5, { row: 0, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.balanced);
    expect(result.found).toBe(true);
    for (const pos of result.path) {
      const cell = TEST_GRID_5X5.cells[pos.row * TEST_GRID_5X5.cols + pos.col];
      expect(cell.isImpassable).toBe(false);
    }
  });

  it("returns found=false when start position is out of bounds", () => {
    const grid = buildUniformGrid("u", 5, 5, 100, 100);
    const result = findPath(grid, { row: -1, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.balanced);
    expect(result.found).toBe(false);
  });

  it("returns a trivial single-cell path when start === end", () => {
    const grid = buildUniformGrid("u", 5, 5, 100, 100);
    const result = findPath(grid, { row: 2, col: 2 }, { row: 2, col: 2 }, ROUTE_PROFILES.balanced);
    expect(result.found).toBe(true);
    expect(result.path).toHaveLength(1);
  });

  it("safe profile assigns higher cell cost to radiation zone than fast profile", () => {
    // Verify the cost function penalises radiation more under safe weights
    const radCell = TEST_GRID_5X5.cells[4 * TEST_GRID_5X5.cols + 2]; // (4,2) radiation zone
    const fastCost = cellCost(radCell, ROUTE_PROFILES.fast);
    const safeCost = cellCost(radCell, ROUTE_PROFILES.safe);
    expect(safeCost).toBeGreaterThan(fastCost);
    // Both routes should still be found (safe avoids by cost, not impossibility)
    const safe = findPath(TEST_GRID_5X5, { row: 0, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.safe);
    expect(safe.found).toBe(true);
  });

  it("produces a connected path (each step is adjacent)", () => {
    const grid = buildIntegrationTestGrid();
    const result = findPath(grid, { row: 0, col: 0 }, { row: 9, col: 9 }, ROUTE_PROFILES.balanced);
    expect(result.found).toBe(true);
    for (let i = 1; i < result.path.length; i++) {
      const dr = Math.abs(result.path[i].row - result.path[i - 1].row);
      const dc = Math.abs(result.path[i].col - result.path[i - 1].col);
      expect(dr).toBeLessThanOrEqual(1);
      expect(dc).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────
//  3. Resource Simulation
// ─────────────────────────────────────────────────────────

describe("resourceSim", () => {
  const flat = { row: 0, col: 0, ...CELL_PRESETS.open_flat };
  const steep = { row: 0, col: 0, ...CELL_PRESETS.steep_slope };
  const radZone = { row: 0, col: 0, ...CELL_PRESETS.radiation_zone };

  it("consumes oxygen traversing a cell", () => {
    const delta = computeCellDelta(flat, 100, false);
    expect(delta.oxygenL).toBeGreaterThan(0);
    expect(delta.timeH).toBeGreaterThan(0);
  });

  it("steep slope consumes more oxygen than flat ground", () => {
    const flatDelta = computeCellDelta(flat, 100, false);
    const steepDelta = computeCellDelta(steep, 100, false);
    expect(steepDelta.oxygenL).toBeGreaterThan(flatDelta.oxygenL);
  });

  it("radiation zone accumulates radiation", () => {
    const delta = computeCellDelta(radZone, 100, false);
    expect(delta.radiationDelta).toBeGreaterThan(0);
  });

  it("rover reduces travel time vs foot", () => {
    const foot = computeCellDelta(flat, 1000, false);
    const rover = computeCellDelta(flat, 1000, true);
    expect(rover.timeH).toBeLessThan(foot.timeH);
  });

  it("rover drains battery", () => {
    const delta = computeCellDelta(flat, 1000, true);
    expect(delta.batteryPctDelta).toBeGreaterThan(0);
  });

  it("comms blackout correctly tracked", () => {
    const blackout = { row: 0, col: 0, ...CELL_PRESETS.comms_blackout };
    const delta = computeCellDelta(blackout, 100, false);
    expect(delta.commsBlackoutH).toBeGreaterThan(0);
  });

  it("open cell has no comms blackout", () => {
    const delta = computeCellDelta(flat, 100, false);
    expect(delta.commsBlackoutH).toBe(0);
  });

  it("simulatePath produces correct number of states", () => {
    const grid = buildUniformGrid("u", 3, 3, 100, 100);
    const path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];
    const states = simulatePath(grid, path, defaultResourceState());
    // 3-cell path, start is position 0, so 2 transitions = 2 states
    expect(states).toHaveLength(2);
  });

  it("oxygen never goes negative in simulation", () => {
    const grid = buildUniformGrid("u", 10, 10, 1000, 1000, "steep_slope");
    const path = findPath(grid, { row: 0, col: 0 }, { row: 9, col: 9 }, ROUTE_PROFILES.fast);
    const states = simulatePath(grid, path.path, defaultResourceState());
    for (const s of states) {
      expect(s.oxygenL).toBeGreaterThanOrEqual(0);
    }
  });

  it("pathIsSurvivable returns false if O2 depleted", () => {
    const depleted = defaultResourceState({ oxygenL: 0 });
    expect(pathIsSurvivable([depleted])).toBe(false);
  });

  it("pathIsSurvivable returns true for a healthy state", () => {
    const healthy = defaultResourceState();
    expect(pathIsSurvivable([healthy])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
//  4. Safety Check
// ─────────────────────────────────────────────────────────

describe("safetyCheck", () => {
  it("findRestPoints returns correct positions", () => {
    const rp = findRestPoints(TEST_GRID_5X5);
    // TEST_GRID_5X5 has one rest point at (2,2)
    expect(rp.length).toBe(1);
    expect(rp[0]).toEqual({ row: 2, col: 2 });
  });

  it("checkRouteSafety passes on a uniform grid with a rest point at start", () => {
    const grid = buildUniformGrid("u", 5, 5, 100, 100, "rest_point");
    const pathResult = findPath(grid, { row: 0, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.safe);
    const states = simulatePath(grid, pathResult.path, defaultResourceState());
    const rp = findRestPoints(grid);
    const result = checkRouteSafety(grid, pathResult.path, states, rp);
    expect(result.allStepsSafe).toBe(true);
  });

  it("checkRouteSafety finds unsafe steps when no rest points exist", () => {
    const grid = buildUniformGrid("u", 5, 5, 100, 100, "open_flat");
    const pathResult = findPath(grid, { row: 0, col: 0 }, { row: 4, col: 4 }, ROUTE_PROFILES.safe);
    const states = simulatePath(grid, pathResult.path, defaultResourceState({ oxygenL: 0 }));
    const result = checkRouteSafety(grid, pathResult.path, states, []);
    expect(result.allStepsSafe).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  5. planRoute public API
// ─────────────────────────────────────────────────────────

describe("planRoute", () => {
  it("returns null when no path exists", () => {
    // Create a 1×3 grid with an impassable middle
    const grid = buildUniformGrid("u", 1, 3, 100, 100, "open_flat");
    grid.cells[1] = { ...grid.cells[1], isImpassable: true };
    const result = planRoute({ row: 0, col: 0 }, { row: 0, col: 2 }, grid, ROUTE_PROFILES.balanced);
    expect(result).toBeNull();
  });

  it("returns route + stats for a valid path", () => {
    const grid = buildIntegrationTestGrid();
    const result = planRoute({ row: 0, col: 0 }, { row: 9, col: 9 }, grid, ROUTE_PROFILES.balanced);
    expect(result).not.toBeNull();
    expect(result!.route.length).toBeGreaterThan(1);
    expect(result!.routeStats.totalDistanceM).toBeGreaterThan(0);
    expect(result!.routeStats.oxygenUsedL).toBeGreaterThan(0);
  });

  it("safe profile uses more steps than fast profile on a complex grid", () => {
    const grid = buildIntegrationTestGrid();
    const fast = planRoute({ row: 0, col: 0 }, { row: 9, col: 9 }, grid, ROUTE_PROFILES.fast);
    const safe = planRoute({ row: 0, col: 0 }, { row: 9, col: 9 }, grid, ROUTE_PROFILES.safe);
    expect(fast).not.toBeNull();
    expect(safe).not.toBeNull();
    // Safe route avoids hazards — may be longer in steps
    expect(safe!.routeStats.totalDistanceM).toBeGreaterThanOrEqual(
      fast!.routeStats.totalDistanceM
    );
  });

  it("planAllProfiles returns all three profiles", () => {
    const grid = buildIntegrationTestGrid();
    const results = planAllProfiles({ row: 0, col: 0 }, { row: 9, col: 9 }, grid);
    expect(results.fast).not.toBeNull();
    expect(results.balanced).not.toBeNull();
    expect(results.safe).not.toBeNull();
  });

  it("routeStats.stepStates length equals route.length - 1", () => {
    const grid = buildIntegrationTestGrid();
    const result = planRoute({ row: 0, col: 0 }, { row: 9, col: 9 }, grid, ROUTE_PROFILES.balanced);
    expect(result).not.toBeNull();
    expect(result!.routeStats.stepStates.length).toBe(result!.route.length - 1);
  });
});
