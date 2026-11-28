import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APK_RELEASE_URL =
  process.env.WACRM_ANDROID_APK_URL ||
  "https://github.com/Yudi8377/WACRM/releases/latest/download/wacrm-android.apk";

/**
 * Same-origin Android APK download endpoint.
 * Streams the verified v1/v2/v3-signed Release APK directly from our HTTPS origin
 * with exact `application/vnd.android.package-archive` headers so Android Chrome,
 * Samsung Internet, MIUI Browser, and WhatsApp in-app browsers never corrupt or
 * rename the file during cross-origin GitHub redirects.
 */
export async function GET() {
  try {
    const upstream = await fetch(APK_RELEASE_URL, {
      redirect: "follow",
      headers: {
        "User-Agent": "WACRM-Android-Distributor/5.3.2",
        Accept: "application/vnd.android.package-archive, application/octet-stream, */*",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(APK_RELEASE_URL, 302);
    }

    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    // Guard against HTML 404/error pages accidentally served with .apk extension
    if (contentType.includes("text/html")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Berkas APK rilis belum tersedia. Silakan coba beberapa saat lagi.",
        },
        { status: 503 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.android.package-archive");
    headers.set("Content-Disposition", 'attachment; filename="WACRM-v5.3.2-Android.apk"');
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.redirect(APK_RELEASE_URL, 302);
  }
}
