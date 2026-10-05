import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, getGhlAppConfig } from "@/lib/ghl";
import { saveConnection } from "@/lib/ghl-connection";
import {
  SETTINGS_PATH,
  STATE_COOKIE,
  callbackUrl,
  clearStateCookie,
  setNotice,
} from "@/lib/crm-oauth";

// Step 2 of connecting HighLevel: HighLevel redirects here with a one-time
// code, which is exchanged for tokens and stored against the signed-in user.
export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === "https:";
  const finish = (ok: boolean, text: string) => {
    const res = NextResponse.redirect(new URL(SETTINGS_PATH, req.url));
    clearStateCookie(res);
    setNotice(res, { ok, text }, secure);
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  // The connection is stored against whoever is signed in, so make sure this
  // browser really started a connect attempt. Without this, a link carrying
  // someone else's code could attach THEIR HighLevel account to this user,
  // and this user's leads would flow into it. HighLevel's guide does not
  // promise to echo `state`, so the cookie set by /api/crm/connect is the
  // required proof; when `state` does come back it must also match.
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  const returnedState = req.nextUrl.searchParams.get("state");
  if (!expectedState) {
    return finish(
      false,
      "That connection attempt expired or did not start here. Press Connect HighLevel to try again.",
    );
  }
  if (returnedState && returnedState !== expectedState) {
    return finish(false, "The connection attempt could not be verified. Please try again.");
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return finish(false, "HighLevel did not return an authorization code. Please try again.");
  }

  const app = getGhlAppConfig();
  if (!app) {
    return finish(false, "HighLevel connections are not set up on this site yet.");
  }

  const redirectUri = callbackUrl(req.nextUrl.origin);
  try {
    const tokens = await exchangeCode(app, code, redirectUri);
    if (!tokens.locationId) {
      return finish(
        false,
        "HighLevel returned an agency-level connection with no sub-account. Start again and choose one sub-account.",
      );
    }
    const { error } = await saveConnection(
      user.id,
      { ...tokens, locationId: tokens.locationId },
      redirectUri,
    );
    if (error) {
      console.error("crm callback: could not store connection", error);
      return finish(false, `Connected, but saving the connection failed: ${error}`);
    }
    return finish(true, "HighLevel is connected.");
  } catch (e) {
    return finish(
      false,
      e instanceof Error ? e.message : "HighLevel rejected the connection.",
    );
  }
}
