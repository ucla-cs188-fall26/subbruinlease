import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Runs before every page request.
 * - With Supabase (DATA_SOURCE=supabase), refreshes the Supabase session cookies.
 * - Optimistic auth check: signed-out visitors to a private page go to /login first.
 *
 * This is only a convenience. Every protected page and server action still verifies the
 * session itself (requireUser).
 */

const SESSION_COOKIE = "sbl_session";

const PROTECTED = [
  /^\/saved(\/|$)/,
  /^\/dashboard(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/inbox(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/listings\/new(\/|$)/,
  /^\/listings\/[^/]+\/edit(\/|$)/,
];

function toLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const isProtected = PROTECTED.some((re) => re.test(request.nextUrl.pathname));

  if ((process.env.DATA_SOURCE ?? "mock") === "supabase") {
    const { response, userId } = await updateSession(request);
    if (!isProtected || userId) return response;
    // Keep any refreshed/cleared auth cookies on the redirect.
    const redirect = toLogin(request);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (!isProtected || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return toLogin(request);
}

export const config = {
  // Every page, so Supabase sessions stay fresh. Skips static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
