import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { BrandLogoMark, CorporateFooter } from "@/components/brand-chrome";

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
  { href: "/refund" as const, label: "Kebijakan Refund", icon: RefreshCw },
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
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#444444]">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <BrandLogoMark compact />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#444444] transition hover:border-[#00A885] hover:text-[#00A885]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Portal Aplikasi
            </Link>
          </div>
          <nav className="flex flex-wrap gap-1.5">
            {NAV_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activePath;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-heading text-[11px] font-bold transition ${
                    isActive
                      ? "bg-[#00A885] text-white"
                      : "border border-zinc-200 bg-[#F5F5F5] text-[#444444] hover:border-[#00A885]/50 hover:text-[#00A885]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl bg-[#222222] p-6 text-white shadow-lg sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00A885]/20 px-3 py-1 font-heading text-[11px] font-bold text-[#00D4A8]">
            <ShieldCheck className="h-3.5 w-3.5" /> {badge}
          </div>
          <h1 className="font-heading mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-zinc-400">
            <span>Berlaku Efektif: <strong className="text-white">{effectiveDate}</strong></span>
            <span>·</span>
            <span>Yurisdiksi: <strong className="text-white">Republik Indonesia</strong></span>
          </div>
        </div>

        <article className="mt-6 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-[#444444] shadow-sm sm:p-8 [&_h2]:font-heading [&_h2]:text-[#222222]">
          {children}
        </article>
      </main>

      <CorporateFooter />
    </div>
  );
}
