import { createClient } from "./supabase/server";
import { DEFAULT_TIMEZONE } from "./constants";
import type {
  Badge,
  EngagementStat,
  Entry,
  InterestStat,
  Lead,
  Overview,
  OverviewCounts,
  OverviewPlace,
  OverviewTotals,
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

// Aggregated in the database (see migration 0005): a plain select is capped
// at 1000 rows and would undercount once traffic grows.
export async function getEngagementStats(): Promise<EngagementStat[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("app_engagement_stats");
  return ((data as EngagementStat[] | null) ?? []).map((r) => ({
    day_number: r.day_number,
    views: Number(r.views),
    clicks: Number(r.clicks),
    live_clicks: Number(r.live_clicks),
    code_clicks: Number(r.code_clicks),
    popular_clicks: Number(r.popular_clicks),
    last_click: r.last_click,
    unique_views: Number(r.unique_views),
    unique_clicks: Number(r.unique_clicks),
  }));
}

// Day numbers of one user's "Most popular" apps, best first. Public: works
// for anonymous visitors, and returns nothing until apps clear the bar.
export async function getPopularDays(ownerUserId: string): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("popular_apps", { p_owner: ownerUserId });
  return ((data as { day_number: number }[] | null) ?? []).map(
    (r) => r.day_number,
  );
}

// Everything the admin overview shows for one date range, from a single
// database call so the tiles, charts and map cannot disagree. `from` and
// `to` are yyyy-MM-dd days in the app's timezone, both included; a null
// `from` means from the beginning.
// Returns null when the call fails, so the page can say so instead of
// drawing a dashboard full of zeros.
export async function getOverview(
  from: string | null,
  to: string,
): Promise<Overview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("app_overview", {
    p_from: from,
    p_to: to,
    p_tz: DEFAULT_TIMEZONE,
  });
  if (error || !data) return null;
  const raw = data as Partial<Overview>;
  const t: Partial<OverviewTotals> = raw.totals ?? {};
  const counts = (c: Partial<OverviewCounts>): OverviewCounts => ({
    views: Number(c.views ?? 0),
    unique_views: Number(c.unique_views ?? 0),
    clicks: Number(c.clicks ?? 0),
    unique_clicks: Number(c.unique_clicks ?? 0),
    signups: Number(c.signups ?? 0),
  });
  const place = (p: Partial<OverviewPlace>): OverviewPlace => ({
    country: p.country ?? null,
    region: p.region ?? null,
    city: p.city ?? null,
    lat: p.lat == null ? null : Number(p.lat),
    lon: p.lon == null ? null : Number(p.lon),
    views: Number(p.views ?? 0),
    unique_views: Number(p.unique_views ?? 0),
    clicks: Number(p.clicks ?? 0),
    unique_clicks: Number(p.unique_clicks ?? 0),
    signups: Number(p.signups ?? 0),
  });
  return {
    totals: {
      views: Number(t.views ?? 0),
      unique_views: Number(t.unique_views ?? 0),
      clicks: Number(t.clicks ?? 0),
      unique_clicks: Number(t.unique_clicks ?? 0),
      live_clicks: Number(t.live_clicks ?? 0),
      code_clicks: Number(t.code_clicks ?? 0),
      signups: Number(t.signups ?? 0),
    },
    daily: (raw.daily ?? []).map((d) => ({
      day: d.day,
      views: Number(d.views),
      unique_views: Number(d.unique_views),
      clicks: Number(d.clicks),
      unique_clicks: Number(d.unique_clicks),
      signups: Number(d.signups),
    })),
    apps: (raw.apps ?? []).map((a) => ({
      day_number: Number(a.day_number),
      views: Number(a.views),
      unique_views: Number(a.unique_views),
      clicks: Number(a.clicks),
      unique_clicks: Number(a.unique_clicks),
      signups: Number(a.signups),
      popular_clicks: Number(a.popular_clicks ?? 0),
      last_click: a.last_click ?? null,
    })),
    countries: (raw.countries ?? []).map(place),
    regions: (raw.regions ?? []).map(place),
    cities: (raw.cities ?? []).map(place),
    channels: (raw.channels ?? []).map((c) => ({
      channel: c.channel,
      ...counts(c),
    })),
    sources: (raw.sources ?? []).map((s) => ({
      channel: s.channel,
      source: s.source ?? "",
      ...counts(s),
    })),
    campaigns: (raw.campaigns ?? []).map((c) => ({
      campaign: c.campaign,
      ...counts(c),
    })),
  };
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
