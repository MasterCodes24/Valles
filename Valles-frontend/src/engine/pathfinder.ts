// ──────────────────────────────────────────────────────────
//  Valles Engine — A* Pathfinder
//  Implements Section 4.3 of the spec
// ──────────────────────────────────────────────────────────

import { TerrainGrid, GridPosition } from "./types";
import { CostWeights, cellCost } from "./costFunction";

// ── Internal node used by the priority queue ──────────────

interface AStarNode {
  row: number;
  col: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: AStarNode | null;
}

// ── Simple min-heap priority queue ───────────────────────

class MinHeap {
  private data: AStarNode[] = [];

  push(node: AStarNode) {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() {
    return this.data.length;
  }

  private _bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent].f <= this.data[i].f) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  private _sinkDown(i: number) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────

function key(row: number, col: number): string {
  return `${row},${col}`;
}

function heuristic(
  a: GridPosition,
  b: GridPosition,
  cellW: number,
  cellH: number
): number {
  // Euclidean heuristic scaled by average cell dimension in metres
  const avg = (cellW + cellH) / 2;
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return avg * Math.sqrt(dr * dr + dc * dc);
}

/** 8-directional neighbours: [dRow, dCol, distanceMultiplier] */
const DIRS: [number, number, number][] = [
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 1],
  [0, 1, 1],
  [-1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [1, 1, Math.SQRT2],
];

// ── Public types ──────────────────────────────────────────

export interface PathResult {
  /** Ordered list of grid positions from start to destination (inclusive) */
  path: GridPosition[];
  /** Total accumulated cost (sum of weighted cell costs along path) */
  totalCost: number;
  /** true if a complete path to the destination was found */
  found: boolean;
}

// ── A* implementation ─────────────────────────────────────

/**
 * Find the least-cost path from start to end using A* with an 8-directional grid.
 *
 * @param grid      The terrain grid
 * @param start     Start cell position
 * @param end       Destination cell position
 * @param weights   Cost weight profile (use ROUTE_PROFILES or custom)
 * @returns         PathResult with the ordered path and total cost
 */
export function findPath(
  grid: TerrainGrid,
  start: GridPosition,
  end: GridPosition,
  weights: CostWeights
): PathResult {
  const { rows, cols, cellWidthM, cellHeightM, cells } = grid;
  const getCell = (r: number, c: number) => cells[r * cols + c];

  // Validate positions
  if (
    start.row < 0 || start.row >= rows ||
    start.col < 0 || start.col >= cols ||
    end.row < 0   || end.row >= rows ||
    end.col < 0   || end.col >= cols
  ) {
    return { path: [], totalCost: 0, found: false };
  }

  const open = new MinHeap();
  const gScores = new Map<string, number>();
  const closedSet = new Set<string>();

  const h0 = heuristic(start, end, cellWidthM, cellHeightM);
  open.push({ row: start.row, col: start.col, g: 0, h: h0, f: h0, parent: null });
  gScores.set(key(start.row, start.col), 0);

  while (open.size > 0) {
    const current = open.pop()!;
    const cKey = key(current.row, current.col);

    if (closedSet.has(cKey)) continue;
    closedSet.add(cKey);

    // Goal reached — reconstruct path
    if (current.row === end.row && current.col === end.col) {
      const path: GridPosition[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ row: node.row, col: node.col });
        node = node.parent;
      }
      return { path, totalCost: current.g, found: true };
    }

    for (const [dr, dc, distMult] of DIRS) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const nKey = key(nr, nc);
      if (closedSet.has(nKey)) continue;

      const cell = getCell(nr, nc);
      const moveCost = cellCost(cell, weights) * distMult;
      if (moveCost === Infinity) continue;

      const tentativeG = current.g + moveCost;
      if (tentativeG < (gScores.get(nKey) ?? Infinity)) {
        gScores.set(nKey, tentativeG);
        const h = heuristic({ row: nr, col: nc }, end, cellWidthM, cellHeightM);
        open.push({
          row: nr,
          col: nc,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        });
      }
    }
  }

  // No path found
  return { path: [], totalCost: 0, found: false };
}
