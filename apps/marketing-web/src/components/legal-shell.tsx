import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileText, RefreshCw, ShieldCheck } from "lucide-react";

interface MarketingLegalShellProps {
  activePath: "/privacy" | "/terms" | "/refund";
  badge: string;
  title: string;
  subtitle: string;
  effectiveDate: string;
  children: ReactNode;
}

const LINKS = [
  { href: "/privacy" as const, label: "Kebijakan Privasi (UU PDP)", icon: ShieldCheck },
  { href: "/terms" as const, label: "Syarat & Ketentuan", icon: FileText },
  { href: "/refund" as const, label: "Kebijakan Refund", icon: RefreshCw },
];

export function MarketingLegalShell({
  activePath,
  badge,
  title,
  subtitle,
  effectiveDate,
  children,
}: MarketingLegalShellProps) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-zinc-800">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:border-[#00A885] hover:text-[#00A885]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Beranda WACRM Enterprise
          </Link>
          <nav className="flex flex-wrap gap-1.5">
            {LINKS.map((item) => {
              const Icon = item.icon;
              const active = item.href === activePath;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? "bg-[#00A885] text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-[#00A885]/50 hover:text-[#00A885]"
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
        <div className="rounded-2xl bg-[#222222] p-6 text-white shadow-lg sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00A885]/20 px-3 py-1 text-[11px] font-bold text-[#00D4A8]">
            <ShieldCheck className="h-3.5 w-3.5" /> {badge}
          </div>
          <h1 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{subtitle}</p>
          <div className="mt-4 text-[11px] text-zinc-400">
            Berlaku Efektif: <strong className="text-white">{effectiveDate}</strong> · Yurisdiksi:{" "}
            <strong className="text-white">Republik Indonesia</strong>
          </div>
        </div>

        <article className="mt-6 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-8">
          {children}
        </article>
      </main>

      <footer className="mt-10 bg-[#222222] px-4 py-6 text-center text-xs text-zinc-400">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span>© {new Date().getFullYear()} PT WACRM Digital Nusantara</span>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-[#00D4A8]">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-[#00D4A8]">Syarat &amp; Ketentuan</Link>
            <Link href="/refund" className="hover:text-[#00D4A8]">Kebijakan Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
