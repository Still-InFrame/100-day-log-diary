import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntryByDay, getProfileByHandle } from "@/lib/queries";
import { OWNER_HANDLE, TOTAL_DAYS } from "@/lib/constants";
import { clickCameFromAPage, looksAutomated } from "@/lib/bots";
import { recordingEnabled } from "@/lib/recording";
import { parseVisitorId } from "@/lib/visitor";
import { placeFromHeaders } from "@/lib/geo";
import { sourceColumns, sourceFromLink } from "@/lib/traffic-source";

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

// Tracked outbound-link redirect for public pages. Records a click against
// the page owner in app_events, then 302s to the destination. The destination
// is resolved from the DB (never from a query param), so this cannot be
// abused as an open redirect. `?t=code` targets the repo link; anything else
// targets the live app. `&p=1` marks a click made from the "Most popular"
// row, which is stored but kept out of the ranking.
//
// Not counted (the visitor is still redirected): automated clients, requests
// that did not come from a click on one of this site's pages, and the page
// owner clicking on their own page while signed in.
//
//   /go/<handle>/<day>   any user's public page
//   /go/<day>            the site owner's page (the original link format)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ parts: string[] }> },
) {
  const { parts } = await params;
  const home = new URL("/", req.url);

  let handle: string;
  let dayParam: string;
  if (parts.length === 1) {
    handle = OWNER_HANDLE;
    dayParam = parts[0];
  } else if (parts.length === 2) {
    handle = parts[0].toLowerCase();
    dayParam = parts[1];
  } else {
    return NextResponse.redirect(home);
  }

  const dayNumber = Number(dayParam);
  if (
    !HANDLE_RE.test(handle) ||
    !Number.isInteger(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > TOTAL_DAYS
  ) {
    return NextResponse.redirect(home);
  }

  const target = req.nextUrl.searchParams.get("t") === "code" ? "code" : "live";

  const profile = await getProfileByHandle(handle);
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
  const source = req.nextUrl.searchParams.get("p") === "1" ? "popular" : "list";

  // Added to the link by ViewTracker in the visitor's browser. Absent when
  // scripts are blocked; the click still counts then, as its own person, as
  // long as the browser says it came from one of our pages.
  const visitorId = parseVisitorId(req.nextUrl.searchParams.get("v"));
  const referrer = req.headers.get("referer");
  // Every name this request says the site was reached by.
  const siteHosts = [
    req.nextUrl.host,
    req.headers.get("x-forwarded-host"),
    req.headers.get("host"),
  ];

  // Best-effort telemetry — a logging failure must never block the redirect.
  if (
    recordingEnabled() &&
    !looksAutomated(userAgent) &&
    clickCameFromAPage(visitorId, referrer, siteHosts)
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id !== profile.user_id) {
        await supabase.from("app_events").insert({
          owner_user_id: profile.user_id,
          event_type: "click",
          day_number: dayNumber,
          target: resolvedTarget,
          source,
          visitor_id: visitorId,
          referrer: referrer?.slice(0, 2000) ?? null,
          user_agent: userAgent.slice(0, 1000),
          ...placeFromHeaders(req.headers),
          // Where the visit came from, put on the link by ViewTracker next
          // to the visitor ID. Absent when scripts are blocked.
          ...sourceColumns(sourceFromLink(req.nextUrl.searchParams), siteHosts),
        });
      }
    } catch {
      // swallow: the visitor still gets redirected
    }
  }

  return NextResponse.redirect(dest, 302);
}
