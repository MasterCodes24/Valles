// ──────────────────────────────────────────────────────────
//  Valles Backend API — Player State
//  Reads and writes all persistent player data.
// ──────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";
import { levelFromXp, SUIT_TIERS, ROVER_TIERS, INVENTORY_UPGRADES, LEVEL_UNLOCKS } from "../config/gameConfig";
import type { SuitTier, RoverStats } from "../config/gameConfig";

// ── Types ─────────────────────────────────────────────────

export interface PlayerState {
  userId: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;
  currency: number;
  activeSuitId: string;
  activeSuit: SuitTier;
  hasRover: boolean;
  activeRover: RoverStats | null;
  currentRegionId: string;
  inventory: InventoryItem[];
  unlockedSuits: string[];
  totalMissionsCompleted: number;
  isExtractionComplete: boolean;
}

export interface InventoryItem {
  upgradeId: string;
  quantity: number;
}

export interface RegionProgress {
  regionId: string;
  firstVisitedAt: string | null;
  lastVisitedAt: string | null;
  totalSessions: number;
  cellsExplored: number;
  totalDistanceM: number;
  discoveredRestPts: string[];
}

/**
 * Load the full player state for a given user.
 * This is the single call Member 2 makes to initialise game state after login.
 *
 * @param userId  Authenticated user's UUID
 * @returns       PlayerState or null if not found
 */
export async function getPlayerState(userId: string): Promise<PlayerState | null> {
  const [profileRes, progressRes, inventoryRes, suitsRes] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", userId).single(),
    supabase.from("player_progress").select("*").eq("user_id", userId).single(),
    supabase.from("inventory").select("upgrade_id, quantity").eq("user_id", userId),
    supabase.from("unlocked_suits").select("suit_id").eq("user_id", userId),
  ]);

  if (profileRes.error || progressRes.error) return null;

  const profile = profileRes.data;
  const progress = progressRes.data;

  const activeSuit =
    SUIT_TIERS.find((s) => s.id === progress.active_suit_id) ?? SUIT_TIERS[0];
  const activeRover = progress.has_rover
    ? (ROVER_TIERS.find((r) => r.id === progress.active_rover_id) ?? ROVER_TIERS[0])
    : null;

  return {
    userId,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    level: progress.level,
    xp: progress.xp,
    currency: progress.currency,
    activeSuitId: progress.active_suit_id,
    activeSuit,
    hasRover: progress.has_rover,
    activeRover,
    currentRegionId: progress.current_region_id,
    inventory: (inventoryRes.data ?? []).map((i: { upgrade_id: string; quantity: number }) => ({
      upgradeId: i.upgrade_id,
      quantity: i.quantity,
    })),
    unlockedSuits: (suitsRes.data ?? []).map((s: { suit_id: string }) => s.suit_id),
    totalMissionsCompleted: progress.total_missions_completed,
    isExtractionComplete: progress.is_extraction_complete,
  };
}

// ── XP & Levelling ────────────────────────────────────────

export interface AwardXpResult {
  xpAwarded: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  newUnlocks: string[];
  error: string | null;
}

/**
 * Award XP to a player and handle levelling up.
 * Logs to xp_events table. Autosaves immediately.
 *
 * @param userId   Player's UUID
 * @param amount   XP to award
 * @param source   Source identifier (e.g. 'mission_complete', 'weekly_challenge')
 * @param description  Human-readable description for the log
 */
export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  description?: string
): Promise<AwardXpResult> {
  // Fetch current progress
  const { data: progress, error: fetchError } = await supabase
    .from("player_progress")
    .select("xp, level, currency")
    .eq("user_id", userId)
    .single();

  if (fetchError) return { xpAwarded: 0, newXp: 0, newLevel: 0, leveledUp: false, newUnlocks: [], error: fetchError.message };

  const newXp = progress.xp + amount;
  const newLevel = Math.min(levelFromXp(newXp), 10);
  const leveledUp = newLevel > progress.level;
  const newUnlocks = leveledUp
    ? (LEVEL_UNLOCKS.find((u) => u.level === newLevel)?.unlocks ?? [])
    : [];

  // Update progress
  const updateData: Record<string, unknown> = { xp: newXp };
  if (leveledUp) {
    updateData.level = newLevel;
    // Apply level unlocks
    const unlock = LEVEL_UNLOCKS.find((u) => u.level === newLevel);
    if (unlock) {
      updateData.currency = progress.currency + unlock.currencyBonus;
      if (unlock.roverUnlocked) updateData.has_rover = true;
      if (unlock.suitUnlocked) {
        // Add to unlocked_suits
        await supabase
          .from("unlocked_suits")
          .upsert({ user_id: userId, suit_id: unlock.suitUnlocked });
      }
      if (unlock.regionUnlocked) {
        // Ensure region_progress row exists
        await supabase.from("region_progress").upsert(
          { user_id: userId, region_id: unlock.regionUnlocked },
          { onConflict: "user_id, region_id", ignoreDuplicates: true }
        );
      }
    }
  }

  const { error: updateError } = await supabase
    .from("player_progress")
    .update(updateData)
    .eq("user_id", userId);

  if (updateError) return { xpAwarded: 0, newXp: 0, newLevel: 0, leveledUp: false, newUnlocks: [], error: updateError.message };

  // Log the XP event
  await supabase.from("xp_events").insert({
    user_id: userId,
    source,
    amount,
    description: description ?? source,
  });

  return { xpAwarded: amount, newXp, newLevel, leveledUp, newUnlocks, error: null };
}

// ── Region Progress ────────────────────────────────────────

/**
 * Get exploration progress for a specific region.
 *
 * @param userId    Player's UUID
 * @param regionId  Region ID string
 */
export async function getRegionProgress(
  userId: string,
  regionId: string
): Promise<RegionProgress | null> {
  const { data, error } = await supabase
    .from("region_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("region_id", regionId)
    .single();

  if (error) return null;
  return {
    regionId: data.region_id,
    firstVisitedAt: data.first_visited_at,
    lastVisitedAt: data.last_visited_at,
    totalSessions: data.total_sessions,
    cellsExplored: data.cells_explored,
    totalDistanceM: data.total_distance_m,
    discoveredRestPts: data.discovered_rest_pts ?? [],
  };
}

// ── Inventory ─────────────────────────────────────────────

/**
 * Purchase an inventory upgrade.
 * Deducts currency and adds item to inventory.
 *
 * @param userId     Player's UUID
 * @param upgradeId  Upgrade ID from INVENTORY_UPGRADES
 * @returns          { success, error }
 */
export async function purchaseUpgrade(
  userId: string,
  upgradeId: string
): Promise<{ success: boolean; error: string | null }> {
  const upgrade = INVENTORY_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return { success: false, error: "Unknown upgrade ID" };

  const { data: progress, error: fetchError } = await supabase
    .from("player_progress")
    .select("currency, level")
    .eq("user_id", userId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };
  if (progress.level < upgrade.unlockLevel)
    return { success: false, error: `Upgrade requires Level ${upgrade.unlockLevel}` };
  if (progress.currency < upgrade.currencyCost)
    return { success: false, error: "Insufficient currency" };

  const { error: updateError } = await supabase
    .from("player_progress")
    .update({ currency: progress.currency - upgrade.currencyCost })
    .eq("user_id", userId);

  if (updateError) return { success: false, error: updateError.message };

  const { error: inventoryError } = await supabase
    .from("inventory")
    .upsert(
      { user_id: userId, upgrade_id: upgradeId, quantity: 1 },
      { onConflict: "user_id, upgrade_id" }
    );

  if (inventoryError) return { success: false, error: inventoryError.message };
  return { success: true, error: null };
}

/**
 * Equip a suit the player has unlocked.
 *
 * @param userId  Player's UUID
 * @param suitId  Suit ID string
 */
export async function equipSuit(
  userId: string,
  suitId: string
): Promise<{ success: boolean; error: string | null }> {
  // Verify ownership
  const { data, error } = await supabase
    .from("unlocked_suits")
    .select("suit_id")
    .eq("user_id", userId)
    .eq("suit_id", suitId)
    .single();

  if (error || !data) return { success: false, error: "Suit not unlocked" };

  const { error: updateError } = await supabase
    .from("player_progress")
    .update({ active_suit_id: suitId })
    .eq("user_id", userId);

  return { success: !updateError, error: updateError?.message ?? null };
}
