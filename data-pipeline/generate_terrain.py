"""
Valles Data Pipeline — Synthetic Terrain Generator
===================================================
Generates procedural TerrainGrid JSON files for each Mars region.
Output: public/data/regions/<region_id>.json

Usage:
    python data-pipeline/generate_terrain.py [--region jezero|all]

The generated JSON matches the TerrainGrid TypeScript interface exactly:
{
  regionId: string,
  rows: number,
  cols: number,
  cellWidthM: number,
  cellHeightM: number,
  cells: GridCell[]
}

Where each GridCell has:
  row, col, elevationM, slopeDeg, roughness, hazard, hazardSeverity,
  radiationLevel, commsAvailable, commsStrength, terrainType,
  isRestPoint, isImpassable
"""

from __future__ import annotations

import json
import math
import os
import random
import argparse
from dataclasses import dataclass, asdict
from typing import Literal, Optional, List

# ── Type definitions (mirror TypeScript types) ───────────────────────────────

TerrainType = Literal[
    "basalt", "sand", "rock", "ice", "crater_floor",
    "canyon_wall", "highland", "lava_field", "dust_plain"
]
HazardType = Literal[
    "none", "dust_devil", "radiation_spike", "unstable_ground",
    "steep_slope", "comms_dead_zone", "thermal_vent", "boulder_field"
]

@dataclass
class GridCell:
    row: int
    col: int
    elevationM: float
    slopeDeg: float
    roughness: float
    hazard: str
    hazardSeverity: float
    radiationLevel: float
    commsAvailable: bool
    commsStrength: float
    terrainType: str
    isRestPoint: bool
    isImpassable: bool


@dataclass
class TerrainGrid:
    regionId: str
    rows: int
    cols: int
    cellWidthM: float
    cellHeightM: float
    cells: List[GridCell]


# ── Procedural noise helpers ──────────────────────────────────────────────────

def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t

def fade(t: float) -> float:
    """Quintic fade for smooth Perlin-style interpolation."""
    return t * t * t * (t * (t * 6 - 15) + 10)

def _grad(h: int, x: float, y: float) -> float:
    """Gradient function for 2D pseudo-Perlin noise."""
    vectors = [(1, 1), (-1, 1), (1, -1), (-1, -1),
                (1, 0), (-1, 0), (0, 1), (0, -1)]
    g = vectors[h % 8]
    return g[0] * x + g[1] * y

def perlin2d(x: float, y: float, perm: List[int]) -> float:
    """Simple 2D Perlin noise in range [-1, 1]."""
    xi = int(math.floor(x)) & 255
    yi = int(math.floor(y)) & 255
    xf = x - math.floor(x)
    yf = y - math.floor(y)
    u = fade(xf)
    v = fade(yf)
    aa = perm[perm[xi]     + yi]
    ab = perm[perm[xi]     + yi + 1]
    ba = perm[perm[xi + 1] + yi]
    bb = perm[perm[xi + 1] + yi + 1]
    return lerp(
        lerp(_grad(aa, xf, yf),   _grad(ba, xf - 1, yf),   u),
        lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u),
        v
    )

def make_permutation(seed: int) -> List[int]:
    rng = random.Random(seed)
    p = list(range(256))
    rng.shuffle(p)
    return (p + p + [p[0]])  # doubled + overflow guard

def fbm(x: float, y: float, perm: List[int], octaves: int = 4, lacunarity: float = 2.0, gain: float = 0.5) -> float:
    """Fractional Brownian Motion via stacked Perlin octaves. Returns [-1, 1]."""
    value = 0.0
    amplitude = 1.0
    frequency = 1.0
    total_amplitude = 0.0
    for _ in range(octaves):
        value += perlin2d(x * frequency, y * frequency, perm) * amplitude
        total_amplitude += amplitude
        amplitude *= gain
        frequency *= lacunarity
    return value / total_amplitude


# ── Elevation → slope conversion ──────────────────────────────────────────────

def compute_slopes(elevation: List[List[float]], cell_w: float, cell_h: float) -> List[List[float]]:
    """Compute slope in degrees for each cell from elevation grid."""
    rows = len(elevation)
    cols = len(elevation[0])
    slopes = [[0.0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            # Finite difference gradients
            dz_dx = (elevation[r][min(c+1, cols-1)] - elevation[r][max(c-1, 0)]) / (2 * cell_w)
            dz_dy = (elevation[min(r+1, rows-1)][c] - elevation[max(r-1, 0)][c]) / (2 * cell_h)
            slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
            slopes[r][c] = math.degrees(slope_rad)
    return slopes


# ── Region generator ──────────────────────────────────────────────────────────

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

def generate_region(
    region_id: str,
    rows: int,
    cols: int,
    cell_width_m: float,
    cell_height_m: float,
    seed: int,
    base_elevation_m: float,
    elevation_range_m: float,
    hazard_zones: list[dict],
    rest_point_positions: list[tuple[int, int]],
    dominant_terrain: str,
    radiation_base: float = 0.05,
    roughness_base: float = 0.15,
) -> TerrainGrid:
    """
    Generate a complete TerrainGrid using procedural noise.

    hazard_zones: list of dicts like:
        { "hazard": "radiation_spike", "center": (r, c), "radius": 3, "severity": 0.8 }
    """
    perm = make_permutation(seed)
    noise_scale = 4.0  # how many "noise periods" fit across the grid

    # ── 1. Generate elevation field ────────────────────────────────────────
    elevation = [
        [
            base_elevation_m + elevation_range_m * (
                fbm(r / rows * noise_scale, c / cols * noise_scale, perm, octaves=5)
                * 0.5 + 0.5  # map [-1,1] to [0,1]
            )
            for c in range(cols)
        ]
        for r in range(rows)
    ]
    slopes = compute_slopes(elevation, cell_width_m, cell_height_m)

    # ── 2. Roughness field (different noise seed) ──────────────────────────
    perm2 = make_permutation(seed + 1)
    roughness_field = [
        [
            clamp(roughness_base + 0.4 * (
                fbm(r / rows * noise_scale * 1.5, c / cols * noise_scale * 1.5, perm2, octaves=3)
                * 0.5 + 0.5
            ), 0.0, 1.0)
            for c in range(cols)
        ]
        for r in range(rows)
    ]

    # ── 3. Radiation field ─────────────────────────────────────────────────
    perm3 = make_permutation(seed + 2)
    radiation_field = [
        [
            clamp(radiation_base + 0.3 * (
                fbm(r / rows * noise_scale * 2, c / cols * noise_scale * 2, perm3, octaves=2)
                * 0.5 + 0.5
            ), 0.0, 1.0)
            for c in range(cols)
        ]
        for r in range(rows)
    ]

    # ── 4. Comms field ─────────────────────────────────────────────────────
    perm4 = make_permutation(seed + 3)
    comms_field = [
        [
            clamp(0.5 + 0.5 * fbm(r / rows * noise_scale, c / cols * noise_scale, perm4, octaves=2), 0.0, 1.0)
            for c in range(cols)
        ]
        for r in range(rows)
    ]

    # ── 5. Hazard zone overlay ─────────────────────────────────────────────
    hazard_map: dict[tuple[int, int], tuple[str, float]] = {}
    for zone in hazard_zones:
        cr, cc = zone["center"]
        radius = zone["radius"]
        hazard = zone["hazard"]
        severity = zone["severity"]
        for r in range(max(0, cr - radius), min(rows, cr + radius + 1)):
            for c in range(max(0, cc - radius), min(cols, cc + radius + 1)):
                dist = math.sqrt((r - cr)**2 + (c - cc)**2)
                if dist <= radius:
                    # Fade severity toward edge
                    effective_sev = severity * (1 - dist / (radius + 1))
                    if (r, c) not in hazard_map or effective_sev > hazard_map[(r, c)][1]:
                        hazard_map[(r, c)] = (hazard, effective_sev)

    # ── 6. Rest-point set ─────────────────────────────────────────────────
    rest_set = set(rest_point_positions)

    # ── 7. Terrain type assignment based on slope + noise ─────────────────
    def terrain_type(r: int, c: int) -> str:
        slope = slopes[r][c]
        if slope > 45:
            return "canyon_wall"
        if slope > 25:
            return "rock"
        rough = roughness_field[r][c]
        if rough > 0.75:
            return "boulder_field" if False else "lava_field"  # simplified
        return dominant_terrain

    # ── 8. Assemble cells ─────────────────────────────────────────────────
    cells: List[GridCell] = []
    for r in range(rows):
        for c in range(cols):
            slope = slopes[r][c]
            is_impassable = slope > 60
            rough = roughness_field[r][c]
            rad = radiation_field[r][c]
            comms_str = comms_field[r][c]

            # Apply hazard overlay
            if (r, c) in hazard_map:
                hazard_type, hazard_sev = hazard_map[(r, c)]
                # Boost radiation in radiation zones
                if hazard_type == "radiation_spike":
                    rad = clamp(rad + hazard_sev * 0.5, 0, 1)
                # Reduce comms in dead zones
                if hazard_type == "comms_dead_zone":
                    comms_str = clamp(comms_str * (1 - hazard_sev), 0, 1)
            else:
                hazard_type = "none"
                hazard_sev = 0.0

            # Also assign steep_slope hazard when slope is high
            if slope > 30 and hazard_type == "none":
                hazard_type = "steep_slope"
                hazard_sev = clamp((slope - 30) / 30, 0, 1)

            is_rest = (r, c) in rest_set and not is_impassable

            cells.append(GridCell(
                row=r,
                col=c,
                elevationM=round(elevation[r][c], 1),
                slopeDeg=round(slope, 2),
                roughness=round(rough, 3),
                hazard=hazard_type,
                hazardSeverity=round(hazard_sev, 3),
                radiationLevel=round(rad, 3),
                commsAvailable=comms_str > 0.3,
                commsStrength=round(comms_str, 3),
                terrainType=terrain_type(r, c),
                isRestPoint=is_rest,
                isImpassable=is_impassable,
            ))

    return TerrainGrid(
        regionId=region_id,
        rows=rows,
        cols=cols,
        cellWidthM=cell_width_m,
        cellHeightM=cell_height_m,
        cells=cells,
    )


def save_grid(grid: TerrainGrid, output_dir: str) -> str:
    """Save a TerrainGrid to JSON. Returns the output file path."""
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"{grid.regionId}.json")
    data = {
        "regionId": grid.regionId,
        "rows": grid.rows,
        "cols": grid.cols,
        "cellWidthM": grid.cellWidthM,
        "cellHeightM": grid.cellHeightM,
        "cells": [asdict(c) for c in grid.cells],
    }
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))  # compact JSON
    print(f"  Saved {len(grid.cells)} cells -> {path}  ({os.path.getsize(path) // 1024} KB)")
    return path


# ── Region definitions ────────────────────────────────────────────────────────

REGION_SPECS = {
    "jezero": dict(
        region_id="jezero",
        rows=20, cols=20,
        cell_width_m=1500, cell_height_m=1500,  # 20×20 grid ≈ 30×30 km
        seed=42,
        base_elevation_m=-2600, elevation_range_m=800,
        dominant_terrain="crater_floor",
        radiation_base=0.04,
        roughness_base=0.10,
        hazard_zones=[
            {"hazard": "dust_devil",      "center": (5, 5),   "radius": 2, "severity": 0.5},
            {"hazard": "unstable_ground", "center": (12, 8),  "radius": 3, "severity": 0.6},
            {"hazard": "dust_devil",      "center": (16, 14), "radius": 2, "severity": 0.4},
            {"hazard": "radiation_spike", "center": (3, 15),  "radius": 2, "severity": 0.45},
            {"hazard": "boulder_field",   "center": (9, 17),  "radius": 2, "severity": 0.55},
        ],
        rest_point_positions=[(0, 0), (10, 10), (19, 19), (0, 19), (19, 0)],
    ),
    "valles_marineris": dict(
        region_id="valles_marineris",
        rows=20, cols=20,
        cell_width_m=5000, cell_height_m=5000,
        seed=137,
        base_elevation_m=-2000, elevation_range_m=8000,
        dominant_terrain="canyon_wall",
        radiation_base=0.08,
        roughness_base=0.35,
        hazard_zones=[
            {"hazard": "steep_slope",     "center": (6, 6),   "radius": 4, "severity": 0.85},
            {"hazard": "comms_dead_zone", "center": (10, 10), "radius": 4, "severity": 0.9},
            {"hazard": "boulder_field",   "center": (3, 15),  "radius": 3, "severity": 0.7},
            {"hazard": "steep_slope",     "center": (15, 3),  "radius": 4, "severity": 0.8},
            {"hazard": "dust_devil",      "center": (18, 12), "radius": 2, "severity": 0.6},
            {"hazard": "comms_dead_zone", "center": (4, 4),   "radius": 3, "severity": 0.75},
        ],
        rest_point_positions=[(0, 0), (0, 19), (19, 0), (19, 19), (10, 0), (10, 19)],
    ),
    "olympus_mons": dict(
        region_id="olympus_mons",
        rows=20, cols=20,
        cell_width_m=3000, cell_height_m=3000,
        seed=256,
        base_elevation_m=18000, elevation_range_m=3000,
        dominant_terrain="lava_field",
        radiation_base=0.15,
        roughness_base=0.40,
        hazard_zones=[
            {"hazard": "radiation_spike", "center": (5, 5),   "radius": 4, "severity": 0.9},
            {"hazard": "thermal_vent",    "center": (10, 10), "radius": 3, "severity": 0.85},
            {"hazard": "steep_slope",     "center": (15, 15), "radius": 4, "severity": 0.9},
            {"hazard": "thermal_vent",    "center": (3, 15),  "radius": 2, "severity": 0.7},
            {"hazard": "radiation_spike", "center": (17, 5),  "radius": 3, "severity": 0.8},
        ],
        rest_point_positions=[(0, 0), (0, 19), (19, 0), (19, 19)],
    ),
    "arcadia_planitia": dict(
        region_id="arcadia_planitia",
        rows=20, cols=20,
        cell_width_m=4000, cell_height_m=4000,
        seed=512,
        base_elevation_m=-500, elevation_range_m=1200,
        dominant_terrain="ice",
        radiation_base=0.12,
        roughness_base=0.20,
        hazard_zones=[
            {"hazard": "unstable_ground", "center": (5, 10),  "radius": 4, "severity": 0.8},
            {"hazard": "dust_devil",      "center": (15, 5),  "radius": 3, "severity": 0.65},
            {"hazard": "radiation_spike", "center": (10, 15), "radius": 3, "severity": 0.75},
            {"hazard": "unstable_ground", "center": (18, 18), "radius": 3, "severity": 0.7},
        ],
        rest_point_positions=[(0, 0), (0, 19), (19, 0), (19, 19), (10, 10)],
    ),
    "hellas_basin": dict(
        region_id="hellas_basin",
        rows=20, cols=20,
        cell_width_m=6000, cell_height_m=6000,
        seed=999,
        base_elevation_m=-7000, elevation_range_m=2000,
        dominant_terrain="dust_plain",
        radiation_base=0.20,
        roughness_base=0.30,
        hazard_zones=[
            {"hazard": "thermal_vent",    "center": (5, 5),   "radius": 3, "severity": 0.95},
            {"hazard": "radiation_spike", "center": (8, 14),  "radius": 4, "severity": 0.9},
            {"hazard": "dust_devil",      "center": (14, 7),  "radius": 4, "severity": 0.85},
            {"hazard": "unstable_ground", "center": (17, 17), "radius": 3, "severity": 0.8},
            {"hazard": "comms_dead_zone", "center": (10, 10), "radius": 5, "severity": 0.95},
            {"hazard": "thermal_vent",    "center": (2, 18),  "radius": 2, "severity": 0.85},
        ],
        rest_point_positions=[(0, 0), (0, 19), (19, 0), (19, 19)],
    ),
}


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Valles terrain data pipeline")
    parser.add_argument("--region", default="all",
                        help="Region ID to generate (jezero, valles_marineris, olympus_mons, etc.) or 'all'")
    parser.add_argument("--output", default="public/data/regions",
                        help="Output directory (default: public/data/regions)")
    args = parser.parse_args()

    regions_to_build = (
        list(REGION_SPECS.keys()) if args.region == "all"
        else [args.region]
    )

    for region_id in regions_to_build:
        if region_id not in REGION_SPECS:
            print(f"Unknown region: {region_id}")
            continue
        print(f"Generating terrain for: {region_id} ...")
        spec = REGION_SPECS[region_id]
        grid = generate_region(**spec)
        save_grid(grid, args.output)

    print("Done.")


if __name__ == "__main__":
    main()
