import { createClient } from "./supabase/server";
import type {
  Badge,
  ClickStat,
  Entry,
  InterestStat,
  Lead,
  Profile,
} from "./types";

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

// ---------- admin reads ----------
// No user filter is passed on purpose: RLS returns only rows the signed-in
// account owns, and returns nothing at all to anyone else.

export async function getLeads(limit = 200): Promise<Lead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_interest")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Lead[] | null) ?? [];
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_interest")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Lead | null) ?? null;
}

export async function getLeadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("app_interest")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

// Aggregated in the database (see migration 0003): a plain select is capped
// at 1000 rows and would undercount once traffic grows.
export async function getClickStats(): Promise<ClickStat[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("app_click_stats");
  return ((data as ClickStat[] | null) ?? []).map((r) => ({
    day_number: r.day_number,
    clicks: Number(r.clicks),
    live_clicks: Number(r.live_clicks),
    code_clicks: Number(r.code_clicks),
    last_click: r.last_click,
  }));
}

export async function getInterestStats(): Promise<InterestStat[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("app_interest_stats");
  return ((data as InterestStat[] | null) ?? []).map((r) => ({
    day_number: r.day_number,
    leads: Number(r.leads),
    with_phone: Number(r.with_phone),
    sms_ok: Number(r.sms_ok),
    last_signup: r.last_signup,
  }));
}
