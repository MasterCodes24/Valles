"""
Gemini-powered scenario parser.

Gemini's ONLY job is to convert free-text into a structured ScenarioQuery.
It is explicitly instructed never to invent environmental numbers —
all numerical conditions come from rems_lookup.py.
"""

from __future__ import annotations

import json
import os
from typing import List, Tuple

import google.generativeai as genai

from schema import ScenarioQuery

# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM = """
You are a Mars EVA scenario parser for a scientifically accurate simulation system.

YOUR ONLY TASK: Convert the user's natural-language description into a JSON object
matching the schema below. You map *intent*, not numbers.

═══ CRITICAL RULES ═══
1. NEVER invent or estimate numerical environmental values such as temperature,
   pressure, UV, wind speed, or radiation. These come from real NASA REMS data.
2. If the user mentions a specific temperature, pressure, or UV value — IGNORE it,
   note it in "assumptions" with the message "User-specified value ignored; real
   REMS data will be used instead."
3. List every assumption you made for unspecified fields in the "assumptions" array.
4. If the user's request is physically impossible (e.g. "noon" + "total darkness"),
   choose the more physically realistic option and note it.
5. Output ONLY valid JSON. No prose, no code fences.

═══ OUTPUT SCHEMA ═══
{
  "season":           "spring" | "summer" | "autumn" | "winter",
  "time_of_day":      "dawn" | "morning" | "midday" | "afternoon" | "dusk" | "night",
  "duration_minutes": integer (5–480),
  "severity":         "typical" | "harsh" | "extreme",
  "dust_level":       "none" | "low" | "moderate" | "high" | "storm",
  "task_type":        "routine_eva" | "sample_collection" | "surveying"
                      | "base_construction" | "traverse" | "emergency",
  "experience":       "novice" | "intermediate" | "expert",
  "suit":             "suit_base" | "suit_advanced" | "suit_radiation"
                      | "suit_elite" | "suit_prototype",
  "notes":            "one-sentence plain-English summary of what the user described",
  "assumptions":      ["list of strings, one per assumption or ignored value"]
}

═══ MAPPING GUIDE ═══
Dust / storms:
  "clear day" / "no dust"           → dust_level: "none"
  "slightly dusty" / "hazy"         → dust_level: "low"
  "dusty" / "usual dust"            → dust_level: "moderate"
  "dust storm" / "regional storm"   → dust_level: "high"
  "global dust storm" / "1977-like" → dust_level: "storm"

Severity:
  "typical" / "average" / "normal"  → severity: "typical"
  "harsh" / "difficult" / "cold"    → severity: "harsh"
  "worst case" / "extreme" / "brutal" → severity: "extreme"

Time of day (Mars Local Solar Time):
  "sunrise" / "early morning"       → time_of_day: "dawn"
  "morning"                         → time_of_day: "morning"
  "noon" / "midday" / "solar noon"  → time_of_day: "midday"
  "afternoon"                       → time_of_day: "afternoon"
  "sunset" / "evening"              → time_of_day: "dusk"
  "night" / "dark" / "after dark"   → time_of_day: "night"

Season (if user mentions sols):
  Sol 0–194   → spring
  Sol 194–371 → summer
  Sol 371–549 → autumn
  Sol 549–669 → winter
  Then repeats.

Default values when unspecified:
  season: "spring", time_of_day: "afternoon", duration_minutes: 60,
  severity: "typical", dust_level: "none", task_type: "routine_eva",
  experience: "intermediate", suit: "suit_base"
"""


def parse_scenario(text: str) -> Tuple[ScenarioQuery, List[str], List[str]]:
    """
    Call Gemini to parse free-text into a ScenarioQuery.

    Returns (scenario, assumptions, warnings).
    Falls back to defaults on any API or parse error.
    """
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    api_key    = os.environ.get("GEMINI_API_KEY", "")

    warnings: List[str] = []

    if not api_key:
        warnings.append("GEMINI_API_KEY not configured — returning default scenario.")
        return ScenarioQuery(notes=text[:120], assumptions=["No API key; defaults used."]), [], warnings

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name,
            system_instruction=_SYSTEM,
        )
        response = model.generate_content(
            f"User scenario description:\n{text}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        raw = json.loads(response.text)

    except Exception as exc:
        warnings.append(f"Gemini error: {exc!r} — returning default scenario.")
        return ScenarioQuery(notes=text[:120], assumptions=["Parse error; defaults used."]), [], warnings

    assumptions = raw.pop("assumptions", [])

    try:
        scenario = ScenarioQuery(**{**raw, "assumptions": assumptions})
    except Exception as exc:
        warnings.append(f"Schema validation applied corrections: {exc}")
        scenario = ScenarioQuery(notes=raw.get("notes", ""), assumptions=assumptions)

    return scenario, assumptions, warnings


def generate_briefing(scenario: ScenarioQuery, start_conditions: dict) -> str:
    """
    Ask Gemini to write a mission briefing from the confirmed scenario + conditions.
    The model is instructed to only restate the provided numbers, never to alter them.
    """
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    api_key    = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        return _fallback_briefing(scenario, start_conditions)

    prompt = f"""
Write a 2–3 paragraph NASA-style EVA mission briefing for the scenario below.

RULES:
1. Use ONLY the numbers provided. Do NOT invent, estimate, or round differently.
2. Keep units exactly as given (°C, Pa, W/m², m/s).
3. Reference "REMS data, Gale Crater" as the source.
4. Mention one key safety consideration based on the worst condition present.
5. Write in professional third-person technical prose.

SCENARIO:
{json.dumps(scenario.model_dump(exclude={"assumptions"}), indent=2)}

CONDITIONS AT SESSION START (from REMS lookup):
Air temperature:    {start_conditions['air_temp_c']} °C
Ground temperature: {start_conditions['ground_temp_c']} °C
Atmospheric pressure: {start_conditions['pressure_pa']} Pa
UV irradiance:      {start_conditions['uv_wm2']} W/m²
Wind speed:         {start_conditions['wind_ms']} m/s
Dust opacity (tau): {start_conditions['dust_opacity']}
Radiation dose:     {start_conditions['radiation_mgy_day']} mGy/day
Local Solar Time:   {start_conditions['lst_hour']:.1f}h
"""
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt,
            generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=512))
        return response.text.strip()
    except Exception:
        return _fallback_briefing(scenario, start_conditions)


def _fallback_briefing(scenario: ScenarioQuery, c: dict) -> str:
    tod_map = {"dawn": "05:00–08:00", "morning": "08:00–11:00", "midday": "11:00–14:00",
               "afternoon": "14:00–17:00", "dusk": "17:00–20:00", "night": "20:00–05:00"}
    return (
        f"EVA Mission Briefing — {scenario.season.value.capitalize()} Season, "
        f"{tod_map.get(scenario.time_of_day.value, '?')} LST\n\n"
        f"Environmental conditions derived from REMS measurements at Gale Crater: "
        f"air temperature {c['air_temp_c']} °C, atmospheric pressure {c['pressure_pa']} Pa, "
        f"UV irradiance {c['uv_wm2']} W/m², surface wind {c['wind_ms']} m/s, "
        f"dust opacity τ = {c['dust_opacity']}. "
        f"Radiation dose rate is {c['radiation_mgy_day']} mGy/day.\n\n"
        f"Task: {scenario.task_type.value.replace('_', ' ').title()}. "
        f"Duration: {scenario.duration_minutes} minutes. "
        f"Suit: {scenario.suit}. Severity: {scenario.severity.value}."
    )

