import Link from "next/link";
import { Lock, Mail, Phone, Smartphone } from "lucide-react";

export function BrandLogoMark({
  subtitle = "Commercial OS v5.3.2",
  compact = false,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`flex shrink-0 items-center justify-center rounded-md bg-[#00A885] font-heading font-extrabold text-white shadow-xs ${
          compact ? "h-8 w-8 text-sm" : "h-9 w-9 text-base"
        }`}
      >
        W
      </span>
      <span className="leading-tight text-left">
        <span
          className={`block font-heading font-extrabold tracking-tight text-[#222222] ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          WACRM<span className="text-[#00A885]">.</span>
        </span>
        {!compact && (
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#797979]">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export function CorporateTopUtilityBar() {
  return (
    <div className="hidden border-b border-zinc-200 bg-[#F5F5F5] text-xs text-[#666666] lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-[#00A885]" />
            Konsultan AI 24/7 Aktif
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-[#00A885]" />
            enterprise@wacrm.id
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1 font-semibold text-[#00A885]">
            <Lock className="h-3.5 w-3.5" /> Portal Aplikasi Commercial OS
          </span>
          <span className="text-[#888888]">PT WACRM Digital Nusantara · v5.3.2</span>
        </div>
      </div>
    </div>
  );
}

export function CorporateNavbar({
  activeHref,
}: {
  activeHref?: "/" | "/sign-in" | "/sign-up" | "/android" | "/setup" | "/katalog";
}) {
  const navItems = [
    { href: "/" as const, label: "Portal Aplikasi" },
    { href: "/katalog" as const, label: "Katalog" },
    { href: "/android" as const, label: "Android APK" },
    { href: "/setup" as const, label: "Setup & Aktivasi" },
  ];

  return (
    <>
      <CorporateTopUtilityBar />
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <BrandLogoMark />
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-heading text-xs font-bold uppercase tracking-wider transition ${
                    active ? "text-[#00A885]" : "text-[#444444] hover:text-[#00A885]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/android"
              className="inline-flex items-center gap-1.5 rounded bg-[#00A885] px-4 py-2 font-heading text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008C6F]"
            >
              <Smartphone className="h-3.5 w-3.5" /> Unduh APK v5.3.2
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/android"
              className="rounded bg-[#00A885] px-3 py-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#008C6F]"
            >
              APK v5.3.2
            </Link>
            <Link
              href="/setup"
              className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 font-heading text-[11px] font-bold uppercase text-[#444444]"
            >
              Setup
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function CorporateFooter() {
  return (
    <footer className="bg-[#222222] text-zinc-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 text-xs sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#00A885] font-heading text-xs font-extrabold text-white">
            W
          </span>
          <span className="font-heading text-sm font-extrabold tracking-tight text-white">
            WACRM<span className="text-[#00A885]">.</span>{" "}
            <span className="text-xs font-normal text-zinc-400">Commercial OS v5.3.2</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/privacy" className="transition hover:text-[#00D4A8]">
            Kebijakan Privasi (UU PDP)
          </Link>
          <Link href="/terms" className="transition hover:text-[#00D4A8]">
            Syarat &amp; Ketentuan
          </Link>
          <Link href="/refund" className="transition hover:text-[#00D4A8]">
            Kebijakan Refund
          </Link>
          <Link href="/android" className="transition hover:text-[#00D4A8]">
            Android APK &amp; PWA
          </Link>
          <Link href="/setup" className="transition hover:text-[#00D4A8]">
            Setup &amp; Aktivasi
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#1B1B1B] px-4 py-3 text-center text-[11px] text-zinc-500">
        © {new Date().getFullYear()} PT WACRM Digital Nusantara · PSAK 72 · AES-256-GCM · PostgreSQL RLS Multi-Tenant
      </div>
    </footer>
  );
}
