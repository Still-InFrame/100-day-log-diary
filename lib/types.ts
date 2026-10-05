export type Entry = {
  id: string;
  user_id: string;
  day_number: number;
  date: string;
  app_name: string;
  description: string;
  repo_url: string | null;
  live_url: string | null;
  tech_stack: string[];
  time_spent_minutes: number;
  learnings: string | null;
  challenges: string | null;
  mood: number | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  public_handle: string | null;
  challenge_start_date: string;
  created_at: string;
  updated_at: string;
};

export type GhlSyncStatus = "pending" | "synced" | "failed" | "skipped";

// A "Notify me" signup for one app. Mirrors public.app_interest.
export type Lead = {
  id: string;
  owner_user_id: string;
  day_number: number;
  app_name: string;
  first_name: string;
  email: string;
  phone: string | null;
  sms_consent: boolean;
  sms_consent_at: string | null;
  consent_text: string | null;
  ghl_contact_id: string | null;
  ghl_sync_status: GhlSyncStatus;
  ghl_sync_error: string | null;
  ghl_synced_at: string | null;
  last_texted_at: string | null;
  // The form's hidden anti-bot field was filled. The lead is kept but is not
  // pushed to HighLevel until the owner sends it.
  suspected_automated: boolean;
  // Where the signup came from, as the host reported it (see lib/geo.ts).
  // Null for signups made before location was recorded.
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
};

// Per-app views and clicks. `views`, `clicks`, `live_clicks` and `code_clicks`
// come from the shuffled list only; `popular_clicks` are clicks made from the
// "Most popular" row and are kept out of the click rate.
// `unique_views` / `unique_clicks` count people (distinct visitor IDs, plus
// one for each event that has no ID): the same browser counts once.
export type EngagementStat = {
  day_number: number;
  views: number;
  clicks: number;
  live_clicks: number;
  code_clicks: number;
  popular_clicks: number;
  last_click: string | null;
  unique_views: number;
  unique_clicks: number;
};

export type InterestStat = {
  day_number: number;
  leads: number;
  with_phone: number;
  sms_ok: number;
  last_signup: string | null;
};

// The admin overview for one date range (see migration 0008). Every figure
// follows the same rules as EngagementStat. A unique figure belongs to its
// own row: someone active on two days is one person in `totals` and one
// person on each of those days, so `daily` does not add up to `totals`.
export type OverviewTotals = {
  views: number;
  unique_views: number;
  clicks: number;
  unique_clicks: number;
  live_clicks: number;
  code_clicks: number;
  signups: number;
};

// One calendar day (yyyy-MM-dd in the app's timezone). Days with no activity
// are present with zeros.
export type OverviewDay = {
  day: string;
  views: number;
  unique_views: number;
  clicks: number;
  unique_clicks: number;
  signups: number;
};

// Only apps with some activity in the range are present. `popular_clicks`
// (clicks made from the "Most popular" row) and `last_click` (the latest
// click of either kind) are the two figures here that are not limited to
// the shuffled list, the same as on EngagementStat.
export type OverviewApp = {
  day_number: number;
  views: number;
  unique_views: number;
  clicks: number;
  unique_clicks: number;
  signups: number;
  popular_clicks: number;
  last_click: string | null;
};

// Activity from one place. On a country row `region` and `city` are null; on
// a region row `city` is null. `country` null means the location is not
// known (everything recorded before location was captured). `lat` / `lon`
// are set on city rows only.
export type OverviewPlace = {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  views: number;
  unique_views: number;
  clicks: number;
  unique_clicks: number;
  signups: number;
};

export type Overview = {
  totals: OverviewTotals;
  daily: OverviewDay[];
  apps: OverviewApp[];
  countries: OverviewPlace[];
  // The busiest 500 of each.
  regions: OverviewPlace[];
  cities: OverviewPlace[];
};

export type BadgeType =
  | "day_10"
  | "day_25"
  | "day_50"
  | "day_75"
  | "day_100"
  | "streak_7"
  | "streak_30"
  | "streak_60"
  | "no_skip_100";

export type Badge = {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  earned_at: string;
  entry_id: string | null;
};

export const BADGE_META: Record<
  BadgeType,
  { label: string; description: string; emoji: string }
> = {
  day_10: {
    label: "Day 10",
    description: "First 10% in the books",
    emoji: "🌱",
  },
  day_25: { label: "Day 25", description: "A quarter of the way", emoji: "🔥" },
  day_50: { label: "Day 50", description: "Halfway there", emoji: "⚡" },
  day_75: { label: "Day 75", description: "Three-quarters done", emoji: "🚀" },
  day_100: { label: "Day 100", description: "Challenge complete", emoji: "🏆" },
  streak_7: {
    label: "7-day streak",
    description: "One full week without skipping",
    emoji: "📅",
  },
  streak_30: {
    label: "30-day streak",
    description: "A month straight",
    emoji: "💪",
  },
  streak_60: {
    label: "60-day streak",
    description: "Two months without missing",
    emoji: "🧠",
  },
  no_skip_100: {
    label: "Perfect 100",
    description: "100 days, zero skipped",
    emoji: "👑",
  },
};
