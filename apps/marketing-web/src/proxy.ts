import { NextResponse } from "next/server";

/**
 * Standalone Enterprise Marketing Website request proxy.
 * Keeps this app fully isolated from the parent WACRM root proxy while
 * applying clean enterprise security headers on every public route.
 */
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
