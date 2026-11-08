/**
 * Realistic Mode API client
 * Calls the FastAPI backend (default: http://localhost:8000)
 *
 * Add to frontend .env:
 *   VITE_REALISTIC_API_URL=http://localhost:8000
 */

const BASE = import.meta.env.VITE_REALISTIC_API_URL || 'http://localhost:8000'

/**
 * Step 1 — Parse user text into a confirmed scenario.
 * @param {string} text  Free-text scenario description
 * @returns {{ scenario, assumptions, warnings }}
 */
export async function parseScenario(text) {
  const res = await fetch(`${BASE}/realistic/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Parse failed (${res.status})`)
  }
  return res.json()
}

/**
 * Step 2 — Generate REMS-based condition time series + mission briefing.
 * @param {object} scenario  Confirmed ScenarioQuery object
 * @returns {{ scenario, conditions, briefing, data_source, caveats }}
 */
export async function generateConditions(scenario) {
  const res = await fetch(`${BASE}/realistic/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Generate failed (${res.status})`)
  }
  return res.json()
}

/** Health check — returns true if backend is reachable. */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE}/realistic/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

// ── Fallback static conditions (no backend needed) ─────────────────────────────
// Values are median REMS statistics for spring/afternoon, clearly labelled.
export function buildFallbackConditions(scenario, durationMinutes = 60) {
  const DEFAULTS = {
    spring:  { air: -20, gnd: 12,  press: 820, uv: 18, wind: 4.2, tau: 0.65, rad: 0.64 },
    summer:  { air: -38, gnd: -15, press: 712, uv: 12, wind: 3.2, tau: 0.45, rad: 0.68 },
    autumn:  { air: -26, gnd:   8, press: 762, uv: 10, wind: 5.5, tau: 1.10, rad: 0.58 },
    winter:  { air:  -6, gnd:  32, press: 870, uv: 22, wind: 4.8, tau: 0.72, rad: 0.62 },
  }
  const BASE_VALUES = DEFAULTS[scenario?.season || 'spring']

  const TIME_LST = {
    dawn: 6, morning: 9, midday: 12.5, afternoon: 15, dusk: 18, night: 22,
  }
  const startLst = TIME_LST[scenario?.time_of_day || 'afternoon']

  const points = []
  for (let min = 0; min <= durationMinutes; min++) {
    const lst = ((startLst + min / 60) % 24)
    const isDay = lst >= 6 && lst <= 19
    const uvFactor = isDay ? Math.max(0, Math.sin(((lst - 6) / 13) * Math.PI)) : 0
    points.push({
      minute: min,
      lst_hour: parseFloat(lst.toFixed(2)),
      air_temp_c:    parseFloat((BASE_VALUES.air - 15 + 15 * uvFactor).toFixed(1)),
      ground_temp_c: parseFloat((BASE_VALUES.gnd - 10 + 25 * uvFactor).toFixed(1)),
      pressure_pa:   parseFloat((BASE_VALUES.press + 4 * Math.sin((lst - 10) / 24 * 2 * Math.PI)).toFixed(1)),
      uv_wm2:        parseFloat((BASE_VALUES.uv * uvFactor).toFixed(2)),
      wind_ms:       parseFloat((BASE_VALUES.wind * (isDay ? 1 : 0.4)).toFixed(2)),
      dust_opacity:  BASE_VALUES.tau,
      radiation_mgy_day: BASE_VALUES.rad,
      source_notes: {
        all: 'Static fallback — median REMS statistics (Martínez et al. 2017). Start the Python backend for AI parsing.',
      },
    })
  }

  return {
    scenario: scenario || {},
    conditions: points,
    briefing: `Static REMS median briefing — ${scenario?.season || 'spring'} season, `
      + `${scenario?.time_of_day || 'afternoon'} LST. `
      + `Conditions derived from published Curiosity REMS statistics. `
      + `Start the Python backend at localhost:8000 for Gemini-powered AI parsing.`,
    data_source: 'REMS median statistics (Martínez et al. 2017) — static fallback',
    caveats: ['Backend not reachable. These are static median values, not AI-parsed.'],
    isFallback: true,
  }
}

