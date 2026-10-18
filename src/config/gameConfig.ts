// ──────────────────────────────────────────────────────────
//  Valles — Game Configuration Constants
//  Single source of truth for all tuneable values.
//  Change here → affects everywhere. No magic numbers in code.
// ──────────────────────────────────────────────────────────

/** Maximum player level in this build. DO NOT hardcode 10 elsewhere. */
export const MAX_LEVEL = 10;

/** In-game time: how many real minutes = 1 in-game hour */
export const REAL_MIN_PER_GAME_HOUR = 1;

/** In-game time: how many in-game hours in one sol (Martian day) */
export const GAME_HOURS_PER_SOL = 24.65; // Mars day ≈ 24h 37m

/** Weekly challenge resets every N real days */
export const WEEKLY_CHALLENGE_DAYS = 7;

// ── XP thresholds: XP needed to reach each level ──────────
// Index i = XP required to be AT level i+1 (level 1 = 0 XP).
export const XP_THRESHOLDS: number[] = [
  0,     // Level 1 (starting level)
  500,   // Level 2
  1200,  // Level 3
  2200,  // Level 4
  3500,  // Level 5
  5500,  // Level 6
  8000,  // Level 7
  11000, // Level 8
  15000, // Level 9
  20000, // Level 10
];

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level - 1, XP_THRESHOLDS.length - 1)] ?? 0;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

// ── XP award amounts ───────────────────────────────────────
export const XP_AWARDS = {
  mission_complete: 300,
  mission_efficient: 100,    // bonus for oxygen saved > 20%
  hazard_avoided: 50,        // per major hazard avoided
  no_rescue_used: 150,
  exploration_session: 75,   // per exploration session completed safely
  weekly_challenge: 500,
} as const;

// ── Level unlock table ────────────────────────────────────
// This is the single authoritative mapping of level → what unlocks.
// Change data here, not code, to rebalance.
export interface LevelUnlock {
  level: number;
  unlocks: string[];           // human-readable unlock names
  regionUnlocked?: string;     // region ID that becomes accessible
  suitUnlocked?: string;       // suit ID
  roverUnlocked?: boolean;
  currencyBonus: number;       // in-game currency bonus on level-up
}

export const LEVEL_UNLOCKS: LevelUnlock[] = [
  { level: 1,  unlocks: ["Base Suit", "Jezero Crater"],                 regionUnlocked: "jezero",           suitUnlocked: "suit_base",    roverUnlocked: false, currencyBonus: 0   },
  { level: 2,  unlocks: ["Oxygen Tank Upgrade I"],                                                                                        suitUnlocked: undefined,  roverUnlocked: false, currencyBonus: 100 },
  { level: 3,  unlocks: ["Advanced Suit", "Radiation Shield I"],                                              suitUnlocked: "suit_advanced",                    roverUnlocked: false, currencyBonus: 150 },
  { level: 4,  unlocks: ["Scout Rover", "Valles Marineris"],            regionUnlocked: "valles_marineris",                                roverUnlocked: true,  currencyBonus: 200 },
  { level: 5,  unlocks: ["Battery Upgrade I", "Comms Booster"],                                                                                                 roverUnlocked: false, currencyBonus: 250 },
  { level: 6,  unlocks: ["Elite Suit", "Olympus Mons Foothills"],       regionUnlocked: "olympus_mons",     suitUnlocked: "suit_elite",   roverUnlocked: false, currencyBonus: 300 },
  { level: 7,  unlocks: ["Rover Upgrade", "Oxygen Tank Upgrade II"],                                                                                            roverUnlocked: false, currencyBonus: 350 },
  { level: 8,  unlocks: ["Arcadia Planitia", "Radiation Shield II"],    regionUnlocked: "arcadia_planitia",                               roverUnlocked: false, currencyBonus: 400 },
  { level: 9,  unlocks: ["Hellas Basin", "Prototype Suit"],             regionUnlocked: "hellas_basin",     suitUnlocked: "suit_prototype",roverUnlocked: false,currencyBonus: 500 },
  { level: 10, unlocks: ["Extraction Sequence", "Final Mission"],       regionUnlocked: undefined,                                        roverUnlocked: false, currencyBonus: 1000 },
];

// ── Suit tier definitions ──────────────────────────────────
export interface SuitTier {
  id: string;
  name: string;
  /** Oxygen capacity in litres */
  oxygenCapacityL: number;
  /** Radiation shielding factor [0,1]; higher = less radiation absorbed */
  radiationShielding: number;
  /** Dust resistance factor [0,1] */
  dustResistance: number;
  /** Base movement speed multiplier vs. un-suited baseline */
  speedMult: number;
}

export const SUIT_TIERS: SuitTier[] = [
  { id: "suit_base",      name: "Base EVA Suit",     oxygenCapacityL: 420,  radiationShielding: 0.2, dustResistance: 0.3, speedMult: 1.0 },
  { id: "suit_advanced",  name: "Advanced EVA Suit",  oxygenCapacityL: 630,  radiationShielding: 0.5, dustResistance: 0.6, speedMult: 1.1 },
  { id: "suit_elite",     name: "Elite EVA Suit",     oxygenCapacityL: 840,  radiationShielding: 0.7, dustResistance: 0.8, speedMult: 1.2 },
  { id: "suit_prototype", name: "Prototype Exosuit",  oxygenCapacityL: 1200, radiationShielding: 0.9, dustResistance: 0.95, speedMult: 1.4 },
];

// ── Rover stats ────────────────────────────────────────────
export interface RoverStats {
  id: string;
  name: string;
  speedMultOverFoot: number;
  batteryCapacityPct: number;  // always 100 at full charge
  /** Terrain roughness max before rover cannot traverse (0–1) */
  maxRoughness: number;
  batteryPctPerKm: number;
}

export const ROVER_TIERS: RoverStats[] = [
  { id: "rover_scout",    name: "Scout Rover",    speedMultOverFoot: 4.0, batteryCapacityPct: 100, maxRoughness: 0.7, batteryPctPerKm: 1.2 },
  { id: "rover_upgraded", name: "Upgraded Rover", speedMultOverFoot: 5.5, batteryCapacityPct: 100, maxRoughness: 0.85, batteryPctPerKm: 0.9 },
];

// ── Inventory upgrade costs ────────────────────────────────
export interface InventoryUpgrade {
  id: string;
  name: string;
  description: string;
  /** Level at which this upgrade becomes available to purchase */
  unlockLevel: number;
  currencyCost: number;
  /** What the upgrade changes (applied multiplicatively or additively) */
  effect: Record<string, number>;
}

export const INVENTORY_UPGRADES: InventoryUpgrade[] = [
  { id: "o2_tank_1",   name: "Oxygen Tank Upgrade I",  description: "+50% O2 capacity", unlockLevel: 2, currencyCost: 300, effect: { oxygenCapacityMult: 1.5 } },
  { id: "o2_tank_2",   name: "Oxygen Tank Upgrade II", description: "+100% O2 capacity (cumulative)", unlockLevel: 7, currencyCost: 700, effect: { oxygenCapacityMult: 2.0 } },
  { id: "rad_shield_1",name: "Radiation Shield I",     description: "+20% radiation shielding", unlockLevel: 3, currencyCost: 400, effect: { radiationShieldingBonus: 0.2 } },
  { id: "rad_shield_2",name: "Radiation Shield II",    description: "+40% radiation shielding", unlockLevel: 8, currencyCost: 800, effect: { radiationShieldingBonus: 0.4 } },
  { id: "battery_1",   name: "Battery Upgrade I",      description: "+30% rover range per charge", unlockLevel: 5, currencyCost: 500, effect: { batteryEfficiencyMult: 0.7 } },
  { id: "comms_boost", name: "Comms Booster",          description: "Reduces comms blackout time by 30%", unlockLevel: 5, currencyCost: 350, effect: { commsBlackoutReduction: 0.3 } },
  { id: "suit_repair", name: "Suit Repair Kit",        description: "Consumable: restore suit integrity", unlockLevel: 1, currencyCost: 150, effect: { suitRepair: 1.0 } },
  { id: "water_store", name: "Water Storage",          description: "+20% survival margin in thermal events", unlockLevel: 3, currencyCost: 250, effect: { waterCapacityBonus: 0.2 } },
];

// ── Region definitions ─────────────────────────────────────
export interface RegionConfig {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  difficultyTier: 1 | 2 | 3 | 4 | 5;
  gridFile: string;           // path to the preprocessed JSON grid
  hazardMix: string[];        // dominant hazard types for flavour text
  /** Approximate real-world area in km² */
  areaKm2: number;
}

export const REGIONS: RegionConfig[] = [
  {
    id: "jezero",
    name: "Jezero Crater",
    description: "Ancient lakebed with diverse terrain. Safe introduction to Mars surface operations.",
    unlockLevel: 1,
    difficultyTier: 1,
    gridFile: "public/data/regions/jezero.json",
    hazardMix: ["dust_devil", "unstable_ground"],
    areaKm2: 45,
  },
  {
    id: "valles_marineris",
    name: "Valles Marineris",
    description: "The solar system's largest canyon. Extreme topography and communication dead zones.",
    unlockLevel: 4,
    difficultyTier: 3,
    gridFile: "public/data/regions/valles_marineris.json",
    hazardMix: ["steep_slope", "comms_dead_zone", "boulder_field"],
    areaKm2: 4000,
  },
  {
    id: "olympus_mons",
    name: "Olympus Mons Foothills",
    description: "Slopes of the solar system's largest volcano. Thin atmosphere, high radiation.",
    unlockLevel: 6,
    difficultyTier: 4,
    gridFile: "public/data/regions/olympus_mons.json",
    hazardMix: ["steep_slope", "radiation_spike", "thermal_vent"],
    areaKm2: 300,
  },
  {
    id: "arcadia_planitia",
    name: "Arcadia Planitia",
    description: "Subsurface ice deposits. Ground instability and dust storms are constant threats.",
    unlockLevel: 8,
    difficultyTier: 4,
    gridFile: "public/data/regions/arcadia_planitia.json",
    hazardMix: ["unstable_ground", "dust_devil", "radiation_spike"],
    areaKm2: 500,
  },
  {
    id: "hellas_basin",
    name: "Hellas Basin",
    description: "Deepest crater on Mars. Extreme atmospheric pressure and temperature swings.",
    unlockLevel: 9,
    difficultyTier: 5,
    gridFile: "public/data/regions/hellas_basin.json",
    hazardMix: ["thermal_vent", "radiation_spike", "dust_devil", "unstable_ground"],
    areaKm2: 2100,
  },
];
