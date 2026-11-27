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
import { evaluatePasswordStrength } from "@/lib/security";

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
      saveTenantEdition("demo-workspace", acc.editionId);
      saveCommercialSession({
        userId: acc.id,
        email: acc.email,
        displayName: acc.displayName,
        businessName: acc.businessName,
        role: acc.role,
        editionId: acc.editionId,
        authProvider: "workspace_local",
        hasPaidLicense: false,
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <Link href="/" className="inline-flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="WACRM" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-extrabold tracking-tight text-white">WACRM</span>
        </Link>

        <h1 className="mt-6 text-2xl font-extrabold text-white">Buat akun WACRM</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Mulai workspace bisnis omnichannel Anda &amp; upgrade kapan saja via License Key resmi.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Nama lengkap
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap Anda"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>
          </label>

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
                placeholder="nama@perusahaan.id"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Kata sandi (minimal 12 karakter untuk Cloud Auth)
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kombinasi huruf besar, kecil & angka"
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

          {password.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Kekuatan Kata Sandi:</span>
                <span className={strength.score >= 3 ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
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
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                        : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-300">
            Konfirmasi kata sandi
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-11 text-sm text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Sembunyikan konfirmasi sandi" : "Lihat konfirmasi sandi"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            {busy ? "Membuat akun..." : "Daftar dan lanjutkan"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
          <span>
            Sudah punya akun?{" "}
            <Link href="/sign-in" className="font-bold text-emerald-400 hover:underline">
              Masuk
            </Link>
          </span>
          <Link href="/" className="font-semibold text-slate-300 hover:text-emerald-400">
            ← Portal Utama
          </Link>
        </div>
      </section>
    </main>
  );
}
