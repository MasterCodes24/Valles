-- ═══════════════════════════════════════════════════════════
--  Valles — Fix Auth Trigger (Migration 003)
--  Fixes the 500 "Database error saving new user" error.
--  Run this in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════════════

-- 1. Drop old triggers on child tables to prevent cascade errors
DROP TRIGGER IF EXISTS on_progress_created ON public.player_progress;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create a robust, self-contained signup handler with public search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Determine username
  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  final_username := base_username;

  -- Avoid collision if another user already took this username
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id <> NEW.id) THEN
    final_username := final_username || '_' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);
  END IF;

  -- 1. Profile row
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), final_username)
  )
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        display_name = EXCLUDED.display_name;

  -- 2. Player progress row
  INSERT INTO public.player_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Unlock initial base EVA suit
  INSERT INTO public.unlocked_suits (user_id, suit_id)
  VALUES (NEW.id, 'suit_base')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details to postgres log so it doesn't fail silently
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Re-attach trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
