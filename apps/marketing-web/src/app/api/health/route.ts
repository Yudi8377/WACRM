import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "wacrm-enterprise-website",
    version: "5.3.1",
    licenseModel: "pure-free-no-copyright-original-code",
    zeroPublicClientAppLink: true,
    publisherPortal:
      process.env.NEXT_PUBLIC_PUBLISHER_HQ_URL || "https://wacrm-publisher-hq.vercel.app",
    timestamp: new Date().toISOString(),
  });
}
