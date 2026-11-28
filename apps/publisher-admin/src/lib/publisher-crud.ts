import type {
  ChartOfAccountRecord,
  CrmDealRecord,
  JournalEntryRecord,
  LicenseRecord,
  ProductSkuRecord,
  PublisherEmployeeRecord,
  PublisherEmsState,
  ResellerPartnerRecord,
  SubscriptionInvoiceRecord,
  SupportTicketRecord,
  TenantCustomerRecord,
  VendorPurchaseOrderRecord,
  VendorRecord,
} from "./publisher-types";
import type { PublisherWebsiteLead } from "./publisher-ai-agents";
import { qualifyWebsiteLead } from "./publisher-ai-agents";

export function exportEmsRowsToCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
): void {
  if (typeof window === "undefined") return;
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── TENANTS CRUD ──
export function updateTenantInState(
  state: PublisherEmsState,
  tenantId: string,
  patch: Partial<TenantCustomerRecord>,
): PublisherEmsState {
  return {
    ...state,
    tenants: state.tenants.map((t) => (t.id === tenantId ? { ...t, ...patch, id: t.id } : t)),
  };
}

export function deleteTenantInState(
  state: PublisherEmsState,
  tenantId: string,
): PublisherEmsState {
  return {
    ...state,
    tenants: state.tenants.filter((t) => t.id !== tenantId),
  };
}

// ── SKU CRUD ──
export function updateSkuInState(
  state: PublisherEmsState,
  skuId: string,
  patch: Partial<ProductSkuRecord>,
): PublisherEmsState {
  return {
    ...state,
    skus: state.skus.map((s) => (s.id === skuId ? { ...s, ...patch, id: s.id } : s)),
  };
}

export function deleteSkuInState(state: PublisherEmsState, skuId: string): PublisherEmsState {
  return {
    ...state,
    skus: state.skus.filter((s) => s.id !== skuId),
  };
}

// ── VENDOR CRUD ──
export function updateVendorInState(
  state: PublisherEmsState,
  vendorId: string,
  patch: Partial<VendorRecord>,
): PublisherEmsState {
  return {
    ...state,
    vendors: state.vendors.map((v) => (v.id === vendorId ? { ...v, ...patch, id: v.id } : v)),
  };
}

export function deleteVendorInState(state: PublisherEmsState, vendorId: string): PublisherEmsState {
  return {
    ...state,
    vendors: state.vendors.filter((v) => v.id !== vendorId),
  };
}

// ── RESELLER CRUD ──
export function updateResellerInState(
  state: PublisherEmsState,
  resellerId: string,
  patch: Partial<ResellerPartnerRecord>,
): PublisherEmsState {
  return {
    ...state,
    resellers: state.resellers.map((r) => (r.id === resellerId ? { ...r, ...patch, id: r.id } : r)),
  };
}

export function deleteResellerInState(
  state: PublisherEmsState,
  resellerId: string,
): PublisherEmsState {
  return {
    ...state,
    resellers: state.resellers.filter((r) => r.id !== resellerId),
  };
}

// ── COA CRUD ──
export function updateCoaInState(
  state: PublisherEmsState,
  code: string,
  patch: Partial<ChartOfAccountRecord>,
): PublisherEmsState {
  return {
    ...state,
    coa: state.coa.map((c) => (c.code === code ? { ...c, ...patch, code: c.code } : c)),
  };
}

export function deleteCoaInState(state: PublisherEmsState, code: string): PublisherEmsState {
  return {
    ...state,
    coa: state.coa.filter((c) => c.code !== code || c.isSystem),
  };
}

// ── LICENSE CRUD ──
export function updateLicenseInState(
  state: PublisherEmsState,
  licenseId: string,
  patch: Partial<LicenseRecord>,
): PublisherEmsState {
  return {
    ...state,
    licenses: state.licenses.map((l) => (l.id === licenseId ? { ...l, ...patch, id: l.id } : l)),
  };
}

export function deleteLicenseInState(
  state: PublisherEmsState,
  licenseId: string,
): PublisherEmsState {
  return {
    ...state,
    licenses: state.licenses.filter((l) => l.id !== licenseId),
  };
}

// ── CRM DEALS & TICKETS CRUD ──
export function updateDealInState(
  state: PublisherEmsState,
  dealId: string,
  patch: Partial<CrmDealRecord>,
): PublisherEmsState {
  return {
    ...state,
    deals: state.deals.map((d) => (d.id === dealId ? { ...d, ...patch, id: d.id } : d)),
  };
}

export function deleteDealInState(state: PublisherEmsState, dealId: string): PublisherEmsState {
  return {
    ...state,
    deals: state.deals.filter((d) => d.id !== dealId),
  };
}

export function updateTicketInState(
  state: PublisherEmsState,
  ticketId: string,
  patch: Partial<SupportTicketRecord>,
): PublisherEmsState {
  return {
    ...state,
    tickets: state.tickets.map((t) => (t.id === ticketId ? { ...t, ...patch, id: t.id } : t)),
  };
}

export function deleteTicketInState(state: PublisherEmsState, ticketId: string): PublisherEmsState {
  return {
    ...state,
    tickets: state.tickets.filter((t) => t.id !== ticketId),
  };
}

// ── ERP INVOICE & PO CRUD ──
export function updateInvoiceInState(
  state: PublisherEmsState,
  invoiceId: string,
  patch: Partial<SubscriptionInvoiceRecord>,
): PublisherEmsState {
  return {
    ...state,
    invoices: state.invoices.map((i) => (i.id === invoiceId ? { ...i, ...patch, id: i.id } : i)),
  };
}

export function deleteInvoiceInState(
  state: PublisherEmsState,
  invoiceId: string,
): PublisherEmsState {
  return {
    ...state,
    invoices: state.invoices.filter((i) => i.id !== invoiceId),
  };
}

export function updatePoInState(
  state: PublisherEmsState,
  poId: string,
  patch: Partial<VendorPurchaseOrderRecord>,
): PublisherEmsState {
  return {
    ...state,
    purchaseOrders: state.purchaseOrders.map((p) => (p.id === poId ? { ...p, ...patch, id: p.id } : p)),
  };
}

export function deletePoInState(state: PublisherEmsState, poId: string): PublisherEmsState {
  return {
    ...state,
    purchaseOrders: state.purchaseOrders.filter((p) => p.id !== poId),
  };
}

// ── ACCOUNTING JOURNAL CRUD ──
export function updateJournalInState(
  state: PublisherEmsState,
  journalId: string,
  patch: Partial<Pick<JournalEntryRecord, "date" | "reference" | "description">>,
): PublisherEmsState {
  return {
    ...state,
    journals: state.journals.map((j) => (j.id === journalId ? { ...j, ...patch } : j)),
  };
}

export function deleteJournalInState(
  state: PublisherEmsState,
  journalId: string,
): PublisherEmsState {
  return {
    ...state,
    journals: state.journals.filter((j) => j.id !== journalId || j.sourceModule === "opening"),
  };
}

// ── INTERNAL HR & RBAC STAFF CRUD ──
export function insertEmployeeInState(
  state: PublisherEmsState,
  emp: Omit<PublisherEmployeeRecord, "id" | "code">,
): PublisherEmsState {
  const num = state.employees.length + 1;
  const record: PublisherEmployeeRecord = {
    ...emp,
    id: `emp-${Date.now()}`,
    code: `EMP-${String(num).padStart(3, "0")}`,
  };
  return {
    ...state,
    employees: [record, ...state.employees],
  };
}

export function updateEmployeeInState(
  state: PublisherEmsState,
  employeeId: string,
  patch: Partial<PublisherEmployeeRecord>,
): PublisherEmsState {
  return {
    ...state,
    employees: state.employees.map((e) => (e.id === employeeId ? { ...e, ...patch, id: e.id } : e)),
  };
}

export function deleteEmployeeInState(
  state: PublisherEmsState,
  employeeId: string,
): PublisherEmsState {
  return {
    ...state,
    employees: state.employees.filter((e) => e.id !== employeeId),
  };
}

export function buildDefaultWebsiteLeads(): PublisherWebsiteLead[] {
  const q1 = qualifyWebsiteLead({
    fullName: "Hendra Kusuma",
    companyName: "PT Sinar Logistik Nusantara",
    interestedEdition: "sovereign",
    teamSize: "50-150 orang",
    industry: "Distribusi & Multi-Cabang",
    city: "Surabaya",
    notes: "Butuh ERP Multi-Cabang, HRD Payroll 80 karyawan, Akuntansi PSAK/SPT dan Strategi Marketing AI.",
  });
  const q2 = qualifyWebsiteLead({
    fullName: "Siti Rahmawati",
    companyName: "CV Kedai Kopi & Bakery Harmoni",
    interestedEdition: "pro",
    teamSize: "10-20 orang",
    industry: "F&B & Retail",
    city: "Kediri",
    notes: "Cari POS kasir thermal, scanner QR FIFO gudang bahan baku, dan balas chat WA otomatis.",
  });
  return [
    {
      id: "lead-demo-01",
      registrationCode: "WCRM-2026-8401",
      fullName: "Hendra Kusuma",
      companyName: "PT Sinar Logistik Nusantara",
      email: "hendra@sinarlogistik.co.id",
      whatsapp: "081234556677",
      city: "Surabaya",
      industry: "Distribusi & Multi-Cabang",
      teamSize: "50-150 orang",
      interestedEdition: "sovereign",
      source: "enterprise_website",
      notes: "Butuh ERP Multi-Cabang, HRD Payroll 80 karyawan, Akuntansi PSAK/SPT dan Strategi Marketing AI.",
      status: "qualified",
      aiScore: q1.aiScore,
      aiRecommendedEdition: q1.aiRecommendedEdition,
      aiWelcomeReply: q1.aiWelcomeReply,
      followUpStage: "H+1",
      lastFollowUpAt: "2026-11-26T08:15:00.000Z",
      messages: [
        {
          id: "m1",
          sender: "prospect",
          text: "Kami punya 6 cabang distribusi dan 80 staf. Apakah WACRM Sovereign sudah ada HRD Payroll + Akuntansi PSAK?",
          timestamp: "2026-11-26T08:10:00.000Z",
        },
        {
          id: "m2",
          sender: "ai_agent",
          agentId: "ai_concierge",
          agentName: "Nadia AI · Sales Concierge 24/7",
          text: q1.aiWelcomeReply,
          timestamp: "2026-11-26T08:10:04.000Z",
        },
      ],
      createdAt: "2026-11-26T08:10:00.000Z",
      updatedAt: "2026-11-26T08:15:00.000Z",
    },
    {
      id: "lead-demo-02",
      registrationCode: "WCRM-2026-8402",
      fullName: "Siti Rahmawati",
      companyName: "CV Kedai Kopi & Bakery Harmoni",
      email: "siti@harmonikopi.id",
      whatsapp: "085611223344",
      city: "Kediri",
      industry: "F&B & Retail",
      teamSize: "10-20 orang",
      interestedEdition: "pro",
      source: "website_ai_chat",
      notes: "Cari POS kasir thermal, scanner QR FIFO gudang bahan baku, dan balas chat WA otomatis.",
      status: "ai_engaged",
      aiScore: q2.aiScore,
      aiRecommendedEdition: q2.aiRecommendedEdition,
      aiWelcomeReply: q2.aiWelcomeReply,
      followUpStage: "H+0",
      lastFollowUpAt: "2026-11-26T10:20:00.000Z",
      messages: [
        {
          id: "m3",
          sender: "prospect",
          text: "Halo, apakah ada trial 14 hari untuk Growth Pro dan printer kasir bluetooth?",
          timestamp: "2026-11-26T10:19:00.000Z",
        },
        {
          id: "m4",
          sender: "ai_agent",
          agentId: "ai_qualifier",
          agentName: "Bima AI · BANT Deal Qualifier",
          text: q2.aiWelcomeReply,
          timestamp: "2026-11-26T10:19:03.000Z",
        },
      ],
      createdAt: "2026-11-26T10:19:00.000Z",
      updatedAt: "2026-11-26T10:20:00.000Z",
    },
  ];
}
