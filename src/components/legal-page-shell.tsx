import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileText, RefreshCw, ShieldCheck } from "lucide-react";

interface LegalPageShellProps {
  activePath: "/privacy" | "/terms" | "/refund";
  badge: string;
  title: string;
  subtitle: string;
  effectiveDate: string;
  children: ReactNode;
}

const NAV_LINKS = [
  { href: "/privacy" as const, label: "Kebijakan Privasi (UU PDP)", icon: ShieldCheck },
  { href: "/terms" as const, label: "Syarat & Ketentuan", icon: FileText },
  { href: "/refund" as const, label: "Kebijakan Pengembalian Dana", icon: RefreshCw },
];

export function LegalPageShell({
  activePath,
  badge,
  title,
  subtitle,
  effectiveDate,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Aplikasi WACRM
          </Link>
          <nav className="flex flex-wrap gap-1.5">
            {NAV_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activePath;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    isActive
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 p-6 sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> {badge}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span>Berlaku Efektif: <strong className="text-slate-200">{effectiveDate}</strong></span>
            <span>·</span>
            <span>Yurisdiksi: <strong className="text-slate-200">Republik Indonesia</strong></span>
          </div>
        </div>

        <article className="mt-6 space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm leading-relaxed text-slate-300 sm:p-8">
          {children}
        </article>

        <footer className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} WACRM Commercial OS. Seluruh hak dilindungi undang-undang.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-emerald-400">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-emerald-400">Syarat &amp; Ketentuan</Link>
            <Link href="/refund" className="hover:text-emerald-400">Kebijakan Pengembalian Dana</Link>
            <Link href="/android" className="hover:text-emerald-400">Aplikasi Android</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
