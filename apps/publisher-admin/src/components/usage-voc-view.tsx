"use client";

import { useState } from "react";
import {
  Activity,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Lightbulb,
  MapPin,
  MessageSquareHeart,
  RefreshCw,
  Star,
  ThumbsUp,
  Users,
} from "lucide-react";
import type {
  CommunityFeedbackItem,
  PublisherIntelligenceReport,
} from "@/lib/intelligence-types";
import { DonutPieChart, HourlyActivityBarChart } from "./svg-charts";

interface UsageVocViewProps {
  report: PublisherIntelligenceReport | null;
  loading: boolean;
  onRefresh: () => void;
  onUpdateFeedbackStatus: (
    feedbackId: string,
    actionStatus: CommunityFeedbackItem["actionStatus"],
  ) => Promise<void>;
}

export function UsageVocView({
  report,
  loading,
  onRefresh,
  onUpdateFeedbackStatus,
}: UsageVocViewProps) {
  const [sentimentFilter, setSentimentFilter] = useState<
    "all" | "positive" | "neutral" | "constructive"
  >("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (loading && !report) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Menarik telemetri penggunaan, komentar &amp; testimoni live dari WACRM Neon...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-300">Data intelijen penggunaan belum termuat.</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Muat Data Live
        </button>
      </div>
    );
  }

  const { usage, voiceOfCustomer } = report;
  const filteredComments = voiceOfCustomer.recentFeedback.filter(
    (f) => sentimentFilter === "all" || f.sentiment === sentimentFilter,
  );

  async function handleChangeStatus(
    id: string,
    next: CommunityFeedbackItem["actionStatus"],
  ) {
    setUpdatingId(id);
    try {
      await onUpdateFeedbackStatus(id, next);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-emerald-950/35 to-slate-900 p-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
            <Activity className="h-3.5 w-3.5" /> Live Usage Telemetry &amp; Voice of Customer (Neon Sync)
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-white">
            Analitik Penggunaan, Daerah, Komentar &amp; Testimoni Pengguna
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Pantau berapa banyak pengguna Starter UMKM Gratis &amp; Trial Pro/Enterprise, lama pemakaian, fitur terpopuler, jam puncak, daerah pengguna, serta kelompok komentar &amp; testimoni berfoto untuk pengambilan sikap strategis.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sinkron Data Live
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Users className="h-3.5 w-3.5 text-emerald-400" /> Total Terdaftar
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-white">
            {usage.totalRegisteredUsers.toLocaleString("id-ID")}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-300">
            {usage.freeUmkmUsers} UMKM Gratis · {usage.paidLicensedUsers} Berbayar
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5 text-cyan-400" /> Rata-rata Sesi
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-cyan-300">
            {usage.avgSessionMinutes} mnt
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Total {usage.totalUsageMinutes.toLocaleString("id-ID")} mnt tercatat
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity className="h-3.5 w-3.5 text-amber-400" /> Jam Puncak
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-amber-300">
            {usage.peakHourLabel}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {usage.totalSessionsLogged} sesi aktif
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" /> Kebermanfaatan
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-400">
            {usage.usefulnessScorePct}%
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Menilai WACRM bermanfaat
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Star className="h-3.5 w-3.5 text-amber-400" /> Rating Rata-rata
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-white">
            {voiceOfCustomer.avgRating} / 5
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Dari {voiceOfCustomer.totalEntries} ulasan
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Camera className="h-3.5 w-3.5 text-pink-400" /> Testimoni Usaha
          </div>
          <div className="mt-1.5 text-2xl font-extrabold text-pink-300">
            {voiceOfCustomer.totalTestimonials}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            + {voiceOfCustomer.totalComments} komentar
          </div>
        </div>
      </div>

      {/* PIE CHARTS ROW: Editions, Regions, Usefulness & Platform */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutPieChart
          title="Pie Chart — Distribusi Wilayah / Daerah Pengguna"
          subtitle="Sebaran asal kota & provinsi pelaku usaha pengguna WACRM"
          slices={usage.regionBreakdown}
          centerValue={`${usage.regionBreakdown.length}`}
          centerLabel="Wilayah Aktif"
        />
        <DonutPieChart
          title="Pie Chart — Distribusi Edisi & Paket Pengguna"
          subtitle="Proporsi Starter UMKM Gratis vs Trial Pro 14h / Ent 7h vs Berbayar"
          slices={usage.editionBreakdown}
          centerValue={`${usage.totalRegisteredUsers || 30}`}
          centerLabel="Total Tenant"
        />
        <DonutPieChart
          title="Pie Chart — Apakah Aplikasi Bermanfaat?"
          subtitle="Penilaian kebermanfaatan langsung dari pengguna aplikasi"
          slices={voiceOfCustomer.usefulnessBreakdown}
          centerValue={`${usage.usefulnessScorePct}%`}
          centerLabel="Bermanfaat"
        />
        <DonutPieChart
          title="Pie Chart — Sentimen Komentar & Platform Akses"
          subtitle="Klasifikasi sentimen AI untuk menentukan prioritas perbaikan"
          slices={voiceOfCustomer.sentimentBreakdown}
          centerValue={`${voiceOfCustomer.avgRating}★`}
          centerLabel="Skor Kepuasan"
        />
      </div>

      {/* 24-HOUR PEAK USAGE BAR CHART + TOP FEATURES RANKING */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HourlyActivityBarChart
            title="Distribusi Jam Penggunaan Aplikasi (00:00 – 23:00 WIB)"
            subtitle="Menunjukkan jam tersibuk pengguna membuka WACRM untuk penjadwalan promo & server"
            peakHourLabel={usage.peakHourLabel}
            data={usage.hourlyActivity}
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 lg:col-span-5">
          <h3 className="text-sm font-extrabold text-white">
            Fitur Paling Banyak Diakses &amp; Lama Pemakaian
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Peringkat modul favorit berdasarkan jumlah kunjungan &amp; durasi aktif
          </p>
          <div className="mt-4 space-y-3">
            {usage.topFeatures.slice(0, 7).map((f) => (
              <div key={f.featureKey} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{f.label}</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    <strong className="text-white">{f.sharePct}%</strong> · {f.minutes} mnt ({f.hits}x)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    style={{ width: `${Math.max(4, f.sharePct)}%`, backgroundColor: f.color }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI STRATEGIC DECISION ENGINE FOR OWNER */}
      <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 p-5">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-extrabold text-white">
              Rekomendasi Pengambilan Sikap &amp; Keputusan Strategis Owner
            </h3>
            <p className="text-[11px] text-slate-400">
              Dirumuskan otomatis dari data lama penggunaan, jam puncak, komentar &amp; testimoni pengguna
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {voiceOfCustomer.strategicDecisions.map((dec, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-950/85 p-4 text-xs"
            >
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                  dec.priority === "HIGH"
                    ? "bg-rose-500/20 text-rose-300"
                    : dec.priority === "OPPORTUNITY"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-cyan-500/20 text-cyan-300"
                }`}
              >
                PRIORITAS {dec.priority}
              </span>
              <h4 className="mt-2 font-extrabold text-white">{dec.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{dec.insight}</p>
              <div className="mt-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-200">
                <strong className="flex items-center gap-1 text-emerald-300">
                  <Lightbulb className="h-3.5 w-3.5" /> Sikap yang Disarankan:
                </strong>
                <p className="mt-0.5">{dec.recommendedMove}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GROUPED FEEDBACK BY CATEGORY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <h3 className="text-sm font-extrabold text-white">
          Pengelompokan Komentar &amp; Saran Berdasarkan Topik
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2 pr-3">Kelompok Topik</th>
                <th className="py-2 pr-3">Jumlah</th>
                <th className="py-2 pr-3">Rating</th>
                <th className="py-2 pr-3">Positif / Konstruktif</th>
                <th className="py-2">Rekomendasi Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {voiceOfCustomer.categoryGroups.map((g) => (
                <tr key={g.category}>
                  <td className="py-2.5 pr-3 font-bold text-white">{g.category}</td>
                  <td className="py-2.5 pr-3 font-mono text-cyan-300">{g.count}</td>
                  <td className="py-2.5 pr-3 text-amber-300">{g.avgRating} ★</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-emerald-400">{g.positiveCount} positif</span> ·{" "}
                    <span className="text-rose-300">{g.constructiveCount} saran</span>
                  </td>
                  <td className="py-2.5 text-[11px] text-slate-300">{g.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PHOTO TESTIMONIALS GALLERY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <Camera className="h-4 w-4 text-amber-400" />
            Galeri Testimoni Berfoto dari Pelaku Usaha ({voiceOfCustomer.testimonials.length})
          </h3>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {voiceOfCustomer.testimonials.map((t) => (
            <div
              key={t.id}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/90"
            >
              {t.photoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={t.photoDataUrl}
                  alt={t.headline || t.businessName}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-20 items-center justify-between bg-gradient-to-r from-emerald-950 to-slate-900 px-4">
                  <span className="text-lg font-extrabold text-emerald-300">
                    {t.businessName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    {t.editionId}
                  </span>
                </div>
              )}
              <div className="p-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300">
                    <MapPin className="h-2.5 w-2.5" /> {t.region}
                  </span>
                </div>
                <div className="mt-2 font-extrabold text-white">{t.headline}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  &ldquo;{t.message}&rdquo;
                </p>
                <div className="mt-2.5 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
                  <strong className="text-slate-200">{t.displayName}</strong> · {t.businessName}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIONABLE FEEDBACK LOG WITH STATUS CONTROLS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
            <MessageSquareHeart className="h-4 w-4 text-cyan-400" />
            Daftar Komentar &amp; Status Tindak Lanjut Owner
          </h3>
          <div className="flex gap-1.5 text-[11px]">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "positive", label: "Positif" },
                { id: "constructive", label: "Saran / Perbaikan" },
                { id: "neutral", label: "Netral" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSentimentFilter(btn.id)}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  sentimentFilter === btn.id
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-slate-700 bg-slate-950 text-slate-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {filteredComments.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/85 p-3.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-white">{item.displayName}</span>
                  <span className="text-[11px] text-slate-400">({item.businessName || item.region})</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.sentiment === "positive"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : item.sentiment === "constructive"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {item.sentiment}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-300">
                    {item.category}
                  </span>
                </div>
                <p className="mt-1 text-slate-300">{item.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <select
                  disabled={updatingId === item.id}
                  value={item.actionStatus}
                  onChange={(e) =>
                    void handleChangeStatus(
                      item.id,
                      e.target.value as CommunityFeedbackItem["actionStatus"],
                    )
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                  <option value="new">Baru</option>
                  <option value="reviewed">Ditinjau</option>
                  <option value="planned">Masuk Roadmap</option>
                  <option value="resolved">Selesai Ditindaklanjuti</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
