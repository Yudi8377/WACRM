import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "wacrm-publisher-hq",
    role: "publisher_super_admin_ems",
    publisher: "PT WACRM Digital Nusantara",
    indexing: "noindex,nofollow",
    timestamp: new Date().toISOString(),
  });
}
