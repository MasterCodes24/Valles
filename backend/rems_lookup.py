"""
REMS Lookup Engine
==================
Derives Martian surface conditions from parameterized statistics
taken from published REMS (Remote Environmental Monitoring Station) data.

Data site:   Gale Crater, Mars (4.59 °S, 137.44 °E, −4.5 km elevation)
Instrument:  MSL/Curiosity REMS MODRDR v1.0
Archive:     https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/mars_lander.html

Key references
--------------
Gómez-Elvira et al. (2014): doi:10.1029/2012JE004282   — REMS first year
Martínez et al. (2017):    doi:10.1002/2016JE005157    — REMS full characterisation
Hamilton et al. (2014):    doi:10.1002/2013JE004596    — Pressure record
Haberle et al. (2014):     doi:10.1002/2014JE004626    — Meteorology overview
Simonsen et al. (2015):    doi:10.1016/j.icarus.2015.09.025 — UV at surface

NOTE: These values are derived from published statistics.
Run data_pipeline/build_lookup.py with actual PDS files to replace
this module with precise per-sol measurements.
"""

from __future__ import annotations

import math
import random
from typing import List

from schema import (
    ConditionPoint, DustLevel, ScenarioQuery, Season, Severity, TimeOfDay,
)

# ── Season parameters ──────────────────────────────────────────────────────────
# All temperatures °C, pressure Pa, UV W/m², wind m/s.
# Ls 0° = Vernal Equinox (NH Spring). Gale is at 5°S, so:
#   NH Spring/Summer → SH Autumn/Winter (colder at Gale)
#   NH Autumn/Winter → SH Spring/Summer (warmer at Gale)

_SP = {
    "spring": {
        # Ls 0–90°: NH Spring / moderate season
        "_ref": "Martínez et al. 2017 Table 2; Gómez-Elvira et al. 2014",
        "air_night_mean": -75.0, "air_night_p05": -92.0, "air_night_p95": -58.0,
        "air_day_mean":   -20.0, "air_day_p05":   -38.0, "air_day_p95":    -5.0,
        "air_extreme_min": -105.0, "air_extreme_max": 2.0,
        "gnd_night_mean": -83.0, "gnd_night_p05": -100.0, "gnd_night_p95": -66.0,
        "gnd_day_mean":    12.0, "gnd_day_p05":    -5.0,  "gnd_day_p95":   28.0,
        "gnd_extreme_min": -112.0, "gnd_extreme_max": 38.0,
        "press_mean": 820.0, "press_p05": 798.0, "press_p95": 843.0,
        "press_min":  782.0, "press_max": 858.0,
        "uv_noon_mean": 18.0, "uv_noon_p05": 7.0, "uv_noon_p95": 28.0, "uv_noon_max": 36.0,
        "wind_day_mean": 4.2, "wind_day_p05": 0.6, "wind_day_p95": 11.0, "wind_day_max": 18.0,
        "wind_night_mean": 1.6, "wind_night_p95": 4.5,
        "dust_tau_mean": 0.65, "dust_tau_p95": 1.5,
        "rad_mean": 0.64, "rad_max": 1.2,
    },
    "summer": {
        # Ls 90–180°: NH Summer / COLDEST period at Gale (SH winter)
        "_ref": "Martínez et al. 2017 Table 2",
        "air_night_mean": -92.0, "air_night_p05": -113.0, "air_night_p95": -72.0,
        "air_day_mean":   -38.0, "air_day_p05":    -55.0, "air_day_p95":   -20.0,
        "air_extreme_min": -126.0, "air_extreme_max": -12.0,
        "gnd_night_mean": -98.0, "gnd_night_p05": -118.0, "gnd_night_p95": -78.0,
        "gnd_day_mean":   -15.0, "gnd_day_p05":    -28.0, "gnd_day_p95":    -4.0,
        "gnd_extreme_min": -130.0, "gnd_extreme_max": 8.0,
        "press_mean": 712.0, "press_p05": 693.0, "press_p95": 738.0,
        "press_min":  684.0, "press_max": 752.0,
        "uv_noon_mean": 12.0, "uv_noon_p05": 5.0, "uv_noon_p95": 20.0, "uv_noon_max": 26.0,
        "wind_day_mean": 3.2, "wind_day_p05": 0.4, "wind_day_p95": 8.5, "wind_day_max": 14.0,
        "wind_night_mean": 1.2, "wind_night_p95": 3.5,
        "dust_tau_mean": 0.45, "dust_tau_p95": 0.9,
        "rad_mean": 0.68, "rad_max": 1.4,
    },
    "autumn": {
        # Ls 180–270°: NH Autumn / DUST-STORM season at Gale
        "_ref": "Martínez et al. 2017; Haberle et al. 2014",
        "air_night_mean": -82.0, "air_night_p05": -103.0, "air_night_p95": -62.0,
        "air_day_mean":   -26.0, "air_day_p05":    -48.0, "air_day_p95":    -8.0,
        "air_extreme_min": -115.0, "air_extreme_max": 5.0,
        "gnd_night_mean": -88.0, "gnd_night_p05": -106.0, "gnd_night_p95": -68.0,
        "gnd_day_mean":     8.0, "gnd_day_p05":    -8.0,  "gnd_day_p95":   24.0,
        "gnd_extreme_min": -118.0, "gnd_extreme_max": 36.0,
        "press_mean": 762.0, "press_p05": 743.0, "press_p95": 795.0,
        "press_min":  730.0, "press_max": 812.0,
        "uv_noon_mean": 10.0, "uv_noon_p05": 2.0, "uv_noon_p95": 22.0, "uv_noon_max": 30.0,
        "wind_day_mean": 5.5, "wind_day_p05": 0.8, "wind_day_p95": 18.0, "wind_day_max": 32.0,
        "wind_night_mean": 2.2, "wind_night_p95": 7.0,
        "dust_tau_mean": 1.1, "dust_tau_p95": 4.5,
        "rad_mean": 0.58, "rad_max": 0.95,  # more shielded by dust column
    },
    "winter": {
        # Ls 270–360°: NH Winter / WARMEST period at Gale (SH summer)
        "_ref": "Martínez et al. 2017 Table 2; Hamilton et al. 2014",
        "air_night_mean": -63.0, "air_night_p05": -82.0,  "air_night_p95": -46.0,
        "air_day_mean":    -6.0, "air_day_p05":   -22.0,  "air_day_p95":    7.0,
        "air_extreme_min": -95.0, "air_extreme_max": 15.0,
        "gnd_night_mean": -68.0, "gnd_night_p05": -86.0, "gnd_night_p95": -50.0,
        "gnd_day_mean":    32.0, "gnd_day_p05":    14.0, "gnd_day_p95":   44.0,
        "gnd_extreme_min": -100.0, "gnd_extreme_max": 55.0,
        "press_mean": 870.0, "press_p05": 850.0, "press_p95": 892.0,
        "press_min":  838.0, "press_max": 902.0,
        "uv_noon_mean": 22.0, "uv_noon_p05": 10.0, "uv_noon_p95": 32.0, "uv_noon_max": 40.0,
        "wind_day_mean": 4.8, "wind_day_p05": 0.6, "wind_day_p95": 13.5, "wind_day_max": 22.0,
        "wind_night_mean": 2.0, "wind_night_p95": 5.5,
        "dust_tau_mean": 0.72, "dust_tau_p95": 1.8,
        "rad_mean": 0.62, "rad_max": 1.1,
    },
}

# Dust-level effect table
# uv_factor: multiplier on UV (tau absorbs UV strongly)
# wind_add:  additional m/s mean wind
# tau_base:  dust optical depth override
_DUST = {
    "none":     {"uv_factor": 1.00, "wind_add": 0.0,  "tau_override": None},
    "low":      {"uv_factor": 0.70, "wind_add": 2.0,  "tau_override": 0.65},
    "moderate": {"uv_factor": 0.40, "wind_add": 5.0,  "tau_override": 1.4},
    "high":     {"uv_factor": 0.14, "wind_add": 10.0, "tau_override": 3.2},
    "storm":    {"uv_factor": 0.04, "wind_add": 18.0, "tau_override": 6.0},
}

# LST hour windows for each time-of-day label
_TOD_LST = {
    "dawn":      (5.0,  8.0),
    "morning":   (8.0, 11.0),
    "midday":   (11.0, 14.0),
    "afternoon":(14.0, 17.0),
    "dusk":     (17.0, 20.0),
    "night":    (20.0, 29.0),  # wraps: 20→24 and 0→5 (stored as 24+h for math)
}

DATA_SOURCE = (
    "REMS MODRDR v1.0 (MSL/Curiosity), Gale Crater, Mars. "
    "Parameterized from Martínez et al. 2017, Gómez-Elvira et al. 2014, "
    "Hamilton et al. 2014. Archive: pds-atmospheres.nmsu.edu"
)


# ── Diurnal cycle models ───────────────────────────────────────────────────────

def _mars_air_temp(lst: float, t_night: float, t_day: float) -> float:
    """Air temperature at a given LST hour.
    Minimum ~05:00, maximum ~14:00 (REMS-calibrated shape).
    """
    if 5.0 <= lst <= 20.0:
        x = (lst - 5.0) / 15.0  # 0 → 1 over daylight window
        factor = math.sin(x * math.pi) ** 1.1  # peaks at x≈0.6 (14h)
        return t_night + (t_day - t_night) * factor
    # Nighttime: cool linearly from dusk-temperature to dawn minimum
    t_dusk = t_night + (t_day - t_night) * 0.18
    if lst > 20.0:
        frac = (lst - 20.0) / 9.0        # 20→29 (=5h next sol)
    else:
        frac = (lst + 4.0) / 9.0         # 0→5 → 4/9 … 9/9
    return t_dusk + (t_night - t_dusk) * min(1.0, frac)


def _mars_gnd_temp(lst: float, t_night: float, t_day: float) -> float:
    """Ground temperature — larger amplitude, faster morning rise."""
    if 6.0 <= lst <= 19.0:
        x = (lst - 6.0) / 13.0
        factor = math.sin(x * math.pi) ** 0.85  # slightly sharper peak
        return t_night + (t_day - t_night) * factor
    t_dusk = t_night + (t_day - t_night) * 0.08  # ground cools fast after sunset
    if lst > 19.0:
        frac = (lst - 19.0) / 10.0
    else:
        frac = (lst + 5.0) / 10.0
    return t_dusk + (t_night - t_dusk) * min(1.0, frac)


def _mars_uv(lst: float, uv_noon: float) -> float:
    """UV irradiance (W/m²). Zero at night, sinusoidal peak at solar noon."""
    if 6.0 <= lst <= 19.5:
        x = (lst - 6.0) / 13.5
        return uv_noon * max(0.0, math.sin(x * math.pi) ** 0.75)
    return 0.0


def _mars_wind(lst: float, wind_day: float, wind_night: float) -> float:
    """Wind speed. Daytime convective boundary layer, calm nights."""
    if 6.0 <= lst <= 20.0:
        x = (lst - 6.0) / 14.0
        factor = 0.4 + 0.6 * math.sin(x * math.pi) ** 0.6
        return wind_night + (wind_day - wind_night) * factor
    return wind_night


def _mars_pressure(lst: float, press_mean: float) -> float:
    """Pressure shows a small diurnal tide (~4–8 Pa amplitude)."""
    # Morning trough, early-afternoon peak
    tide = 5.0 * math.sin(2 * math.pi * (lst - 10.0) / 24.0)
    return press_mean + tide


# ── Severity → percentile selector ────────────────────────────────────────────

def _pick(sp: dict, severity: str, key_mean: str, key_p05: str | None, key_p95: str | None,
          key_min: str | None = None, key_max: str | None = None, invert: bool = False) -> float:
    """Return a value from the season-param dict based on severity level.
    invert=True means p95 is the BAD side for this variable (e.g. wind, UV).
    invert=False means p05 is the bad side (e.g. temperature – colder is worse).
    """
    if severity == "typical":
        return sp[key_mean]
    if severity == "harsh":
        bad_key = key_p95 if invert else key_p05
        return sp[bad_key] if bad_key and bad_key in sp else sp[key_mean]
    # extreme
    bad_key = key_max if invert else key_min
    return sp[bad_key] if bad_key and bad_key in sp else sp[key_mean]


# ── Public API ─────────────────────────────────────────────────────────────────

def build_time_series(scenario: ScenarioQuery) -> List[ConditionPoint]:
    """Generate a per-minute list of ConditionPoints for the scenario."""
    sp    = _SP[scenario.season.value]
    dust  = _DUST[scenario.dust_level.value]
    sev   = scenario.severity.value
    tod   = _TOD_LST[scenario.time_of_day.value]
    start_lst = tod[0]
    if start_lst >= 24.0:
        start_lst -= 24.0

    # Choose temperature extremes based on severity
    air_night = _pick(sp, sev, "air_night_mean", "air_night_p05", "air_night_p95",
                      "air_extreme_min", None, invert=False)
    air_day   = _pick(sp, sev, "air_day_mean",   "air_day_p05",   "air_day_p95",
                      None, "air_extreme_max", invert=True)
    gnd_night = _pick(sp, sev, "gnd_night_mean", "gnd_night_p05", "gnd_night_p95",
                      "gnd_extreme_min", None, invert=False)
    gnd_day   = _pick(sp, sev, "gnd_day_mean",   "gnd_day_p05",   "gnd_day_p95",
                      None, "gnd_extreme_max", invert=True)
    press_base = _pick(sp, sev, "press_mean", "press_p05", "press_p95",
                       "press_min", "press_max", invert=False)
    uv_noon   = _pick(sp, sev, "uv_noon_mean", "uv_noon_p05", "uv_noon_p95",
                      None, "uv_noon_max", invert=True)
    wind_day  = _pick(sp, sev, "wind_day_mean", "wind_day_p05", "wind_day_p95",
                      None, "wind_day_max", invert=True)
    wind_night = _pick(sp, sev, "wind_night_mean", None, "wind_night_p95",
                       None, None, invert=True)
    rad_base  = sp["rad_mean"] if sev == "typical" else sp["rad_max"]

    # Apply dust modifiers
    uv_factor  = dust["uv_factor"]
    wind_extra = dust["wind_add"]
    tau_val    = dust["tau_override"] if dust["tau_override"] is not None else sp["dust_tau_mean"]

    # Source notes (attached once; all points share the same provenance)
    sev_label = {"typical": "median (p50)", "harsh": "p05/p95 worst-case",
                 "extreme": "observed extremes"}[sev]
    source_notes = {
        "air_temp":   f"REMS air temp, {scenario.season.value} season, {sev_label} — {sp['_ref']}",
        "ground_temp":f"REMS ground temp, {scenario.season.value} season, {sev_label} — {sp['_ref']}",
        "pressure":   f"REMS pressure, {scenario.season.value} season, {sev_label} — {sp['_ref']}",
        "uv":         f"REMS UV, {scenario.season.value} season × dust τ={tau_val:.1f} — Simonsen et al. 2015",
        "wind":       f"REMS wind, {scenario.season.value} season + dust forcing — {sp['_ref']}",
        "radiation":  "RAD instrument (Hassler et al. 2014): mean surface dose 0.64 mGy/day",
        "dust":       f"Dust level: {scenario.dust_level.value}, τ={tau_val:.1f} — {sp['_ref']}",
    }

    # Add a tiny deterministic jitter so consecutive readings look natural
    rng = random.Random(hash(f"{scenario.season}{scenario.time_of_day}{scenario.severity}"))

    points: List[ConditionPoint] = []
    for minute in range(scenario.duration_minutes + 1):
        lst = (start_lst + minute / 60.0) % 24.0

        air  = _mars_air_temp(lst, air_night, air_day)
        gnd  = _mars_gnd_temp(lst, gnd_night, gnd_day)
        pres = _mars_pressure(lst, press_base)
        uv   = _mars_uv(lst, uv_noon) * uv_factor
        wind = _mars_wind(lst, wind_day, wind_night) + wind_extra
        rad  = rad_base

        # Natural micro-variation (±1–2% of value)
        noise = lambda scale: rng.gauss(0, scale)
        air  += noise(0.6)
        pres += noise(2.0)
        wind  = max(0.0, wind + noise(0.4))
        uv    = max(0.0, uv + noise(0.3))

        points.append(ConditionPoint(
            minute=minute,
            lst_hour=round(lst, 2),
            air_temp_c=round(air, 1),
            ground_temp_c=round(gnd, 1),
            pressure_pa=round(pres, 1),
            uv_wm2=round(uv, 2),
            wind_ms=round(wind, 2),
            dust_opacity=round(tau_val, 2),
            radiation_mgy_day=round(rad, 3),
            source_notes=source_notes,
        ))

    return points


CAVEATS = [
    "Data source: REMS (Curiosity rover, Gale Crater). Conditions at other Mars "
    "landing sites will differ — particularly elevation-dependent pressure.",
    "Dust opacity (tau) is seasonally typical; actual storm onset cannot be predicted.",
    "Ground temperature can exceed 0 °C on sun-facing slopes in southern summer — "
    "this does NOT mean liquid water is stable (sublimation, not melting).",
    "Radiation values are from the RAD instrument (Hassler et al. 2014). "
    "Solar particle events can transiently raise dose rates >5×.",
    "This simulation is data-driven, not certified astronaut training.",
]

