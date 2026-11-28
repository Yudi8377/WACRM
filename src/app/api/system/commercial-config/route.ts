import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildMaskedCommercialConfig,
  getEffectiveCommercialConfig,
  saveCommercialRuntimeConfigPatch,
} from "@/lib/commercial-runtime-config";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";
import {
  buildPasswordResetOtpEmail,
  sendTransactionalEmail,
} from "@/lib/transactional-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secureMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function isAdminAuthorized(request: Request, adminKeyFromBody?: string): boolean {
  const provided = (
    request.headers.get("x-admin-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    adminKeyFromBody ||
    ""
  ).trim();

  const validSecrets = [
    process.env.PUBLISHER_SYNC_SECRET?.trim(),
    process.env.AUTH_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((s): s is string => Boolean(s && s.length >= 16));

  if (validSecrets.length === 0) {
    // Allow in local dev/test only when no prod secrets exist
    return process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
  }

  return validSecrets.some((sec) => secureMatch(provided, sec));
}

const SaveSchema = z.object({
  action: z.literal("save"),
  adminSecret: z.string().optional(),
  patch: z.object({
    resendApiKey: z.string().max(240).optional(),
    brevoApiKey: z.string().max(240).optional(),
    emailWebhookUrl: z.string().max(300).optional(),
    emailWebhookSecret: z.string().max(240).optional(),
    emailFromAddress: z.string().max(160).optional(),
    emailFromName: z.string().max(120).optional(),
    manualBankName: z.string().max(120).optional(),
    manualBankAccount: z.string().max(80).optional(),
    manualBankHolder: z.string().max(120).optional(),
    manualBillingWa: z.string().max(32).optional(),
    paymentProvider: z.enum(["manual_transfer", "midtrans", "xendit", "tripay"]).optional(),
    midtransServerKey: z.string().max(240).optional(),
    midtransIsProduction: z.boolean().optional(),
    xenditSecretKey: z.string().max(240).optional(),
    xenditWebhookToken: z.string().max(240).optional(),
    tripayApiKey: z.string().max(240).optional(),
    tripayPrivateKey: z.string().max(240).optional(),
    tripayMerchantCode: z.string().max(80).optional(),
    tripayIsProduction: z.boolean().optional(),
  }),
});

const TestEmailSchema = z.object({
  action: z.literal("test_email"),
  adminSecret: z.string().optional(),
  toEmail: z.string().trim().email().max(160),
});

const BodySchema = z.discriminatedUnion("action", [SaveSchema, TestEmailSchema]);

export async function GET() {
  const cfg = await getEffectiveCommercialConfig();
  return NextResponse.json({
    ok: true,
    config: buildMaskedCommercialConfig(cfg),
    webhookUrls: {
      midtrans: "/api/webhooks/payment?provider=midtrans",
      xendit: "/api/webhooks/payment?provider=xendit",
      tripay: "/api/webhooks/payment?provider=tripay",
    },
  });
}

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`commercial_cfg:${ip}`, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfterSeconds} detik.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Format konfigurasi tidak valid." },
      { status: 400 },
    );
  }

  if (!isAdminAuthorized(request, parsed.data.adminSecret)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Kunci Otorisasi Admin (PUBLISHER_SYNC_SECRET / AUTH_SECRET) diperlukan untuk mengubah atau menguji konfigurasi komersial server.",
      },
      { status: 401 },
    );
  }

  if (parsed.data.action === "save") {
    try {
      const result = await saveCommercialRuntimeConfigPatch(parsed.data.patch);
      const refreshed = await getEffectiveCommercialConfig(true);
      return NextResponse.json({
        ok: true,
        message: `Berhasil menyimpan ${result.savedKeys.length} pengaturan (${result.encryptedKeys.length} kunci rahasia dienkripsi AES-256-GCM) — langsung aktif tanpa redeploy!`,
        savedKeys: result.savedKeys,
        encryptedKeys: result.encryptedKeys,
        config: buildMaskedCommercialConfig(refreshed),
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "Gagal menyimpan konfigurasi komersial.",
        },
        { status: 500 },
      );
    }
  }

  // action === "test_email"
  const cfg = await getEffectiveCommercialConfig(true);
  const mail = buildPasswordResetOtpEmail({
    email: parsed.data.toEmail,
    otpCode: "739204",
    expiresInMinutes: 15,
  });
  const sent = await sendTransactionalEmail({
    to: parsed.data.toEmail,
    subject: "[TEST LIVE] Konfigurasi Email OTP WACRM Aktif",
    html: mail.html,
    text: mail.text,
    configOverride: cfg,
  });

  return NextResponse.json(
    {
      ok: sent.ok,
      provider: sent.provider,
      messageId: sent.messageId,
      message: sent.ok
        ? `Email uji coba berhasil terkirim ke ${parsed.data.toEmail} melalui ${sent.provider.toUpperCase()}!`
        : sent.error || "Gagal mengirim email uji coba.",
    },
    { status: sent.ok ? 200 : 502 },
  );
}
