-- ═══════════════════════════════════════════════════════════
--  Valles — Supabase Database Schema
--  Migration 001: Initial schema
--  Run via Supabase CLI: supabase db push
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────
--  1. profiles — extends Supabase auth.users
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────
--  2. player_progress — level, XP, currency
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_progress (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level           INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  xp              INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  currency        INT NOT NULL DEFAULT 0 CHECK (currency >= 0),
  -- Suit and rover
  active_suit_id  TEXT NOT NULL DEFAULT 'suit_base',
  has_rover       BOOLEAN NOT NULL DEFAULT FALSE,
  active_rover_id TEXT,
  -- Accumulated stats
  total_missions_completed INT NOT NULL DEFAULT 0,
  total_distance_m         FLOAT NOT NULL DEFAULT 0,
  total_oxygen_used_l      FLOAT NOT NULL DEFAULT 0,
  total_radiation_accum    FLOAT NOT NULL DEFAULT 0,
  rescues_used             INT NOT NULL DEFAULT 0,
  -- State
  current_region_id        TEXT NOT NULL DEFAULT 'jezero',
  is_extraction_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create player_progress row on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO player_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ─────────────────────────────────────────────────────────
--  3. inventory — owned upgrades per player
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upgrade_id    TEXT NOT NULL,
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  acquired_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, upgrade_id)
);

-- ─────────────────────────────────────────────────────────
--  4. unlocked_suits — suits the player has unlocked
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unlocked_suits (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suit_id     TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, suit_id)
);

-- Everyone starts with the base suit
CREATE OR REPLACE FUNCTION handle_new_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO unlocked_suits (user_id, suit_id) VALUES (NEW.user_id, 'suit_base')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_progress_created ON player_progress;
CREATE TRIGGER on_progress_created
  AFTER INSERT ON player_progress
  FOR EACH ROW EXECUTE FUNCTION handle_new_progress();

-- ─────────────────────────────────────────────────────────
--  5. region_progress — per-player per-region exploration state
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS region_progress (
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id            TEXT NOT NULL,
  first_visited_at     TIMESTAMPTZ,
  last_visited_at      TIMESTAMPTZ,
  total_sessions       INT NOT NULL DEFAULT 0,
  cells_explored       INT NOT NULL DEFAULT 0,
  total_distance_m     FLOAT NOT NULL DEFAULT 0,
  discovered_rest_pts  TEXT[] DEFAULT '{}',  -- list of discovered rest point keys
  PRIMARY KEY (user_id, region_id)
);

-- ─────────────────────────────────────────────────────────
--  6. missions — story mission definitions (static reference)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id              TEXT PRIMARY KEY,  -- e.g. "jezero_m1"
  region_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  objective_type  TEXT NOT NULL,  -- "reach_site" | "survive_n_hours" | "return_safely" | "collect_sample"
  objective_data  JSONB NOT NULL DEFAULT '{}',
  xp_reward       INT NOT NULL DEFAULT 0,
  currency_reward INT NOT NULL DEFAULT 0,
  unlock_level    INT NOT NULL DEFAULT 1,
  sequence_order  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  7. player_missions — per-player mission completion log
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_missions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id          TEXT NOT NULL REFERENCES missions(id),
  status              TEXT NOT NULL DEFAULT 'not_started',  -- not_started | in_progress | completed | failed
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  xp_awarded          INT DEFAULT 0,
  currency_awarded    INT DEFAULT 0,
  efficiency_bonus    INT DEFAULT 0,
  -- Mission result metrics
  route_taken         JSONB,          -- serialised GridPosition[] for the route used
  resources_snapshot  JSONB,          -- ResourceState at mission end
  UNIQUE (user_id, mission_id)
);

-- ─────────────────────────────────────────────────────────
--  8. weekly_challenges — one active challenge per week
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start     TIMESTAMPTZ NOT NULL,  -- Monday 00:00 UTC
  week_end       TIMESTAMPTZ NOT NULL,  -- Sunday 23:59 UTC
  region_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  objective      JSONB NOT NULL DEFAULT '{}',
  xp_reward      INT NOT NULL DEFAULT 500,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  9. player_weekly_challenges — per-player weekly challenge state
--     Separate from main campaign progress (failure here doesn't hurt main save)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_weekly_challenges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id        UUID NOT NULL REFERENCES weekly_challenges(id),
  status              TEXT NOT NULL DEFAULT 'not_started',  -- not_started | in_progress | completed | failed
  challenge_save      JSONB DEFAULT '{}',  -- isolated save state for this challenge
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  xp_awarded          INT DEFAULT 0,
  attempts            INT DEFAULT 0,
  UNIQUE (user_id, challenge_id)
);

-- ─────────────────────────────────────────────────────────
--  10. exploration_logs — records each exploration session
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exploration_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id       TEXT NOT NULL,
  session_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end     TIMESTAMPTZ,
  distance_m      FLOAT DEFAULT 0,
  cells_visited   INT DEFAULT 0,
  oxygen_used_l   FLOAT DEFAULT 0,
  radiation_accum FLOAT DEFAULT 0,
  xp_earned       INT DEFAULT 0,
  path_taken      JSONB DEFAULT '[]',  -- serialised GridPosition[]
  outcome         TEXT DEFAULT 'in_progress'  -- in_progress | safe_return | rescue | timeout
);

-- ─────────────────────────────────────────────────────────
--  11. earth_comms_log — "Martian"-style transmission feed
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earth_comms_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL,  -- 'to_earth' | 'from_earth'
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  -- Simulated transmission metadata
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at     TIMESTAMPTZ,  -- NULL until simulated delivery (after comms delay)
  comms_delay_min FLOAT DEFAULT 0,  -- one-way light delay at time of send
  is_read         BOOLEAN DEFAULT FALSE,
  message_type    TEXT DEFAULT 'personal',  -- 'personal' | 'mission_report' | 'alert' | 'weekly_challenge'
  related_mission TEXT,  -- mission_id if this is a mission report
  metadata        JSONB DEFAULT '{}'
);

-- ─────────────────────────────────────────────────────────
--  12. xp_events — audit log of all XP awards
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,   -- 'mission_complete' | 'exploration' | 'weekly_challenge' | 'efficiency_bonus' etc.
  amount      INT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  Row Level Security (RLS) — users can only read/write their own rows
-- ─────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_suits ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE earth_comms_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Helper: current user ID
CREATE OR REPLACE FUNCTION auth_uid() RETURNS UUID
LANGUAGE SQL STABLE AS $$ SELECT auth.uid() $$;

-- RLS policies — self access only
DO $$ BEGIN
  -- profiles
  CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (id = auth_uid());
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (id = auth_uid());

  -- player_progress
  CREATE POLICY "Users can view own progress"
    ON player_progress FOR SELECT USING (user_id = auth_uid());
  CREATE POLICY "Users can update own progress"
    ON player_progress FOR UPDATE USING (user_id = auth_uid());

  -- inventory
  CREATE POLICY "Users can manage own inventory"
    ON inventory FOR ALL USING (user_id = auth_uid());

  -- unlocked_suits
  CREATE POLICY "Users can view own suits"
    ON unlocked_suits FOR SELECT USING (user_id = auth_uid());

  -- region_progress
  CREATE POLICY "Users can manage region progress"
    ON region_progress FOR ALL USING (user_id = auth_uid());

  -- player_missions
  CREATE POLICY "Users can manage own missions"
    ON player_missions FOR ALL USING (user_id = auth_uid());

  -- weekly_challenges (challenge definitions are public)
  CREATE POLICY "Anyone can view weekly challenges"
    ON weekly_challenges FOR SELECT USING (TRUE);

  -- player_weekly_challenges
  CREATE POLICY "Users can manage own weekly challenge state"
    ON player_weekly_challenges FOR ALL USING (user_id = auth_uid());

  -- exploration_logs
  CREATE POLICY "Users can manage own exploration logs"
    ON exploration_logs FOR ALL USING (user_id = auth_uid());

  -- earth_comms_log
  CREATE POLICY "Users can manage own comms log"
    ON earth_comms_log FOR ALL USING (user_id = auth_uid());

  -- xp_events
  CREATE POLICY "Users can view own XP events"
    ON xp_events FOR SELECT USING (user_id = auth_uid());

EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────
--  Indexes for common queries
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_player_missions_user    ON player_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_exploration_logs_user   ON exploration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_earth_comms_user        ON earth_comms_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_user          ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_active           ON weekly_challenges(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────
--  updated_at trigger helper
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_progress_updated_at BEFORE UPDATE ON player_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
