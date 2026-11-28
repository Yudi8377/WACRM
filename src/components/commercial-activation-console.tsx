"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy,
  CreditCard,
  KeyRound,
  Landmark,
  Mail,
  Send,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";
import type { MaskedCommercialRuntimeConfig } from "@/lib/commercial-runtime-config";

type ActiveTab = "email" | "manual" | "gateway" | "cloudflare";

export function CommercialActivationConsole() {
  const [tab, setTab] = useState<ActiveTab>("email");
  const [cfg, setCfg] = useState<MaskedCommercialRuntimeConfig | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testToEmail, setTestToEmail] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email OTP fields
  const [resendApiKey, setResendApiKey] = useState("");
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("no-reply@wacrm.id");
  const [emailFromName, setEmailFromName] = useState("WACRM Commercial OS");

  // Manual Transfer Rp 0 fields
  const [manualBankName, setManualBankName] = useState("Bank BCA / QRIS Resmi WACRM");
  const [manualBankAccount, setManualBankAccount] = useState("");
  const [manualBankHolder, setManualBankHolder] = useState("PT WACRM Digital Nusantara");
  const [manualBillingWa, setManualBillingWa] = useState("");

  // Payment Gateway fields
  const [paymentProvider, setPaymentProvider] = useState<
    "manual_transfer" | "midtrans" | "xendit" | "tripay"
  >("manual_transfer");
  const [midtransServerKey, setMidtransServerKey] = useState("");
  const [midtransIsProduction, setMidtransIsProduction] = useState(true);
  const [xenditSecretKey, setXenditSecretKey] = useState("");
  const [xenditWebhookToken, setXenditWebhookToken] = useState("");
  const [tripayApiKey, setTripayApiKey] = useState("");
  const [tripayPrivateKey, setTripayPrivateKey] = useState("");
  const [tripayMerchantCode, setTripayMerchantCode] = useState("");
  const [tripayIsProduction, setTripayIsProduction] = useState(true);

  async function loadConfig() {
    try {
      const res = await fetch("/api/system/commercial-config", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { ok: boolean; config?: MaskedCommercialRuntimeConfig };
      if (json.ok && json.config) {
        setCfg(json.config);
        setEmailFromAddress(json.config.email.emailFromAddress);
        setEmailFromName(json.config.email.emailFromName);
        setManualBankName(json.config.manualTransfer.bankName);
        setManualBankAccount(json.config.manualTransfer.accountNumber);
        setManualBankHolder(json.config.manualTransfer.accountHolder);
        setManualBillingWa(json.config.manualTransfer.billingWa);
        setPaymentProvider(json.config.paymentGateway.preferredProvider);
        setMidtransIsProduction(json.config.paymentGateway.midtransIsProduction);
        setTripayMerchantCode(json.config.paymentGateway.tripayMerchantCode);
        setTripayIsProduction(json.config.paymentGateway.tripayIsProduction);
      }
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  function copyText(id: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleSavePatch(e: FormEvent, patch: Record<string, unknown>) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/system/commercial-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          adminSecret,
          patch,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        config?: MaskedCommercialRuntimeConfig;
      };
      if (data.ok && data.config) {
        setCfg(data.config);
        setResendApiKey("");
        setBrevoApiKey("");
        setMidtransServerKey("");
        setXenditSecretKey("");
        setXenditWebhookToken("");
        setTripayApiKey("");
        setTripayPrivateKey("");
        setFeedback({ ok: true, text: data.message || "Konfigurasi berhasil disimpan!" });
      } else {
        setFeedback({ ok: false, text: data.error || "Gagal menyimpan konfigurasi." });
      }
    } catch {
      setFeedback({ ok: false, text: "Gagal menghubungi API konfigurasi komersial." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testToEmail.trim()) return;
    setTestingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/system/commercial-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_email",
          adminSecret,
          toEmail: testToEmail.trim(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setFeedback({
        ok: data.ok,
        text: data.message || data.error || "Pengujian selesai.",
      });
    } finally {
      setTestingEmail(false);
    }
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://wacrm-seven-dusky.vercel.app";

  const envSnippet = [
    "# 1) Email OTP Gratis (pilih Resend 3.000/bln atau Brevo 300/hari)",
    `RESEND_API_KEY=${resendApiKey || "<TEMPEL_RESEND_KEY>"}`,
    `# BREVO_API_KEY=${brevoApiKey || "<ATAU_TEMPEL_BREVO_KEY>"}`,
    `EMAIL_FROM_ADDRESS=${emailFromAddress}`,
    `EMAIL_FROM_NAME="${emailFromName}"`,
    "",
    "# 2) Mode Transfer Manual Rp 0,-",
    `MANUAL_BANK_NAME="${manualBankName}"`,
    `MANUAL_BANK_ACCOUNT="${manualBankAccount || "<NO_REKENING_ANDA>"}"`,
    `MANUAL_BANK_HOLDER="${manualBankHolder}"`,
    `MANUAL_BILLING_WA="${manualBillingWa || "6281234567890"}"`,
    "",
    "# 3) Payment Gateway Otomatis (pilih midtrans | xendit | tripay | manual_transfer)",
    `PAYMENT_PROVIDER=${paymentProvider}`,
    `MIDTRANS_SERVER_KEY=${midtransServerKey || "<MIDTRANS_SERVER_KEY>"}`,
    `MIDTRANS_IS_PRODUCTION=${String(midtransIsProduction)}`,
    `XENDIT_SECRET_KEY=${xenditSecretKey || "<XENDIT_SECRET_KEY>"}`,
    `XENDIT_WEBHOOK_TOKEN=${xenditWebhookToken || "<XENDIT_WEBHOOK_TOKEN>"}`,
    `TRIPAY_API_KEY=${tripayApiKey || "<TRIPAY_API_KEY>"}`,
    `TRIPAY_PRIVATE_KEY=${tripayPrivateKey || "<TRIPAY_PRIVATE_KEY>"}`,
    `TRIPAY_MERCHANT_CODE=${tripayMerchantCode || "<TRIPAY_MERCHANT_CODE>"}`,
    `TRIPAY_IS_PRODUCTION=${String(tripayIsProduction)}`,
  ].join("\n");

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F7F3] px-3 py-1 font-heading text-[11px] font-extrabold text-[#008C6F]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00A885]" /> Aktivasi Komersial Otonom (Rp 0,- → Pro · Enkripsi AES-256-GCM · Tanpa Redeploy)
          </div>
          <h2 className="font-heading mt-2 text-lg font-extrabold text-[#222222]">
            Pusat Aktivasi Email OTP, Transfer Manual Rp 0,- &amp; Payment Gateway
          </h2>
          <p className="mt-1 text-xs text-[#666666]">
            Aktifkan <strong>Resend / Brevo Gratis</strong>, <strong>Rekening Transfer Manual Rp 0,-</strong>, dan{" "}
            <strong>Midtrans / Xendit / Tripay</strong> langsung dari sini (tersimpan terenkripsi AES-256-GCM di PostgreSQL) — atau salin blok env untuk Cloudflare Workers / Vercel.
          </p>
        </div>

        {/* Live Status Badges */}
        {cfg && (
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span
              className={`rounded-full px-2.5 py-1 font-heading font-bold ${
                cfg.sources.activeEmailProvider !== "none"
                  ? "bg-[#E6F7F3] text-[#008C6F]"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              Email OTP: {cfg.sources.activeEmailProvider.toUpperCase()}
            </span>
            <span className="rounded-full bg-[#222222] px-2.5 py-1 font-heading font-bold text-[#00D4A8]">
              Billing: {cfg.sources.activePaymentProvider.toUpperCase()}
            </span>
            <span className="rounded-full bg-[#F5F5F5] px-2.5 py-1 font-heading font-bold text-[#222222]">
              Android: APK v5.3.2 + PWA
            </span>
          </div>
        )}
      </div>

      {/* Admin Key Authorization Bar */}
      <div className="rounded-xl border border-zinc-200 bg-[#F5F5F5] p-3.5">
        <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#222222]">
            <KeyRound className="h-4 w-4 text-[#00A885]" />
            Kunci Otorisasi Admin (PUBLISHER_SYNC_SECRET / AUTH_SECRET):
          </span>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Tempel secret server Anda untuk menyimpan perubahan..."
            className="made-input !w-full font-mono text-xs sm:!w-96"
          />
        </label>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "email" as const, label: "1. Email OTP Gratis (Resend / Brevo)", icon: Mail },
            { id: "manual" as const, label: "2. Transfer Manual Rp 0,-", icon: Landmark },
            { id: "gateway" as const, label: "3. Payment Gateway (Midtrans / Xendit / Tripay)", icon: CreditCard },
            { id: "cloudflare" as const, label: "4. Migrasi Cloudflare Rp 0,- & Android APK", icon: Cloud },
          ]
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded px-3.5 py-2 font-heading text-xs font-bold transition ${
                tab === item.id
                  ? "bg-[#00A885] text-white shadow-xs"
                  : "border border-zinc-200 bg-[#F5F5F5] text-[#444444] hover:border-[#00A885]/50 hover:text-[#00A885]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-semibold ${
            feedback.ok
              ? "border-[#00A885]/40 bg-[#E6F7F3] text-[#006B54]"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* TAB 1: EMAIL OTP GRATIS */}
      {tab === "email" && (
        <form
          onSubmit={(e) =>
            void handleSavePatch(e, {
              ...(resendApiKey ? { resendApiKey } : {}),
              ...(brevoApiKey ? { brevoApiKey } : {}),
              emailFromAddress,
              emailFromName,
            })
          }
          className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="font-bold text-slate-700">
                RESEND_API_KEY (Gratis 3.000 email/bln){" "}
                {cfg?.email.resendConfigured && (
                  <span className="text-emerald-700">✓ Aktif ({cfg.email.resendMasked})</span>
                )}
              </span>
              <input
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">
                ATAU BREVO_API_KEY (Gratis 300 email/hari){" "}
                {cfg?.email.brevoConfigured && (
                  <span className="text-emerald-700">✓ Aktif ({cfg.email.brevoMasked})</span>
                )}
              </span>
              <input
                type="password"
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">EMAIL_FROM_ADDRESS</span>
              <input
                type="email"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">EMAIL_FROM_NAME</span>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#008C6F] disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan & Aktifkan Email OTP"}
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={testToEmail}
                onChange={(e) => setTestToEmail(e.target.value)}
                placeholder="Email tujuan tes OTP..."
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-xs text-[#222222]"
              />
              <button
                type="button"
                disabled={testingEmail || !testToEmail.trim()}
                onClick={() => void handleTestEmail()}
                className="inline-flex items-center gap-1.5 rounded bg-[#222222] px-3.5 py-2 font-heading text-xs font-bold text-white hover:bg-[#00A885] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {testingEmail ? "Mengirim..." : "Kirim Tes Live"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: MODE TRANSFER MANUAL RP 0 */}
      {tab === "manual" && (
        <form
          onSubmit={(e) =>
            void handleSavePatch(e, {
              manualBankName,
              manualBankAccount,
              manualBankHolder,
              manualBillingWa,
            })
          }
          className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="font-bold text-slate-700">MANUAL_BANK_NAME (Nama Bank / QRIS)</span>
              <input
                type="text"
                value={manualBankName}
                onChange={(e) => setManualBankName(e.target.value)}
                placeholder="Bank BCA / BRI / Mandiri / QRIS"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">MANUAL_BANK_ACCOUNT (No. Rekening Anda)</span>
              <input
                type="text"
                value={manualBankAccount}
                onChange={(e) => setManualBankAccount(e.target.value)}
                placeholder="Contoh: 1234567890"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">MANUAL_BANK_HOLDER (Atas Nama Rekening)</span>
              <input
                type="text"
                value={manualBankHolder}
                onChange={(e) => setManualBankHolder(e.target.value)}
                placeholder="Nama Pemilik / PT / CV"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-700">MANUAL_BILLING_WA (No. WA Admin Billing, format 628xxx)</span>
              <input
                type="text"
                value={manualBillingWa}
                onChange={(e) => setManualBillingWa(e.target.value)}
                placeholder="6281234567890"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#008C6F] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Rekening Transfer Manual Rp 0,-"}
          </button>
        </form>
      )}

      {/* TAB 3: PAYMENT GATEWAY OTOMATIS */}
      {tab === "gateway" && (
        <form
          onSubmit={(e) =>
            void handleSavePatch(e, {
              paymentProvider,
              ...(midtransServerKey ? { midtransServerKey } : {}),
              midtransIsProduction,
              ...(xenditSecretKey ? { xenditSecretKey } : {}),
              ...(xenditWebhookToken ? { xenditWebhookToken } : {}),
              ...(tripayApiKey ? { tripayApiKey } : {}),
              ...(tripayPrivateKey ? { tripayPrivateKey } : {}),
              ...(tripayMerchantCode ? { tripayMerchantCode } : {}),
              tripayIsProduction,
            })
          }
          className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 font-bold text-slate-800">
              <span>PAYMENT_PROVIDER Utama:</span>
              <select
                value={paymentProvider}
                onChange={(e) =>
                  setPaymentProvider(
                    e.target.value as "manual_transfer" | "midtrans" | "xendit" | "tripay",
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900"
              >
                <option value="manual_transfer">manual_transfer (Mode Rp 0,-)</option>
                <option value="midtrans">midtrans (Snap QRIS &amp; VA)</option>
                <option value="xendit">xendit (Invoice v2 QRIS &amp; VA)</option>
                <option value="tripay">tripay (Closed Payment QRIS &amp; VA)</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* Midtrans */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-extrabold text-slate-900">
                Midtrans Snap{" "}
                {cfg?.paymentGateway.midtransConfigured && (
                  <span className="text-emerald-700">✓ ({cfg.paymentGateway.midtransServerKeyMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={midtransServerKey}
                onChange={(e) => setMidtransServerKey(e.target.value)}
                placeholder="MIDTRANS_SERVER_KEY"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <label className="flex items-center gap-2 text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={midtransIsProduction}
                  onChange={(e) => setMidtransIsProduction(e.target.checked)}
                />
                MIDTRANS_IS_PRODUCTION=true
              </label>
              <button
                type="button"
                onClick={() =>
                  copyText("wh-mid", `${origin}/api/webhooks/payment?provider=midtrans`)
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:underline"
              >
                <Copy className="h-3 w-3" />
                {copiedId === "wh-mid" ? "URL Webhook Disalin!" : "Salin URL Webhook Midtrans"}
              </button>
            </div>

            {/* Xendit */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-extrabold text-slate-900">
                Xendit Invoice v2{" "}
                {cfg?.paymentGateway.xenditConfigured && (
                  <span className="text-emerald-700">✓ ({cfg.paymentGateway.xenditSecretKeyMasked})</span>
                )}
              </div>
              <input
                type="password"
                value={xenditSecretKey}
                onChange={(e) => setXenditSecretKey(e.target.value)}
                placeholder="XENDIT_SECRET_KEY"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <input
                type="password"
                value={xenditWebhookToken}
                onChange={(e) => setXenditWebhookToken(e.target.value)}
                placeholder="XENDIT_WEBHOOK_TOKEN"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() =>
                  copyText("wh-xnd", `${origin}/api/webhooks/payment?provider=xendit`)
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:underline"
              >
                <Copy className="h-3 w-3" />
                {copiedId === "wh-xnd" ? "URL Webhook Disalin!" : "Salin URL Webhook Xendit"}
              </button>
            </div>

            {/* Tripay */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-extrabold text-slate-900">
                Tripay{" "}
                {cfg?.paymentGateway.tripayConfigured && (
                  <span className="text-emerald-700">✓ ({cfg.paymentGateway.tripayMerchantCode})</span>
                )}
              </div>
              <input
                type="password"
                value={tripayApiKey}
                onChange={(e) => setTripayApiKey(e.target.value)}
                placeholder="TRIPAY_API_KEY"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <input
                type="password"
                value={tripayPrivateKey}
                onChange={(e) => setTripayPrivateKey(e.target.value)}
                placeholder="TRIPAY_PRIVATE_KEY"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <input
                type="text"
                value={tripayMerchantCode}
                onChange={(e) => setTripayMerchantCode(e.target.value)}
                placeholder="TRIPAY_MERCHANT_CODE"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-[11px]"
              />
              <label className="flex items-center gap-2 text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={tripayIsProduction}
                  onChange={(e) => setTripayIsProduction(e.target.checked)}
                />
                TRIPAY_IS_PRODUCTION=true
              </label>
              <button
                type="button"
                onClick={() =>
                  copyText("wh-trp", `${origin}/api/webhooks/payment?provider=tripay`)
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 hover:underline"
              >
                <Copy className="h-3 w-3" />
                {copiedId === "wh-trp" ? "URL Webhook Disalin!" : "Salin URL Webhook Tripay"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#008C6F] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan & Aktifkan Payment Gateway"}
          </button>
        </form>
      )}

      {/* TAB 4: CLOUDFLARE WORKERS RP 0 + ANDROID APK & PWA */}
      {tab === "cloudflare" && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                <Cloud className="h-4 w-4 text-orange-500" /> Migrasi Cloudflare Workers (Rp 0,- Boleh Komersial)
              </div>
              <p className="text-slate-600 leading-relaxed">
                File <code>wrangler.jsonc</code>, <code>open-next.config.ts</code>, dan GitHub Action{" "}
                <code>.github/workflows/deploy-cloudflare.yml</code> sudah siap di repositori. Cukup tambahkan{" "}
                <code>CLOUDFLARE_API_TOKEN</code> &amp; <code>CLOUDFLARE_ACCOUNT_ID</code> di GitHub Secrets, lalu jalankan workflow <strong>Deploy to Cloudflare Workers</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                <Smartphone className="h-4 w-4 text-emerald-600" /> Distribusi Android Rp 0,- (Signed APK v5.3.2 + PWA)
              </div>
              <p className="text-slate-600 leading-relaxed">
                Distribusi langsung melalui halaman{" "}
                <a href="/android" className="font-bold text-emerald-700 underline">/android</a>{" "}
                menyediakan <strong>Signed Release APK v5.3.2</strong> + instalasi <strong>PWA 1-Tap</strong> tanpa biaya Google Play Console $25.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                <Terminal className="h-3.5 w-3.5" /> Template Environment Variables Siap Tempel (.env / Vercel / Cloudflare)
              </span>
              <button
                type="button"
                onClick={() => copyText("env-block", envSnippet)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
              >
                <Copy className="h-3 w-3" />
                {copiedId === "env-block" ? "Disalin!" : "Salin Blok Env"}
              </button>
            </div>
            <pre className="max-h-56 overflow-auto rounded-xl bg-[#1B1B1B] p-3 font-mono text-[11px] text-[#00D4A8]">
              {envSnippet}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
