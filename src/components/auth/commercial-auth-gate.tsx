"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Mail,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  User,
} from "lucide-react";
import { WorkspaceApp } from "@/components/crm/workspace-app";
import {
  authenticateLocalCommercialAccount,
  clearCommercialSession,
  COMMERCIAL_DEMO_ACCOUNTS,
  loadCommercialSession,
  registerLocalCommercialAccount,
  resetLocalCommercialPassword,
  saveCommercialSession,
  type CommercialUserSession,
} from "@/lib/access-control";
import { authClient } from "@/lib/auth-client";
import { formatIdr, type AppEditionId } from "@/lib/crm-types";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { APP_EDITIONS, loadTenantEdition, saveTenantEdition } from "@/lib/editions";
import { evaluatePasswordStrength } from "@/lib/security";

type AuthMode = "signin" | "signup" | "forgot";

const ROLE_LABELS: Record<CommercialUserSession["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  supervisor: "Supervisor",
  agent: "Agen CS / Kasir",
  viewer: "Viewer",
};

const emptySubscribe = () => () => {};

export function CommercialAuthGate({
  initialMode = "signin",
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up fields
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [signupEdition, setSignupEdition] = useState<AppEditionId>("starter");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password fields
  const [forgotStep, setForgotStep] = useState<"request" | "confirm">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotCodePreview, setForgotCodePreview] = useState<string | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetch("/api/system/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { readyForLiveAuth?: boolean } | null) => {
        if (data) setDbReady(Boolean(data.readyForLiveAuth));
      })
      .catch(() => setDbReady(false));
  }, []);

  const activePasswordForMeter = mode === "signup" ? password : forgotNewPassword;
  const pwdStrength = useMemo(
    () => evaluatePasswordStrength(activePasswordForMeter),
    [activePasswordForMeter],
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setSuccessMsg("");
    if (next === "forgot") {
      setForgotStep("request");
      setForgotCode("");
      setForgotCodePreview(null);
      setForgotEmail(email);
    }
  }

  function enterCommercialSession(nextSession: CommercialUserSession) {
    saveCommercialSession(nextSession);
    const currentTenantEd = loadTenantEdition(adapter.tenantId);
    if (nextSession.authProvider === "workspace_local" || !currentTenantEd) {
      saveTenantEdition(adapter.tenantId, nextSession.editionId);
    }
    setSession(nextSession);
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMsg("");

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Check Commercial Account / Demo Edition Account first so instant commercial accounts always work cleanly
      const localCheck = authenticateLocalCommercialAccount(normalizedEmail, password);
      if (localCheck.ok && localCheck.account) {
        const acc = localCheck.account;
        saveTenantEdition(adapter.tenantId, acc.editionId);
        enterCommercialSession({
          userId: acc.id,
          email: acc.email,
          displayName: acc.displayName,
          businessName: acc.businessName,
          role: acc.role,
          editionId: acc.editionId,
          authProvider: "workspace_local",
          signedInAt: new Date().toISOString(),
        });
        return;
      }

      // 2. If Neon Cloud Better Auth is configured, attempt real Cloud Auth login
      if (dbReady) {
        const res = await authClient.signIn.email({
          email: normalizedEmail,
          password,
        });
        if (!res.error) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      }

      setError(localCheck.error ?? "Email atau kata sandi tidak cocok.");
    } catch {
      setError("Koneksi server gagal. Periksa jaringan Anda lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      setBusy(false);
      return;
    }

    const strength = evaluatePasswordStrength(password);
    if (strength.score < 2) {
      setError("Kata sandi terlalu lemah. Gunakan minimal 8–12 karakter kombinasi huruf besar, huruf kecil, dan angka.");
      setBusy(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Also register in Neon Better Auth when configured & password >= 12 chars
      if (dbReady && password.length >= 12) {
        const cloudRes = await authClient.signUp.email({
          name: fullName.trim(),
          email: normalizedEmail,
          password,
        });
        if (!cloudRes.error) {
          saveTenantEdition(adapter.tenantId, signupEdition);
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      }

      const localReg = registerLocalCommercialAccount({
        displayName: fullName.trim(),
        email: normalizedEmail,
        password,
        businessName: companyName.trim() || "Toko WACRM Saya",
        editionId: signupEdition,
      });
      if (!localReg.ok || !localReg.account) {
        setError(localReg.error ?? "Gagal mendaftarkan akun.");
        return;
      }
      const acc = localReg.account;
      saveTenantEdition(adapter.tenantId, acc.editionId);
      enterCommercialSession({
        userId: acc.id,
        email: acc.email,
        displayName: acc.displayName,
        businessName: acc.businessName,
        role: acc.role,
        editionId: acc.editionId,
        authProvider: "workspace_local",
        signedInAt: new Date().toISOString(),
      });
    } catch {
      setError("Gagal membuat akun. Silakan coba beberapa saat lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMsg("");
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
        setError(data.error || "Gagal memproses permintaan reset kata sandi.");
        return;
      }
      setForgotCodePreview(data.verificationCodePreview ?? null);
      setSuccessMsg(data.message || "Kode verifikasi 6 digit telah dikirim.");
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
    setSuccessMsg("");

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

      // Sync reset into local commercial account store as well
      resetLocalCommercialPassword(forgotEmail.trim(), forgotNewPassword);

      setEmail(forgotEmail.trim());
      setPassword("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotCode("");
      setForgotCodePreview(null);
      setMode("signin");
      setSuccessMsg(
        data.message || "Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.",
      );
    } catch {
      setError("Gagal menyelesaikan reset kata sandi.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuickDemoLogin(demoAcc: (typeof COMMERCIAL_DEMO_ACCOUNTS)[number]) {
    saveTenantEdition(adapter.tenantId, demoAcc.editionId);
    enterCommercialSession({
      userId: `demo-${demoAcc.editionId}-${demoAcc.role}`,
      displayName: demoAcc.displayName,
      email: demoAcc.email,
      businessName: demoAcc.businessName,
      role: demoAcc.role,
      editionId: demoAcc.editionId,
      signedInAt: new Date().toISOString(),
      authProvider: "workspace_local",
    });
  }

  async function handleSignOut() {
    clearCommercialSession();
    setSession(null);
    setPassword("");
    setError("");
    setSuccessMsg("Anda telah keluar (Sign Out) dengan aman dari workspace WACRM.");
    if (dbReady) {
      await authClient.signOut().catch(() => undefined);
    }
  }

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-xs text-slate-400">
        Memuat Portal Komersial WACRM...
      </main>
    );
  }

  // Active signed-in commercial session -> Render full WorkspaceApp with Sign Out & Edition/Role Enforcement
  if (session) {
    return (
      <WorkspaceApp
        adapter={adapter}
        commercialUser={session}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* COMMERCIAL TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 md:px-6">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WACRM" className="h-9 w-9 rounded-xl shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">WACRM</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/40">
                  Commercial v4.2
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Omnichannel CRM, Multi-Agent AI, POS QR, ERP &amp; Akuntansi
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-xs">
            <Link
              href="/katalog"
              className="hidden rounded-xl border border-slate-800 px-3 py-2 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white md:inline-flex"
            >
              Katalog Publik
            </Link>
            <Link
              href="/android"
              className="hidden items-center gap-1.5 rounded-xl border border-slate-800 px-3 py-2 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white sm:inline-flex"
            >
              <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
              Android APK
            </Link>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`rounded-xl px-3.5 py-2 font-bold transition ${
                mode === "signin"
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:bg-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-xl px-3.5 py-2 font-bold transition ${
                mode === "signup"
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:bg-slate-900"
              }`}
            >
              Daftar
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN COMMERCIAL LANDING + AUTH GRID */}
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 lg:grid-cols-12 lg:items-start lg:py-12">
        {/* LEFT COLUMN: Commercial Value Proposition + Editions Matrix */}
        <section className="space-y-6 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Platform Bisnis Komersial Siap Produksi · Lisensi &amp; Hak Akses Terverifikasi
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Satu Aplikasi untuk{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              CS AI Otomatis, POS QR, ERP &amp; Akuntansi
            </span>
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Balas chat WhatsApp/Instagram/TikTok otomatis dengan AI Sales yang proaktif mem-follow-up prospek lambat &amp; menawarkan produk alternatif, ekstrak checkout + alamat pelanggan langsung ke <strong>POS &amp; Label QR</strong>, kelola <strong>Master Data Barang (Card Picture)</strong>, Supplier &amp; tarif kurir, hingga laporan laba rugi otomatis.
          </p>

          {/* 4 Commercial Highlight Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Bot className="h-4 w-4" />
                <span className="text-xs font-bold">Inbox AI + Auto Follow-Up &amp; Cross-Sell</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Saat prospek lambat merespons, AI otomatis menyapa ulang dengan sopan &amp; menawarkan produk katalog lain jika batal checkout.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <QrCode className="h-4 w-4" />
                <span className="text-xs font-bold">POS &amp; Label QR Terisi Otomatis</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Pelanggan kirim pesanan + alamat di chat, Multi-Agent AI langsung mengisi Invoice POS, ongkir &amp; Label QR siap cetak.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Truck className="h-4 w-4" />
                <span className="text-xs font-bold">Master Data + Card Picture &amp; Logistik AI</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Foto produk Card Picture, View detail Supplier lengkap, dan multi-tarif Kurir Ekspedisi yang memperkaya kecerdasan AI.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4">
              <div className="flex items-center gap-2 text-violet-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold">Hak Akses Sesuai Edisi &amp; License Key</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Modul, kuota produk/agen/kanal, dan RBAC terkunci presisi mengikuti langganan aktif &amp; aktivasi License Key resmi WACRM.
              </p>
            </div>
          </div>

          {/* LIVE EDITIONS & SUBSCRIPTION RIGHTS OVERVIEW */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Edisi Langganan, Kuota &amp; Hak Akses WACRM
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                Aktivasi &amp; upgrade instan via License Key
              </span>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {APP_EDITIONS.map((ed) => (
                <div
                  key={ed.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ed.name}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {ed.monthlyPriceIdr === 0 ? "Gratis" : `${formatIdr(ed.monthlyPriceIdr)}/bln`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{ed.tagline}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-300">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.limits.maxAgents < 0 ? "∞ Agen" : `${ed.limits.maxAgents} Agen`}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.limits.maxContacts < 0 ? "∞ Kontak" : `${ed.limits.maxContacts.toLocaleString("id-ID")} Kontak`}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5">
                      {ed.limits.maxChannels < 0 ? "∞ Kanal" : `${ed.limits.maxChannels} Kanal`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: COMMERCIAL AUTH CARD (SIGN IN / SIGN UP / FORGOT PASSWORD) */}
        <section className="lg:col-span-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/50 sm:p-7">
            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-950 p-1 text-xs">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-xl py-2 font-bold transition ${
                  mode === "signin"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-xl py-2 font-bold transition ${
                  mode === "signup"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Daftar Akun
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className={`rounded-xl py-2 font-bold transition ${
                  mode === "forgot"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Lupa Sandi
              </button>
            </div>

            {successMsg && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs text-emerald-200"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="mt-5 space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Masuk ke Ruang Kerja WACRM</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Hak akses modul &amp; kuota aktif otomatis mengikuti paket langganan akun Anda.
                  </p>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Email Akun
                  <div className="relative mt-1.5">
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
                    <span>Kata Sandi</span>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
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
                      title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy ? "Memverifikasi Kredensial..." : "Masuk ke Aplikasi"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Commercial Instant Trial Access Matrix (Per Edition & Role) */}
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Uji Coba Langsung Sesuai Edisi &amp; Hak Akses
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Pilih akun uji untuk melihat perbedaan modul, kuota &amp; proteksi lisensi secara nyata:
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {COMMERCIAL_DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleQuickDemoLogin(acc)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-left text-xs transition hover:border-emerald-500/50 hover:bg-slate-900"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span>{acc.displayName}</span>
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                              {acc.editionId}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {ROLE_LABELS[acc.role]}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-slate-400">
                            {acc.email} · {acc.badge}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-emerald-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="mt-5 space-y-3.5">
                <div>
                  <h2 className="text-lg font-extrabold text-white">Buat Akun Bisnis WACRM</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Daftar gratis &amp; aktifkan License Key kapan saja untuk memperluas kuota dan modul AI.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Lengkap *
                    <div className="relative mt-1">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        required
                        minLength={2}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Budi Santoso"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">
                    Nama Toko / Bisnis *
                    <div className="relative mt-1">
                      <Store className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                      <input
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Toko Kopi Nusantara"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </label>
                </div>

                <label className="block text-xs font-semibold text-slate-300">
                  Email Bisnis *
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@tokosaya.id"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Edisi Awal (Dapat Diupgrade via License Key)
                  <select
                    value={signupEdition}
                    onChange={(e) => setSignupEdition(e.target.value as AppEditionId)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    {APP_EDITIONS.map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.name} — {ed.monthlyPriceIdr === 0 ? "Gratis" : `${formatIdr(ed.monthlyPriceIdr)}/bln`} ({ed.limits.maxAgents < 0 ? "Unlimited" : ed.limits.maxAgents} Agen)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold text-slate-300">
                  Kata Sandi *
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 karakter (huruf besar, kecil & angka)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-10 text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {password.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kekuatan Kata Sandi:</span>
                      <span
                        className={`font-bold ${
                          pwdStrength.score >= 3
                            ? "text-emerald-400"
                            : pwdStrength.score === 2
                              ? "text-amber-400"
                              : "text-rose-400"
                        }`}
                      >
                        {pwdStrength.label}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 rounded-full ${
                            pwdStrength.score >= lvl
                              ? pwdStrength.score >= 3
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
                  Konfirmasi Kata Sandi *
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-10 text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Sembunyikan konfirmasi sandi" : "Lihat konfirmasi sandi"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy ? "Membuat Akun..." : "Daftar & Buka Workspace"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD 2-STEP FLOW */}
            {mode === "forgot" && (
              <div className="mt-5 space-y-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                    <KeyRound className="h-5 w-5 text-emerald-400" />
                    Reset Kata Sandi (Lupa Password)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {forgotStep === "request"
                      ? "Masukkan email akun Anda untuk menerima kode verifikasi 6 digit sekali pakai (berlaku 15 menit)."
                      : "Masukkan kode verifikasi 6 digit dan buat kata sandi baru yang kuat."}
                  </p>
                </div>

                {forgotStep === "request" ? (
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <label className="block text-xs font-semibold text-slate-300">
                      Email Terdaftar
                      <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="owner@wacrm.id"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {busy ? "Mengirim Kode..." : "Kirim Kode Verifikasi 6 Digit"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotConfirm} className="space-y-3.5">
                    {forgotCodePreview && (
                      <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 p-3 text-xs text-cyan-200">
                        <div className="font-bold">Kode Verifikasi Anda (Mode Pratinjau Non-SMTP):</div>
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
                      Kode Verifikasi 6 Digit *
                      <input
                        required
                        pattern="\d{6}"
                        maxLength={6}
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-base tracking-widest text-white outline-none focus:border-emerald-500"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-slate-300">
                      Kata Sandi Baru *
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <input
                          type={showForgotPassword ? "text" : "password"}
                          required
                          minLength={8}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Kata sandi baru (min 8 karakter)"
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-10 text-xs text-white outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword((v) => !v)}
                          aria-label={showForgotPassword ? "Sembunyikan sandi baru" : "Lihat sandi baru"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"
                        >
                          {showForgotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </label>

                    {forgotNewPassword.length > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Kekuatan Sandi:</span>
                        <span className={pwdStrength.score >= 3 ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
                          {pwdStrength.label}
                        </span>
                      </div>
                    )}

                    <label className="block text-xs font-semibold text-slate-300">
                      Konfirmasi Kata Sandi Baru *
                      <input
                        type={showForgotPassword ? "text" : "password"}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep("request")}
                        className="rounded-xl border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        Kembali
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {busy ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
