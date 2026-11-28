import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySignedLicenseKey } from "@/lib/license-crypto";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";

const VerifySchema = z.object({
  licenseKey: z.string().min(10).max(80),
  tenantId: z.string().min(1).max(120).optional(),
  domain: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const rate = checkRateLimit(`license_verify:${ip}`, 20, 10 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          valid: false,
          error: `Terlalu banyak percobaan verifikasi lisensi. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          error: "License Key harus diisi minimal 10 karakter.",
        },
        { status: 400 },
      );
    }

    const publisherApiUrl = process.env.PUBLISHER_LICENSE_API_URL?.trim();

    if (publisherApiUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${publisherApiUrl.replace(/\/$/, "")}/api/licenses/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const remote = (await res.json()) as Record<string, unknown>;
          return NextResponse.json({
            ...remote,
            verificationMode: "publisher_live",
          });
        }
      } catch {
        // Fall through to deterministic cryptographic offline verification
      }
    }

    const verified = verifySignedLicenseKey(parsed.data.licenseKey);
    return NextResponse.json(verified, { status: verified.valid ? 200 : 422 });
  } catch (err) {
    return NextResponse.json(
      {
        valid: false,
        error: err instanceof Error ? err.message : "Gagal memverifikasi License Key.",
      },
      { status: 500 },
    );
  }
}
