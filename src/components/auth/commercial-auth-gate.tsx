"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { WorkspaceApp } from "@/components/crm/workspace-app";
import {
  authenticateLocalCommercialAccount,
  clearCommercialSession,
  detectClientPlatform,
  loadCommercialSession,
  registerLocalCommercialAccount,
  resetLocalCommercialPassword,
  saveCommercialSession,
  TRIAL_DURATION_DAYS,
  type CommercialUserSession,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import { formatIdr } from "@/lib/crm-types";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { APP_EDITIONS, saveTenantEdition } from "@/lib/editions";
import { clearLegacyUnscopedLicenseStorage } from "@/lib/license-crypto";
import {
  authenticateWithBiometric,
  detectBiometricCapability,
  getLatestEnrolledBiometricProfile,
  type BiometricCapability,
  type EnrolledBiometricProfile,
} from "@/lib/biometric-auth";
import { evaluatePasswordStrength } from "@/lib/security";
import { loadStoreProfile, saveStoreProfile } from "@/lib/store-profile";

type AuthMode = "signin" | "signup" | "forgot";

const emptySubscribe = () => () => {};

export function CommercialAuthGate({
  initialMode = "signup",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const adapter = useMemo(() => createDemoWorkspaceAdapter(), []);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [session, setSession] = useState<CommercialUserSession | null>(() =>
    typeof window !== "undefined" ? loadCommercialSession() : null,
  );
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [dbReady, setDbReady] = useState<boolean>(false);

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Sign Up fields (Starter UMKM Gratis Selamanya / Trial 14h Growth Pro / Trial 7h Enterprise)
  const [regName, setRegName] = useState("");
  const [regBusiness, setRegBusiness] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("Kediri, Jawa Timur");
  const [regEdition, setRegEdition] = useState<"starter" | "pro" | "enterprise">("starter");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Forgot Password 2-step fields
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPreviewCode, setForgotPreviewCode] = useState<string | null>(null);
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [biometricCap, setBiometricCap] = useState<BiometricCapability | null>(null);
  const [enrolledBiometric, setEnrolledBiometric] = useState<EnrolledBiometricProfile | null>(null);

  useEffect(() => {
    let active = true;
    detectBiometricCapability()
      .then((cap) => {
        if (active) {
          setBiometricCap(cap);
          setEnrolledBiometric(getLatestEnrolledBiometricProfile());
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function handleBiometricSignIn() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await authenticateWithBiometric(loginEmail || undefined);
      if (!res.ok || !res.session) {
        setError(res.error || "Verifikasi biometrik gagal.");
        return;
      }
      activateSession(res.session);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { readyForLiveAuth?: boolean } | null) => {
        if (data) setDbReady(Boolean(data.readyForLiveAuth));
      })
      .catch(() => setDbReady(false));
  }, []);

  const regStrength = useMemo(() => evaluatePasswordStrength(regPassword), [regPassword]);
  const forgotStrength = useMemo(() => evaluatePasswordStrength(forgotNewPass), [forgotNewPass]);
  const clientPlatform = useMemo(
    () => (isClient ? detectClientPlatform() : "web"),
    [isClient],
  );

  function activateSession(next: CommercialUserSession) {
    const hasVerifiedPaidKey = Boolean(next.hasPaidLicense && next.licenseKey);
    const hasActiveTierTrial =
      !hasVerifiedPaidKey &&
      (next.editionId === "pro" || next.editionId === "enterprise") &&
      Boolean(next.trialEndsAt && Date.parse(next.trialEndsAt) > Date.now());
    const strictEdition = hasVerifiedPaidKey
      ? next.editionId
      : hasActiveTierTrial
        ? next.editionId
        : "starter";

    const normalizedSession: CommercialUserSession = {
      ...next,
      editionId: strictEdition,
      hasPaidLicense: hasVerifiedPaidKey,
    };
    if (!normalizedSession.hasPaidLicense) {
      clearLegacyUnscopedLicenseStorage(adapter.tenantId);
    }
    saveCommercialSession(normalizedSession);
    saveTenantEdition(adapter.tenantId, strictEdition);
    if (normalizedSession.businessName) {
      const store = loadStoreProfile(adapter.tenantId);
      saveStoreProfile(adapter.tenantId, {
        ...store,
        businessName: normalizedSession.businessName,
        email: normalizedSession.email,
        address: normalizedSession.city || store.address,
      });
    }
    setSession(normalizedSession);
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      if (!cleanEmail || !loginPassword) {
        setError("Masukkan email dan kata sandi Anda.");
        return;
      }

      // 1. Try Better Auth Neon Cloud Sign-In when database is configured
      if (dbReady) {
        try {
          const cloudRes = await authClient.signIn.email({
            email: cleanEmail,
            password: loginPassword,
          });
          if (!cloudRes.error && cloudRes.data?.user) {
            const now = new Date();
            const trialEnd = new Date(
              now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
            ).toISOString();
            const existingLocal = authenticateLocalCommercialAccount(cleanEmail, loginPassword).account;
            activateSession({
              userId: cloudRes.data.user.id,
              email: cloudRes.data.user.email,
              displayName: cloudRes.data.user.name || existingLocal?.displayName || cleanEmail.split("@")[0],
              businessName: existingLocal?.businessName || "Toko WACRM",
              role: existingLocal?.role || "owner",
              editionId: existingLocal?.editionId || "starter",
              authProvider: "cloud_neon",
              hasPaidLicense: existingLocal?.hasPaidLicense ?? false,
              licenseKey: existingLocal?.licenseKey ?? null,
              trialStartedAt: existingLocal?.trialStartedAt || now.toISOString(),
              trialEndsAt: existingLocal?.trialEndsAt || trialEnd,
              platform: clientPlatform,
              signedInAt: now.toISOString(),
            });
            return;
          }
        } catch {
          // Fall back cleanly to local commercial account auth
        }
      }

      // 2. Local registered commercial account auth
      const localRes = authenticateLocalCommercialAccount(cleanEmail, loginPassword);
      if (!localRes.ok || !localRes.account) {
        setError(localRes.error || "Email atau kata sandi tidak valid.");
        return;
      }

      activateSession({
        userId: localRes.account.id,
        email: localRes.account.email,
        displayName: localRes.account.displayName,
        businessName: localRes.account.businessName,
        city: localRes.account.city,
        role: localRes.account.role,
        editionId: localRes.account.editionId,
        authProvider: "workspace_local",
        hasPaidLicense: localRes.account.hasPaidLicense ?? false,
        licenseKey: localRes.account.licenseKey ?? null,
        trialEditionId: localRes.account.trialEditionId,
        usedTrialEditions: localRes.account.usedTrialEditions,
        trialStartedAt: localRes.account.trialStartedAt || localRes.account.createdAt,
        trialEndsAt: localRes.account.trialEndsAt,
        platform: clientPlatform,
        signedInAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (regName.trim().length < 2) {
      setError("Masukkan nama lengkap minimal 2 karakter.");
      return;
    }
    if (regBusiness.trim().length < 2) {
      setError("Masukkan nama toko / usaha Anda.");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (regStrength.score < 2) {
      setError("Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf & angka.");
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      const cleanName = regName.trim();
      const cleanBusiness = regBusiness.trim();
      const cleanPhone = regPhone.trim();
      const cleanCity = regCity.trim() || "Indonesia";

      // 1. Register local account (Starter UMKM Gratis Selamanya / Growth Pro 14d Trial / Enterprise 7d Trial)
      const localRes = registerLocalCommercialAccount({
        displayName: cleanName,
        businessName: cleanBusiness,
        phone: cleanPhone,
        city: cleanCity,
        email: cleanEmail,
        password: regPassword,
        platform: clientPlatform,
        editionId: regEdition,
      });

      if (!localRes.ok || !localRes.account) {
        setError(localRes.error || "Gagal mendaftarkan akun.");
        return;
      }

      // 2. Sync new user registration immediately to Neon PostgreSQL & WACRM Publisher HQ!
      let syncedTrialEndsAt = localRes.account.trialEndsAt;
      try {
        const regApiRes = await fetch("/api/auth/register-tenant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            fullName: cleanName,
            businessName: cleanBusiness,
            email: cleanEmail,
            phone: cleanPhone,
            city: cleanCity,
            platform: clientPlatform,
            editionId: regEdition,
          }),
        });
        if (regApiRes.ok) {
          const regData = (await regApiRes.json()) as { trialEndsAt?: string };
          if (regData.trialEndsAt && regEdition !== "starter") {
            syncedTrialEndsAt = regData.trialEndsAt;
          }
        }
      } catch {
        // Non-blocking fallback so user can still enter workspace immediately
      }

      // 3. Also sync to Neon Cloud Better Auth if live DB configured & password >= 12 chars
      let provider: "cloud_neon" | "workspace_local" = "workspace_local";
      if (dbReady && regPassword.length >= 12) {
        try {
          const cloud = await authClient.signUp.email({
            name: cleanName,
            email: cleanEmail,
            password: regPassword,
          });
          if (!cloud.error) {
            provider = "cloud_neon";
          }
        } catch {
          // Local + Neon tenant registration already succeeded
        }
      }

      activateSession({
        userId: localRes.account.id,
        email: localRes.account.email,
        displayName: localRes.account.displayName,
        businessName: localRes.account.businessName,
        city: cleanCity,
        role: "owner",
        editionId: localRes.account.editionId,
        authProvider: provider,
        hasPaidLicense: false,
        licenseKey: null,
        trialEditionId: localRes.account.trialEditionId,
        usedTrialEditions: localRes.account.usedTrialEditions,
        trialStartedAt: localRes.account.trialStartedAt,
        trialEndsAt: syncedTrialEndsAt,
        platform: clientPlatform,
        signedInAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotStep1(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", email: forgotEmail.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        verificationCodePreview?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal membuat kode verifikasi reset kata sandi.");
        return;
      }
      setForgotPreviewCode(data.verificationCodePreview ?? null);
      setNotice(data.message || "Kode 6 digit berhasil dibuat.");
      setForgotStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotStep2(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (forgotStrength.score < 2) {
      setError("Kata sandi baru terlalu lemah. Gunakan minimal 8 karakter dengan huruf & angka.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword: forgotNewPass,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Kode verifikasi salah atau kedaluwarsa.");
        return;
      }

      resetLocalCommercialPassword(forgotEmail.trim(), forgotNewPass);
      setNotice(data.message || "Kata sandi berhasil diperbarui! Silakan masuk dengan sandi baru.");
      setLoginEmail(forgotEmail.trim());
      setLoginPassword("");
      setForgotStep(1);
      setForgotCode("");
      setForgotNewPass("");
      setForgotPreviewCode(null);
      setMode("signin");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    clearCommercialSession();
    clearLegacyUnscopedLicenseStorage(adapter.tenantId);
    try {
      await authClient.signOut();
    } catch {
      // ignore if local session
    }
    setSession(null);
    setMode("signin");
    setNotice("Anda telah keluar dari sesi WACRM dengan aman.");
    router.refresh();
  }

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-xs text-slate-400">
        Memuat Portal Komersial WACRM...
      </main>
    );
  }

  if (session) {
    return (
      <WorkspaceApp
        key={session.userId || session.email}
        adapter={adapter}
        commercialUser={session}
        onCommercialSessionUpdate={(next) => {
          saveCommercialSession(next);
          setSession(next);
        }}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-12 lg:px-8">
        {/* LEFT COLUMN: Commercial Value Proposition + 14-Day UMKM Trial Info + Editions */}
        <section className="space-y-6 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              UMKM Gratis Selamanya · Trial 14h Growth Pro · Trial 7h Enterprise
            </span>
            {clientPlatform === "android" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <Smartphone className="h-3.5 w-3.5" /> Aplikasi Android WACRM
              </span>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Satu Aplikasi untuk CS AI Otomatis, POS QR, ERP &amp; Akuntansi
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Daftar akun email untuk menggunakan{" "}
              <strong>Starter UMKM Gratis Selamanya</strong> tanpa batas trial, atau coba gratis{" "}
              <strong>14 Hari Growth Pro</strong> &amp; <strong>7 Hari Enterprise AI Suite</strong>{" "}
              (termasuk Pemandu Suara AI 24/7 yang ramah). Berlaku di Web &amp; Aplikasi Android.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <MessageSquare className="h-4 w-4" /> Inbox AI + Auto Follow-Up &amp; Cross-Sell
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Saat prospek lambat merespons, AI otomatis menyapa ulang dengan sopan &amp;
                menawarkan produk katalog lain jika batal checkout.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <QrCode className="h-4 w-4" /> POS &amp; Label QR Terisi Otomatis
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Pelanggan kirim pesanan + alamat di chat, AI langsung mengisi Invoice POS, ongkir
                kurir &amp; Label QR siap cetak Bluetooth/USB/WiFi.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Package className="h-4 w-4" /> Master Data Card Picture &amp; Kurir Multi-Tarif
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Foto produk Card Picture, View detail Supplier lengkap, dan multi-tarif Kurir
                Ekspedisi yang langsung memperkaya kecerdasan AI.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Bot className="h-4 w-4" /> Studio SEO Simpel &amp; Upgrade License Key
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Cukup isi username FB, IG, TikTok, YouTube &amp; WA — konten SEO lintas kanal
                terbuat otomatis. Upgrade edisi instan dengan License Key.
              </p>
            </div>
          </div>

          {/* Transparent Editions & Revised Trial Matrix */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-white">
                <Crown className="h-4 w-4 text-amber-400" /> Paket Edisi &amp; Aturan Gratis / Trial
              </h2>
              <span className="text-[11px] font-semibold text-emerald-300">
                Aktivasi &amp; upgrade instan via License Key
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {APP_EDITIONS.map((ed) => (
                <div
                  key={ed.id}
                  className={`rounded-xl border p-3 text-xs ${
                    ed.id === "starter"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : ed.id === "pro"
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : ed.id === "enterprise"
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{ed.name}</span>
                    <span
                      className={`font-extrabold ${
                        ed.id === "starter"
                          ? "text-emerald-300"
                          : ed.id === "pro"
                            ? "text-cyan-300"
                            : ed.id === "enterprise"
                              ? "text-violet-300"
                              : "text-amber-300"
                      }`}
                    >
                      {ed.id === "starter"
                        ? "Gratis Selamanya"
                        : `${formatIdr(ed.monthlyPriceIdr)}/bln`}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{ed.tagline}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-300">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.limits.maxAgents < 0 ? "∞" : ed.limits.maxAgents} Agen
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.limits.maxContacts < 0 ? "∞" : ed.limits.maxContacts.toLocaleString("id-ID")} Kontak
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.id === "starter"
                        ? "Wajib Daftar · Tanpa Batas Trial"
                        : ed.id === "pro"
                          ? `Trial ${TRIAL_DURATION_DAYS} Hari`
                          : ed.id === "enterprise"
                            ? "Trial 7 Hari"
                            : "Khusus License Key"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Commercial Sign Up / Sign In / Forgot Password */}
        <section className="lg:col-span-5">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-xl py-2 transition ${
                  mode === "signup"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Daftar Gratis
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-xl py-2 transition ${
                  mode === "signin"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-xl py-2 transition ${
                  mode === "forgot"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Lupa Sandi
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-200">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-200">
                {notice}
              </div>
            )}

            {/* SIGN UP FORM */}
            {mode === "signup" && (
              <form onSubmit={(e) => void handleSignUp(e)} className="mt-5 space-y-3.5">
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    Daftar Starter UMKM Gratis / Trial Pro &amp; Enterprise
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Starter UMKM gratis selamanya (wajib daftar), atau pilih Trial {TRIAL_DURATION_DAYS} Hari Growth Pro / 7 Hari Enterprise AI di Web &amp; Android APK (mendukung Login Biometrik Sidik Jari/Face ID).
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Lengkap *
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Toko / Usaha *
                    <input
                      type="text"
                      required
                      value={regBusiness}
                      onChange={(e) => setRegBusiness(e.target.value)}
                      placeholder="Contoh: Toko Berkah Jaya"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Email Bisnis / Pribadi *
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@usahaanda.id"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    No. WhatsApp (Opsional)
                    <div className="relative mt-1">
                      <Phone className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-3 pl-9 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Kota / Daerah Usaha *
                  <input
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Contoh: Kediri, Jawa Timur / Jakarta / Bandung"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-300">
                    Pilih Paket Mulai Anda *
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    {(
                      [
                        { id: "starter", title: "Starter UMKM", sub: "Gratis Selamanya" },
                        { id: "pro", title: "Growth Pro", sub: "Trial 14 Hari" },
                        { id: "enterprise", title: "Enterprise AI", sub: "Trial 7 Hari" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRegEdition(opt.id)}
                        className={`rounded-xl border px-2 py-2 text-left transition ${
                          regEdition === opt.id
                            ? "border-emerald-400 bg-emerald-500/20 text-white"
                            : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <div className="font-extrabold">{opt.title}</div>
                        <div className="text-[10px] text-emerald-300">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Kata Sandi *
                  <div className="relative mt-1">
                    <input
                      type={showRegPass ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 8 karakter (huruf besar, angka & simbol)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-11 pl-3 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPass((v) => !v)}
                      aria-label={showRegPass ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute top-1.5 right-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regPassword.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((lvl) => (
                          <span
                            key={lvl}
                            className={`h-1.5 flex-1 rounded-full ${
                              regStrength.score >= lvl
                                ? regStrength.score >= 3
                                  ? "bg-emerald-500"
                                  : "bg-amber-400"
                                : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Kekuatan sandi:{" "}
                        <strong className="text-white">{regStrength.label}</strong>
                      </div>
                    </div>
                  )}
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Konfirmasi Kata Sandi *
                  <div className="relative mt-1">
                    <input
                      type={showRegConfirm ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-11 pl-3 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm((v) => !v)}
                      aria-label={showRegConfirm ? "Sembunyikan konfirmasi sandi" : "Lihat konfirmasi sandi"}
                      className="absolute top-1.5 right-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      {showRegConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {regEdition === "starter"
                      ? "Paket Pilihan: Starter UMKM — Gratis Selamanya (Tanpa Batas Trial)"
                      : regEdition === "pro"
                        ? `Paket Pilihan: Trial Gratis ${TRIAL_DURATION_DAYS} Hari Growth Pro`
                        : "Paket Pilihan: Trial Gratis 7 Hari Enterprise AI Suite (Full Suara 24/7)"}
                  </div>
                  <p className="mt-1 text-emerald-100/80">
                    {regEdition === "starter"
                      ? "Wajib daftar agar data usaha aman. Termasuk Inbox AI Dasar, POS QR, Master Data, FAQ AI & 2 Agen AI selamanya gratis."
                      : "Setelah masa trial selesai tanpa License Key, data usaha tetap aman & akun otomatis kembali ke Starter UMKM (Gratis Selamanya)."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 disabled:opacity-60"
                >
                  <UserPlus className="h-4 w-4" />
                  {busy
                    ? "Mendaftarkan Akun..."
                    : regEdition === "starter"
                      ? "Daftar Starter UMKM Gratis Selamanya"
                      : regEdition === "pro"
                        ? `Mulai Trial ${TRIAL_DURATION_DAYS} Hari Growth Pro`
                        : "Mulai Trial 7 Hari Enterprise AI"}
                </button>
              </form>
            )}

            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={(e) => void handleSignIn(e)} className="mt-5 space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Masuk ke Ruang Kerja WACRM</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Gunakan email yang sudah terdaftar untuk melanjutkan sesi Trial UMKM atau Lisensi aktif Anda.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Email Akun
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nama@usahaanda.id"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-3 pl-9 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Kata Sandi</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotEmail(loginEmail);
                        setError(null);
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
                    <input
                      type={showLoginPass ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-11 pl-9 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass((v) => !v)}
                      aria-label={showLoginPass ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute top-2 right-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 disabled:opacity-60"
                >
                  {busy ? "Memverifikasi Akun..." : "Masuk ke Aplikasi"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Biometric Login (Fingerprint / Face ID) */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleBiometricSignIn()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-extrabold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  <Fingerprint className="h-4 w-4 text-cyan-300" />
                  {enrolledBiometric
                    ? `Masuk Cepat Sidik Jari / Face ID (${enrolledBiometric.displayName})`
                    : biometricCap?.available
                      ? `Masuk dengan ${biometricCap.label}`
                      : "Masuk dengan Sidik Jari / Face Recognition"}
                </button>
                <p className="text-center text-[10px] text-slate-400">
                  {enrolledBiometric
                    ? `Biometrik aktif untuk ${enrolledBiometric.email} · 1 sentuhan tanpa ketik sandi`
                    : "Tips HP: Setelah login pertama, aktifkan Login Biometrik (Sidik Jari / Face ID) di menu Pengaturan."}
                </p>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center text-xs text-slate-400">
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                    className="font-bold text-emerald-400 hover:underline"
                  >
                    Daftar Starter UMKM Gratis Selamanya →
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD 2-STEP FLOW */}
            {mode === "forgot" && (
              <div className="mt-5 space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Reset Kata Sandi</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Verifikasi 2 langkah dengan kode OTP 6 digit sekali pakai (kedaluwarsa 15 menit).
                  </p>
                </div>

                {forgotStep === 1 ? (
                  <form onSubmit={(e) => void handleForgotStep1(e)} className="space-y-3.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Email Terdaftar
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nama@usahaanda.id"
                        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      {busy ? "Membuat Kode OTP..." : "Kirim Kode Verifikasi 6 Digit"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(e) => void handleForgotStep2(e)} className="space-y-3.5">
                    {forgotPreviewCode && (
                      <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-xs text-cyan-200">
                        <div className="font-bold">Kode Verifikasi OTP Anda:</div>
                        <div className="mt-1 font-mono text-lg font-extrabold tracking-widest text-white">
                          {forgotPreviewCode}
                        </div>
                        <div className="mt-0.5 text-[11px] text-cyan-200/80">
                          (Ditampilkan langsung karena SMTP eksternal belum dikonfigurasi di server)
                        </div>
                      </div>
                    )}

                    <label className="block text-xs font-semibold text-slate-300">
                      Kode OTP 6 Digit
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-base tracking-widest text-white outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-slate-300">
                      Kata Sandi Baru
                      <div className="relative mt-1">
                        <input
                          type={showForgotPass ? "text" : "password"}
                          required
                          minLength={8}
                          value={forgotNewPass}
                          onChange={(e) => setForgotNewPass(e.target.value)}
                          placeholder="Minimal 8 karakter kuat"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pr-11 pl-3 text-sm text-white outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPass((v) => !v)}
                          aria-label={showForgotPass ? "Sembunyikan sandi baru" : "Lihat sandi baru"}
                          className="absolute top-2 right-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          {showForgotPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {forgotNewPass.length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-400">
                          Kekuatan: <strong className="text-white">{forgotStrength.label}</strong>
                        </div>
                      )}
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {busy ? "Menyimpan Sandi..." : "Simpan Kata Sandi Baru"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Enkripsi SSL &amp; Proteksi Rate-Limit
              </span>
              <span className="font-mono text-slate-500">WACRM v4.2</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
