import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByHandle } from "@/lib/queries";
import { looksAutomated } from "@/lib/bots";
import { TOTAL_DAYS } from "@/lib/constants";

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const MAX_BODY_CHARS = 2000;

// Records which app cards a visitor actually saw on a public page. The
// browser batches day numbers and posts them here (see ViewTracker). Views
// are the denominator of the click rate, so they are held to the same rules
// as clicks: no crawlers, and not the page owner looking at their own page.
//
// Always answers 204 with no body, whether or not anything was stored: the
// sender does nothing with the reply, and a uniform answer tells a prober
// nothing about which handles exist.
export async function POST(req: NextRequest) {
  const done = () => new NextResponse(null, { status: 204 });

  if (looksAutomated(req.headers.get("user-agent"))) return done();

  let payload: { handle?: unknown; days?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return done();
    payload = JSON.parse(raw);
  } catch {
    return done();
  }

  const handle = String(payload?.handle ?? "").toLowerCase();
  if (!HANDLE_RE.test(handle) || !Array.isArray(payload?.days)) return done();

  // Whole numbers in range, each counted once per request.
  const days = [
    ...new Set(
      payload.days.filter(
        (d): d is number =>
          Number.isInteger(d) && (d as number) >= 1 && (d as number) <= TOTAL_DAYS,
      ),
    ),
  ];
  if (days.length === 0) return done();

  const profile = await getProfileByHandle(handle);
  if (!profile) return done();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === profile.user_id) return done();

  // Best-effort: a failed write only loses a few views.
  await supabase.from("app_events").insert(
    days.map((day) => ({
      owner_user_id: profile.user_id,
      event_type: "impression",
      day_number: day,
      source: "list",
    })),
  );

  return done();
}
