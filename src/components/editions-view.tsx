"use client";

import { Check, Crown, Layers, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { formatIdr, type AppEditionId } from "@/lib/crm-types";
import {
  APP_EDITIONS,
  EDITION_FEATURE_LABELS,
  getEditionById,
  type EditionFeatureKey,
} from "@/lib/editions";

interface EditionsViewProps {
  currentEditionId: AppEditionId;
  activeAgentsCount: number;
  productsCount: number;
  channelsCount: number;
  onSelectEdition: (editionId: AppEditionId) => void;
}

const ALL_FEATURES = Object.keys(EDITION_FEATURE_LABELS) as EditionFeatureKey[];

function formatLimit(val: number, unit: string): string {
  return val < 0 ? `Unlimited ${unit}` : `${val.toLocaleString("id-ID")} ${unit}`;
}

export function EditionsView({
  currentEditionId,
  activeAgentsCount,
  productsCount,
  channelsCount,
  onSelectEdition,
}: EditionsViewProps) {
  const activeEdition = getEditionById(currentEditionId);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Layers className="h-3.5 w-3.5" />
            WACRM v4.0 Multi-Edition Architecture · 4 Tingkat Versi Produk
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            Edisi &amp; Paket Berjenjang — Dari Starter UMKM hingga Sovereign Corporate
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Setiap edisi mengatur kapasitas agen, batas kontak &amp; cabang, jumlah Agen AI Otonom, Studio Cetak Universal, SEO Omnichannel AI, White-Label penuh, hingga Super Admin &amp; Dedicated Cluster.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/80 px-4 py-3 text-right">
          <div className="text-[11px] font-semibold text-slate-400">Edisi Aktif Workspace Ini</div>
          <div className="mt-0.5 flex items-center justify-end gap-1.5 text-lg font-extrabold text-emerald-400">
            <Crown className="h-4 w-4" /> {activeEdition.name}
          </div>
          <div className="text-[11px] text-slate-400">
            {activeEdition.monthlyPriceIdr === 0
              ? "Gratis Selamanya"
              : `${formatIdr(activeEdition.monthlyPriceIdr)} / bulan`}
          </div>
        </div>
      </div>

      {/* Live Quota Meters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Agen AI Aktif</span>
            <strong className="text-white">
              {activeAgentsCount} / {activeEdition.limits.maxAiAgents}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(100, Math.round((activeAgentsCount / activeEdition.limits.maxAiAgents) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Produk &amp; Kapasitas Kontak</span>
            <strong className="text-white">
              {productsCount} SKU · {formatLimit(activeEdition.limits.maxContacts, "kontak")}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/3 rounded-full bg-cyan-500" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Kanal Omnichannel</span>
            <strong className="text-white">
              {channelsCount} / {activeEdition.limits.maxChannels < 0 ? "∞" : activeEdition.limits.maxChannels}
            </strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${
                  activeEdition.limits.maxChannels < 0
                    ? 40
                    : Math.min(100, Math.round((channelsCount / activeEdition.limits.maxChannels) * 100))
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 4-Tier Edition Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {APP_EDITIONS.map((ed) => {
          const isCurrent = ed.id === currentEditionId;
          return (
            <div
              key={ed.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                isCurrent
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                  : ed.recommended
                    ? "border-indigo-500/50 bg-slate-900/95"
                    : "border-slate-800 bg-slate-900/85"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                    {ed.badge}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      <Check className="h-3 w-3" /> Aktif
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-extrabold text-white">{ed.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{ed.tagline}</p>

                <div className="mt-4 border-y border-slate-800 py-3">
                  <div className="text-2xl font-extrabold text-white">
                    {ed.monthlyPriceIdr === 0 ? "Rp 0" : formatIdr(ed.monthlyPriceIdr)}
                    <span className="text-xs font-normal text-slate-400"> /bln</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {ed.annualPriceIdr === 0
                      ? "Tanpa biaya komitmen"
                      : `Tahunan hemat: ${formatIdr(ed.annualPriceIdr)}/thn`}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Tim: <strong>{formatLimit(ed.limits.maxAgents, "agen")}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    AI: <strong>{ed.limits.maxAiAgents} agen</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Kontak: <strong>{formatLimit(ed.limits.maxContacts, "")}</strong>
                  </div>
                  <div className="rounded-lg bg-slate-950/80 px-2 py-1">
                    Cabang: <strong>{formatLimit(ed.limits.maxWorkspaces, "")}</strong>
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                  {ed.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => onSelectEdition(ed.id)}
                className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  isCurrent
                    ? "cursor-default bg-emerald-500/20 text-emerald-300"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                }`}
              >
                {isCurrent ? (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Sedang Digunakan
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" /> Aktifkan {ed.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <h3 className="text-sm font-bold text-white">
          Matriks Perbandingan Fitur Antar Edisi WACRM v4.0
        </h3>
        <table className="mt-3 w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2.5 pr-4">Kapabilitas &amp; Modul</th>
              {APP_EDITIONS.map((ed) => (
                <th key={ed.id} className="px-3 py-2.5 text-center font-bold text-white">
                  {ed.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {ALL_FEATURES.map((feat) => (
              <tr key={feat} className="hover:bg-slate-800/40">
                <td className="py-2.5 pr-4 font-medium text-slate-200">
                  {EDITION_FEATURE_LABELS[feat]}
                </td>
                {APP_EDITIONS.map((ed) => {
                  const has = ed.features.includes(feat);
                  return (
                    <td key={ed.id} className="px-3 py-2.5 text-center">
                      {has ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
