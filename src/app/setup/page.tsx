"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, Database, ExternalLink, RefreshCw, ShieldCheck, Terminal, XCircle } from "lucide-react";
import { CommercialActivationConsole } from "@/components/commercial-activation-console";
import { CorporateFooter, CorporateNavbar } from "@/components/brand-chrome";

interface SystemStatusResponse {
  neon: {
    projectId: string;
    branchId: string;
    region: string;
    consoleUrl: string;
  };
  checks: {
    databaseConfigured: boolean;
    databaseConnected: boolean;
    authSecretConfigured: boolean;
    encryptionKeyConfigured: boolean;
    metaConfigured: boolean;
    schemaTablesCount: number;
    rlsEnabledTablesCount: number;
  };
  readyForLiveAuth: boolean;
}

export default function SetupPage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [sqlText, setSqlText] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  async function fetchSetupData() {
    const [statusRes, sqlRes] = await Promise.all([
      fetch("/api/system/status", { cache: "no-store" }),
      fetch("/api/system/sql", { cache: "no-store" }),
    ]);
    const nextStatus = statusRes.ok ? ((await statusRes.json()) as SystemStatusResponse) : null;
    const nextSql = sqlRes.ok ? await sqlRes.text() : "";
    return { nextStatus, nextSql };
  }

  async function loadStatus() {
    setLoading(true);
    try {
      const { nextStatus, nextSql } = await fetchSetupData();
      if (nextStatus) setStatus(nextStatus);
      if (nextSql) setSqlText(nextSql);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchSetupData()
      .then(({ nextStatus, nextSql }) => {
        if (!active) return;
        if (nextStatus) setStatus(nextStatus);
        if (nextSql) setSqlText(nextSql);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function copySql() {
    if (!sqlText) return;
    navigator.clipboard?.writeText(sqlText).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  }

  const checkRows = status
    ? [
        {
          label: "DATABASE_URL / POSTGRES_URL dikonfigurasi",
          ok: status.checks.databaseConfigured,
          hint: "Salin Connection String dari Neon branch br-patient-mud-a1xi2iun ke Environment Variables Vercel.",
        },
        {
          label: "Koneksi langsung ke Neon PostgreSQL",
          ok: status.checks.databaseConnected,
          hint: status.checks.databaseConnected
            ? `Terhubung! ${status.checks.schemaTablesCount} tabel ditemukan (${status.checks.rlsEnabledTablesCount} dengan RLS aktif).`
            : "Belum dapat menjangkau Neon. Pastikan DATABASE_URL aktif & SSL diizinkan.",
        },
        {
          label: "AUTH_SECRET (Better Auth >= 32 karakter)",
          ok: status.checks.authSecretConfigured,
          hint: "Sudah dikonfigurasi otomatis pada proyek Vercel WACRM.",
        },
        {
          label: "APP_ENCRYPTION_KEY (AES-256-GCM 32-byte)",
          ok: status.checks.encryptionKeyConfigured,
          hint: "Digunakan untuk enkripsi token WhatsApp Cloud API & Evolution API.",
        },
        {
          label: "Skema Database Migrasi 0001–0007 (19 tabel)",
          ok: status.checks.schemaTablesCount >= 16,
          hint: "Jalankan skrip SQL idempoten di bawah pada Neon SQL Editor atau jalankan npm run db:migrate.",
        },
        {
          label: "Konfigurasi Meta WhatsApp App (opsional saat awal)",
          ok: status.checks.metaConfigured,
          hint: "Isi META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN saat mengaktifkan pengiriman Meta resmi.",
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#444444]">
      <CorporateNavbar activeHref="/setup" />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00A885] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Portal Aplikasi
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-[#444444] hover:border-[#00A885] hover:text-[#00A885]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Periksa Ulang
            </button>
            <Link
              href="/demo"
              className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#008C6F]"
            >
              Buka Mode Demo
            </Link>
          </div>
        </div>

        <header className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-[#222222] p-6 text-white">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00A885]/20 px-3 py-1 font-heading text-xs font-bold text-[#00D4A8]">
                <Database className="h-3.5 w-3.5" />
                Pusat Koneksi Neon PostgreSQL &amp; Cloudflare Workers
              </span>
              <h1 className="font-heading mt-3 text-2xl font-extrabold text-white">
                Status Database &amp; Aktivasi Live
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                Target Project: <code className="font-mono font-semibold text-[#00D4A8]">{status?.neon.projectId ?? "small-tree-35716017"}</code> · Branch:{" "}
                <code className="font-mono font-semibold text-white">{status?.neon.branchId ?? "br-patient-mud-a1xi2iun"}</code>
              </p>
            </div>
            <a
              href={status?.neon.consoleUrl ?? "https://console.neon.tech/app/projects/small-tree-35716017/branches/br-patient-mud-a1xi2iun"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-[#00A885] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[#008C6F]"
            >
              Buka Neon Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-3 p-6">
            {loading && !status ? (
              <p className="text-sm text-[#797979]">Memeriksa kesiapan server...</p>
            ) : (
              checkRows.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-[#F5F5F5] p-3.5">
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00A885]" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="font-heading text-sm font-bold text-[#222222]">{item.label}</p>
                    <p className="mt-0.5 text-xs text-[#666666]">{item.hint}</p>
                  </div>
                </div>
              ))
            )}

            {status?.readyForLiveAuth && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#00A885]/35 bg-[#E6F7F3] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#006B54]">
                  <ShieldCheck className="h-5 w-5 text-[#00A885]" />
                  Database Neon siap digunakan untuk produksi!
                </div>
                <Link href="/sign-up" className="rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[#008C6F]">
                  Daftar &amp; Masuk Dashboard →
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Step-by-step */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-extrabold text-[#222222]">
              Langkah Aktivasi Neon (Otomatis saat Redeploy)
            </h2>
            <span className="rounded-full bg-[#E6F7F3] px-2.5 py-0.5 font-heading text-[11px] font-bold text-[#008C6F]">
              Auto-Migrate Aktif
            </span>
          </div>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[#444444]">
            <li>
              Tambahkan <code className="font-mono">DATABASE_URL</code> (Neon branch{" "}
              <code className="font-mono">br-patient-mud-a1xi2iun</code> atau Supabase PostgreSQL) pada Environment Variables Cloudflare Workers / GitHub Secrets.
            </li>
            <li>
              Jalankan deploy — skrip <code className="font-mono">scripts/vercel-migrate.mjs</code> otomatis menerapkan seluruh 19 tabel + RLS multi-tenant secara idempoten.
            </li>
            <li>
              <em>Opsional (role least-privilege <code className="font-mono">wacrm_runtime</code>):</em> jika menggunakan role non-owner, jalankan skrip SQL di bawah sekali saja di{" "}
              <a
                href="https://console.neon.tech/app/projects/small-tree-35716017/branches/br-patient-mud-a1xi2iun"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#00A885] underline"
              >
                Neon SQL Editor
              </a>
              .
            </li>
          </ol>
        </section>

        {/* Autonomous Commercial Activation Console (Email OTP, Transfer Manual Rp 0, Midtrans/Xendit/Tripay, Cloudflare) */}
        <CommercialActivationConsole />

        {/* Copyable SQL */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-[#00A885]" />
              <div>
                <h2 className="font-heading text-base font-extrabold text-[#222222]">
                  Skrip SQL Lengkap (db/neon-production-setup.sql)
                </h2>
                <p className="text-xs text-[#666666]">
                  Migrasi 0001–0007 · 19 tabel · RLS multi-tenant aktif · Aman dijalankan berulang kali
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={copySql}
              disabled={!sqlText}
              className="inline-flex items-center gap-1.5 rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[#008C6F] disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedSql ? "SQL Tersalin!" : "Salin Semua SQL"}
            </button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-[#1B1B1B] p-4 font-mono text-[11px] leading-relaxed text-[#00D4A8]">
            {sqlText || "Memuat skrip SQL..."}
          </pre>
        </section>
      </main>

      <CorporateFooter />
    </div>
  );
}
