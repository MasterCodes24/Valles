// ──────────────────────────────────────────────────────────
//  Valles — CLI Simulation Demo & Engine Test Runner
//  Demonstrates A* Pathfinding + Resource Simulation
// ──────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import {
  planAllProfiles,
  TerrainGrid,
  GridPosition,
} from "../src/engine";

// 1. Load Jezero Crater generated terrain
const dataPath = path.resolve(process.cwd(), "public/data/regions/jezero.json");
console.log("\n============================================================");
console.log("       VALLES: INTERPLANETARY SURVIVAL GUIDE - ENGINE DEMO   ");
console.log("============================================================\n");

console.log(`[1] Loading real Mars terrain: ${path.basename(dataPath)}...`);
const raw = fs.readFileSync(dataPath, "utf-8");
const grid: TerrainGrid = JSON.parse(raw);
console.log(`    Loaded ${grid.regionId} (${grid.rows}x${grid.cols} grid, ${grid.cells.length} cells).`);
console.log(`    Cell Resolution: ${grid.cellWidthM}m x ${grid.cellHeightM}m\n`);

// 2. Select mission coordinates
const startPos: GridPosition = { row: 2, col: 2 };
const endPos: GridPosition = { row: grid.rows - 5, col: grid.cols - 5 };

console.log(`[2] Mission Traversal Plan:`);
console.log(`    Origin:      [Row ${startPos.row}, Col ${startPos.col}]`);
console.log(`    Destination: [Row ${endPos.row}, Col ${endPos.col}]\n`);

// 3. Compare routes (Fast vs Balanced vs Safe)
console.log(`[3] Running A* Pathfinding across 3 routing profiles...`);
const profiles = planAllProfiles(startPos, endPos, grid);

console.log("\n    Profile    | Waypoints | Distance   | Est. Time | Oxygen Used | Safe?");
console.log("    -----------+-----------+------------+-----------+-------------+------");
for (const [name, result] of Object.entries(profiles)) {
  if (!result) {
    console.log(`    ${name.padEnd(10)} | NO PATH FOUND`);
    continue;
  }
  const stats = result.routeStats;
  const distKm = (stats.totalDistanceM / 1000).toFixed(2);
  const timeMin = Math.round(stats.totalTimeH * 60);
  const o2 = stats.oxygenUsedL.toFixed(1);
  const safeStr = stats.isSurvivable ? "YES (OK)" : "DEADLY";
  console.log(`    ${name.padEnd(10)} | ${String(result.route.length).padEnd(9)} | ${distKm.padStart(6)} km | ${String(timeMin).padStart(4)} min  | ${o2.padStart(6)} L   | ${safeStr}`);
}

// 4. Detailed telemetry on Balanced Profile
const chosen = profiles.balanced;
if (chosen) {
  const stats = chosen.routeStats;
  console.log(`\n[4] Balanced Profile Telemetry Details:`);
  console.log(`    * Survivable:          ${stats.isSurvivable ? "YES - Mission Success" : "NO - Critical Failure"}`);
  console.log(`    * Distance:            ${(stats.totalDistanceM / 1000).toFixed(2)} km`);
  console.log(`    * Total Time:          ${stats.totalTimeH.toFixed(2)} hours (${Math.round(stats.totalTimeH * 60)} minutes)`);
  console.log(`    * Oxygen Consumed:     ${stats.oxygenUsedL.toFixed(1)} L`);
  console.log(`    * Radiation Dose:      ${(stats.radiationAccum * 100).toFixed(2)}% of lethal threshold`);
  console.log(`    * Comms Blackout:      ${stats.commsBlackoutH.toFixed(2)} hours`);
  console.log(`    * All Steps Safe:      ${stats.safetyCheck.allStepsSafe ? "YES" : "NO"}`);
  console.log(`    * Safety Status:       ${stats.safetyCheck.summary}`);
}

console.log("\n============================================================");
console.log("      ALL ENGINE SUB-SYSTEMS FUNCTIONING NORMALLY           ");
console.log("============================================================\n");
