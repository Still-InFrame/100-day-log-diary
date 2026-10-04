// Minimal HighLevel (LeadConnector) API client.
// Server-only: it reads the Private Integration Token from the environment.
// Never import this from a "use client" file.

const BASE_URL = "https://services.leadconnectorhq.com";
// Dated API versions, as used in HighLevel's Private Integration guide. Their
// reference also documents a newer "v3"; change these two constants to move.
const CONTACTS_API_VERSION = "2021-07-28";
const CONVERSATIONS_API_VERSION = "2021-04-15";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_APP_BASE_URL = "https://app.gohighlevel.com";

export type GhlConfig = {
  token: string;
  locationId: string;
  appBaseUrl: string;
};

// Which settings are present, without exposing their values. Safe to render.
export function getGhlStatus() {
  return {
    hasToken: Boolean(process.env.GHL_PRIVATE_TOKEN?.trim()),
    hasLocationId: Boolean(process.env.GHL_LOCATION_ID?.trim()),
  };
}

export function getGhlConfig(): GhlConfig | null {
  const token = process.env.GHL_PRIVATE_TOKEN?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  if (!token || !locationId) return null;
  const appBaseUrl = (
    process.env.GHL_APP_BASE_URL?.trim() || DEFAULT_APP_BASE_URL
  ).replace(/\/+$/, "");
  return { token, locationId, appBaseUrl };
}

export class GhlError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GhlError";
    this.status = status;
  }
}

// HighLevel error bodies vary; `{ message: string | string[] }` is the usual
// shape. Fall back to the raw text so the admin always sees what came back.
function describeError(status: number, payload: unknown, raw: string): string {
  let detail = "";
  if (payload && typeof payload === "object" && "message" in payload) {
    const m = (payload as { message: unknown }).message;
    detail = Array.isArray(m) ? m.join("; ") : String(m ?? "");
  }
  if (!detail) detail = raw.slice(0, 300);
  return `HighLevel ${status}: ${detail || "request failed"}`;
}

async function post<T>(
  cfg: GhlConfig,
  path: string,
  version: string,
  body: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Version: version,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new GhlError(
      0,
      timedOut
        ? "HighLevel did not respond in time"
        : "Could not reach HighLevel",
    );
  }

  const raw = await res.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON body; describeError falls back to the raw text
  }
  if (!res.ok) throw new GhlError(res.status, describeError(res.status, payload, raw));
  return payload as T;
}

// Creates the contact, or updates the existing one that matches by email/phone
// (matching follows the sub-account's duplicate-contact setting). `tags` is
// deliberately not sent: on upsert it REPLACES the contact's existing tags.
export async function upsertContact(
  cfg: GhlConfig,
  input: { firstName: string; email: string; phone?: string | null },
): Promise<{ contactId: string; isNew: boolean }> {
  const res = await post<{ new?: boolean; contact?: { id?: string } }>(
    cfg,
    "/contacts/upsert",
    CONTACTS_API_VERSION,
    {
      locationId: cfg.locationId,
      firstName: input.firstName,
      email: input.email,
      ...(input.phone ? { phone: input.phone } : {}),
      source: "100 Day AI Challenge",
    },
  );
  const contactId = res?.contact?.id;
  if (!contactId) {
    throw new GhlError(200, "HighLevel accepted the contact but returned no id");
  }
  return { contactId, isNew: Boolean(res.new) };
}

export async function addContactNote(
  cfg: GhlConfig,
  contactId: string,
  body: string,
): Promise<void> {
  await post(
    cfg,
    `/contacts/${encodeURIComponent(contactId)}/notes`,
    CONTACTS_API_VERSION,
    { body },
  );
}

// Queues an outbound SMS to the contact from the sub-account's number.
// The reference lists a `status` field as required, but that field describes
// a message's delivery state; it is left out here so an outbound text can
// never be recorded as already delivered without being sent. If HighLevel
// rejects the request for it, the error is shown to the admin verbatim.
export async function sendSms(
  cfg: GhlConfig,
  contactId: string,
  message: string,
): Promise<{ conversationId?: string; messageId?: string }> {
  return post(cfg, "/conversations/messages", CONVERSATIONS_API_VERSION, {
    type: "SMS",
    contactId,
    message,
  });
}

export function contactUrl(cfg: GhlConfig, contactId: string): string {
  return `${cfg.appBaseUrl}/v2/location/${cfg.locationId}/contacts/detail/${contactId}`;
}

export type LeadForSync = {
  firstName: string;
  email: string;
  phone: string | null;
  appName: string;
  dayNumber: number;
  smsConsent: boolean;
  createdAt: string;
};

function leadNote(lead: LeadForSync): string {
  const when = new Date(lead.createdAt).toISOString().slice(0, 10);
  return [
    `Interested in: ${lead.appName} (Day ${lead.dayNumber} of the 100 Day AI Build Challenge)`,
    `Signed up ${when} at 100dayaichallenge.com`,
    `SMS consent: ${lead.smsConsent ? "Yes" : "No"}`,
  ].join("\n");
}

// Upserts the contact and attaches a note naming the app. Never throws: the
// caller records the outcome either way. A contact id can come back alongside
// an error when the contact was saved but the note was not.
export async function pushLead(
  cfg: GhlConfig,
  lead: LeadForSync,
): Promise<{ contactId: string | null; error: string | null }> {
  let contactId: string | null = null;
  try {
    ({ contactId } = await upsertContact(cfg, lead));
    await addContactNote(cfg, contactId, leadNote(lead));
    return { contactId, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown HighLevel error";
    return {
      contactId,
      error: contactId ? `Contact saved, but the note failed. ${message}` : message,
    };
  }
}
