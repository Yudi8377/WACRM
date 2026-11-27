"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  Boxes,
  Briefcase,
  Crown,
  Database,
  KeyRound,
  LayoutDashboard,
  Lock,
  Settings,
} from "lucide-react";
import {
  buildInitialPublisherState,
  convertDealToClosedWonInState,
  issueLicenseInState,
  loadPublisherState,
  markInvoicePaidInState,
  mutateLicenseInState,
  payVendorPoInState,
  resetPublisherState,
  runMonthlyRevenueRecognitionInState,
  savePublisherState,
} from "@/lib/publisher-store";
import type {
  BillingCycle,
  EditionId,
  PublisherCompanyProfile,
  PublisherEmsState,
} from "@/lib/publisher-types";
import { OverviewView } from "./overview-view";
import { LicenseManagerView } from "./license-manager-view";
import { MasterDataView } from "./master-data-view";
import { PublisherCrmView } from "./publisher-crm-view";
import { PublisherErpView } from "./publisher-erp-view";
import { PublisherAccountingView } from "./publisher-accounting-view";
import { PublisherSettingsView } from "./publisher-settings-view";

type PublisherTabId =
  | "overview"
  | "licenses"
  | "master"
  | "crm"
  | "erp"
  | "accounting"
  | "settings";

const NAV_ITEMS: Array<{
  id: PublisherTabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Executive Command", shortLabel: "Overview", icon: LayoutDashboard },
  { id: "licenses", label: "License Management", shortLabel: "Lisensi", icon: KeyRound },
  { id: "master", label: "Master Data", shortLabel: "Master", icon: Database },
  { id: "crm", label: "Publisher CRM B2B", shortLabel: "CRM B2B", icon: Briefcase },
  { id: "erp", label: "Publisher ERP & Billing", shortLabel: "ERP", icon: Boxes },
  { id: "accounting", label: "Akuntansi PSAK", shortLabel: "Akuntansi", icon: BookOpenCheck },
  { id: "settings", label: "Entitas & Keamanan", shortLabel: "Atur", icon: Settings },
];

export function PublisherEmsApp() {
  const [tab, setTab] = useState<PublisherTabId>("overview");
  const [state, setState] = useState<PublisherEmsState>(() => buildInitialPublisherState());
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    const loaded = loadPublisherState();
    setState(loaded);
    setHydrated(true);
  }, []);

  const showToast = useCallback((text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast((curr) => (curr?.text === text ? null : curr)), 4500);
  }, []);

  const updateState = useCallback((updater: (prev: PublisherEmsState) => PublisherEmsState) => {
    setState((prev) => {
      const next = updater(prev);
      savePublisherState(next);
      return next;
    });
  }, []);

  function handleIssueLicense(input: {
    tenantId: string;
    editionId: EditionId;
    billingCycle: BillingCycle;
    maxSeats: number;
    expiryYear: number;
    expiryMonth: number;
    domain: string;
    notes: string;
  }) {
    try {
      let issuedKey = "";
      updateState((prev) => {
        const res = issueLicenseInState(prev, input);
        issuedKey = res.license.licenseKey;
        return res.state;
      });
      showToast(`License Key resmi diterbitkan: ${issuedKey}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menerbitkan lisensi.", "error");
    }
  }

  function handleMutateLicense(
    licenseId: string,
    action: "renew_12m" | "suspend" | "reactivate" | "revoke" | "upgrade",
    upgradeEdition?: EditionId,
  ) {
    updateState((prev) => mutateLicenseInState(prev, licenseId, action, upgradeEdition));
    showToast(`Status lisensi diperbarui (${action}).`);
  }

  function handleConvertDealWon(dealId: string) {
    try {
      let key = "";
      let invNo = "";
      updateState((prev) => {
        const res = convertDealToClosedWonInState(prev, dealId);
        key = res.license.licenseKey;
        invNo = res.invoice.invoiceNumber;
        return res.state;
      });
      showToast(
        `Deal Closed Won! Lisensi ${key}, Invoice ${invNo}, dan Jurnal PSAK otomatis terbit.`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengonversi deal.", "error");
    }
  }

  function handleMarkInvoicePaid(invoiceId: string) {
    updateState((prev) => markInvoicePaidInState(prev, invoiceId));
    showToast("Invoice dilunasi — Jurnal Double-Entry PSAK & status lisensi otomatis diperbarui.");
  }

  function handlePayVendorPo(poId: string) {
    updateState((prev) => payVendorPoInState(prev, poId));
    showToast("PO Vendor dibayar — Stok Hardware & Jurnal COGS/PPN Masukan otomatis diposting.");
  }

  function handleRunRevRec(amountIdr: number, periodLabel: string) {
    try {
      updateState((prev) => runMonthlyRevenueRecognitionInState(prev, amountIdr, periodLabel));
      showToast(`Pengakuan Pendapatan Bulanan PSAK 72 (${periodLabel}) berhasil diposting!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menjalankan amortisasi.", "error");
    }
  }

  function handleSaveProfile(profile: PublisherCompanyProfile) {
    updateState((prev) => ({ ...prev, profile }));
    showToast("Profil legal perusahaan penerbit disimpan.");
  }

  function handleResetDemo() {
    if (!window.confirm("Kembalikan seluruh data Publisher HQ ke dataset awal?")) return;
    const fresh = resetPublisherState();
    setState(fresh);
    showToast("Data Publisher HQ direset ke kondisi awal.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 text-slate-950 shadow-lg">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-white">
                WACRM Publisher HQ
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                Super Admin EMS
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {state.profile.companyName} · NPWP {state.profile.npwp}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            Private Internal App (noindex)
          </span>
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-300">
            {hydrated ? `${state.licenses.length} Lisensi · ${state.journals.length} Jurnal PSAK` : "Memuat..."}
          </span>
        </div>
      </header>

      {/* Main Shell */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 p-4 md:flex">
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                    active
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 text-[11px] text-slate-400">
            <div className="font-bold text-amber-300">Aplikasi Terpisah Penerbit</div>
            <p className="mt-1 leading-relaxed">
              License Key yang diterbitkan di sini dapat langsung disalin dan diaktifkan pada
              aplikasi klien <strong>WACRM</strong> (menu <em>Edisi &amp; Lisensi</em>).
            </p>
          </div>
        </aside>

        {/* Active Module Content */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-8">
          <div className="mx-auto max-w-7xl">
            {tab === "overview" && (
              <OverviewView
                state={state}
                onNavigate={(next) => setTab(next as PublisherTabId)}
                onQuickCollectOverdue={handleMarkInvoicePaid}
              />
            )}
            {tab === "licenses" && (
              <LicenseManagerView
                state={state}
                onIssueLicense={handleIssueLicense}
                onMutateLicense={handleMutateLicense}
                onToast={showToast}
              />
            )}
            {tab === "master" && (
              <MasterDataView
                state={state}
                onUpdateState={updateState}
                onToast={showToast}
              />
            )}
            {tab === "crm" && (
              <PublisherCrmView
                state={state}
                onUpdateState={updateState}
                onConvertDealWon={handleConvertDealWon}
                onToast={showToast}
              />
            )}
            {tab === "erp" && (
              <PublisherErpView
                state={state}
                onUpdateState={updateState}
                onMarkInvoicePaid={handleMarkInvoicePaid}
                onPayVendorPo={handlePayVendorPo}
                onToast={showToast}
              />
            )}
            {tab === "accounting" && (
              <PublisherAccountingView
                state={state}
                onUpdateState={updateState}
                onRunRevenueRecognition={handleRunRevRec}
                onToast={showToast}
              />
            )}
            {tab === "settings" && (
              <PublisherSettingsView
                state={state}
                onSaveProfile={handleSaveProfile}
                onResetDemo={handleResetDemo}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex overflow-x-auto border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex min-w-[74px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold ${
                active ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-2.5 text-xs font-bold text-white shadow-2xl md:bottom-6 ${
            toast.tone === "error" ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
