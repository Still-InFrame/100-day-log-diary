// HighLevel (LeadConnector) API client: OAuth token calls and the handful of
// CRM calls this app makes. Pure HTTP, no database access.
// Server-only: it handles the client secret and users' access tokens.
// Never import this from a "use client" file.

export const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";
// HighLevel's current API version. The version is a per-request header and is
// independent of how the request is authenticated.
const API_VERSION = "v3";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_APP_BASE_URL = "https://app.gohighlevel.com";
const DEFAULT_INSTALL_BASE_URL =
  "https://marketplace.gohighlevel.com/oauth/chooselocation";

// What the Marketplace app must be granted: save contacts and notes, and send
// conversation messages.
export const GHL_SCOPES = ["contacts.write", "conversations/message.write"];

// ---------- app (site-level) configuration ----------

export type GhlAppConfig = {
  clientId: string;
  clientSecret: string;
  // Optional override: the exact Install Link shown in the Marketplace app's
  // Auth settings, for when it differs from the standard format.
  installUrl: string | null;
  appBaseUrl: string;
};

// Which site-level settings are present, without exposing their values.
export function getGhlAppStatus() {
  return {
    hasClientId: Boolean(process.env.GHL_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.GHL_CLIENT_SECRET?.trim()),
  };
}

export function getGhlAppBaseUrl(): string {
  return (process.env.GHL_APP_BASE_URL?.trim() || DEFAULT_APP_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

export function getGhlAppConfig(): GhlAppConfig | null {
  const clientId = process.env.GHL_CLIENT_ID?.trim();
  const clientSecret = process.env.GHL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    installUrl: process.env.GHL_INSTALL_URL?.trim() || null,
    appBaseUrl: getGhlAppBaseUrl(),
  };
}

// ---------- errors ----------

export class GhlError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GhlError";
    this.status = status;
  }
}

// HighLevel error bodies vary: `{ message: string | string[] }` on API calls,
// `{ error, error_description }` on the token endpoint. Fall back to the raw
// text so whoever is debugging always sees what came back.
function describeError(status: number, payload: unknown, raw: string): string {
  let detail = "";
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (p.message !== undefined && p.message !== null) {
      detail = Array.isArray(p.message) ? p.message.join("; ") : String(p.message);
    } else if (p.error_description || p.error) {
      detail = [p.error, p.error_description].filter(Boolean).join(": ");
    }
  }
  if (!detail) detail = raw.slice(0, 300);
  return `HighLevel ${status}: ${detail || "request failed"}`;
}

async function request<T>(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", Version: API_VERSION, ...headers },
      body,
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

// ---------- OAuth ----------

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  // ISO timestamp.
  expiresAt: string;
  scope: string | null;
  userType: string | null;
  locationId: string | null;
  companyId: string | null;
  userId: string | null;
};

// Where a user is sent to pick a sub-account and approve the connection.
// `state` is included for CSRF protection; HighLevel's guide does not say it
// is echoed back, so the callback does not depend on it (see the callback).
export function buildInstallUrl(
  app: Pick<GhlAppConfig, "clientId" | "installUrl">,
  redirectUri: string,
  state: string,
): string {
  if (app.installUrl) {
    const url = new URL(app.installUrl);
    if (!url.searchParams.has("state")) url.searchParams.set("state", state);
    return url.toString();
  }
  const url = new URL(DEFAULT_INSTALL_BASE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_id", app.clientId);
  url.searchParams.set("scope", GHL_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

type RawTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  userType?: string;
  locationId?: string;
  companyId?: string;
  userId?: string;
};

async function tokenRequest(
  app: Pick<GhlAppConfig, "clientId" | "clientSecret">,
  params: Record<string, string>,
  apiBaseUrl: string,
): Promise<TokenSet> {
  const body = new URLSearchParams({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    // A sub-account token: every call this app makes is sub-account level.
    user_type: "Location",
    ...params,
  });
  const raw = await request<RawTokenResponse>(
    `${apiBaseUrl}/oauth/token`,
    { "Content-Type": "application/x-www-form-urlencoded" },
    body.toString(),
  );
  if (!raw?.access_token || !raw.refresh_token) {
    throw new GhlError(200, "HighLevel returned no tokens");
  }
  // Fall back to a short lifetime if expires_in is missing, so a refresh is
  // attempted sooner rather than never.
  const lifetimeSeconds =
    typeof raw.expires_in === "number" && raw.expires_in > 0 ? raw.expires_in : 3600;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: new Date(Date.now() + lifetimeSeconds * 1000).toISOString(),
    scope: raw.scope ?? null,
    userType: raw.userType ?? null,
    locationId: raw.locationId ?? null,
    companyId: raw.companyId ?? null,
    userId: raw.userId ?? null,
  };
}

export function exchangeCode(
  app: Pick<GhlAppConfig, "clientId" | "clientSecret">,
  code: string,
  redirectUri: string,
  apiBaseUrl: string = GHL_API_BASE_URL,
): Promise<TokenSet> {
  return tokenRequest(
    app,
    { grant_type: "authorization_code", code, redirect_uri: redirectUri },
    apiBaseUrl,
  );
}

// The refresh token is single-use: the returned set carries a NEW refresh
// token and the one passed in stops working. Callers must store the result.
export function refreshTokens(
  app: Pick<GhlAppConfig, "clientId" | "clientSecret">,
  refreshToken: string,
  redirectUri: string | null,
  apiBaseUrl: string = GHL_API_BASE_URL,
): Promise<TokenSet> {
  return tokenRequest(
    app,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    },
    apiBaseUrl,
  );
}

// ---------- CRM calls (made with one user's access token) ----------

export type GhlAuth = {
  accessToken: string;
  locationId: string;
  appBaseUrl: string;
  apiBaseUrl?: string;
};

function api<T>(auth: GhlAuth, path: string, body: unknown): Promise<T> {
  return request<T>(
    `${auth.apiBaseUrl ?? GHL_API_BASE_URL}${path}`,
    {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
    JSON.stringify(body),
  );
}

// Creates the contact, or updates the existing one that matches by email/phone
// (matching follows the sub-account's duplicate-contact setting). `tags` is
// deliberately not sent: on upsert it REPLACES the contact's existing tags.
export async function upsertContact(
  auth: GhlAuth,
  input: { firstName: string; email: string; phone?: string | null },
): Promise<{ contactId: string; isNew: boolean }> {
  const res = await api<{ new?: boolean; contact?: { id?: string } }>(
    auth,
    "/contacts/upsert",
    {
      locationId: auth.locationId,
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
  auth: GhlAuth,
  contactId: string,
  body: string,
): Promise<void> {
  await api(auth, `/contacts/${encodeURIComponent(contactId)}/notes`, { body });
}

// Queues an outbound SMS to the contact from the sub-account's number.
// The reference lists a `status` field as required, but that field describes
// a message's delivery state; it is left out here so an outbound text can
// never be recorded as already delivered without being sent. If HighLevel
// rejects the request for it, the error is shown to the user verbatim.
export async function sendSms(
  auth: GhlAuth,
  contactId: string,
  message: string,
): Promise<{ conversationId?: string; messageId?: string }> {
  return api(auth, "/conversations/messages", {
    type: "SMS",
    contactId,
    message,
  });
}

export function contactUrl(
  where: { appBaseUrl: string; locationId: string },
  contactId: string,
): string {
  return `${where.appBaseUrl}/v2/location/${where.locationId}/contacts/detail/${contactId}`;
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
  auth: GhlAuth,
  lead: LeadForSync,
): Promise<{ contactId: string | null; error: string | null }> {
  let contactId: string | null = null;
  try {
    ({ contactId } = await upsertContact(auth, lead));
    await addContactNote(auth, contactId, leadNote(lead));
    return { contactId, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown HighLevel error";
    return {
      contactId,
      error: contactId ? `Contact saved, but the note failed. ${message}` : message,
    };
  }
}
