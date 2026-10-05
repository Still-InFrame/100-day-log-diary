// The anonymous visitor ID: a random value generated in the visitor's browser
// (see ViewTracker) and sent with views and clicks, so the same browser
// counts as one person. It carries no name, email or address, and is never
// stored alongside a signup.
//
// The pattern matches the CHECK constraint on app_events.visitor_id
// (migration 0007); a value that fails it would make the insert fail, so
// anything else is treated as "no ID".
const VISITOR_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export function parseVisitorId(value: unknown): string | null {
  return typeof value === "string" && VISITOR_ID_RE.test(value) ? value : null;
}
