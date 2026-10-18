// ──────────────────────────────────────────────────────────
//  Valles Backend API — Auth
//  All auth operations Member 2 calls from login/register screens.
// ──────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";

export interface AuthResult {
  userId: string | null;
  error: string | null;
}

/**
 * Register a new user with email + password.
 * Also sets username in user metadata (triggers profile creation via DB trigger).
 *
 * @param email     User's email address
 * @param password  Password (min 8 chars enforced by Supabase)
 * @param username  Display username (stored in profiles table)
 * @returns         { userId, error }
 */
export async function registerUser(
  email: string,
  password: string,
  username: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username },
    },
  });

  if (error) return { userId: null, error: error.message };
  return { userId: data.user?.id ?? null, error: null };
}

/**
 * Log in with email + password.
 *
 * @returns { userId, error }
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { userId: null, error: error.message };
  return { userId: data.user?.id ?? null, error: null };
}

/**
 * Log out the current user.
 */
export async function logoutUser(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

/**
 * Get the currently authenticated user's ID.
 * Returns null if not logged in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * Subscribe to auth state changes.
 * Member 2 calls this in their auth store.
 */
export function onAuthStateChange(
  callback: (userId: string | null) => void
) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  });
}
