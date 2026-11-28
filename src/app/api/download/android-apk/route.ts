import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const APK_RELEASE_URL =
  process.env.WACRM_ANDROID_APK_URL ||
  "https://github.com/Yudi8377/WACRM/releases/latest/download/wacrm-android.apk";

const APK_FILENAME = "WACRM-v5.3.3-Android.apk";
const APK_CONTENT_TYPE = "application/vnd.android.package-archive";

function buildDownloadHeaders(upstream: Response, isPartial = false): Headers {
  const headers = new Headers();
  headers.set("Content-Type", APK_CONTENT_TYPE);
  headers.set("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=300, s-maxage=300");

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  const contentRange = upstream.headers.get("content-range");
  if (isPartial && contentRange) {
    headers.set("Content-Range", contentRange);
  }
  const etag = upstream.headers.get("etag");
  if (etag) {
    headers.set("ETag", etag);
  }
  return headers;
}

/**
 * HEAD handler so Android DownloadManager, Chrome, and MIUI Browser can
 * inspect Content-Length, filename, and Accept-Ranges before fetching bytes.
 */
export async function HEAD() {
  try {
    const upstream = await fetch(APK_RELEASE_URL, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "WACRM-Android-Distributor/5.3.2",
      },
    });
    if (!upstream.ok) {
      return new Response(null, { status: 502 });
    }
    return new Response(null, {
      status: 200,
      headers: buildDownloadHeaders(upstream),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

/**
 * Edge-streamed same-origin Android APK download endpoint.
 * Runs on Vercel Edge Runtime so >4.5 MB APK binaries stream directly without
 * hitting Node.js Serverless 4.5 MB payload caps, supports HTTP Range resumable
 * downloads on mobile networks, and enforces `application/vnd.android.package-archive`.
 *
 * Pass `?check=1` to run a lightweight ZIP/APK magic-bytes (`PK\x03\x04`) & size check.
 */
export async function GET(request: NextRequest) {
  try {
    const isCheck = request.nextUrl.searchParams.get("check") === "1";

    if (isCheck) {
      const probe = await fetch(APK_RELEASE_URL, {
        redirect: "follow",
        headers: {
          "User-Agent": "WACRM-Android-Distributor/5.3.2",
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
        : Number(probe.headers.get("content-length") || "0");

      return NextResponse.json(
        {
          ok: probe.ok && validApkZipMagic && totalBytes > 1_000_000,
          status: probe.status,
          runtime: "nodejs",
          filename: APK_FILENAME,
          contentType: APK_CONTENT_TYPE,
          packageId: "com.wacrm.android",
          versionName: "5.3.3",
          versionCode: 11,
          targetBaseUrl: "https://wacrm-commercial.dwahyudi8377.workers.dev",
          privacyPolicyUrl: "https://wacrm-commercial.dwahyudi8377.workers.dev/privacy",
          signingSchemes: ["v1", "v2", "v3"],
          totalBytes,
          totalMB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
          validApkZipMagic,
          releaseUrl: APK_RELEASE_URL,
        },
        { status: probe.ok && validApkZipMagic ? 200 : 502 },
      );
    }

    const rangeHeader = request.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "WACRM-Android-Distributor/5.3.2",
      Accept: "application/vnd.android.package-archive, application/octet-stream, */*",
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const upstream = await fetch(APK_RELEASE_URL, {
      redirect: "follow",
      headers: fetchHeaders,
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

    const isPartial = upstream.status === 206;
    return new Response(upstream.body, {
      status: isPartial ? 206 : 200,
      headers: buildDownloadHeaders(upstream, isPartial),
    });
  } catch {
    return NextResponse.redirect(APK_RELEASE_URL, 302);
  }
}
