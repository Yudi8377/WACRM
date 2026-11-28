import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthConfigured } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { updateRegisteredTenantPassword } from "@/lib/publisher-sync";
import {
  checkRateLimit,
  evaluatePasswordStrength,
  getClientIpFromRequest,
} from "@/lib/security";
import { getEffectiveCommercialConfig } from "@/lib/commercial-runtime-config";
import {
  buildPasswordResetOtpEmail,
  detectConfiguredEmailProvider,
  sendTransactionalEmail,
} from "@/lib/transactional-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResetTokenRecord {
  email: string;
  tokenHash: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 5;

const globalResetStore = globalThis as unknown as {
  __wacrmPasswordResetTokens?: Map<string, ResetTokenRecord>;
};

function getTokenStore(): Map<string, ResetTokenRecord> {
  if (!globalResetStore.__wacrmPasswordResetTokens) {
    globalResetStore.__wacrmPasswordResetTokens = new Map();
  }
  return globalResetStore.__wacrmPasswordResetTokens;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function hashToken(email: string, code: string): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "wacrm-reset-token-pepper-v1";
  return createHash("sha256")
    .update(`${secret}:${email.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

function secureCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    email: z.string().trim().email().max(160),
  }),
  z.object({
    action: z.literal("confirm"),
    email: z.string().trim().email().max(160),
    code: z.string().trim().regex(/^\d{6}$/, "Kode verifikasi harus 6 digit angka."),
    newPassword: z.string().min(8).max(128),
  }),
]);

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || "Data permintaan reset kata sandi tidak valid.",
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const emailKey = data.email.trim().toLowerCase();
  const store = getTokenStore();

  // Prune expired records
  const now = Date.now();
  for (const [k, rec] of store.entries()) {
    if (rec.expiresAt <= now || rec.used) {
      store.delete(k);
    }
  }

  if (data.action === "request") {
    const rate = checkRateLimit(`forgot_req:${ip}:${emailKey}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Terlalu banyak permintaan reset. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }

    const runtimeCfg = await getEffectiveCommercialConfig();
    const provider = detectConfiguredEmailProvider(runtimeCfg);
    const isProd = isProductionRuntime();

    // CRITICAL SECURITY LOCK: Never expose OTP in production responses when no email provider is configured.
    if (isProd && provider === "none") {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_PROVIDER_NOT_CONFIGURED",
          error:
            "Demi keamanan akun, reset kata sandi mandiri membutuhkan layanan email OTP (Resend/Brevo gratis). Silakan hubungi Admin Support untuk verifikasi reset manual.",
        },
        { status: 503 },
      );
    }

    const otpCode = String(randomInt(100000, 999999));

    if (provider !== "none") {
      const emailPayload = buildPasswordResetOtpEmail({
        email: emailKey,
        otpCode,
        expiresInMinutes: 15,
      });
      const sent = await sendTransactionalEmail({
        to: emailKey,
        ...emailPayload,
        configOverride: runtimeCfg,
      });
      if (!sent.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "EMAIL_DELIVERY_FAILED",
            error:
              "Gagal mengirim email OTP saat ini. Silakan coba lagi beberapa saat atau hubungi Admin Support.",
          },
          { status: 502 },
        );
      }

      store.set(emailKey, {
        email: emailKey,
        tokenHash: hashToken(emailKey, otpCode),
        expiresAt: now + TOKEN_TTL_MS,
        attempts: 0,
        used: false,
      });

      return NextResponse.json({
        ok: true,
        deliveryMethod: "email",
        provider: sent.provider,
        message:
          "Kode verifikasi 6 digit telah dikirim ke email terdaftar Anda (berlaku 15 menit). Periksa folder Inbox atau Spam.",
        expiresInMinutes: 15,
      });
    }

    // Local development / automated test environment ONLY (NODE_ENV !== "production")
    store.set(emailKey, {
      email: emailKey,
      tokenHash: hashToken(emailKey, otpCode),
      expiresAt: now + TOKEN_TTL_MS,
      attempts: 0,
      used: false,
    });

    return NextResponse.json({
      ok: true,
      deliveryMethod: "dev_preview",
      message:
        "Mode pengembangan lokal: kode verifikasi 6 digit berhasil dibuat (berlaku 15 menit).",
      expiresInMinutes: 15,
      verificationCodePreview: otpCode,
    });
  }

  // action === "confirm"
  const rate = checkRateLimit(`forgot_confirm:${ip}:${emailKey}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Terlalu banyak percobaan verifikasi. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const strength = evaluatePasswordStrength(data.newPassword);
  if (strength.score < 2) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Kata sandi baru terlalu lemah. Gunakan minimal 8–12 karakter kombinasi huruf besar, huruf kecil, dan angka.",
      },
      { status: 400 },
    );
  }

  const record = store.get(emailKey);
  if (!record || record.used || record.expiresAt <= now) {
    return NextResponse.json(
      {
        ok: false,
        error: "Kode verifikasi sudah kedaluwarsa atau tidak ditemukan. Silakan minta kode baru.",
      },
      { status: 400 },
    );
  }

  record.attempts += 1;
  if (record.attempts > MAX_VERIFY_ATTEMPTS) {
    store.delete(emailKey);
    return NextResponse.json(
      {
        ok: false,
        error: "Batas percobaan kode terlampaui. Kode dibatalkan demi keamanan — silakan minta kode baru.",
      },
      { status: 429 },
    );
  }

  const expectedHash = hashToken(emailKey, data.code);
  if (!secureCompareHex(expectedHash, record.tokenHash)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Kode verifikasi 6 digit tidak cocok (sisa ${MAX_VERIFY_ATTEMPTS - record.attempts} percobaan).`,
      },
      { status: 400 },
    );
  }

  // Mark token single-use immediately
  record.used = true;
  store.delete(emailKey);

  // If Better Auth / Neon PostgreSQL is configured, sync password update for existing user if present
  let syncedWithCloudDb = false;
  if (isAuthConfigured()) {
    try {
      const pool = getDbPool();
      const userRes = await pool.query(`SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1`, [
        emailKey,
      ]);
      if (userRes.rows[0]?.id) {
        const { hashPassword } = await import("better-auth/crypto");
        const hashed = await hashPassword(data.newPassword);
        await pool.query(
          `UPDATE "account"
              SET password = $2, "updatedAt" = now()
            WHERE "userId" = $1 AND "providerId" = 'credential'`,
          [String(userRes.rows[0].id), hashed],
        );
        syncedWithCloudDb = true;
      }
    } catch {
      // Non-fatal: client-side commercial accounts still complete reset cleanly
    }
  }

  // Sync new password into Neon commercial tenant registry too
  await updateRegisteredTenantPassword(emailKey, data.newPassword).catch(() => false);

  return NextResponse.json({
    ok: true,
    syncedWithCloudDb,
    message: "Kata sandi Anda berhasil diperbarui! Silakan masuk menggunakan kata sandi baru.",
  });
}
