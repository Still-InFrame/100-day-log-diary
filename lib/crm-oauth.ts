import type { NextResponse } from "next/server";

// Shared pieces of the HighLevel connect flow (app/api/crm/*).
// The routes are named "crm", not after the vendor, so the redirect URL
// registered with the Marketplace app carries no vendor name.

export const CONNECT_PATH = "/api/crm/connect";
export const CALLBACK_PATH = "/api/crm/callback";
export const SETTINGS_PATH = "/admin/settings";

// Set when a signed-in user starts connecting; required by the callback.
export const STATE_COOKIE = "crm_oauth_state";
// One-shot message from the connect flow to the Settings page.
export const NOTICE_COOKIE = "crm_notice";

const STATE_MAX_AGE_SECONDS = 10 * 60;
const NOTICE_MAX_AGE_SECONDS = 60;

export type CrmNotice = { ok: boolean; text: string };

// The redirect URI must match, character for character, one registered on the
// Marketplace app. It is derived from the request so the same code works on
// the production domain and on localhost.
export function callbackUrl(origin: string): string {
  return `${origin}${CALLBACK_PATH}`;
}

export function setStateCookie(
  res: NextResponse,
  state: string,
  secure: boolean,
): void {
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api/crm",
    maxAge: STATE_MAX_AGE_SECONDS,
  });
}

export function clearStateCookie(res: NextResponse): void {
  res.cookies.set(STATE_COOKIE, "", { path: "/api/crm", maxAge: 0 });
}

// The message travels in a short-lived httpOnly cookie rather than the URL so
// an error reply from HighLevel is not left in browser history or logs.
export function setNotice(
  res: NextResponse,
  notice: CrmNotice,
  secure: boolean,
): void {
  res.cookies.set(
    NOTICE_COOKIE,
    JSON.stringify({ ok: notice.ok, text: notice.text.slice(0, 600) }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/admin",
      maxAge: NOTICE_MAX_AGE_SECONDS,
    },
  );
}

export function parseNotice(raw: string | undefined): CrmNotice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CrmNotice>;
    if (typeof v.text !== "string") return null;
    return { ok: Boolean(v.ok), text: v.text };
  } catch {
    return null;
  }
}
