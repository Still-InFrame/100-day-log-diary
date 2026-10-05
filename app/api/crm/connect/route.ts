import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInstallUrl, getGhlAppConfig } from "@/lib/ghl";
import { hasSupabaseSecretKey } from "@/lib/supabase/admin";
import {
  SETTINGS_PATH,
  callbackUrl,
  setNotice,
  setStateCookie,
} from "@/lib/crm-oauth";

// Step 1 of connecting HighLevel: send the signed-in user to HighLevel to pick
// a sub-account and approve. HighLevel then redirects to /api/crm/callback.
export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === "https:";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const app = getGhlAppConfig();
  if (!app || !hasSupabaseSecretKey()) {
    const res = NextResponse.redirect(new URL(SETTINGS_PATH, req.url));
    setNotice(
      res,
      { ok: false, text: "HighLevel connections are not set up on this site yet." },
      secure,
    );
    return res;
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    buildInstallUrl(app, callbackUrl(req.nextUrl.origin), state),
  );
  setStateCookie(res, state, secure);
  return res;
}
