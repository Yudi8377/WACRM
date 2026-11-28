"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  MessageCircle,
  PlayCircle,
  Save,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Video,
  Wand2,
} from "lucide-react";
import {
  formatIdr,
  type ErpProductRecord,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  auditProductSeo,
  computeStoreSeoSummary,
  generateOmnichannelSeoPack,
} from "@/lib/seo-engine";
import { normalizeSocialChannelAccount } from "@/lib/store-profile";
import { SovereignSeoSuite } from "@/components/sovereign-corporate-panels";
import type { AppEditionId } from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface SeoGrowthViewProps {
  adapter: WorkspaceAdapter;
  editionId?: AppEditionId;
  storeProfile: StoreBusinessProfile;
  onUpdateStoreProfile?: (next: StoreBusinessProfile) => void;
  products: ErpProductRecord[];
  onOpenEditions?: () => void;
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

type ChannelKey = "google" | "whatsapp" | "instagram" | "tiktok" | "youtube" | "facebook";

const CHANNEL_TABS: Array<{ key: ChannelKey; label: string }> = [
  { key: "google", label: "Google & JSON-LD" },
  { key: "whatsapp", label: "WhatsApp Katalog" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok Shop" },
  { key: "youtube", label: "YouTube Shorts" },
  { key: "facebook", label: "Facebook" },
];

export function SeoGrowthView({
  adapter,
  editionId = "starter",
  storeProfile,
  onUpdateStoreProfile,
  products,
  onOpenEditions,
  onRefresh,
  onToast,
}: SeoGrowthViewProps) {
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id ?? "");
  const [activeChannel, setActiveChannel] = useState<ChannelKey>("whatsapp");
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Ultra-simple social channel account form (just type FB, IG, TikTok, YT, WA!)
  const [waInput, setWaInput] = useState(
    storeProfile.socialHandles?.whatsapp || storeProfile.phone || "",
  );
  const [igInput, setIgInput] = useState(storeProfile.socialHandles?.instagram || "");
  const [fbInput, setFbInput] = useState(storeProfile.socialHandles?.facebook || "");
  const [ttInput, setTtInput] = useState(storeProfile.socialHandles?.tiktok || "");
  const [ytInput, setYtInput] = useState(storeProfile.socialHandles?.youtube || "");
  const [cityInput, setCityInput] = useState(storeProfile.city || "Indonesia");

  const normalizedChannels = useMemo(
    () => ({
      whatsapp: normalizeSocialChannelAccount("whatsapp", waInput),
      instagram: normalizeSocialChannelAccount("instagram", igInput),
      facebook: normalizeSocialChannelAccount("facebook", fbInput),
      tiktok: normalizeSocialChannelAccount("tiktok", ttInput),
      youtube: normalizeSocialChannelAccount("youtube", ytInput),
    }),
    [waInput, igInput, fbInput, ttInput, ytInput],
  );

  const connectedChannelCount = useMemo(
    () => Object.values(normalizedChannels).filter((c) => c.connected).length,
    [normalizedChannels],
  );

  // Live effective store profile so typing a social account immediately updates SEO copy preview!
  const effectiveProfile = useMemo<StoreBusinessProfile>(
    () => ({
      ...storeProfile,
      city: cityInput.trim() || storeProfile.city,
      socialHandles: {
        whatsapp: waInput.trim(),
        instagram: igInput.trim(),
        facebook: fbInput.trim(),
        tiktok: ttInput.trim(),
        youtube: ytInput.trim(),
        websiteUrl: storeProfile.socialHandles?.websiteUrl,
      },
    }),
    [storeProfile, cityInput, waInput, igInput, fbInput, ttInput, ytInput],
  );

  function handleSaveSimpleAccounts(e: FormEvent) {
    e.preventDefault();
    onUpdateStoreProfile?.(effectiveProfile);
    onToast(
      `Akun kanal disimpan (${connectedChannelCount}/5 terhubung) — seluruh teks promosi & link SEO 6 kanal otomatis diperbarui!`,
    );
  }

  const summary = useMemo(
    () => computeStoreSeoSummary(products, effectiveProfile),
    [products, effectiveProfile],
  );

  const audits = useMemo(
    () => products.map((p) => ({ product: p, audit: auditProductSeo(p, effectiveProfile) })),
    [products, effectiveProfile],
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? products[0] ?? null,
    [products, selectedId],
  );

  const selectedAudit = useMemo(
    () => (selectedProduct ? auditProductSeo(selectedProduct, effectiveProfile) : null),
    [selectedProduct, effectiveProfile],
  );

  const seoPack = useMemo(() => {
    if (!selectedProduct) return null;
    return generateOmnichannelSeoPack(selectedProduct, effectiveProfile);
  }, [selectedProduct, effectiveProfile]);

  async function copyText(key: string, text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onToast(`${label} berhasil disalin — siap tempel ke kanal promosi!`);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      onToast("Gagal menyalin teks ke clipboard.", "error");
    }
  }

  async function handleApplySeoToProduct() {
    if (!selectedProduct || !seoPack) return;
    setApplying(true);
    try {
      const enrichedDescription = `${seoPack.google.metaDescription} Kata kunci: ${seoPack.google.keywords.slice(0, 5).join(", ")}.`;
      await adapter.updateProduct(selectedProduct.id, {
        description: enrichedDescription,
      });
      await adapter.addAiKnowledge({
        sourceType: "autonomous_learning",
        title: `Paket SEO Omnichannel: ${selectedProduct.name}`,
        content: `Meta Title: ${seoPack.google.metaTitle}\nMeta Desc: ${seoPack.google.metaDescription}\nWA Broadcast: ${seoPack.whatsapp.broadcastCopy}\nHashtags: ${seoPack.instagram.hashtags.join(" ")}`,
        tags: [
          "seo",
          "omnichannel",
          selectedProduct.sku.toLowerCase(),
          selectedProduct.category.toLowerCase(),
        ],
      });
      await onRefresh();
      onToast(
        `Deskripsi SEO & paket 6 kanal untuk "${selectedProduct.name}" diterapkan ke ERP & Basis Pengetahuan AI!`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menerapkan optimasi SEO.", "error");
    } finally {
      setApplying(false);
    }
  }

  async function handleOptimizeAllCatalog() {
    setSyncingAll(true);
    try {
      let updatedCount = 0;
      for (const { product, audit } of audits) {
        if (audit.score < 85 && product.isActive) {
          const pack = generateOmnichannelSeoPack(product, storeProfile);
          await adapter.updateProduct(product.id, {
            description: `${pack.google.metaDescription} Pengiriman cepat & invoice QR resmi ${storeProfile.businessName}.`,
          });
          updatedCount += 1;
        }
      }
      await adapter.runAiKnowledgeSync();
      await onRefresh();
      onToast(
        updatedCount > 0
          ? `Agen SEO AI mengoptimalkan ${updatedCount} produk & menyinkronkan basis pengetahuan omnichannel!`
          : "Seluruh produk sudah memiliki skor SEO optimal (>= 85/100) dan tersinkron ke AI!",
      );
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : "Gagal menjalankan optimasi massal SEO.",
        "error",
      );
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Hero Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/70 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" />
            Agen #9 · SEO &amp; Omnichannel Growth AI (6 Kanal Aktif)
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Studio Optimasi SEO Produk Lintas Kanal — {storeProfile.businessName}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Menyediakan <strong>Technical SEO nyata</strong> (Schema.org Product JSON-LD, OpenGraph, Sitemap XML, Robots.txt, Katalog Publik) sekaligus <strong>AI Copywriter Omnichannel</strong> untuk Google, WhatsApp, Instagram, TikTok, YouTube &amp; Facebook.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSimpleMode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {simpleMode ? "Mode Simpel UMKM (Aktif)" : "Mode Teknis (JSON-LD)"}
          </button>
          <Link
            href="/katalog"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800"
          >
            <Globe className="h-3.5 w-3.5" /> Buka Katalog Publik SEO <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            type="button"
            disabled={syncingAll}
            onClick={() => void handleOptimizeAllCatalog()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {syncingAll ? "Mengoptimalkan Katalog..." : "1-Klik Optimasi SEO Semua Produk"}
          </button>
        </div>
      </div>

      {/* ULTRA-SIMPLE CHANNEL ACCOUNT SETUP (Just input FB, IG, TikTok, YouTube & WA!) */}
      <form
        onSubmit={handleSaveSimpleAccounts}
        className="rounded-2xl border border-cyan-500/35 bg-slate-900/95 p-5 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
              <Sparkles className="h-4 w-4" /> Pengaturan Simpel Akun Kanal (Cukup Isi Username — Tanpa Kode!)
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Cukup ketik nomor WA dan username Facebook, Instagram, TikTok, atau YouTube toko Anda.
              AI otomatis memasang link &amp; tombol order di semua promosi produk + Google SEO.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
            {connectedChannelCount}/5 Akun Kanal Terhubung
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-semibold text-slate-300">
            WhatsApp Bisnis (No. HP / WA)
            <input
              type="text"
              value={waInput}
              onChange={(e) => setWaInput(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
            {normalizedChannels.whatsapp.url && (
              <span className="mt-1 block truncate text-[10px] text-emerald-400">
                ✓ Link order otomatis: {normalizedChannels.whatsapp.url}
              </span>
            )}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Akun Instagram (Username saja)
            <input
              type="text"
              value={igInput}
              onChange={(e) => setIgInput(e.target.value)}
              placeholder="Contoh: @tokoberkah"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            />
            {normalizedChannels.instagram.url && (
              <span className="mt-1 block truncate text-[10px] text-pink-300">
                ✓ {normalizedChannels.instagram.url}
              </span>
            )}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Halaman Facebook (Username / Page)
            <input
              type="text"
              value={fbInput}
              onChange={(e) => setFbInput(e.target.value)}
              placeholder="Contoh: tokoberkah.id"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
            {normalizedChannels.facebook.url && (
              <span className="mt-1 block truncate text-[10px] text-blue-300">
                ✓ {normalizedChannels.facebook.url}
              </span>
            )}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Akun TikTok / TikTok Shop
            <input
              type="text"
              value={ttInput}
              onChange={(e) => setTtInput(e.target.value)}
              placeholder="Contoh: @tokoberkah"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
            />
            {normalizedChannels.tiktok.url && (
              <span className="mt-1 block truncate text-[10px] text-cyan-300">
                ✓ {normalizedChannels.tiktok.url}
              </span>
            )}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Channel YouTube
            <input
              type="text"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              placeholder="Contoh: @tokoberkah"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
            />
            {normalizedChannels.youtube.url && (
              <span className="mt-1 block truncate text-[10px] text-rose-300">
                ✓ {normalizedChannels.youtube.url}
              </span>
            )}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Kota / Area Jualan (SEO Lokal)
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Contoh: Kediri / Surabaya"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
            <span className="mt-1 block text-[10px] text-slate-400">
              Dipakai otomatis pada kata kunci pencarian lokal Google &amp; Marketplace.
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {normalizedChannels.whatsapp.url && (
              <a
                href={normalizedChannels.whatsapp.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/25"
              >
                Buka WA <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {normalizedChannels.instagram.url && (
              <a
                href={normalizedChannels.instagram.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-pink-500/15 px-2.5 py-1 font-semibold text-pink-300 hover:bg-pink-500/25"
              >
                Buka IG <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {normalizedChannels.facebook.url && (
              <a
                href={normalizedChannels.facebook.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2.5 py-1 font-semibold text-blue-300 hover:bg-blue-500/25"
              >
                Buka FB <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {normalizedChannels.tiktok.url && (
              <a
                href={normalizedChannels.tiktok.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1 font-semibold text-cyan-300 hover:bg-cyan-500/25"
              >
                Buka TikTok <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {normalizedChannels.youtube.url && (
              <a
                href={normalizedChannels.youtube.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                Buka YouTube <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
          >
            <Save className="h-3.5 w-3.5" /> Simpan Akun &amp; Terapkan ke Semua Kanal
          </button>
        </div>
      </form>

      {/* KPI Strip + Technical SEO Checklist */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-xs text-slate-400">Skor SEO Rata-rata Katalog</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">{summary.overallScore}</span>
            <span className="text-xs text-slate-400">/ 100 (Grade {summary.grade})</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {summary.optimizedCount}/{summary.totalProducts} produk siap ranking Google
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-xs text-slate-400">Perlu Peningkatan SEO</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-300">
            {summary.needsAttentionCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">SKU dengan skor &lt; 80</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-xs text-slate-400">Technical SEO Engine</div>
          <div className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Aktif &amp; Terindeks
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              sitemap.xml
            </a>
            <a href="/robots.txt" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              robots.txt
            </a>
            <a href="/katalog" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
              JSON-LD
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="text-xs text-slate-400">Cakupan Kanal AI</div>
          <div className="mt-1 text-2xl font-extrabold text-cyan-300">6 Kanal</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Google · WA · IG · TikTok · YT · FB
          </div>
        </div>
      </div>

      {/* Main Split: Left Product Audit List | Right 6-Channel AI Pack */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Product SEO Audit List */}
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Audit Skor SEO Produk ERP</h3>
            <span className="text-[11px] text-slate-400">{products.length} SKU</span>
          </div>

          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {audits.map(({ product, audit }) => {
              const isSelected = selectedProduct?.id === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/15"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{product.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {product.sku} · {formatIdr(product.unitPrice)} · Stok {product.stockQty}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-extrabold ${
                        audit.score >= 85
                          ? "bg-emerald-500/20 text-emerald-300"
                          : audit.score >= 70
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {audit.score} ({audit.grade})
                    </span>
                  </div>
                  {audit.issues.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-amber-300/90">
                      • {audit.issues[0]}
                    </div>
                  )}
                </button>
              );
            })}
            {audits.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
                Tambahkan produk di ERP / Master Data untuk memulai audit SEO otomatis.
              </div>
            )}
          </div>
        </div>

        {/* Right: Omnichannel SEO Generator */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 lg:col-span-8">
          {selectedProduct && selectedAudit && seoPack ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    Paket Optimasi Omnichannel AI · SKU {selectedProduct.sku}
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedProduct.name}</h3>
                </div>
                <button
                  type="button"
                  disabled={applying}
                  onClick={() => void handleApplySeoToProduct()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {applying ? "Menyimpan..." : "Terapkan ke ERP & Basis Pengetahuan AI"}
                </button>
              </div>

              {/* Audit Issues & Strengths */}
              {selectedAudit.issues.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <div className="font-bold">Catatan Optimasi SEO ({selectedAudit.score}/100):</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">
                    {selectedAudit.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6-Channel Selector */}
              <div className="flex flex-wrap gap-1.5">
                {CHANNEL_TABS.map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setActiveChannel(ch.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeChannel === ch.key
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {ch.key === "google" && <Search className="h-3.5 w-3.5" />}
                    {ch.key === "whatsapp" && <MessageCircle className="h-3.5 w-3.5" />}
                    {ch.key === "instagram" && <Camera className="h-3.5 w-3.5" />}
                    {ch.key === "tiktok" && <Video className="h-3.5 w-3.5" />}
                    {ch.key === "youtube" && <PlayCircle className="h-3.5 w-3.5" />}
                    {ch.key === "facebook" && <Share2 className="h-3.5 w-3.5" />}
                    {ch.label}
                  </button>
                ))}
              </div>

              {/* Channel Output Cards */}
              {activeChannel === "google" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-700 bg-white p-4 text-slate-900">
                    <div className="text-[11px] text-emerald-700">
                      https://wacrm-seven-dusky.vercel.app/katalog#{seoPack.google.slug}
                    </div>
                    <div className="mt-0.5 text-base font-bold text-blue-700">
                      {seoPack.google.metaTitle}
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-600">
                      {seoPack.google.metaDescription}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {seoPack.google.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {simpleMode ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                      <div className="font-bold text-emerald-300">
                        ✓ Google SEO &amp; Kode Teknis (JSON-LD) Sudah Otomatis Aktif!
                      </div>
                      <p className="mt-1 text-emerald-100/80">
                        Anda tidak perlu menyalin kode teknis apa pun — akun FB, IG, TikTok, YouTube &amp;
                        WA yang Anda isi di atas sudah otomatis ditautkan ke halaman Katalog Publik SEO.
                        Aktifkan <strong>Mode Teknis</strong> di kanan atas jika ingin melihat kode JSON-LD.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-300">
                          Schema.org Product JSON-LD (Siap Rich Snippet Google)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText("jsonld", seoPack.google.jsonLd, "Schema.org JSON-LD")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                        >
                          {copiedKey === "jsonld" ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          Salin JSON-LD
                        </button>
                      </div>
                      <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-cyan-200">
                        {seoPack.google.jsonLd}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeChannel === "whatsapp" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">
                        Judul Katalog &amp; CTA WhatsApp Business
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "wa-cat",
                            `${seoPack.whatsapp.catalogTitle}\n${seoPack.whatsapp.ctaLine}`,
                            "Judul WA Katalog",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin
                      </button>
                    </div>
                    <div className="mt-2 font-bold text-white">{seoPack.whatsapp.catalogTitle}</div>
                    <p className="mt-1 text-slate-300">{seoPack.whatsapp.ctaLine}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">
                        Naskah Broadcast Promo WhatsApp
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText("wa-bc", seoPack.whatsapp.broadcastCopy, "Broadcast WhatsApp")
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin
                      </button>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-200">
                      {seoPack.whatsapp.broadcastCopy}
                    </pre>
                  </div>
                </div>
              )}

              {activeChannel === "instagram" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="font-bold text-pink-300">Hook 3 Detik Pertama Reels</div>
                    <p className="mt-1 text-slate-200">{seoPack.instagram.hook}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-pink-300">
                        Caption Feed &amp; Hashtags SEO Instagram
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "ig",
                            `${seoPack.instagram.caption}\n\n${seoPack.instagram.hashtags.join(" ")}`,
                            "Caption Instagram",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin Semua
                      </button>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-200">
                      {seoPack.instagram.caption}
                    </pre>
                    <div className="mt-3 text-cyan-300">{seoPack.instagram.hashtags.join(" ")}</div>
                  </div>
                </div>
              )}

              {activeChannel === "tiktok" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="font-bold text-cyan-300">Hook FYP TikTok Video</div>
                    <p className="mt-1 text-slate-200">{seoPack.tiktok.videoHook}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">
                        Caption SEO TikTok Shop &amp; Search Tags
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "tt",
                            `${seoPack.tiktok.seoCaption}\n\nKata Kunci: ${seoPack.tiktok.searchTags.join(", ")}`,
                            "Konten TikTok",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin Semua
                      </button>
                    </div>
                    <p className="mt-2 text-slate-200">{seoPack.tiktok.seoCaption}</p>
                    <div className="mt-3 text-emerald-300">
                      Search Tags: {seoPack.tiktok.searchTags.join(" · ")}
                    </div>
                  </div>
                </div>
              )}

              {activeChannel === "youtube" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">
                        Judul &amp; Deskripsi YouTube Shorts / Review
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "yt",
                            `${seoPack.youtube.title}\n\n${seoPack.youtube.description}\n\nTags: ${seoPack.youtube.tags.join(", ")}`,
                            "SEO YouTube",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin Semua
                      </button>
                    </div>
                    <div className="mt-2 font-bold text-white">{seoPack.youtube.title}</div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-200">
                      {seoPack.youtube.description}
                    </pre>
                    <div className="mt-3 text-[11px] text-slate-400">
                      Tags: {seoPack.youtube.tags.join(", ")}
                    </div>
                  </div>
                </div>
              )}

              {activeChannel === "facebook" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300">
                        Listing Facebook Marketplace &amp; Halaman
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            "fb",
                            `${seoPack.facebook.marketplaceTitle}\n\n${seoPack.facebook.postCopy}`,
                            "Listing Facebook",
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-white"
                      >
                        <Copy className="h-3 w-3" /> Salin Semua
                      </button>
                    </div>
                    <div className="mt-2 font-bold text-white">
                      {seoPack.facebook.marketplaceTitle}
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-200">
                      {seoPack.facebook.postCopy}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Pilih produk di sebelah kiri untuk menghasilkan paket SEO 6 kanal.
            </div>
          )}
        </div>
      </div>

      {/* Sovereign Corporate High-Level SEO Suite (Technical Audit, CWV, Multi-Schema & Keyword ROI) */}
      <SovereignSeoSuite
        editionId={editionId}
        businessName={storeProfile.businessName}
        onOpenEditions={onOpenEditions}
        onToast={onToast}
      />
    </div>
  );
}
