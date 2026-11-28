"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  Bot,
  Boxes,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Crown,
  Database,
  Download,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Lock,
  PieChart,
  RefreshCw,
  Settings,
  TrendingUp,
  Users,
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
  PublisherEmployeeRecord,
  PublisherEmsState,
} from "@/lib/publisher-types";
import type {
  CommunityFeedbackItem,
  PublisherIntelligenceReport,
} from "@/lib/intelligence-types";
import {
  buildDefaultPublisherAiAgents,
  type PublisherAiAgentConfig,
  type PublisherWebsiteLead,
} from "@/lib/publisher-ai-agents";
import {
  buildDefaultWebsiteLeads,
  deleteEmployeeInState,
  insertEmployeeInState,
  updateEmployeeInState,
} from "@/lib/publisher-crud";
import { PUBLISHER_EDITIONS } from "@/lib/license-engine";
import { OverviewView } from "./overview-view";
import { UsageVocView } from "./usage-voc-view";
import { EconomicRadarView } from "./economic-radar-view";
import { ForecastingView } from "./forecasting-view";
import { LicenseManagerView } from "./license-manager-view";
import { MasterDataView } from "./master-data-view";
import { PublisherCrmView } from "./publisher-crm-view";
import { PublisherErpView } from "./publisher-erp-view";
import { PublisherAccountingView } from "./publisher-accounting-view";
import { PublisherSettingsView } from "./publisher-settings-view";
import { PublisherAiHubView, type AiHubSubModule } from "./publisher-ai-hub-view";
import { PublisherHrRbacView, type HrSubModule } from "./publisher-hr-rbac-view";
import { EmsRecordCommandBar } from "./ems-record-command-bar";

type PublisherTabId =
  | "overview"
  | "ai_hub"
  | "master"
  | "licenses"
  | "crm"
  | "erp"
  | "accounting"
  | "hr_rbac"
  | "forecasting"
  | "usage_voc"
  | "economics"
  | "settings";

interface EmsSubNav {
  id: string;
  label: string;
}

interface EmsNavModule {
  id: PublisherTabId;
  code: string;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  subModules?: EmsSubNav[];
}

const EMS_MODULES: EmsNavModule[] = [
  {
    id: "overview",
    code: "M01",
    label: "Executive Command",
    shortLabel: "Overview",
    icon: LayoutDashboard,
    subModules: [{ id: "kpi", label: "KPI, SWOT & Unit Economics" }],
  },
  {
    id: "ai_hub",
    code: "M02",
    label: "Multi-Agent AI (5 Agen)",
    shortLabel: "AI 5-Agen",
    icon: Bot,
    subModules: [
      { id: "inbox_chat", label: "Inbox Chat & Auto-Reply 24/7" },
      { id: "website_leads", label: "Lead Website & Follow-Up WA" },
      { id: "agent_config", label: "Konfigurasi 5 Agen AI" },
    ],
  },
  {
    id: "master",
    code: "M03",
    label: "Master Data (MDM)",
    shortLabel: "Master",
    icon: Database,
    subModules: [
      { id: "tenants", label: "Master Perusahaan Tenant" },
      { id: "skus", label: "Master Produk SKU v5.3" },
      { id: "resellers", label: "Master Reseller Partner" },
      { id: "vendors", label: "Master Vendor Cloud & HW" },
      { id: "coa", label: "Master Bagan Akun (COA)" },
    ],
  },
  {
    id: "licenses",
    code: "M04",
    label: "License Management (LMS)",
    shortLabel: "Lisensi",
    icon: KeyRound,
    subModules: [{ id: "registry", label: "Terbit, Audit & Matriks v5.3" }],
  },
  {
    id: "crm",
    code: "M05",
    label: "CRM B2B & Pipeline",
    shortLabel: "CRM B2B",
    icon: Briefcase,
    subModules: [
      { id: "pipeline", label: "Pipeline Deal B2B" },
      { id: "tickets", label: "Tiket Support SLA Enterprise" },
    ],
  },
  {
    id: "erp",
    code: "M06",
    label: "ERP Billing & Procurement",
    shortLabel: "ERP",
    icon: Boxes,
    subModules: [
      { id: "billing", label: "Invoice Langganan (AR)" },
      { id: "procurement", label: "Purchase Order Vendor (AP)" },
      { id: "inventory", label: "Stok Hardware POS/Printer" },
    ],
  },
  {
    id: "accounting",
    code: "M07",
    label: "Akuntansi Korporat PSAK",
    shortLabel: "Akuntansi",
    icon: BookOpenCheck,
    subModules: [
      { id: "journals", label: "Jurnal Umum Double-Entry" },
      { id: "ledger", label: "Buku Besar (General Ledger)" },
      { id: "trial_balance", label: "Neraca Saldo (Trial Balance)" },
      { id: "income_statement", label: "Laba Rugi (P&L PSAK)" },
      { id: "balance_sheet", label: "Neraca (Balance Sheet)" },
      { id: "cash_flow", label: "Arus Kas (Cash Flow)" },
      { id: "tax", label: "Pajak PPN 11% & PPh" },
    ],
  },
  {
    id: "hr_rbac",
    code: "M08",
    label: "Human Capital & RBAC",
    shortLabel: "HR & RBAC",
    icon: Users,
    subModules: [
      { id: "directory_rbac", label: "Direktori Staf & Peran RBAC" },
      { id: "kpi_commission", label: "Target KPI & Beban Payroll" },
    ],
  },
  {
    id: "forecasting",
    code: "M09",
    label: "AI Revenue Forecasting",
    shortLabel: "Forecast",
    icon: LineChart,
  },
  {
    id: "usage_voc",
    code: "M10",
    label: "Telemetri & Voice of User",
    shortLabel: "Analitik",
    icon: PieChart,
  },
  {
    id: "economics",
    code: "M11",
    label: "Radar Ekonomi UMKM",
    shortLabel: "Ekonomi",
    icon: TrendingUp,
  },
  {
    id: "settings",
    code: "M12",
    label: "Entitas, Integrasi & Installer",
    shortLabel: "Sistem",
    icon: Settings,
  },
];

const AI_LEADS_STORAGE_KEY = "wacrm_publisher_ai_leads_v53";
const AI_AGENTS_STORAGE_KEY = "wacrm_publisher_ai_agents_v53";

export function PublisherEmsApp() {
  const [tab, setTab] = useState<PublisherTabId>("overview");
  const [activeSub, setActiveSub] = useState<string>("kpi");
  const [expandedModule, setExpandedModule] = useState<PublisherTabId>("ai_hub");

  const [state, setState] = useState<PublisherEmsState>(() => buildInitialPublisherState());
  const [leads, setLeads] = useState<PublisherWebsiteLead[]>(() => buildDefaultWebsiteLeads());
  const [aiAgents, setAiAgents] = useState<PublisherAiAgentConfig[]>(() =>
    buildDefaultPublisherAiAgents(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [syncingLeads, setSyncingLeads] = useState(false);
  const [intelligence, setIntelligence] = useState<PublisherIntelligenceReport | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [liveSyncInfo, setLiveSyncInfo] = useState<{ count: number; lastSyncedAt: string | null }>({
    count: 0,
    lastSyncedAt: null,
  });
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);

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

  const persistLeads = useCallback((next: PublisherWebsiteLead[]) => {
    try {
      window.localStorage.setItem(AI_LEADS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const persistAgents = useCallback((next: PublisherAiAgentConfig[]) => {
    try {
      window.localStorage.setItem(AI_AGENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const selectModuleAndSub = useCallback((modId: PublisherTabId, subId?: string) => {
    setTab(modId);
    setExpandedModule(modId);
    const mod = EMS_MODULES.find((m) => m.id === modId);
    setActiveSub(subId ?? mod?.subModules?.[0]?.id ?? "main");
  }, []);

  const syncWebsiteLeads = useCallback(
    async (silent = false) => {
      setSyncingLeads(true);
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { leads?: PublisherWebsiteLead[] };
        const remoteLeads = data.leads ?? [];
        if (remoteLeads.length > 0) {
          setLeads((prev) => {
            const byId = new Map<string, PublisherWebsiteLead>();
            for (const r of remoteLeads) byId.set(r.id, r);
            for (const p of prev) {
              if (!byId.has(p.id)) byId.set(p.id, p);
            }
            const merged = Array.from(byId.values()).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            );
            persistLeads(merged);
            return merged;
          });
        }
        if (!silent) {
          showToast(
            remoteLeads.length > 0
              ? `Sinkronisasi Multi-Agent AI sukses: ${remoteLeads.length} lead live dari Website Enterprise!`
              : "Konektor Lead Website aktif — siap menerima pendaftar otomatis 24/7.",
          );
        }
      } catch {
        if (!silent) {
          showToast("Gagal menarik lead live website — menggunakan cache lokal.", "error");
        }
      } finally {
        setSyncingLeads(false);
      }
    },
    [persistLeads, showToast],
  );

  const syncLiveRegistrations = useCallback(
    async (silent = false) => {
      setSyncingLive(true);
      try {
        const res = await fetch("/api/tenants", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as {
          ok?: boolean;
          count?: number;
          syncedAt?: string;
          tenants?: Array<{
            id: string;
            fullName: string;
            businessName: string;
            email: string;
            phone: string;
            city: string;
            platform: "web" | "android";
            editionId: EditionId;
            licenseStatus:
              | "free_umkm"
              | "trial"
              | "active"
              | "grace_period"
              | "expired"
              | "suspended";
            trialStartedAt: string;
            trialEndsAt: string;
            licenseKey: string | null;
            createdAt: string;
          }>;
        };

        const liveList = payload.tenants ?? [];
        setLiveSyncInfo({
          count: liveList.length,
          lastSyncedAt: payload.syncedAt ?? new Date().toISOString(),
        });

        if (liveList.length > 0) {
          updateState((prev) => {
            const existingByEmail = new Map(
              prev.tenants.map((t) => [t.picEmail.toLowerCase(), t]),
            );
            const mergedTenants = [...prev.tenants];
            const mergedLicenses = [...prev.licenses];

            for (const reg of liveList) {
              const emailKey = reg.email.toLowerCase();
              const existing = existingByEmail.get(emailKey);
              const tenantId = existing?.id ?? reg.id;

              const mappedTenant = {
                id: tenantId,
                code: existing?.code ?? `LIVE-${reg.id.slice(-4).toUpperCase()}`,
                companyName: reg.businessName || reg.fullName,
                npwp: existing?.npwp ?? "-",
                industry:
                  existing?.industry ??
                  (reg.platform === "android" ? "UMKM · Android APK" : "UMKM · Web SaaS"),
                picName: reg.fullName,
                picEmail: reg.email,
                picWhatsapp: reg.phone || existing?.picWhatsapp || "-",
                domain: existing?.domain ?? "wacrm-seven-dusky.vercel.app",
                city: reg.city || "Indonesia",
                resellerId: existing?.resellerId ?? null,
                status:
                  reg.licenseStatus === "active"
                    ? ("active" as const)
                    : ("onboarding" as const),
                monthlyCloudCogsIdr: existing?.monthlyCloudCogsIdr ?? 35000,
                monthlyAiTokenCostIdr: existing?.monthlyAiTokenCostIdr ?? 20000,
                healthScore: existing?.healthScore ?? 92,
                createdAt: reg.createdAt,
                trialEndsAt: reg.trialEndsAt,
                signupPlatform: reg.platform,
                syncedFromLive: true,
              };

              if (existing) {
                const idx = mergedTenants.findIndex((t) => t.id === existing.id);
                if (idx >= 0) mergedTenants[idx] = mappedTenant;
              } else {
                mergedTenants.unshift(mappedTenant);
              }

              const hasLic = mergedLicenses.some((l) => l.tenantId === tenantId);
              if (!hasLic) {
                const spec = PUBLISHER_EDITIONS[reg.editionId];
                const defaultKey =
                  reg.licenseKey ||
                  (reg.editionId === "starter"
                    ? `FREE-UMKM-FOREVER-${tenantId.slice(-4).toUpperCase()}`
                    : reg.editionId === "pro"
                      ? `TRIAL-PRO-14D-${tenantId.slice(-4).toUpperCase()}`
                      : `TRIAL-ENT-7D-${tenantId.slice(-4).toUpperCase()}`);
                mergedLicenses.unshift({
                  id: `lic-live-${tenantId}`,
                  licenseKey: defaultKey,
                  tenantId,
                  tenantName: mappedTenant.companyName,
                  domain: "wacrm-seven-dusky.vercel.app",
                  editionId: reg.editionId,
                  status:
                    reg.licenseStatus === "active" || reg.licenseStatus === "free_umkm"
                      ? "active"
                      : "trial",
                  billingCycle:
                    reg.licenseStatus === "active"
                      ? "monthly"
                      : reg.licenseStatus === "free_umkm"
                        ? "perpetual"
                        : "trial",
                  maxSeats: spec.defaultSeats,
                  usedSeats: 1,
                  maxAiAgents: spec.maxAiAgents,
                  maxBranches: spec.maxBranches,
                  monthlyValueIdr:
                    reg.licenseStatus === "active" ? spec.monthlyPriceIdr : 0,
                  issuedAt: reg.trialStartedAt,
                  expiresAt: reg.trialEndsAt,
                  lastHeartbeatAt: reg.createdAt,
                  entitlements: [...spec.entitlements],
                  notes: `${spec.name} via ${reg.platform === "android" ? "Android APK" : "Web"}`,
                });
              }
            }

            return {
              ...prev,
              tenants: mergedTenants,
              licenses: mergedLicenses,
            };
          });
        }
        if (!silent) {
          showToast(
            liveList.length > 0
              ? `Sinkronisasi berhasil: ${liveList.length} pendaftar live terhubung!`
              : "Terhubung ke server WACRM — belum ada pendaftar baru.",
          );
        }
      } catch {
        if (!silent) {
          showToast("Gagal menyinkronkan pendaftar live dari server WACRM.", "error");
        }
      } finally {
        setSyncingLive(false);
      }
    },
    [showToast, updateState],
  );

  const syncIntelligenceReport = useCallback(
    async (silent = false) => {
      setLoadingIntel(true);
      try {
        const res = await fetch("/api/intelligence", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as {
          ok?: boolean;
          report?: PublisherIntelligenceReport | null;
        };
        if (payload.report) {
          setIntelligence(payload.report);
          if (!silent) {
            showToast("Analitik penggunaan, suara user & statistik ekonomi disinkronkan!");
          }
        }
      } catch {
        if (!silent) {
          showToast("Gagal menarik laporan intelijen dari server WACRM.", "error");
        }
      } finally {
        setLoadingIntel(false);
      }
    },
    [showToast],
  );

  const handleUpdateFeedbackStatus = useCallback(
    async (feedbackId: string, actionStatus: CommunityFeedbackItem["actionStatus"]) => {
      setIntelligence((prev) =>
        prev
          ? {
              ...prev,
              voiceOfCustomer: {
                ...prev.voiceOfCustomer,
                recentFeedback: prev.voiceOfCustomer.recentFeedback.map((f) =>
                  f.id === feedbackId ? { ...f, actionStatus } : f,
                ),
                testimonials: prev.voiceOfCustomer.testimonials.map((t) =>
                  t.id === feedbackId ? { ...t, actionStatus } : t,
                ),
              },
            }
          : prev,
      );
      try {
        const res = await fetch("/api/intelligence", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ feedbackId, actionStatus }),
        });
        if (res.ok) showToast(`Status tindak lanjut diperbarui menjadi "${actionStatus}".`);
      } catch {
        showToast("Status tersimpan lokal, gagal sinkron ke Neon.", "error");
      }
    },
    [showToast],
  );

  useEffect(() => {
    const loaded = loadPublisherState();
    setState(loaded);
    try {
      const savedLeads = window.localStorage.getItem(AI_LEADS_STORAGE_KEY);
      if (savedLeads) {
        const parsed = JSON.parse(savedLeads) as PublisherWebsiteLead[];
        if (Array.isArray(parsed) && parsed.length > 0) setLeads(parsed);
      }
      const savedAgents = window.localStorage.getItem(AI_AGENTS_STORAGE_KEY);
      if (savedAgents) {
        const parsedA = JSON.parse(savedAgents) as PublisherAiAgentConfig[];
        if (Array.isArray(parsedA) && parsedA.length > 0) setAiAgents(parsedA);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
    void syncLiveRegistrations(true);
    void syncWebsiteLeads(true);
    void syncIntelligenceReport(true);
  }, [syncLiveRegistrations, syncWebsiteLeads, syncIntelligenceReport]);

  // ── MULTI-AGENT AI LEAD HANDLERS ──
  function handleInsertLead(lead: PublisherWebsiteLead) {
    setLeads((prev) => {
      const next = [lead, ...prev];
      persistLeads(next);
      return next;
    });
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: lead.fullName,
        companyName: lead.companyName,
        email: lead.email,
        whatsapp: lead.whatsapp || "081200000000",
        city: lead.city,
        industry: lead.industry,
        teamSize: lead.teamSize,
        interestedEdition: lead.interestedEdition,
        source: lead.source,
        notes: lead.notes,
      }),
    }).catch(() => undefined);
    showToast(`Lead baru "${lead.companyName}" ditambahkan & langsung dianalisis 5 Agen AI.`);
  }

  function handleUpdateLead(id: string, patch: Partial<PublisherWebsiteLead>) {
    setLeads((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
      );
      persistLeads(next);
      return next;
    });
    void fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => undefined);
  }

  function handleDeleteLead(id: string) {
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persistLeads(next);
      return next;
    });
    void fetch(`/api/leads?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    showToast("Lead dihapus dari Multi-Agent AI Hub.");
  }

  function handleConvertLeadToDeal(lead: PublisherWebsiteLead) {
    const spec = PUBLISHER_EDITIONS[lead.aiRecommendedEdition];
    updateState((prev) => ({
      ...prev,
      deals: [
        {
          id: `deal-ai-${Date.now()}`,
          code: `DEAL-${String(prev.deals.length + 1).padStart(3, "0")}`,
          companyName: lead.companyName,
          contactName: lead.fullName,
          contactWhatsapp: lead.whatsapp,
          contactEmail: lead.email,
          industry: lead.industry,
          targetEdition: lead.aiRecommendedEdition,
          billingCycle: "annual",
          requestedSeats: spec.defaultSeats,
          dealValueIdr: spec.annualPriceIdr || 2_390_000,
          probability: Math.min(90, Math.max(40, lead.aiScore)),
          stage: "proposal",
          ownerEmployeeId: prev.employees[0]?.id ?? "emp-01",
          resellerId: null,
          expectedCloseDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
          notes: `Konversi otomatis dari Multi-Agent AI (${lead.registrationCode}) · ${lead.notes}`,
        },
        ...prev.deals,
      ],
    }));
    handleUpdateLead(lead.id, { status: "converted", followUpStage: "closed" });
    showToast(`Lead "${lead.companyName}" berhasil dikonversi ke Pipeline CRM B2B!`);
    selectModuleAndSub("crm", "pipeline");
  }

  function handleUpdateAiAgent(
    id: PublisherAiAgentConfig["id"],
    patch: Partial<PublisherAiAgentConfig>,
  ) {
    setAiAgents((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      persistAgents(next);
      return next;
    });
    showToast("Konfigurasi Agen AI diperbarui.");
  }

  // ── HR & RBAC HANDLERS ──
  function handleInsertEmployee(emp: Omit<PublisherEmployeeRecord, "id" | "code">) {
    updateState((prev) => insertEmployeeInState(prev, emp));
    showToast(`Staf baru "${emp.name}" berhasil ditambahkan (INSERT).`);
  }

  function handleUpdateEmployee(id: string, patch: Partial<PublisherEmployeeRecord>) {
    updateState((prev) => updateEmployeeInState(prev, id, patch));
    showToast("Data staf & RBAC diperbarui (UPDATE).");
  }

  function handleDeleteEmployee(id: string) {
    updateState((prev) => deleteEmployeeInState(prev, id));
    showToast("Data staf dihapus (DELETE).");
  }

  // ── LICENSE, CRM, ERP, ACCOUNTING HANDLERS ──
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
      const targetTenant = state.tenants.find((t) => t.id === input.tenantId);
      if (targetTenant?.syncedFromLive && issuedKey) {
        void fetch("/api/tenants", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: targetTenant.picEmail,
            tenantId: targetTenant.id,
            editionId: input.editionId,
            licenseStatus: "active",
            licenseKey: issuedKey,
          }),
        }).catch(() => undefined);
      }
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
      showToast(`Deal Closed Won! Lisensi ${key}, Invoice ${invNo}, & Jurnal PSAK otomatis terbit.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengonversi deal.", "error");
    }
  }

  function handleMarkInvoicePaid(invoiceId: string) {
    updateState((prev) => markInvoicePaidInState(prev, invoiceId));
    showToast("Invoice dilunasi — Jurnal Double-Entry PSAK & lisensi otomatis diperbarui.");
  }

  function handlePayVendorPo(poId: string) {
    updateState((prev) => payVendorPoInState(prev, poId));
    showToast("PO Vendor dibayar — Stok Hardware & Jurnal COGS/PPN otomatis diposting.");
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
    const freshLeads = buildDefaultWebsiteLeads();
    setLeads(freshLeads);
    persistLeads(freshLeads);
    showToast("Data Publisher HQ direset ke kondisi awal.");
  }

  const currentModuleObj = EMS_MODULES.find((m) => m.id === tab) ?? EMS_MODULES[0];
  const currentSubObj = currentModuleObj.subModules?.find((s) => s.id === activeSub);
  const activeAgentsCount = aiAgents.filter((a) => a.isActive).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Standard Enterprise Header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 text-slate-950 shadow-lg">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-white">
                WACRM Publisher HQ
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                Standard EMS v5.3.1
              </span>
              <button
                type="button"
                onClick={() => selectModuleAndSub("ai_hub", "inbox_chat")}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 hover:bg-emerald-500/30"
              >
                <Bot className="h-3 w-3" /> {activeAgentsCount} Agen AI Aktif ({leads.length} Lead)
              </button>
            </div>
            <div className="text-[11px] text-slate-400">
              {state.profile.companyName} · NPWP {state.profile.npwp} ·{" "}
              <span className="text-emerald-400">
                EMS / {currentModuleObj.code} {currentModuleObj.label}
                {currentSubObj ? ` / ${currentSubObj.label}` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/downloads/WACRM-Publisher-HQ-v5.3-Windows-Offline-Installer.zip"
            download
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
            title="Unduh Offline Windows Installer (instalasi 100% offline, operasi online)"
          >
            <Download className="h-3.5 w-3.5" />
            Windows Offline Installer
          </a>
          <button
            type="button"
            disabled={syncingLive || syncingLeads}
            onClick={() => {
              void syncLiveRegistrations(false);
              void syncWebsiteLeads(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncingLive || syncingLeads ? "animate-spin" : ""}`} />
            Sync Live ({liveSyncInfo.count} Tenant · {leads.length} Lead)
          </button>
          <a
            href="https://wacrm-seven-dusky.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/20 xl:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" /> App Klien
          </a>
          <span className="hidden items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 2xl:inline-flex">
            <Lock className="h-3 w-3 text-emerald-400" />
            Internal Private EMS
          </span>
        </div>
      </header>

      {/* Main Enterprise Shell */}
      <div className="flex flex-1">
        {/* Hierarchical Standard Enterprise Sidebar (Modules -> Sub-Modules) */}
        <aside className="hidden w-72 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 p-3.5 md:flex">
          <div className="space-y-1 overflow-y-auto pr-1">
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <span>Struktur Modul EMS (12 Modul)</span>
              <span className="text-emerald-400">{hydrated ? "ONLINE" : "..."}</span>
            </div>
            {EMS_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActiveMod = tab === mod.id;
              const isExpanded = expandedModule === mod.id || isActiveMod;
              const hasSubs = Boolean(mod.subModules && mod.subModules.length > 0);
              return (
                <div key={mod.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isActiveMod && hasSubs) {
                        setExpandedModule(expandedModule === mod.id ? "overview" : mod.id);
                      } else {
                        selectModuleAndSub(mod.id);
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                      isActiveMod
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        <span className="mr-1 font-mono text-[10px] opacity-70">{mod.code}</span>
                        {mod.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {mod.id === "ai_hub" && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] font-extrabold ${
                            isActiveMod
                              ? "bg-slate-950/20 text-slate-950"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {leads.length}
                        </span>
                      )}
                      {hasSubs &&
                        (isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                        ))}
                    </span>
                  </button>

                  {hasSubs && isExpanded && (
                    <div className="ml-4 space-y-0.5 border-l border-slate-800 pl-2.5 pt-0.5">
                      {mod.subModules!.map((sub) => {
                        const subActive = isActiveMod && activeSub === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => selectModuleAndSub(mod.id, sub.id)}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition ${
                              subActive
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            <span className="truncate">• {sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 text-[11px] text-slate-400">
            <div className="font-bold text-amber-300">Standard Enterprise EMS</div>
            <p className="mt-1 leading-relaxed">
              Seluruh modul dilengkapi navigasi sub-modul, tombol <strong>Insert, Update, Delete, Cetak &amp; CSV</strong>, serta <strong>5 Agen AI</strong> yang terhubung ke Website Enterprise.
            </p>
          </div>
        </aside>

        {/* Active Module Content */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-8">
          <div className="mx-auto max-w-7xl">
            {tab === "overview" && (
              <>
                <EmsRecordCommandBar
                  target="overview"
                  moduleTitle="Executive Command Center"
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <OverviewView
                  state={state}
                  onNavigate={(next) => selectModuleAndSub(next as PublisherTabId)}
                  onQuickCollectOverdue={handleMarkInvoicePaid}
                  onSyncLive={() => {
                    void syncLiveRegistrations(false);
                    void syncWebsiteLeads(false);
                    void syncIntelligenceReport(true);
                  }}
                  syncingLive={syncingLive}
                />
              </>
            )}

            {tab === "ai_hub" && (
              <PublisherAiHubView
                profile={state.profile}
                subModule={
                  (["inbox_chat", "website_leads", "agent_config"].includes(activeSub)
                    ? activeSub
                    : "inbox_chat") as AiHubSubModule
                }
                onSelectSubModule={(sub) => setActiveSub(sub)}
                leads={leads}
                agents={aiAgents}
                syncingLeads={syncingLeads}
                onSyncLeads={() => void syncWebsiteLeads(false)}
                onInsertLead={handleInsertLead}
                onUpdateLead={handleUpdateLead}
                onDeleteLead={handleDeleteLead}
                onConvertLeadToDeal={handleConvertLeadToDeal}
                onUpdateAgent={handleUpdateAiAgent}
              />
            )}

            {tab === "master" && (
              <>
                <EmsRecordCommandBar
                  target={activeSub === "skus" ? "master_skus" : "master_tenants"}
                  moduleTitle={
                    activeSub === "skus" ? "Master Produk SKU v5.3" : "Master Data Perusahaan Tenant"
                  }
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <MasterDataView
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                  externalSubTab={
                    (["tenants", "skus", "resellers", "vendors", "employees", "coa"].includes(
                      activeSub,
                    )
                      ? activeSub
                      : "tenants") as "tenants" | "skus" | "resellers" | "vendors" | "employees" | "coa"
                  }
                />
              </>
            )}

            {tab === "licenses" && (
              <>
                <EmsRecordCommandBar
                  target="licenses"
                  moduleTitle="License Management (LMS)"
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <LicenseManagerView
                  state={state}
                  onIssueLicense={handleIssueLicense}
                  onMutateLicense={handleMutateLicense}
                  onToast={showToast}
                />
              </>
            )}

            {tab === "crm" && (
              <>
                <EmsRecordCommandBar
                  target={activeSub === "tickets" ? "crm_tickets" : "crm_deals"}
                  moduleTitle={
                    activeSub === "tickets" ? "Tiket Support SLA Enterprise" : "Pipeline Deal B2B CRM"
                  }
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <PublisherCrmView
                  state={state}
                  onUpdateState={updateState}
                  onConvertDealWon={handleConvertDealWon}
                  onToast={showToast}
                  externalSubTab={activeSub === "tickets" ? "tickets" : "pipeline"}
                />
              </>
            )}

            {tab === "erp" && (
              <>
                <EmsRecordCommandBar
                  target={activeSub === "procurement" ? "erp_pos" : "erp_invoices"}
                  moduleTitle={
                    activeSub === "procurement"
                      ? "Purchase Order Vendor (AP)"
                      : "Commercial Invoice & Billing (AR)"
                  }
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <PublisherErpView
                  state={state}
                  onUpdateState={updateState}
                  onMarkInvoicePaid={handleMarkInvoicePaid}
                  onPayVendorPo={handlePayVendorPo}
                  onToast={showToast}
                  externalSubTab={
                    (["billing", "procurement", "inventory"].includes(activeSub)
                      ? activeSub
                      : "billing") as "billing" | "procurement" | "inventory"
                  }
                />
              </>
            )}

            {tab === "accounting" && (
              <>
                <EmsRecordCommandBar
                  target="accounting"
                  moduleTitle="Akuntansi Korporat PSAK 72"
                  state={state}
                  onUpdateState={updateState}
                  onToast={showToast}
                />
                <PublisherAccountingView
                  state={state}
                  onUpdateState={updateState}
                  onRunRevenueRecognition={handleRunRevRec}
                  onToast={showToast}
                  externalSubTab={
                    ([
                      "journals",
                      "ledger",
                      "trial_balance",
                      "income_statement",
                      "balance_sheet",
                      "cash_flow",
                      "tax",
                    ].includes(activeSub)
                      ? activeSub
                      : "journals") as
                      | "journals"
                      | "ledger"
                      | "trial_balance"
                      | "income_statement"
                      | "balance_sheet"
                      | "cash_flow"
                      | "tax"
                  }
                />
              </>
            )}

            {tab === "hr_rbac" && (
              <PublisherHrRbacView
                profile={state.profile}
                subModule={activeSub === "kpi_commission" ? "kpi_commission" : "directory_rbac"}
                onSelectSubModule={(s) => setActiveSub(s)}
                employees={state.employees}
                onInsertEmployee={handleInsertEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}

            {tab === "forecasting" && (
              <ForecastingView
                report={intelligence}
                loading={loadingIntel}
                onRefresh={() => void syncIntelligenceReport(false)}
              />
            )}

            {tab === "usage_voc" && (
              <UsageVocView
                report={intelligence}
                loading={loadingIntel}
                onRefresh={() => void syncIntelligenceReport(false)}
                onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
              />
            )}

            {tab === "economics" && (
              <EconomicRadarView
                report={intelligence}
                loading={loadingIntel}
                onRefresh={() => void syncIntelligenceReport(false)}
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
        {EMS_MODULES.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectModuleAndSub(item.id)}
              className={`flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold ${
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
