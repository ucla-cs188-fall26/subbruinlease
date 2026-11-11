import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: if there's no session cookie at all, send the visitor to
 * /login before rendering a protected page. This is only a convenience — every
 * protected page and server action still verifies the session itself (requireUser).
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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PROTECTED.some((re) => re.test(pathname))) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/saved/:path*", "/dashboard/:path*", "/profile/:path*", "/inbox/:path*", "/admin/:path*", "/listings/:path*"],
};
