import { createClient } from "./supabase/server";
import type { Badge, Entry, Profile } from "./types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

// Public lookup by handle. Works for unauthenticated (anon) visitors because
// the profiles_select_public RLS policy exposes any row with a non-null
// public_handle. Returns null if the handle is unclaimed.
export async function getProfileByHandle(
  handle: string,
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("public_handle", handle)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getEntries(userId: string): Promise<Entry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .order("day_number", { ascending: false });
  return (data as Entry[] | null) ?? [];
}

export async function getEntryByDay(
  userId: string,
  day: number,
): Promise<Entry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .eq("day_number", day)
    .maybeSingle();
  return (data as Entry | null) ?? null;
}

export async function getBadges(userId: string): Promise<Badge[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("badges")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: true });
  return (data as Badge[] | null) ?? [];
}
