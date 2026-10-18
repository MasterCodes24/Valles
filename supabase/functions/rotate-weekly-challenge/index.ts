// ═══════════════════════════════════════════════════════════
//  Valles — Weekly Challenge Edge Function
//  Deploy to Supabase: supabase functions deploy rotate-weekly-challenge
//  Schedule: cron("0 0 * * 1")  — every Monday at 00:00 UTC
// ═══════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Challenge rotation pool — each week picks from this list
// Expand this array to add more challenges without code changes
const CHALLENGE_POOL = [
  {
    region_id: "valles_marineris",
    title: "Canyon Endurance",
    description: "Survive for a full in-game week (7 sols) on the Valles Marineris canyon floor. Comms will be unreliable. Resupply is not available.",
    objective: {
      type: "survive_n_sols",
      sols: 7,
      region_id: "valles_marineris",
      start_position: { row: 10, col: 10 },
    },
    xp_reward: 500,
  },
  {
    region_id: "olympus_mons",
    title: "Radiation Dash",
    description: "Cross the Olympus Mons radiation belt from west to east with less than 50% radiation accumulation.",
    objective: {
      type: "reach_site",
      region_id: "olympus_mons",
      start_position: { row: 5, col: 0 },
      target: { row: 5, col: 19 },
      max_radiation_accum: 0.5,
    },
    xp_reward: 500,
  },
  {
    region_id: "jezero",
    title: "Speed Run",
    description: "Complete a Jezero survey mission in under 2 in-game hours. Efficiency is everything.",
    objective: {
      type: "reach_site",
      region_id: "jezero",
      start_position: { row: 0, col: 0 },
      target: { row: 19, col: 19 },
      time_limit_hours: 2,
    },
    xp_reward: 500,
  },
  {
    region_id: "arcadia_planitia",
    title: "Ice Walk",
    description: "Navigate Arcadia Planitia's unstable ice terrain without triggering any ground collapse events.",
    objective: {
      type: "reach_site",
      region_id: "arcadia_planitia",
      start_position: { row: 0, col: 0 },
      target: { row: 19, col: 19 },
      avoid_hazard: "unstable_ground",
    },
    xp_reward: 500,
  },
  {
    region_id: "hellas_basin",
    title: "Hellas Survivor",
    description: "Survive 3 sols in the Hellas Basin. The deepest, most hostile region on Mars.",
    objective: {
      type: "survive_n_sols",
      sols: 3,
      region_id: "hellas_basin",
      start_position: { row: 0, col: 0 },
    },
    xp_reward: 500,
  },
];

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role for write access
    );

    // Deactivate current challenge
    const { error: deactivateError } = await supabase
      .from("weekly_challenges")
      .update({ is_active: false })
      .eq("is_active", true);

    if (deactivateError) throw deactivateError;

    // Pick a random challenge from the pool
    const pick = CHALLENGE_POOL[Math.floor(Math.random() * CHALLENGE_POOL.length)];

    const now = new Date();
    // Week start: this Monday 00:00 UTC
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() + daysToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
    weekEnd.setUTCMilliseconds(-1); // Sunday 23:59:59.999

    const { error: insertError } = await supabase
      .from("weekly_challenges")
      .insert({
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        region_id: pick.region_id,
        title: pick.title,
        description: pick.description,
        objective: pick.objective,
        xp_reward: pick.xp_reward,
        is_active: true,
      });

    if (insertError) throw insertError;

    // Broadcast "from Earth" alert to all active players (insert into their comms logs)
    const { data: allPlayers, error: playersError } = await supabase
      .from("player_progress")
      .select("user_id");

    if (playersError) throw playersError;

    if (allPlayers && allPlayers.length > 0) {
      const commsEntries = allPlayers.map((p: { user_id: string }) => ({
        user_id: p.user_id,
        direction: "from_earth",
        subject: `MISSION CONTROL: New Weekly Challenge — ${pick.title}`,
        body: `Attention astronaut. Mission Control has issued this week's priority challenge.\n\nCHALLENGE: ${pick.title}\nREGION: ${pick.region_id.replace(/_/g, " ").toUpperCase()}\n\n${pick.description}\n\nXP REWARD: ${pick.xp_reward}\n\nThis challenge expires in 7 days. Good luck.\n\n— Mission Control, Earth`,
        comms_delay_min: 8 + Math.random() * 16, // 8–24 minute simulated delay
        message_type: "weekly_challenge",
        sent_at: now.toISOString(),
        received_at: new Date(now.getTime() + (8 + Math.random() * 16) * 60000).toISOString(),
      }));

      const { error: commsError } = await supabase
        .from("earth_comms_log")
        .insert(commsEntries);

      if (commsError) console.error("Failed to send comms alerts:", commsError);
    }

    return new Response(
      JSON.stringify({ success: true, challenge: pick.title, weekStart: weekStart.toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("rotate-weekly-challenge error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
