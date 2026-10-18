// ──────────────────────────────────────────────────────────
//  Valles Backend API — Missions & Autosave
// ──────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";
import { awardXp } from "./playerState";
import { XP_AWARDS } from "../config/gameConfig";
import type { ResourceState } from "../engine/resourceSim";
import type { GridPosition } from "../engine/types";

// ── Types ─────────────────────────────────────────────────

export interface MissionReport {
  missionId: string;
  missionTitle: string;
  regionId: string;
  completedAt: string;
  durationH: number;
  distanceM: number;
  oxygenUsedL: number;
  oxygenRemainingL: number;
  radiationAccumulated: number;
  commsBlackoutH: number;
  routeProfile: "fast" | "balanced" | "safe";
  efficiencyScore: number;     // 0–100
  xpAwarded: number;
  currencyAwarded: number;
  bonusXp: number;
  narrative: string;           // "Martian"-style mission log text
}

// ── Mission Management ────────────────────────────────────

/**
 * Start a mission — creates or updates the player_missions row.
 * Call this when the player confirms a mission and departs.
 *
 * @param userId     Player's UUID
 * @param missionId  Mission ID (e.g. 'jezero_m1')
 */
export async function startMission(
  userId: string,
  missionId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from("player_missions").upsert(
    {
      user_id: userId,
      mission_id: missionId,
      status: "in_progress",
      started_at: new Date().toISOString(),
    },
    { onConflict: "user_id, mission_id" }
  );
  return { success: !error, error: error?.message ?? null };
}

/**
 * Complete a mission. Awards XP, currency, generates mission report,
 * sends Earth comms message, and autosaves all state.
 *
 * This is the primary autosave trigger after mission completion.
 *
 * @param userId         Player's UUID
 * @param missionId      Mission ID
 * @param routeProfile   Which route profile was used
 * @param routeTaken     The actual path taken (GridPosition[])
 * @param finalState     ResourceState at mission end
 * @param initialState   ResourceState at mission start (for efficiency calc)
 * @returns              MissionReport
 */
export async function completeMission(
  userId: string,
  missionId: string,
  routeProfile: "fast" | "balanced" | "safe",
  routeTaken: GridPosition[],
  finalState: ResourceState,
  initialState: ResourceState
): Promise<{ report: MissionReport | null; error: string | null }> {
  // Fetch mission definition
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (missionError || !mission) return { report: null, error: "Mission not found" };

  // Compute efficiency score (0–100)
  const o2Fraction = finalState.oxygenL / initialState.oxygenCapacityL;
  const radFraction = finalState.radiationAccum;
  const efficiencyScore = Math.round(
    Math.max(0, Math.min(100,
      o2Fraction * 50 +           // 50 pts for conserving O2
      (1 - radFraction) * 30 +    // 30 pts for avoiding radiation
      (finalState.commsBlackoutH < 0.1 ? 20 : 0)  // 20 pts for maintaining comms
    ))
  );

  const xpBase = mission.xp_reward as number;
  const bonusXp =
    (efficiencyScore >= 80 ? XP_AWARDS.mission_efficient : 0) +
    (finalState.radiationAccum < 0.1 ? XP_AWARDS.hazard_avoided : 0);

  const totalXp = xpBase + bonusXp;
  const distanceM = routeTaken.length * 200; // approximation; real calc in engine

  // Award XP (handles level-up logic)
  await awardXp(userId, totalXp, "mission_complete", `Mission: ${mission.title}`);

  // Award currency
  const { data: progress } = await supabase
    .from("player_progress")
    .select("currency, total_missions_completed, total_distance_m")
    .eq("user_id", userId)
    .single();

  if (progress) {
    await supabase.from("player_progress").update({
      currency: progress.currency + (mission.currency_reward as number),
      total_missions_completed: progress.total_missions_completed + 1,
      total_distance_m: progress.total_distance_m + distanceM,
    }).eq("user_id", userId);
  }

  // Mark mission complete in player_missions
  const completedAt = new Date().toISOString();
  await supabase.from("player_missions").upsert({
    user_id: userId,
    mission_id: missionId,
    status: "completed",
    completed_at: completedAt,
    xp_awarded: totalXp,
    currency_awarded: mission.currency_reward,
    efficiency_bonus: bonusXp,
    route_taken: routeTaken,
    resources_snapshot: finalState,
  }, { onConflict: "user_id, mission_id" });

  // Generate narrative
  const narrative = generateMissionNarrative(mission.title as string, finalState, efficiencyScore, routeProfile);

  const report: MissionReport = {
    missionId,
    missionTitle: mission.title,
    regionId: mission.region_id,
    completedAt,
    durationH: finalState.elapsedH,
    distanceM,
    oxygenUsedL: initialState.oxygenL - finalState.oxygenL,
    oxygenRemainingL: finalState.oxygenL,
    radiationAccumulated: finalState.radiationAccum,
    commsBlackoutH: finalState.commsBlackoutH,
    routeProfile,
    efficiencyScore,
    xpAwarded: xpBase,
    currencyAwarded: mission.currency_reward,
    bonusXp,
    narrative,
  };

  // Send mission report as Earth comm
  await sendEarthComm(userId, {
    direction: "to_earth",
    subject: `MISSION REPORT: ${mission.title} — COMPLETE`,
    body: `Mission Control, Earth\n\nMission: ${mission.title}\nStatus: COMPLETE\n\n${narrative}\n\nDistance: ${(distanceM / 1000).toFixed(1)} km\nDuration: ${finalState.elapsedH.toFixed(1)} in-game hours\nO2 Remaining: ${((finalState.oxygenL / initialState.oxygenCapacityL) * 100).toFixed(0)}%\nRadiation: ${(finalState.radiationAccum * 100).toFixed(0)}% accumulated\nEfficiency Score: ${efficiencyScore}/100\n\nEnd of report.\n— Crew`,
    messageType: "mission_report",
    relatedMission: missionId,
  });

  return { report, error: null };
}

// ── Exploration Session Autosave ──────────────────────────

/**
 * Start an exploration session log.
 * Call when player enters free-roam mode.
 *
 * @returns  The exploration log ID to pass to updateExplorationSession
 */
export async function startExplorationSession(
  userId: string,
  regionId: string
): Promise<{ sessionId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("exploration_logs")
    .insert({ user_id: userId, region_id: regionId })
    .select("id")
    .single();

  return { sessionId: data?.id ?? null, error: error?.message ?? null };
}

/**
 * Autosave exploration progress. Call this regularly during exploration
 * (e.g. every cell visited, or every 30 real seconds).
 */
export async function updateExplorationSession(
  sessionId: string,
  update: {
    distanceM: number;
    cellsVisited: number;
    oxygenUsedL: number;
    radiationAccum: number;
    pathTaken: GridPosition[];
  }
): Promise<void> {
  await supabase.from("exploration_logs").update({
    distance_m: update.distanceM,
    cells_visited: update.cellsVisited,
    oxygen_used_l: update.oxygenUsedL,
    radiation_accum: update.radiationAccum,
    path_taken: update.pathTaken,
  }).eq("id", sessionId);
}

/**
 * End an exploration session. Awards XP and autosaves region progress.
 */
export async function endExplorationSession(
  userId: string,
  sessionId: string,
  regionId: string,
  outcome: "safe_return" | "rescue" | "timeout",
  finalState: ResourceState,
  cellsVisited: number,
  pathTaken: GridPosition[]
): Promise<void> {
  const distanceM = finalState.elapsedH * 3000; // approx; real calc in engine
  const xpEarned = outcome === "safe_return" ? XP_AWARDS.exploration_session : 0;

  await supabase.from("exploration_logs").update({
    session_end: new Date().toISOString(),
    distance_m: distanceM,
    cells_visited: cellsVisited,
    oxygen_used_l: finalState.oxygenL,
    radiation_accum: finalState.radiationAccum,
    xp_earned: xpEarned,
    path_taken: pathTaken,
    outcome,
  }).eq("id", sessionId);

  // Update region progress
  const { data: existing } = await supabase
    .from("region_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("region_id", regionId)
    .single();

  const now = new Date().toISOString();
  await supabase.from("region_progress").upsert({
    user_id: userId,
    region_id: regionId,
    first_visited_at: existing?.first_visited_at ?? now,
    last_visited_at: now,
    total_sessions: (existing?.total_sessions ?? 0) + 1,
    cells_explored: (existing?.cells_explored ?? 0) + cellsVisited,
    total_distance_m: (existing?.total_distance_m ?? 0) + distanceM,
  }, { onConflict: "user_id, region_id" });

  // Award XP for the session
  if (xpEarned > 0) {
    await awardXp(userId, xpEarned, "exploration_session", `Exploration: ${regionId}`);
  }
}

// ── Weekly Challenge ──────────────────────────────────────

/**
 * Get the currently active weekly challenge.
 */
export async function getActiveWeeklyChallenge() {
  const { data, error } = await supabase
    .from("weekly_challenges")
    .select("*")
    .eq("is_active", true)
    .single();

  return { challenge: data, error: error?.message ?? null };
}

/**
 * Get the player's state for the current weekly challenge.
 */
export async function getPlayerChallengeState(userId: string, challengeId: string) {
  const { data, error } = await supabase
    .from("player_weekly_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .single();

  return { state: data, error: error?.message ?? null };
}

/**
 * Autosave the player's weekly challenge state.
 * Uses a completely separate save blob — failure here never affects main progress.
 */
export async function autosaveWeeklyChallenge(
  userId: string,
  challengeId: string,
  challengeSave: Record<string, unknown>
): Promise<void> {
  await supabase.from("player_weekly_challenges").upsert({
    user_id: userId,
    challenge_id: challengeId,
    status: "in_progress",
    challenge_save: challengeSave,
  }, { onConflict: "user_id, challenge_id" });
}

/**
 * Complete the weekly challenge. Awards XP once.
 */
export async function completeWeeklyChallenge(
  userId: string,
  challengeId: string,
  xpReward: number
): Promise<void> {
  await supabase.from("player_weekly_challenges").upsert({
    user_id: userId,
    challenge_id: challengeId,
    status: "completed",
    completed_at: new Date().toISOString(),
    xp_awarded: xpReward,
  }, { onConflict: "user_id, challenge_id" });

  await awardXp(userId, xpReward, "weekly_challenge", "Weekly challenge completed");
}

// ── Earth Comms ───────────────────────────────────────────

interface SendCommOptions {
  direction: "to_earth" | "from_earth";
  subject: string;
  body: string;
  messageType?: string;
  relatedMission?: string;
  commsDelayMin?: number;
}

/**
 * Send a message to/from Earth. Simulates transmission delay.
 */
export async function sendEarthComm(
  userId: string,
  options: SendCommOptions
): Promise<void> {
  const delay = options.commsDelayMin ?? 12; // default ~12 min (close to average)
  const sentAt = new Date();
  const receivedAt = new Date(sentAt.getTime() + delay * 60 * 1000);

  await supabase.from("earth_comms_log").insert({
    user_id: userId,
    direction: options.direction,
    subject: options.subject,
    body: options.body,
    sent_at: sentAt.toISOString(),
    received_at: receivedAt.toISOString(),
    comms_delay_min: delay,
    message_type: options.messageType ?? "personal",
    related_mission: options.relatedMission ?? null,
  });
}

/**
 * Get the player's Earth comms log (most recent first).
 */
export async function getEarthCommsLog(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("earth_comms_log")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  return { messages: data ?? [], error: error?.message ?? null };
}

/**
 * Mark a comms message as read.
 */
export async function markCommRead(messageId: string): Promise<void> {
  await supabase.from("earth_comms_log").update({ is_read: true }).eq("id", messageId);
}

// ── Mission Report Generation ─────────────────────────────

/**
 * Generate a "Martian"-style personal log narrative for a completed mission.
 * This is the data-side function — Member 2 renders it.
 */
function generateMissionNarrative(
  missionTitle: string,
  finalState: ResourceState,
  efficiencyScore: number,
  routeProfile: string
): string {
  const o2Pct = ((finalState.oxygenL / (finalState.oxygenL + 8.4 * finalState.elapsedH)) * 100).toFixed(0);
  const survived = finalState.oxygenL > 0 && finalState.radiationAccum < 1;

  if (!survived) {
    return `Sol ${Math.ceil(finalState.elapsedH / 24.65)}: Mission "${missionTitle}" terminated. Resources depleted before reaching objective. Initiating emergency protocols.`;
  }

  const tone =
    efficiencyScore >= 80 ? "textbook operation" :
    efficiencyScore >= 60 ? "solid performance" :
    efficiencyScore >= 40 ? "close call, but I made it" :
    "I'm not going to lie — that was rough";

  return `Sol ${Math.ceil(finalState.elapsedH / 24.65)}: "${missionTitle}" complete. ${tone}. ` +
    `Chose the ${routeProfile} route — ${routeProfile === "safe" ? "took longer but I'll live" : routeProfile === "fast" ? "pushed hard to make time" : "balanced speed and safety"}. ` +
    `O2 at ${o2Pct}% when I got back to base. ` +
    `Radiation accumulated to ${(finalState.radiationAccum * 100).toFixed(0)}% of safe limit. ` +
    (finalState.commsBlackoutH > 0.1
      ? `Lost comms for ${(finalState.commsBlackoutH * 60).toFixed(0)} minutes — not ideal, but I managed. `
      : `Maintained comms throughout. `) +
    `Efficiency: ${efficiencyScore}/100. Moving on.`;
}
