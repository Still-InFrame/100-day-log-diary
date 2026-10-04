export const TOTAL_DAYS = 100;

// The single public showcase owner. The apex "/" and the /go click-tracking
// redirect both resolve this handle to decide whose projects to show/record.
// Single-user today; if the app ever opens to multiple public handles, the
// showcase + /go links must carry the handle instead of this constant.
export const OWNER_HANDLE = "savion";

// The exact sentence shown beside the SMS checkbox on the "Notify me" form.
// The form displays it and the server stores it as the consent record, so both
// must come from this one place.
export function smsConsentText(appName: string): string {
  return `Text me about ${appName}. Message and data rates may apply. Reply STOP to opt out.`;
}

// Used by todayISO() and any "what date is it right now?" logic.
// Hardcoded for now. Replace call sites with a per-user setting if a
// settings panel ever ships.
export const DEFAULT_TIMEZONE = "America/New_York";

export const COMMON_TECH = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind",
  "Supabase",
  "Postgres",
  "Node.js",
  "Python",
  "FastAPI",
  "Vercel",
  "OpenAI",
  "Anthropic",
  "LangChain",
];
