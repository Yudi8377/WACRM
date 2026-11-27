import { NextResponse } from "next/server";

/**
 * Standalone Publisher HQ edge/request proxy.
 * Enforces strict search-engine privacy headers across every Publisher HQ route
 * and keeps this app fully isolated from the client WACRM root proxy.
 */
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
