import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const APK_VERSION = "5.3.4";
const APK_VERSION_CODE = 12;
const APK_FILENAME = `WACRM-v${APK_VERSION}-Android.apk`;
const STATIC_APK_PATH = `/downloads/${APK_FILENAME}`;
const APK_CONTENT_TYPE = "application/vnd.android.package-archive";

const APK_RELEASE_URL =
  process.env.WACRM_ANDROID_APK_URL ||
  "https://github.com/Yudi8377/WACRM/releases/latest/download/wacrm-android.apk";

const TARGET_BASE_URL = "https://wacrm-commercial.dwahyudi8377.workers.dev";
const PRIVACY_POLICY_URL = `${TARGET_BASE_URL}/privacy`;

async function probeStaticEdgeApk(origin: string): Promise<{
  available: boolean;
  url: string;
  totalBytes: number;
  contentType: string;
}> {
  const staticUrl = `${origin}${STATIC_APK_PATH}`;
  try {
    const res = await fetch(staticUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": `WACRM-Android-Distributor/${APK_VERSION}`,
      },
    });
    const contentLength = Number(res.headers.get("content-length") || "0");
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const available =
      res.ok && contentLength > 1_000_000 && !contentType.includes("text/html");
    return {
      available,
      url: staticUrl,
      totalBytes: contentLength,
      contentType: contentType || APK_CONTENT_TYPE,
    };
  } catch {
    return {
      available: false,
      url: staticUrl,
      totalBytes: 0,
      contentType: APK_CONTENT_TYPE,
    };
  }
}

/**
 * HEAD handler for Android DownloadManager / Chrome / MIUI Browser preflight checks.
 * Never buffers the 5 MB binary through the Worker isolate (avoids Cloudflare 10ms CPU / HTTP 500).
 */
export async function HEAD(request: NextRequest) {
  const edge = await probeStaticEdgeApk(request.nextUrl.origin);
  if (edge.available) {
    const headers = new Headers();
    headers.set("Content-Type", APK_CONTENT_TYPE);
    headers.set("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
    headers.set("Content-Length", String(edge.totalBytes));
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "public, max-age=300");
    return new Response(null, { status: 200, headers });
  }

  try {
    const upstream = await fetch(APK_RELEASE_URL, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": `WACRM-Android-Distributor/${APK_VERSION}`,
      },
    });
    if (!upstream.ok) {
      return new Response(null, { status: 502 });
    }
    const headers = new Headers();
    headers.set("Content-Type", APK_CONTENT_TYPE);
    headers.set("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}

/**
 * Zero-CPU Android APK download distributor for Cloudflare Workers Free Tier.
 *
 * IMPORTANT: Streaming a 5+ MB binary through `@opennextjs/cloudflare` Node.js stream adapters
 * can exceed the Workers Free Tier 10 ms CPU limit and emit HTTP 500 (corrupting the downloaded APK).
 * Instead, this route redirects (HTTP 302) directly to the verified same-origin Cloudflare Edge Static
 * Asset (`/downloads/WACRM-v5.3.4-Android.apk`, served at 0 ms Worker CPU with exact Content-Length
 * and resumable HTTP Range support), falling back to GitHub Releases CDN if static asset is absent.
 *
 * Pass `?check=1` to verify APK ZIP magic bytes (`PK\x03\x04`) and exact size.
 */
export async function GET(request: NextRequest) {
  const isCheck = request.nextUrl.searchParams.get("check") === "1";
  const edge = await probeStaticEdgeApk(request.nextUrl.origin);

  if (isCheck) {
    const targetUrl = edge.available ? edge.url : APK_RELEASE_URL;
    try {
      const probe = await fetch(targetUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": `WACRM-Android-Distributor/${APK_VERSION}`,
          Range: "bytes=0-3",
        },
      });
      const bytes = new Uint8Array(await probe.arrayBuffer());
      const validApkZipMagic =
        bytes.length >= 4 &&
        bytes[0] === 0x50 && // 'P'
        bytes[1] === 0x4b && // 'K'
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;

      const contentRange = probe.headers.get("content-range") || "";
      const totalBytesMatch = contentRange.match(/\/(\d+)$/);
      const totalBytes = totalBytesMatch
        ? Number(totalBytesMatch[1])
        : edge.available
          ? edge.totalBytes
          : Number(probe.headers.get("content-length") || "0");

      return NextResponse.json(
        {
          ok: probe.ok && validApkZipMagic && totalBytes > 1_000_000,
          status: probe.status,
          runtime: "nodejs",
          delivery: edge.available ? "cloudflare-edge-static" : "github-releases-cdn",
          edgeStaticReady: edge.available,
          downloadPath: STATIC_APK_PATH,
          filename: APK_FILENAME,
          contentType: APK_CONTENT_TYPE,
          packageId: "com.wacrm.android",
          versionName: APK_VERSION,
          versionCode: APK_VERSION_CODE,
          targetBaseUrl: TARGET_BASE_URL,
          privacyPolicyUrl: PRIVACY_POLICY_URL,
          signingSchemes: ["v1", "v2", "v3"],
          totalBytes,
          totalMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
          validApkZipMagic,
          releaseUrl: APK_RELEASE_URL,
        },
        { status: probe.ok && validApkZipMagic ? 200 : 502 },
      );
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Gagal memverifikasi berkas APK rilis.",
          releaseUrl: APK_RELEASE_URL,
        },
        { status: 502 },
      );
    }
  }

  // Always redirect to a zero-CPU CDN binary endpoint so Android browsers receive 100% intact bytes.
  const redirectTarget = edge.available ? edge.url : APK_RELEASE_URL;
  return NextResponse.redirect(redirectTarget, 302);
}
