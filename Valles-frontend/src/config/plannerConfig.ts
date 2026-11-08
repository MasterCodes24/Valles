// ──────────────────────────────────────────────────────────
//  Valles — Mission Planner Configuration (Product B)
//  Separate from game config — different design philosophy.
// ──────────────────────────────────────────────────────────

/** Planner-specific suit specifications (realistic, not gamified) */
export interface PlannerSuitSpec {
  id: string;
  name: string;
  model: string;
  /** Primary O2 supply in litres at 0.95 bar partial pressure */
  primaryO2L: number;
  /** Emergency O2 reserve in litres */
  reserveO2L: number;
  /** CO2 scrubber endurance in hours at max exertion */
  co2ScrubberH: number;
  /** Battery capacity in Wh */
  batteryWh: number;
  /** Thermal protection range: [min, max] °C survivable */
  thermalRangeC: [number, number];
  /** Radiation shielding in g/cm² aluminium equivalent */
  radiationShieldingGcm2: number;
  /** Nominal EVA duration limit in hours (suit endurance) */
  nominalEvaH: number;
  maxEvaH: number;
}

export const PLANNER_SUIT_SPECS: PlannerSuitSpec[] = [
  {
    id: "xemu",
    name: "xEMU (Exploration Extravehicular Mobility Unit)",
    model: "NASA xEMU (Illustrative)",
    primaryO2L: 840,
    reserveO2L: 120,
    co2ScrubberH: 8,
    batteryWh: 3000,
    thermalRangeC: [-128, 121],
    radiationShieldingGcm2: 0.6,
    nominalEvaH: 8,
    maxEvaH: 10,
  },
  {
    id: "spacex_iva",
    name: "SpaceX IVA Suit (EVA Variant)",
    model: "SpaceX Dragon IVA (Illustrative)",
    primaryO2L: 600,
    reserveO2L: 100,
    co2ScrubberH: 6,
    batteryWh: 2500,
    thermalRangeC: [-100, 100],
    radiationShieldingGcm2: 0.4,
    nominalEvaH: 6,
    maxEvaH: 8,
  },
  {
    id: "collins_axiom",
    name: "Axiom Space AxEMU",
    model: "Collins/Axiom AxEMU (Illustrative)",
    primaryO2L: 900,
    reserveO2L: 150,
    co2ScrubberH: 9,
    batteryWh: 3500,
    thermalRangeC: [-157, 121],
    radiationShieldingGcm2: 0.75,
    nominalEvaH: 8,
    maxEvaH: 12,
  },
];

/** Safety thresholds used by the Mission Planner */
export const PLANNER_THRESHOLDS = {
  /** Abort EVA if O2 remaining drops below this fraction */
  o2AbortFraction: 0.25,
  /** Warn crew if O2 remaining drops below this fraction */
  o2WarnFraction: 0.40,
  /** Radiation exposure abort threshold (mSv/EVA) */
  radiationAbortMSv: 50,
  /** Warn if accumulated radiation exceeds this (mSv) */
  radiationWarnMSv: 30,
  /** Maximum comms blackout window before plan is flagged */
  maxCommsBlackoutMinutes: 15,
  /** Maximum slope for EVA without special equipment (degrees) */
  maxSlopeDeg: 30,
} as const;

/**
 * Compute Earth–Mars light-travel delay in minutes for a given date.
 * Uses a simplified circular-orbit model (good to ~5%).
 *
 * @param date  JavaScript Date object (defaults to now)
 * @returns     One-way light delay in minutes
 */
export function earthMarsDelayMinutes(date: Date = new Date()): number {
  // Mars orbital period ≈ 686.97 days; Earth ≈ 365.25 days
  // Use a simplified synodic approach: distance oscillates between
  // 54.6 Mkm (opposition) and 401 Mkm (conjunction)
  // Period ≈ 779.94 days (synodic period of Mars)
  const SYNODIC_DAYS = 779.94;
  const MIN_DIST_MKM = 54.6;
  const MAX_DIST_MKM = 401.0;
  const SPEED_OF_LIGHT_KM_S = 299792.458;

  // Reference opposition: 2022-12-01 (arbitrary known opposition date)
  const REF_OPPOSITION = new Date("2022-12-01T00:00:00Z").getTime();
  const elapsedDays = (date.getTime() - REF_OPPOSITION) / (1000 * 60 * 60 * 24);
  const phase = (elapsedDays % SYNODIC_DAYS) / SYNODIC_DAYS; // 0–1
  const angle = phase * 2 * Math.PI;

  // cos: 1 at opposition (min dist), -1 at conjunction (max dist)
  const distMkm =
    (MIN_DIST_MKM + MAX_DIST_MKM) / 2 -
    ((MAX_DIST_MKM - MIN_DIST_MKM) / 2) * Math.cos(angle);

  const distKm = distMkm * 1e6;
  const delaySeconds = distKm / SPEED_OF_LIGHT_KM_S;
  return delaySeconds / 60;
}
