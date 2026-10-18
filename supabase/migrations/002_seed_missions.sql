-- ═══════════════════════════════════════════════════════════
--  Valles — Seed Data: Story Missions
--  Migration 002: Insert static mission definitions
-- ═══════════════════════════════════════════════════════════

INSERT INTO missions (id, region_id, title, description, objective_type, objective_data, xp_reward, currency_reward, unlock_level, sequence_order)
VALUES
-- ── Jezero Crater Missions ──────────────────────────────────────────────────
('jezero_m1', 'jezero',
 'First Steps',
 'Perform your first EVA from the landing site. Reach the primary science target coordinates and return safely.',
 'reach_site',
 '{"target": {"row": 5, "col": 5}, "must_return_to_base": true}',
 300, 100, 1, 1),

('jezero_m2', 'jezero',
 'Delta Fan Survey',
 'Survey the ancient river delta fan. Traverse the boulder field and collect a geological sample.',
 'collect_sample',
 '{"target": {"row": 9, "col": 17}, "sample_type": "delta_rock", "must_return_to_base": true}',
 400, 150, 1, 2),

('jezero_m3', 'jezero',
 'Storm Survival',
 'A dust storm is incoming. Survive for 6 in-game hours on the surface and reach shelter before the storm peaks.',
 'survive_n_hours',
 '{"hours": 6, "rest_point_required": true}',
 500, 200, 2, 3),

('jezero_m4', 'jezero',
 'Perseverance Ridge',
 'Reach the highest elevated point in Jezero Crater. Radiation exposure will be elevated — plan accordingly.',
 'reach_site',
 '{"target": {"row": 3, "col": 15}, "max_radiation_allowed": 0.5}',
 600, 250, 3, 4),

-- ── Valles Marineris Missions ───────────────────────────────────────────────
('valles_m1', 'valles_marineris',
 'Canyon Descent',
 'Descend into Valles Marineris and establish a forward camp on the canyon floor. Comms will be intermittent.',
 'reach_site',
 '{"target": {"row": 10, "col": 10}, "comms_ok_to_lose": true}',
 700, 300, 4, 1),

('valles_m2', 'valles_marineris',
 'The Long Way Around',
 'Navigate from east to west rim without losing comms for more than 10 in-game minutes.',
 'reach_site',
 '{"target": {"row": 10, "col": 19}, "max_comms_blackout_min": 10}',
 800, 350, 4, 2),

('valles_m3', 'valles_marineris',
 'Landslide Recovery',
 'Reach the boulder field debris zone and recover a probe. Extremely rough terrain — rover recommended.',
 'collect_sample',
 '{"target": {"row": 3, "col": 15}, "sample_type": "probe_unit", "rover_recommended": true}',
 900, 400, 5, 3),

-- ── Olympus Mons Missions ───────────────────────────────────────────────────
('olympus_m1', 'olympus_mons',
 'The Approach',
 'Navigate the lava field foothills to the first shelter point. Radiation is extreme — elite suit required.',
 'reach_site',
 '{"target": {"row": 5, "col": 5}, "require_suit": "suit_elite"}',
 1000, 450, 6, 1),

('olympus_m2', 'olympus_mons',
 'Caldera View',
 'Reach the caldera escarpment overlook. Return before your suit thermal limits are exceeded.',
 'reach_site',
 '{"target": {"row": 15, "col": 15}, "thermal_limit": true, "must_return_to_base": true}',
 1200, 500, 7, 2),

-- ── Arcadia Planitia Missions ───────────────────────────────────────────────
('arcadia_m1', 'arcadia_planitia',
 'Ice Recon',
 'Locate and survey the subsurface ice exposure sites. Avoid ground collapse zones.',
 'reach_site',
 '{"target": {"row": 5, "col": 10}, "avoid_hazard": "unstable_ground"}',
 1200, 550, 8, 1),

('arcadia_m2', 'arcadia_planitia',
 'Storm Shelter',
 'A category 3 dust storm is incoming. Reach the shelter point within 4 in-game hours.',
 'survive_n_hours',
 '{"hours": 4, "rest_point_required": true, "storm_active": true}',
 1400, 600, 8, 2),

-- ── Hellas Basin Missions ───────────────────────────────────────────────────
('hellas_m1', 'hellas_basin',
 'Into the Deep',
 'Descend to the lowest point in the Hellas Basin. Every resource matters here — no margin for error.',
 'reach_site',
 '{"target": {"row": 10, "col": 10}, "max_rescue_uses": 0}',
 2000, 800, 9, 1),

('hellas_m2', 'hellas_basin',
 'Extraction Point Alpha',
 '*** FINAL MISSION *** The rescue shuttle is waiting at extraction coordinates. Navigate there before your oxygen runs out. Earth is watching.',
 'reach_site',
 '{"target": {"row": 19, "col": 19}, "is_final_mission": true, "max_rescue_uses": 0, "time_limit_hours": 12}',
 5000, 2000, 10, 2);
