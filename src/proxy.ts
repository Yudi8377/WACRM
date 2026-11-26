import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasDb = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  if (!hasDb) {
    // Allow /dashboard to render the friendly Neon Setup / Demo chooser when DATABASE_URL is not linked yet.
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackURL", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
