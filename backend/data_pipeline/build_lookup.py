"""
Data Pipeline: Build precise REMS lookup table from real PDS files
==================================================================

INSTRUCTIONS
------------
1. Download REMS MODRDR data from the PDS archive:
   https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars_lander.html
   → Navigate to: MSL → REMS → MODRDR
   → Download all .tab files (CSV-like) and their .lbl label files

2. Place the downloaded files in a directory, e.g.:
   backend/data_pipeline/pds_raw/MODRDR/

3. Install extra deps:
   pip install pandas numpy scipy tqdm

4. Run:
   python build_lookup.py --input pds_raw/MODRDR --output ../rems_precise.json

The generated rems_precise.json replaces the parameterized tables in rems_lookup.py.
Edit rems_lookup.py to load from that file instead of _SP.

REMS MODRDR Column Reference (from PDS label files)
----------------------------------------------------
TIMESTAMP                - SCLK-based timestamp
LOCAL_MEAN_SOLAR_TIME    - LMST (HH:MM:SS)
SOLAR_LONGITUDE          - Ls (degrees)
AIR_TEMPERATURE          - °C (quality-flagged)
GROUND_TEMPERATURE       - °C (quality-flagged)
PRESSURE                 - Pa
HORIZONTAL_WIND_SPEED    - m/s
MAXIMUM_WIND_SPEED       - m/s (gust)
ULTRAVIOLET_SENSOR_A_B_C - UV bands (W/m²)
RELATIVE_HUMIDITY        - % (often near sensor floor)

Quality flags: 0 = valid, 1-7 = various error/calibration states.
Drop rows where QUALITY_FLAG != 0 for each variable.

UVRDR columns (separate instrument):
UV_A, UV_B, UV_C, UV_D, UV_E, UV_TOTAL — W/m²
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import numpy as np
    import pandas as pd
except ImportError:
    print("ERROR: Run:  pip install pandas numpy scipy tqdm")
    sys.exit(1)


SEASON_LS = {
    "spring": (0,   90),
    "summer": (90,  180),
    "autumn": (180, 270),
    "winter": (270, 360),
}

PERCENTILES = [5, 25, 50, 75, 95]
HOUR_BINS   = list(range(24))


def ls_to_season(ls: float) -> str:
    for name, (lo, hi) in SEASON_LS.items():
        if lo <= ls < hi:
            return name
    return "spring"  # Ls=360 wraps to spring


def parse_modrdr_tab(filepath: Path) -> pd.DataFrame:
    """Parse a single MODRDR .tab file into a DataFrame."""
    # MODRDR files are fixed-width or CSV; adjust sep if needed
    df = pd.read_csv(filepath, sep=",", comment="#", low_memory=False,
                     na_values=["UNK", "N/A", "-9999", "-9999.0", "9999"])
    df.columns = [c.strip().upper() for c in df.columns]
    return df


def load_all_tabs(directory: Path) -> pd.DataFrame:
    files = sorted(directory.glob("*.tab")) + sorted(directory.glob("*.TAB"))
    if not files:
        print(f"No .tab files found in {directory}")
        sys.exit(1)
    frames = []
    for f in files:
        try:
            frames.append(parse_modrdr_tab(f))
        except Exception as e:
            print(f"  Warning: could not parse {f.name}: {e}")
    return pd.concat(frames, ignore_index=True)


def build_stats(df: pd.DataFrame) -> dict:
    """Aggregate by season × hourly LST bin."""
    result = {}
    for season, (ls_lo, ls_hi) in SEASON_LS.items():
        mask = (df["SOLAR_LONGITUDE"] >= ls_lo) & (df["SOLAR_LONGITUDE"] < ls_hi)
        sub  = df[mask].copy()
        result[season] = {}
        for hour in HOUR_BINS:
            # LMST hour bin
            hour_mask = sub["LST_HOUR"].round().astype(int) == hour
            g = sub[hour_mask]
            entry = {"n_samples": int(len(g))}
            for col, out_key in [
                ("AIR_TEMPERATURE",       "air_temp"),
                ("GROUND_TEMPERATURE",    "ground_temp"),
                ("PRESSURE",              "pressure"),
                ("HORIZONTAL_WIND_SPEED", "wind"),
                ("UV_TOTAL",              "uv"),
            ]:
                if col in g.columns:
                    vals = g[col].dropna()
                    entry[out_key] = {
                        "mean": float(vals.mean()) if len(vals) else None,
                        "min":  float(vals.min())  if len(vals) else None,
                        "max":  float(vals.max())  if len(vals) else None,
                        **{f"p{p}": float(np.percentile(vals, p)) if len(vals) else None
                           for p in PERCENTILES},
                    }
            result[season][str(hour)] = entry
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="pds_raw/MODRDR", help="Directory of .tab files")
    parser.add_argument("--output", default="../rems_precise.json", help="Output JSON path")
    args = parser.parse_args()

    inp = Path(args.input)
    print(f"Loading REMS MODRDR files from: {inp}")
    df = load_all_tabs(inp)
    print(f"  Loaded {len(df):,} rows")

    # Parse LST hour from LMST string "HH:MM:SS"
    if "LOCAL_MEAN_SOLAR_TIME" in df.columns:
        df["LST_HOUR"] = df["LOCAL_MEAN_SOLAR_TIME"].str.split(":").str[0].astype(float)

    df["SOLAR_LONGITUDE"] = pd.to_numeric(df.get("SOLAR_LONGITUDE", pd.Series()), errors="coerce")

    print("Building seasonal × hourly statistics …")
    stats = build_stats(df)

    output = {
        "metadata": {
            "source": "REMS MODRDR v1.0 (MSL/Curiosity)",
            "site":   "Gale Crater, Mars (4.59°S, 137.44°E, −4.5 km)",
            "generated_by": "data_pipeline/build_lookup.py",
            "note": "Replace _SP in rems_lookup.py with this data for precise values.",
        },
        "seasons": stats,
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2))
    print(f"Saved → {out_path}")


if __name__ == "__main__":
    main()

