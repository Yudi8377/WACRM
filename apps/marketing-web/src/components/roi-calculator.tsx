"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Sparkles } from "lucide-react";
import { formatIdr, type CommercialEditionId } from "@/lib/enterprise-catalog";

interface RoiCalculatorProps {
  onSelectEditionForRegistration: (edition: CommercialEditionId) => void;
}

export function RoiCalculator({ onSelectEditionForRegistration }: RoiCalculatorProps) {
  const [branches, setBranches] = useState(4);
  const [staffCount, setStaffCount] = useState(14);
  const [dailyChats, setDailyChats] = useState(180);

  const calc = useMemo(() => {
    // Estimasi konservatif penghematan biaya software terpisah + lembur rekap + lost lead
    const legacySoftwareCost = branches * 450_000 + staffCount * 85_000;
    const savedAdminHoursMonthly = branches * 18 + Math.round(dailyChats * 0.18);
    const laborValueSaved = savedAdminHoursMonthly * 45_000;
    const recoveredRevenueMonthly = dailyChats * 30 * 0.015 * 220_000;

    let recommended: CommercialEditionId = "pro";
    let wacrmMonthlyCost = 249_000;
    let recLabel = "Growth Pro";
    if (branches <= 1 && staffCount <= 2) {
      recommended = "starter";
      wacrmMonthlyCost = 0;
      recLabel = "Starter UMKM (Gratis)";
    } else if (branches > 20 || staffCount > 50) {
      recommended = "sovereign";
      wacrmMonthlyCost = 1_950_000;
      recLabel = "Sovereign Corporate";
    } else if (branches > 5 || staffCount > 10 || dailyChats >= 150) {
      recommended = "enterprise";
      wacrmMonthlyCost = 699_000;
      recLabel = "Enterprise AI";
    }

    const totalMonthlyImpact =
      Math.max(0, legacySoftwareCost - wacrmMonthlyCost) +
      laborValueSaved +
      recoveredRevenueMonthly;
    const roiMultiple =
      wacrmMonthlyCost > 0 ? Math.round((totalMonthlyImpact / wacrmMonthlyCost) * 10) / 10 : 99;

    return {
      recommended,
      recLabel,
      wacrmMonthlyCost,
      savedAdminHoursMonthly,
      totalMonthlyImpact,
      annualImpact: totalMonthlyImpact * 12,
      roiMultiple,
    };
  }, [branches, staffCount, dailyChats]);

  return (
    <section id="roi" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 p-6 md:grid-cols-12 md:p-10">
        <div className="space-y-5 md:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Calculator className="h-3.5 w-3.5" /> Kalkulator ROI &amp; Efisiensi Enterprise
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Hitung Dampak Finansial Konsolidasi Software &amp; Automasi AI
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Geser parameter sesuai skala operasional perusahaan Anda untuk melihat proyeksi
            penghematan jam kerja admin, konsolidasi langganan aplikasi, dan potensi omzet terselamatkan.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold">
                <span className="text-slate-300">Jumlah Cabang / Gudang</span>
                <span className="font-mono text-emerald-300">{branches} Cabang</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={branches}
                onChange={(e) => setBranches(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold">
                <span className="text-slate-300">Jumlah Staf Operasional &amp; Sales</span>
                <span className="font-mono text-emerald-300">{staffCount} Staf</span>
              </div>
              <input
                type="range"
                min={1}
                max={80}
                value={staffCount}
                onChange={(e) => setStaffCount(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-bold">
                <span className="text-slate-300">Volume Chat Prospek WhatsApp / Hari</span>
                <span className="font-mono text-emerald-300">{dailyChats} Chat/Hari</span>
              </div>
              <input
                type="range"
                min={20}
                max={800}
                step={10}
                value={dailyChats}
                onChange={(e) => setDailyChats(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-6 md:col-span-6">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400">Rekomendasi Edisi Terbaik</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-extrabold text-emerald-300">
              <Sparkles className="h-3 w-3" /> {calc.recLabel}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-xs text-slate-400">Estimasi Dampak Efisiensi &amp; Omzet / Bulan</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-emerald-400">
              {formatIdr(calc.totalMonthlyImpact)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Proyeksi tahunan:{" "}
              <strong className="text-white">{formatIdr(calc.annualImpact)} / tahun</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <div className="text-slate-400">Jam Kerja Terhemat</div>
              <div className="mt-1 text-lg font-extrabold text-white">
                {calc.savedAdminHoursMonthly} Jam/bln
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <div className="text-slate-400">Estimasi ROI</div>
              <div className="mt-1 text-lg font-extrabold text-amber-300">
                {calc.wacrmMonthlyCost === 0 ? "∞ (Gratis)" : `${calc.roiMultiple}x Lipat`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectEditionForRegistration(calc.recommended)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-400"
          >
            Daftar &amp; Aktifkan {calc.recLabel} Sekarang <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
