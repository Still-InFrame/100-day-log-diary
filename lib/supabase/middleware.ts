import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isAuthRoute =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/auth");
  const isPublicShare = url.pathname.startsWith("/share");
  // "/" is the public lead-magnet front door (renders the owner's showcase for
  // anonymous visitors); "/go/*" is the click-tracking redirect those visitors
  // follow. Both must be reachable without a session.
  const isPublicHome = url.pathname === "/";
  const isTrackedRedirect =
    url.pathname === "/go" || url.pathname.startsWith("/go/");
  // Crawlers fetch this without a session; redirecting it to /login would
  // make the robots rules unreadable.
  const isRobots = url.pathname === "/robots.txt";
  // Anonymous visitors' browsers post the app cards they saw here.
  const isViewBeacon = url.pathname === "/api/views";
  // The privacy policy is linked from every public page and signup form, and
  // is what a text-messaging or ad reviewer will open without an account.
  const isPrivacy = url.pathname === "/privacy";

  if (
    !user &&
    !isAuthRoute &&
    !isPublicShare &&
    !isPublicHome &&
    !isTrackedRedirect &&
    !isRobots &&
    !isViewBeacon &&
    !isPrivacy
  ) {
    const redirect = url.clone();
    redirect.pathname = "/login";
    // Drop the query string: nothing on /login reads it, and a private URL's
    // parameters (such as an OAuth code) should not be carried along.
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  if (user && url.pathname === "/login") {
    const redirect = url.clone();
    redirect.pathname = "/";
    return NextResponse.redirect(redirect);
  }

  return response;
}
