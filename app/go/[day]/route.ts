import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntryByDay, getProfileByHandle } from "@/lib/queries";
import { OWNER_HANDLE, TOTAL_DAYS } from "@/lib/constants";

// Automated clients that follow links. They are still redirected, but not
// counted: the click data is meant to measure human interest. This is a
// best-effort filter on a self-reported header, not a guarantee.
const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|embedly|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|go-http-client|scrapy|okhttp/i;

// Tracked outbound-link redirect for the public showcase. Records a click in
// app_events, then 302s to the destination. The destination is resolved from
// the DB (never from a query param), so this cannot be abused as an open
// redirect. `?t=code` targets the repo link; anything else targets the live app.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ day: string }> },
) {
  const { day } = await params;
  const dayNumber = Number(day);
  const home = new URL("/", req.url);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
    return NextResponse.redirect(home);
  }

  const target = req.nextUrl.searchParams.get("t") === "code" ? "code" : "live";

  const profile = await getProfileByHandle(OWNER_HANDLE);
  if (!profile) return NextResponse.redirect(home);

  const entry = await getEntryByDay(profile.user_id, dayNumber);
  if (!entry) return NextResponse.redirect(home);

  // Prefer the requested link; fall back to the other if it is empty.
  const primary = target === "code" ? entry.repo_url : entry.live_url;
  const secondary = target === "code" ? entry.live_url : entry.repo_url;
  const resolvedTarget = primary ? target : target === "code" ? "live" : "code";
  const dest = primary ?? secondary;

  // Only ever redirect to an absolute http(s) URL stored in our own DB.
  if (!dest || !/^https?:\/\//i.test(dest)) {
    return NextResponse.redirect(home);
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  const looksAutomated = !userAgent || BOT_UA.test(userAgent);

  // Best-effort telemetry — a logging failure must never block the redirect.
  if (!looksAutomated) {
    try {
      const supabase = await createClient();
      await supabase.from("app_events").insert({
        owner_user_id: profile.user_id,
        event_type: "click",
        day_number: dayNumber,
        target: resolvedTarget,
        referrer: req.headers.get("referer")?.slice(0, 2000) ?? null,
        user_agent: userAgent.slice(0, 1000),
      });
    } catch {
      // swallow: the visitor still gets redirected
    }
  }

  return NextResponse.redirect(dest, 302);
}
