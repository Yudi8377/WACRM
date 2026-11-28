/**
 * Zero-cost / commercial-ready Transactional Email Dispatcher.
 * Supports Rp 0,- free commercial tiers:
 * - Resend (RESEND_API_KEY — 3,000 emails/month free, commercial allowed)
 * - Brevo (BREVO_API_KEY — 300 emails/day free, commercial allowed)
 * - Custom SMTP/Email Webhook Relay (EMAIL_WEBHOOK_URL + optional EMAIL_WEBHOOK_SECRET)
 */

import type { CommercialRuntimeConfig } from "@/lib/commercial-runtime-config";

export type EmailProviderName = "resend" | "brevo" | "webhook" | "none";

export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  configOverride?: Pick<
    CommercialRuntimeConfig,
    | "resendApiKey"
    | "brevoApiKey"
    | "emailWebhookUrl"
    | "emailWebhookSecret"
    | "emailFromAddress"
    | "emailFromName"
  >;
}

export interface EmailSendResult {
  ok: boolean;
  provider: EmailProviderName;
  messageId?: string;
  error?: string;
}

export function detectConfiguredEmailProvider(
  cfg?: Pick<CommercialRuntimeConfig, "resendApiKey" | "brevoApiKey" | "emailWebhookUrl">,
): EmailProviderName {
  if ((cfg?.resendApiKey ?? process.env.RESEND_API_KEY)?.trim()) return "resend";
  if ((cfg?.brevoApiKey ?? process.env.BREVO_API_KEY)?.trim()) return "brevo";
  if ((cfg?.emailWebhookUrl ?? process.env.EMAIL_WEBHOOK_URL)?.trim()) return "webhook";
  return "none";
}

export function isEmailProviderConfigured(
  cfg?: Pick<CommercialRuntimeConfig, "resendApiKey" | "brevoApiKey" | "emailWebhookUrl">,
): boolean {
  return detectConfiguredEmailProvider(cfg) !== "none";
}

function getSenderAddress(
  cfg?: Pick<CommercialRuntimeConfig, "emailFromAddress" | "emailFromName">,
): { name: string; email: string } {
  const fromEmail =
    (cfg?.emailFromAddress || process.env.EMAIL_FROM_ADDRESS)?.trim() || "no-reply@wacrm.id";
  const fromName =
    (cfg?.emailFromName || process.env.EMAIL_FROM_NAME)?.trim() || "WACRM Commercial OS";
  return { name: fromName, email: fromEmail };
}

export async function sendTransactionalEmail(
  input: EmailSendInput,
): Promise<EmailSendResult> {
  const cfg = input.configOverride;
  const provider = detectConfiguredEmailProvider(cfg);
  const sender = getSenderAddress(cfg);

  if (provider === "none") {
    return {
      ok: false,
      provider: "none",
      error: "Layanan email transaksional (Resend / Brevo / Webhook) belum dikonfigurasi.",
    };
  }

  try {
    if (provider === "resend") {
      const apiKey = (cfg?.resendApiKey || process.env.RESEND_API_KEY || "").trim();
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${sender.name} <${sender.email}>`,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          provider: "resend",
          error: json.message || `Resend HTTP ${res.status}`,
        };
      }
      return { ok: true, provider: "resend", messageId: json.id };
    }

    if (provider === "brevo") {
      const apiKey = (cfg?.brevoApiKey || process.env.BREVO_API_KEY || "").trim();
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: sender.name, email: sender.email },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        messageId?: string;
        message?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          provider: "brevo",
          error: json.message || `Brevo HTTP ${res.status}`,
        };
      }
      return { ok: true, provider: "brevo", messageId: json.messageId };
    }

    // Custom Webhook / Self-hosted SMTP Relay
    const webhookUrl = (cfg?.emailWebhookUrl || process.env.EMAIL_WEBHOOK_URL || "").trim();
    const webhookSecret = (cfg?.emailWebhookSecret || process.env.EMAIL_WEBHOOK_SECRET || "").trim();
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify({
        from: sender,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        provider: "webhook",
        error: `Email relay HTTP ${res.status}`,
      };
    }
    return { ok: true, provider: "webhook" };
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err instanceof Error ? err.message : "Gagal menghubungi layanan email.",
    };
  }
}

export function buildPasswordResetOtpEmail(params: {
  email: string;
  otpCode: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = `[WACRM] Kode Verifikasi Reset Kata Sandi: ${params.otpCode}`;
  const text = [
    "Permintaan Reset Kata Sandi Akun WACRM",
    "",
    `Kode Verifikasi (OTP) Anda: ${params.otpCode}`,
    `Berlaku selama ${params.expiresInMinutes} menit.`,
    "",
    "PERINGATAN KEAMANAN: Jangan berikan kode ini kepada siapa pun termasuk pihak yang mengaku admin.",
    "Jika Anda tidak meminta reset kata sandi, abaikan email ini.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="id"><body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
    <div style="font-size:12px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.08em;">WACRM Commercial OS · Keamanan Akun</div>
    <h2 style="margin:8px 0 12px;font-size:20px;color:#0f172a;">Kode Verifikasi Reset Kata Sandi</h2>
    <p style="font-size:14px;line-height:1.6;color:#334155;">Kami menerima permintaan reset kata sandi untuk akun <strong>${params.email}</strong>. Gunakan kode verifikasi 6 digit berikut:</p>
    <div style="margin:20px 0;padding:16px;text-align:center;background:#ecfdf5;border:2px dashed #10b981;border-radius:10px;font-size:30px;font-weight:800;letter-spacing:8px;color:#065f46;font-family:monospace;">${params.otpCode}</div>
    <p style="font-size:13px;color:#475569;">Kode ini hanya berlaku selama <strong>${params.expiresInMinutes} menit</strong> dan hanya dapat digunakan satu kali.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
    <p style="font-size:12px;color:#64748b;line-height:1.5;"><strong>Peringatan Keamanan:</strong> Jangan pernah membagikan kode OTP ini kepada siapa pun. Jika Anda tidak merasa melakukan permintaan ini, segera abaikan email ini.</p>
  </div>
</body></html>`;

  return { subject, html, text };
}
