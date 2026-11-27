"use client";

import { useState, type FormEvent } from "react";
import {
  Briefcase,
  CheckCircle2,
  Headphones,
  Plus,
  Rocket,
  Sparkles,
  X,
} from "lucide-react";
import { PUBLISHER_EDITIONS } from "@/lib/license-engine";
import {
  formatIdr,
  type BillingCycle,
  type CrmDealRecord,
  type DealStage,
  type EditionId,
  type PublisherEmsState,
  type SupportTicketRecord,
  type TicketPriority,
} from "@/lib/publisher-types";

interface PublisherCrmViewProps {
  state: PublisherEmsState;
  onUpdateState: (updater: (prev: PublisherEmsState) => PublisherEmsState) => void;
  onConvertDealWon: (dealId: string) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

const STAGE_META: Record<DealStage, { label: string; color: string }> = {
  lead: { label: "Lead Masuk", color: "bg-slate-800 text-slate-300" },
  discovery: { label: "Discovery & Demo", color: "bg-cyan-500/20 text-cyan-300" },
  proposal: { label: "Proposal", color: "bg-indigo-500/20 text-indigo-300" },
  trial_poc: { label: "Trial / PoC", color: "bg-violet-500/20 text-violet-300" },
  negotiation: { label: "Negosiasi", color: "bg-amber-500/20 text-amber-300" },
  closed_won: { label: "Closed Won", color: "bg-emerald-500/20 text-emerald-300" },
  closed_lost: { label: "Closed Lost", color: "bg-rose-500/20 text-rose-300" },
};

export function PublisherCrmView({
  state,
  onUpdateState,
  onConvertDealWon,
  onToast,
}: PublisherCrmViewProps) {
  const [subTab, setSubTab] = useState<"pipeline" | "tickets">("pipeline");
  const [dealModal, setDealModal] = useState(false);
  const [ticketModal, setTicketModal] = useState(false);

  const [dealForm, setDealForm] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactWhatsapp: "+628",
    industry: "Retail & Distribusi",
    targetEdition: "enterprise" as EditionId,
    billingCycle: "annual" as BillingCycle,
    requestedSeats: 40,
    resellerId: "",
    notes: "",
  });

  const [ticketForm, setTicketForm] = useState({
    tenantId: state.tenants[0]?.id ?? "",
    subject: "",
    category: "technical" as SupportTicketRecord["category"],
    priority: "p2_high" as TicketPriority,
  });

  function handleCreateDeal(e: FormEvent) {
    e.preventDefault();
    const spec = PUBLISHER_EDITIONS[dealForm.targetEdition];
    const value =
      dealForm.billingCycle === "annual" ? spec.annualPriceIdr : spec.monthlyPriceIdr;

    const next: CrmDealRecord = {
      id: `dl-${Date.now().toString(36)}`,
      code: `DEAL-${new Date().getFullYear()}-${String(state.deals.length + 15).padStart(3, "0")}`,
      companyName: dealForm.companyName.trim(),
      contactName: dealForm.contactName.trim(),
      contactEmail: dealForm.contactEmail.trim(),
      contactWhatsapp: dealForm.contactWhatsapp.trim(),
      industry: dealForm.industry.trim(),
      targetEdition: dealForm.targetEdition,
      billingCycle: dealForm.billingCycle,
      requestedSeats: Number(dealForm.requestedSeats) || spec.defaultSeats,
      dealValueIdr: value,
      probability: 45,
      stage: "proposal",
      ownerEmployeeId: state.employees[2]?.id ?? "emp-003",
      resellerId: dealForm.resellerId || null,
      expectedCloseDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      notes: dealForm.notes.trim() || "Prospek baru dari tim Sales B2B.",
    };

    onUpdateState((prev) => ({ ...prev, deals: [next, ...prev.deals] }));
    setDealModal(false);
    onToast(`Deal B2B ${next.companyName} (${formatIdr(next.dealValueIdr)}) ditambahkan.`);
  }

  function handleCreateTicket(e: FormEvent) {
    e.preventDefault();
    const tenant = state.tenants.find((t) => t.id === ticketForm.tenantId);
    const next: SupportTicketRecord = {
      id: `tkt-${Date.now().toString(36)}`,
      code: `SLA-${new Date().getFullYear()}-${String(state.tickets.length + 101)}`,
      tenantId: ticketForm.tenantId,
      tenantName: tenant?.companyName ?? "Tenant",
      subject: ticketForm.subject.trim(),
      category: ticketForm.category,
      priority: ticketForm.priority,
      status: "open",
      assignedTo: "Putri Maharani",
      slaHours: ticketForm.priority === "p1_critical" ? 4 : ticketForm.priority === "p2_high" ? 8 : 24,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onUpdateState((prev) => ({ ...prev, tickets: [next, ...prev.tickets] }));
    setTicketModal(false);
    onToast(`Tiket SLA ${next.code} dibuat.`);
  }

  const openDeals = state.deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const totalOpen = openDeals.reduce((s, d) => s + d.dealValueIdr, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Publisher CRM — Penjualan B2B SaaS &amp; Support SLA Enterprise
          </h2>
          <p className="text-xs text-slate-400">
            Kelola prospek korporat &amp; UMKM yang membeli lisensi WACRM. Klik{" "}
            <strong className="text-emerald-300">Close Won</strong> untuk otomatis menerbitkan
            License Key, Invoice PPN 11%, dan Jurnal Akuntansi PSAK!
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDealModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Tambah Deal B2B
          </button>
          <button
            type="button"
            onClick={() => setTicketModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            <Headphones className="h-4 w-4 text-indigo-400" /> Buat Tiket SLA
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab("pipeline")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
              subTab === "pipeline"
                ? "bg-emerald-500 text-slate-950"
                : "border border-slate-800 bg-slate-900 text-slate-300"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" /> Pipeline Sales B2B ({state.deals.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("tickets")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
              subTab === "tickets"
                ? "bg-emerald-500 text-slate-950"
                : "border border-slate-800 bg-slate-900 text-slate-300"
            }`}
          >
            <Headphones className="h-3.5 w-3.5" /> Tiket Support SLA ({state.tickets.length})
          </button>
        </div>
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs text-indigo-200">
          Pipeline Aktif: <strong className="text-white">{formatIdr(totalOpen)}</strong> (
          {openDeals.length} deal terbuka)
        </div>
      </div>

      {subTab === "pipeline" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.deals.map((deal) => (
            <article
              key={deal.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] text-slate-400">{deal.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STAGE_META[deal.stage].color}`}
                    >
                      {STAGE_META[deal.stage].label}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                      {PUBLISHER_EDITIONS[deal.targetEdition].name}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-extrabold text-white">
                    {deal.companyName}
                  </h3>
                  <div className="text-xs text-slate-400">
                    PIC: {deal.contactName} ({deal.contactWhatsapp}) · {deal.industry}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-emerald-400">
                    {formatIdr(deal.dealValueIdr)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {deal.billingCycle} · {deal.requestedSeats} kursi · {deal.probability}%
                  </div>
                </div>
              </div>

              <p className="mt-2.5 rounded-xl bg-slate-950/70 p-2.5 text-xs text-slate-300">
                {deal.notes}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                <span className="text-[11px] text-slate-400">
                  Target Close: <strong className="text-slate-200">{deal.expectedCloseDate}</strong>
                </span>
                {deal.stage !== "closed_won" ? (
                  <button
                    type="button"
                    onClick={() => onConvertDealWon(deal.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    <Rocket className="h-3.5 w-3.5" /> Close Won → Terbitkan Lisensi, Invoice &amp;
                    Jurnal
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" /> Lisensi &amp; Jurnal PSAK Terbit
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {state.tickets.map((tkt) => (
            <div
              key={tkt.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-xs"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-indigo-300">{tkt.code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      tkt.priority === "p1_critical"
                        ? "bg-rose-500/20 text-rose-300"
                        : tkt.priority === "p2_high"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {tkt.priority} · SLA {tkt.slaHours}j
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      tkt.status === "resolved"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    {tkt.status}
                  </span>
                </div>
                <div className="mt-1.5 text-sm font-bold text-white">{tkt.subject}</div>
                <div className="text-[11px] text-slate-400">
                  Tenant: {tkt.tenantName} · PIC: {tkt.assignedTo} · {tkt.createdAt}
                </div>
              </div>

              {tkt.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      tickets: prev.tickets.map((x) =>
                        x.id === tkt.id ? { ...x, status: "resolved" as const } : x,
                      ),
                    }));
                    onToast(`Tiket ${tkt.code} diselesaikan dalam target SLA.`);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-300 hover:bg-emerald-500/30"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Tandai Selesai
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DEAL MODAL */}
      {dealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Tambah Deal B2B Baru</h3>
              <button
                type="button"
                onClick={() => setDealModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="mt-4 space-y-3 text-xs">
              <input
                required
                placeholder="Nama Perusahaan Prospek *"
                value={dealForm.companyName}
                onChange={(e) => setDealForm({ ...dealForm, companyName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Nama PIC *"
                  value={dealForm.contactName}
                  onChange={(e) => setDealForm({ ...dealForm, contactName: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  required
                  type="email"
                  placeholder="Email PIC *"
                  value={dealForm.contactEmail}
                  onChange={(e) => setDealForm({ ...dealForm, contactEmail: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={dealForm.targetEdition}
                  onChange={(e) =>
                    setDealForm({ ...dealForm, targetEdition: e.target.value as EditionId })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="pro">Growth Pro</option>
                  <option value="enterprise">Enterprise AI Suite</option>
                  <option value="sovereign">Sovereign Corporate</option>
                </select>
                <select
                  value={dealForm.billingCycle}
                  onChange={(e) =>
                    setDealForm({ ...dealForm, billingCycle: e.target.value as BillingCycle })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="annual">Tahunan (Annual)</option>
                  <option value="monthly">Bulanan (Monthly)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  placeholder="Jumlah Kursi"
                  value={dealForm.requestedSeats}
                  onChange={(e) =>
                    setDealForm({ ...dealForm, requestedSeats: Number(e.target.value) })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <select
                  value={dealForm.resellerId}
                  onChange={(e) => setDealForm({ ...dealForm, resellerId: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="">Direct Sales (Tanpa Reseller)</option>
                  {state.resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({(r.commissionRate * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="Catatan kebutuhan prospek..."
                value={dealForm.notes}
                onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDealModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950"
                >
                  Simpan Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET MODAL */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Buat Tiket Support SLA</h3>
              <button
                type="button"
                onClick={() => setTicketModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3 text-xs">
              <select
                value={ticketForm.tenantId}
                onChange={(e) => setTicketForm({ ...ticketForm, tenantId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {state.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.companyName}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Subjek / Kendala Tenant *"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={ticketForm.category}
                  onChange={(e) =>
                    setTicketForm({
                      ...ticketForm,
                      category: e.target.value as SupportTicketRecord["category"],
                    })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="license">License</option>
                  <option value="billing">Billing &amp; Pajak</option>
                  <option value="technical">Technical</option>
                  <option value="custom_apk">Custom APK</option>
                </select>
                <select
                  value={ticketForm.priority}
                  onChange={(e) =>
                    setTicketForm({
                      ...ticketForm,
                      priority: e.target.value as TicketPriority,
                    })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="p1_critical">P1 Critical (4j)</option>
                  <option value="p2_high">P2 High (8j)</option>
                  <option value="p3_normal">P3 Normal (24j)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950"
                >
                  Simpan Tiket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
