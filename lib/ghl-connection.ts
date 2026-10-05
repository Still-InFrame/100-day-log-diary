import { createAdminClient, hasSupabaseSecretKey } from "./supabase/admin";
import {
  GhlError,
  getGhlAppBaseUrl,
  getGhlAppConfig,
  refreshTokens,
  type GhlAuth,
  type TokenSet,
} from "./ghl";

// Storage and upkeep of each user's HighLevel connection (OAuth tokens).
// Server-only. Every function takes the app user's id explicitly; callers are
// responsible for passing the right one (the signed-in user, or the owner of
// the public page a visitor signed up on).

// Refresh a little before expiry so a token never dies mid-request.
const REFRESH_MARGIN_SECONDS = 5 * 60;
const REFRESH_MARGIN_MS = REFRESH_MARGIN_SECONDS * 1000;
const LEASE_SECONDS = 30;
const WAIT_FOR_OTHER_REFRESH_MS = 800;
const WAIT_ATTEMPTS = 5;

type ConnectionRow = {
  user_id: string;
  location_id: string;
  scope: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  redirect_uri: string | null;
  needs_reconnect: boolean;
  last_error: string | null;
  connected_at: string;
};

// The parts of a connection that are safe to show its owner. No tokens.
export type ConnectionInfo = {
  locationId: string;
  scope: string | null;
  connectedAt: string;
  needsReconnect: boolean;
  lastError: string | null;
};

// True when the site itself is set up for HighLevel connections (Marketplace
// app credentials + the secret key needed to store tokens).
export function isGhlAvailable(): boolean {
  return getGhlAppConfig() !== null && hasSupabaseSecretKey();
}

export async function getConnectionInfo(
  userId: string,
): Promise<ConnectionInfo | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("ghl_connections")
    .select("location_id, scope, connected_at, needs_reconnect, last_error")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    locationId: data.location_id,
    scope: data.scope,
    connectedAt: data.connected_at,
    needsReconnect: data.needs_reconnect,
    lastError: data.last_error,
  };
}

export async function saveConnection(
  userId: string,
  tokens: TokenSet & { locationId: string },
  redirectUri: string,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  if (!admin) return { error: "The site is missing its Supabase secret key." };
  const { error } = await admin.from("ghl_connections").upsert({
    user_id: userId,
    location_id: tokens.locationId,
    company_id: tokens.companyId,
    ghl_user_id: tokens.userId,
    scope: tokens.scope,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    access_token_expires_at: tokens.expiresAt,
    redirect_uri: redirectUri,
    refresh_locked_until: null,
    needs_reconnect: false,
    last_error: null,
    connected_at: new Date().toISOString(),
  });
  return { error: error?.message ?? null };
}

export async function deleteConnection(
  userId: string,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  if (!admin) return { error: "The site is missing its Supabase secret key." };
  const { error } = await admin
    .from("ghl_connections")
    .delete()
    .eq("user_id", userId);
  return { error: error?.message ?? null };
}

export type GhlAuthResult =
  | { ok: true; auth: GhlAuth }
  | {
      ok: false;
      // not_available: the site is not set up. not_connected: this user has
      // not connected. needs_reconnect: HighLevel rejected the stored refresh
      // token. temporary: worth retrying later.
      reason: "not_available" | "not_connected" | "needs_reconnect" | "temporary";
      message: string;
    };

const MESSAGES = {
  not_available: "HighLevel connections are not set up on this site yet",
  not_connected: "HighLevel is not connected",
  needs_reconnect:
    "The HighLevel connection has expired. Reconnect it in Admin → Settings",
} as const;

function isFresh(row: Pick<ConnectionRow, "access_token_expires_at">): boolean {
  return (
    new Date(row.access_token_expires_at).getTime() - Date.now() >
    REFRESH_MARGIN_MS
  );
}

function notExpired(row: Pick<ConnectionRow, "access_token_expires_at">): boolean {
  return new Date(row.access_token_expires_at).getTime() > Date.now();
}

// Returns a working access token for this user's HighLevel connection,
// refreshing it first when it is about to expire.
export async function getGhlAuthFor(userId: string): Promise<GhlAuthResult> {
  const admin = createAdminClient();
  const app = getGhlAppConfig();
  if (!admin || !app) {
    return { ok: false, reason: "not_available", message: MESSAGES.not_available };
  }

  const read = async (): Promise<ConnectionRow | null> => {
    const { data } = await admin
      .from("ghl_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ConnectionRow | null) ?? null;
  };
  const authFrom = (row: ConnectionRow): GhlAuthResult => ({
    ok: true,
    auth: {
      accessToken: row.access_token,
      locationId: row.location_id,
      appBaseUrl: getGhlAppBaseUrl(),
    },
  });

  const row = await read();
  if (!row) {
    return { ok: false, reason: "not_connected", message: MESSAGES.not_connected };
  }
  if (row.needs_reconnect) {
    return {
      ok: false,
      reason: "needs_reconnect",
      message: MESSAGES.needs_reconnect,
    };
  }
  if (isFresh(row)) return authFrom(row);

  // The token is at or near expiry. The refresh token is single-use, so take
  // the lease first; only the request that gets it may call HighLevel.
  const { data: claimed, error: claimError } = await admin.rpc(
    "ghl_claim_refresh",
    {
      p_user_id: userId,
      p_lease_seconds: LEASE_SECONDS,
      p_margin_seconds: REFRESH_MARGIN_SECONDS,
    },
  );
  const refreshToken: string | undefined = (
    claimed as { refresh_token: string }[] | null
  )?.[0]?.refresh_token;

  if (claimError || !refreshToken) {
    // No lease: another request is refreshing right now, or already has.
    // Use the tokens it stores rather than spending a refresh token twice.
    for (let i = 0; i < WAIT_ATTEMPTS; i++) {
      const latest = await read();
      if (!latest) break;
      if (latest.needs_reconnect) {
        return {
          ok: false,
          reason: "needs_reconnect",
          message: MESSAGES.needs_reconnect,
        };
      }
      if (isFresh(latest)) return authFrom(latest);
      await new Promise((r) => setTimeout(r, WAIT_FOR_OTHER_REFRESH_MS));
    }
    if (notExpired(row)) return authFrom(row);
    return {
      ok: false,
      reason: "temporary",
      message: "HighLevel connection is busy refreshing. Try again in a moment",
    };
  }

  try {
    const tokens = await refreshTokens(app, refreshToken, row.redirect_uri);
    const { error: saveError } = await admin
      .from("ghl_connections")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        access_token_expires_at: tokens.expiresAt,
        scope: tokens.scope ?? row.scope,
        refresh_locked_until: null,
        needs_reconnect: false,
        last_error: null,
      })
      .eq("user_id", userId);
    if (saveError) {
      // HighLevel has already retired the old refresh token. If the new one
      // cannot be stored, the next refresh will fail and ask for a reconnect.
      console.error("ghl: refreshed but could not store tokens", saveError.message);
    }
    return {
      ok: true,
      auth: {
        accessToken: tokens.accessToken,
        locationId: row.location_id,
        appBaseUrl: getGhlAppBaseUrl(),
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed";
    // A 4xx from the token endpoint means the refresh token itself is no good
    // (revoked, expired, app uninstalled): only reconnecting fixes that.
    // Anything else (timeout, 5xx) is treated as temporary.
    const rejected = e instanceof GhlError && e.status >= 400 && e.status < 500;
    await admin
      .from("ghl_connections")
      .update({
        refresh_locked_until: null,
        needs_reconnect: rejected,
        last_error: message.slice(0, 500),
      })
      .eq("user_id", userId);
    if (rejected) {
      return {
        ok: false,
        reason: "needs_reconnect",
        message: MESSAGES.needs_reconnect,
      };
    }
    if (notExpired(row)) return authFrom(row);
    return { ok: false, reason: "temporary", message };
  }
}
