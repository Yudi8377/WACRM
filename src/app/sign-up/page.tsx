"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import {
  detectClientPlatform,
  registerLocalCommercialAccount,
  saveCommercialSession,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import { saveTenantEdition } from "@/lib/editions";
import { clearLegacyUnscopedLicenseStorage } from "@/lib/license-crypto";
import { evaluatePasswordStrength } from "@/lib/security";
import { CorporateFooter, CorporateNavbar } from "@/components/brand-chrome";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { readyForLiveAuth?: boolean } | null) => {
        if (data) setDbReady(Boolean(data.readyForLiveAuth));
      })
      .catch(() => setDbReady(null));
  }, []);

  const strength = evaluatePasswordStrength(password);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      setBusy(false);
      return;
    }

    if (strength.score < 2) {
      setError("Kata sandi terlalu lemah. Gunakan minimal 8–12 karakter dengan huruf besar, huruf kecil, dan angka.");
      setBusy(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const platform = detectClientPlatform();

      // Always register into Neon PostgreSQL + push to Publisher HQ
      let syncedTrialEndsAt: string | undefined;
      try {
        const regApiRes = await fetch("/api/auth/register-tenant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fullName: cleanName,
            businessName: `Usaha ${cleanName}`,
            email: cleanEmail,
            platform,
          }),
        });
        if (regApiRes.ok) {
          const regData = (await regApiRes.json()) as { trialEndsAt?: string };
          syncedTrialEndsAt = regData.trialEndsAt;
        }
      } catch {
        // non-blocking
      }

      if (dbReady && password.length >= 12) {
        const result = await authClient.signUp.email({
          name: cleanName,
          email: cleanEmail,
          password,
        });
        if (!result.error) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      }

      const localReg = registerLocalCommercialAccount({
        displayName: cleanName,
        email: cleanEmail,
        password,
        businessName: `Usaha ${cleanName}`,
        platform,
        editionId: "starter",
      });
      if (!localReg.ok || !localReg.account) {
        setError(localReg.error ?? "Gagal membuat akun baru.");
        return;
      }
      const acc = localReg.account;
      clearLegacyUnscopedLicenseStorage("demo-workspace");
      saveTenantEdition("demo-workspace", "starter");
      saveCommercialSession({
        userId: acc.id,
        email: acc.email,
        displayName: acc.displayName,
        businessName: acc.businessName,
        role: acc.role,
        editionId: "starter",
        authProvider: "workspace_local",
        hasPaidLicense: false,
        licenseKey: null,
        trialStartedAt: acc.trialStartedAt,
        trialEndsAt: syncedTrialEndsAt || acc.trialEndsAt,
        platform,
        signedInAt: new Date().toISOString(),
      });
      router.replace("/");
    } catch {
      setError("Koneksi server gagal. Periksa koneksi jaringan Anda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#444444]">
      <CorporateNavbar activeHref="/sign-up" />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="made-fade-in w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-[#222222] px-6 py-4 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-[#00A885] font-heading text-xs font-extrabold text-white">
                W
              </span>
              <span className="font-heading text-sm font-extrabold tracking-tight">
                WACRM<span className="text-[#00A885]">.</span> Daftar Akun
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D4A8]">
              Gratis Selamanya
            </span>
          </div>

          <div className="p-7">
            <h1 className="font-heading text-2xl font-extrabold text-[#222222]">
              Daftar Starter UMKM Gratis Selamanya
            </h1>
            <p className="mt-1.5 text-sm text-[#666666]">
              Gratis tanpa batas trial untuk Starter UMKM, atau aktifkan Trial 14 Hari Growth Pro &amp; Trial 7 Hari Enterprise di dalam aplikasi.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-[#333333]">
                Nama lengkap
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="made-input !pl-9"
                  />
                </div>
              </label>

              <label className="block text-xs font-semibold text-[#333333]">
                Email
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.id"
                    className="made-input !pl-9"
                  />
                </div>
              </label>

              <label className="block text-xs font-semibold text-[#333333]">
                Kata sandi (minimal 12 karakter untuk Cloud Auth)
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kombinasi huruf besar, kecil & angka"
                    className="made-input !pl-9 !pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#797979] hover:bg-zinc-100 hover:text-[#222222]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {password.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-[#F5F5F5] p-2.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Kekuatan Kata Sandi:</span>
                    <span className={strength.score >= 3 ? "font-bold text-[#00A885]" : "font-bold text-amber-600"}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 rounded-full ${
                          strength.score >= lvl
                            ? strength.score >= 3
                              ? "bg-[#00A885]"
                              : "bg-amber-400"
                            : "bg-zinc-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <label className="block text-xs font-semibold text-[#333333]">
                Konfirmasi kata sandi
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888888]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className="made-input !pl-9 !pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Sembunyikan konfirmasi sandi" : "Lihat konfirmasi sandi"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#797979] hover:bg-zinc-100 hover:text-[#222222]"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </p>
              )}

              <button
                disabled={busy}
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded bg-[#00A885] py-3 font-heading text-xs font-extrabold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008C6F] disabled:opacity-50"
              >
                {busy ? "Membuat akun..." : "Daftar dan lanjutkan"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 text-xs text-[#666666]">
              <span>
                Sudah punya akun?{" "}
                <Link href="/sign-in" className="font-bold text-[#00A885] hover:underline">
                  Masuk
                </Link>
              </span>
              <Link href="/" className="font-semibold text-[#444444] hover:text-[#00A885]">
                ← Portal Utama
              </Link>
            </div>
          </div>
        </section>
      </main>

      <CorporateFooter />
    </div>
  );
}
