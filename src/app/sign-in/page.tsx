"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";
import {
  authenticateLocalCommercialAccount,
  resetLocalCommercialPassword,
  saveCommercialSession,
  upsertLocalCommercialAccountFromCloud,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import { saveTenantEdition } from "@/lib/editions";
import { clearLegacyUnscopedLicenseStorage } from "@/lib/license-crypto";
import { evaluatePasswordStrength } from "@/lib/security";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  // Forgot Password inline state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "confirm">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotCodePreview, setForgotCodePreview] = useState<string | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { readyForLiveAuth?: boolean } | null) => {
        if (data) setDbReady(Boolean(data.readyForLiveAuth));
      })
      .catch(() => setDbReady(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Allow signing into commercial trial/local accounts too
      const localRes = authenticateLocalCommercialAccount(normalizedEmail, password);
      if (localRes.ok && localRes.account) {
        const acc = localRes.account;
        const hasVerifiedKey = Boolean(acc.hasPaidLicense && acc.licenseKey);
        const strictEdition = hasVerifiedKey ? acc.editionId : "starter";
        if (!hasVerifiedKey) {
          clearLegacyUnscopedLicenseStorage("demo-workspace");
        }
        saveTenantEdition("demo-workspace", strictEdition);
        saveCommercialSession({
          userId: acc.id,
          email: acc.email,
          displayName: acc.displayName,
          businessName: acc.businessName,
          role: acc.role,
          editionId: strictEdition,
          authProvider: "workspace_local",
          hasPaidLicense: hasVerifiedKey,
          trialStartedAt: acc.trialStartedAt,
          trialEndsAt: acc.trialEndsAt,
          platform: acc.platform,
          licenseKey: hasVerifiedKey ? acc.licenseKey : null,
          signedInAt: new Date().toISOString(),
        });
        router.replace("/");
        return;
      }

      // Check Neon Commercial Tenant Registry too (works across devices / cleared cache)
      try {
        const commRes = await fetch("/api/auth/commercial-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        if (commRes.ok) {
          const commData = (await commRes.json()) as {
            ok?: boolean;
            tenant?: {
              id: string;
              fullName: string;
              businessName: string;
              email: string;
              city?: string;
              editionId: "starter" | "pro" | "enterprise" | "sovereign";
              licenseStatus: string;
              licenseKey?: string | null;
              trialStartedAt?: string;
              trialEndsAt?: string;
            };
          };
          if (commData.ok && commData.tenant) {
            const t = commData.tenant;
            const hasPaid = Boolean(t.licenseKey && t.licenseStatus === "active");
            const strictEdition = hasPaid ? t.editionId : t.editionId === "sovereign" ? "starter" : t.editionId;
            upsertLocalCommercialAccountFromCloud({
              id: t.id,
              email: t.email,
              password,
              displayName: t.fullName,
              businessName: t.businessName,
              city: t.city,
              editionId: strictEdition,
              hasPaidLicense: hasPaid,
              licenseKey: t.licenseKey ?? null,
              trialStartedAt: t.trialStartedAt,
              trialEndsAt: t.trialEndsAt,
            });
            saveTenantEdition("demo-workspace", strictEdition);
            saveCommercialSession({
              userId: t.id,
              email: t.email,
              displayName: t.fullName,
              businessName: t.businessName,
              city: t.city,
              role: "owner",
              editionId: strictEdition,
              authProvider: "cloud_neon",
              hasPaidLicense: hasPaid,
              licenseKey: t.licenseKey ?? null,
              trialStartedAt: t.trialStartedAt,
              trialEndsAt: t.trialEndsAt,
              signedInAt: new Date().toISOString(),
            });
            router.replace("/");
            return;
          }
        }
      } catch {
        // continue to Better Auth below
      }

      const result = await authClient.signIn.email({ email: normalizedEmail, password });
      if (result.error) {
        setError(
          result.error.status === 503
            ? "Database Neon belum aktif di server ini. Lengkapi DATABASE_URL di Vercel atau masuk melalui Portal Komersial di Beranda."
            : "Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.",
        );
        return;
      }
      const callback = new URLSearchParams(window.location.search).get("callbackURL");
      router.replace(callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/dashboard");
      router.refresh();
    } catch {
      setError("Koneksi server gagal. Periksa koneksi jaringan atau status database Neon.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: forgotEmail.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        verificationCodePreview?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal meminta kode reset kata sandi.");
        return;
      }
      setForgotCodePreview(data.verificationCodePreview ?? null);
      setNotice(data.message || "Kode verifikasi 6 digit berhasil dibuat.");
      setForgotStep("confirm");
    } catch {
      setError("Tidak dapat menghubungi layanan reset kata sandi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotConfirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Kode verifikasi tidak valid.");
        return;
      }
      resetLocalCommercialPassword(forgotEmail.trim(), forgotNewPassword);
      setEmail(forgotEmail.trim());
      setPassword("");
      setShowForgot(false);
      setForgotStep("request");
      setForgotCode("");
      setForgotCodePreview(null);
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setNotice(data.message || "Kata sandi berhasil diperbarui! Silakan masuk kembali.");
    } catch {
      setError("Gagal memperbarui kata sandi.");
    } finally {
      setBusy(false);
    }
  }

  const forgotStrength = evaluatePasswordStrength(forgotNewPassword);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <Link href="/" className="inline-flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="WACRM" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-extrabold tracking-tight text-white">WACRM</span>
        </Link>

        {!showForgot ? (
          <>
            <h1 className="mt-6 text-2xl font-extrabold text-white">Masuk ke ruang kerja</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Kelola percakapan omnichannel AI, Master Data, POS QR &amp; hak akses sesuai Edisi aktif.
            </p>

            {dbReady === false && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <p className="flex items-center gap-1.5 font-bold">
                  <Database className="h-4 w-4 text-amber-400" />
                  Mode Portal Komersial Aktif
                </p>
                <p className="mt-1 leading-relaxed text-amber-200/80">
                  Anda dapat masuk langsung menggunakan akun komersial atau menautkan <code className="font-mono">DATABASE_URL</code> Neon di Vercel untuk sinkronisasi cloud multi-perangkat.
                </p>
              </div>
            )}

            {notice && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs font-medium text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{notice}</span>
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-slate-300">
                Email
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@wacrm.id"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </label>

              <label className="block text-xs font-semibold text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Kata sandi</span>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgot(true);
                      setError("");
                      setNotice("");
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-11 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/15 p-3 text-xs font-medium text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </p>
              )}

              <button
                disabled={busy}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? "Memeriksa..." : "Masuk"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-extrabold text-white">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                Lupa Password
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                {forgotStep === "request"
                  ? "Masukkan email terdaftar Anda untuk menerima kode verifikasi 6 digit (berlaku 15 menit)."
                  : "Masukkan kode verifikasi 6 digit beserta kata sandi baru Anda."}
              </p>
            </div>

            {notice && (
              <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{notice}</span>
              </p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/15 p-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </p>
            )}

            {forgotStep === "request" ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Terdaftar
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="owner@wacrm.id"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {busy ? "Mengirim..." : "Kirim Kode Verifikasi"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotConfirm} className="space-y-3.5">
                {forgotCodePreview && (
                  <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 p-3 text-xs text-cyan-200">
                    <div>Kode Verifikasi (Pratinjau Non-SMTP):</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-lg font-black tracking-widest text-white">
                        {forgotCodePreview}
                      </span>
                      <button
                        type="button"
                        onClick={() => setForgotCode(forgotCodePreview)}
                        className="rounded-lg bg-cyan-400 px-2.5 py-1 text-[11px] font-bold text-slate-950"
                      >
                        Isi Otomatis
                      </button>
                    </div>
                  </div>
                )}

                <label className="block text-xs font-semibold text-slate-300">
                  Kode Verifikasi 6 Digit
                  <input
                    required
                    pattern="\d{6}"
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-base tracking-widest text-white"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Kata Sandi Baru
                  <div className="relative mt-1">
                    <input
                      type={showForgotPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter kuat"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-3 pr-10 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword((v) => !v)}
                      aria-label={showForgotPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                    >
                      {showForgotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {forgotNewPassword.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Kekuatan sandi:{" "}
                    <strong className={forgotStrength.score >= 3 ? "text-emerald-400" : "text-amber-400"}>
                      {forgotStrength.label}
                    </strong>
                  </p>
                )}

                <label className="block text-xs font-semibold text-slate-300">
                  Konfirmasi Kata Sandi Baru
                  <input
                    type={showForgotPassword ? "text" : "password"}
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep("request")}
                    className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {busy ? "Menyimpan..." : "Simpan Kata Sandi"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
          <span>
            Belum punya akun?{" "}
            <Link href="/sign-up" className="font-bold text-emerald-400 hover:underline">
              Daftar
            </Link>
          </span>
          <Link href="/" className="font-semibold text-slate-300 hover:text-emerald-400">
            ← Portal Utama
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
          <Link href="/privacy" className="hover:text-emerald-400">Kebijakan Privasi (UU PDP)</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-emerald-400">Syarat &amp; Ketentuan</Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-emerald-400">Refund</Link>
        </div>
      </section>
    </main>
  );
}
