"""
Pydantic models for the Realistic Mode scenario API.

Season/time vocabulary is intentionally kept plain-English so Gemini can
map user language onto it without confusion.
"""
from __future__ import annotations

from enum import Enum
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ── Enumerations ────────────────────────────────────────────────────────────────

class Season(str, Enum):
    spring = "spring"    # Ls 0-90°   : moderate, rising pressure
    summer = "summer"    # Ls 90-180° : coldest at Gale (SH winter), lowest pressure
    autumn = "autumn"    # Ls 180-270°: dust-storm season, variable
    winter = "winter"    # Ls 270-360°: warmest at Gale (SH summer), highest pressure


class TimeOfDay(str, Enum):
    dawn      = "dawn"       # 05-08 LST
    morning   = "morning"    # 08-11 LST
    midday    = "midday"     # 11-14 LST
    afternoon = "afternoon"  # 14-17 LST
    dusk      = "dusk"       # 17-20 LST
    night     = "night"      # 20-05 LST


class Severity(str, Enum):
    typical = "typical"   # median conditions
    harsh   = "harsh"     # 5th/95th-percentile worst case
    extreme = "extreme"   # observed minima/maxima or storm table


class DustLevel(str, Enum):
    none     = "none"      # tau < 0.3   — clear
    low      = "low"       # tau 0.3-0.8 — slight haze
    moderate = "moderate"  # tau 0.8-2.0 — dusty
    high     = "high"      # tau 2.0-4.5 — regional storm
    storm    = "storm"     # tau > 4.5   — global storm


class TaskType(str, Enum):
    routine_eva       = "routine_eva"
    sample_collection = "sample_collection"
    surveying         = "surveying"
    base_construction = "base_construction"
    traverse          = "traverse"
    emergency         = "emergency"


# ── Core scenario ────────────────────────────────────────────────────────────────

class ScenarioQuery(BaseModel):
    season:           Season    = Season.spring
    time_of_day:      TimeOfDay = TimeOfDay.afternoon
    duration_minutes: int       = Field(default=60, ge=5, le=480)
    severity:         Severity  = Severity.typical
    dust_level:       DustLevel = DustLevel.none
    task_type:        TaskType  = TaskType.routine_eva
    experience: Literal["novice", "intermediate", "expert"] = "intermediate"
    suit:   str       = "suit_base"
    notes:  str       = ""
    assumptions: List[str] = []


# ── Request / response models ────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=4000,
                      description="Raw user scenario description.")

    @field_validator("text")
    @classmethod
    def sanitize(cls, v: str) -> str:
        # Strip markdown code fences and common injection markers
        for bad in ("```", "SYSTEM:", "system:", "<|system|>", "<|user|>"):
            v = v.replace(bad, "")
        return v.strip()


class ParseResponse(BaseModel):
    scenario:    ScenarioQuery
    assumptions: List[str]
    warnings:    List[str] = []


class ConditionPoint(BaseModel):
    minute:        int     # elapsed minutes from scenario start
    lst_hour:      float   # Local Solar Time (Mars), 0-24
    air_temp_c:    float   # °C
    ground_temp_c: float   # °C
    pressure_pa:   float   # Pa
    uv_wm2:        float   # W/m²
    wind_ms:       float   # m/s
    dust_opacity:  float   # tau (unitless)
    radiation_mgy_day: float  # mGy/day
    source_notes:  Dict[str, str]  # variable → provenance string


class GenerateResponse(BaseModel):
    scenario:    ScenarioQuery
    conditions:  List[ConditionPoint]  # one point per minute
    briefing:    str
    data_source: str
    caveats:     List[str]


class GenerateRequest(BaseModel):
    scenario: ScenarioQuery

