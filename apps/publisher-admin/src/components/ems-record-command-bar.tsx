"use client";

import { useState, type FormEvent } from "react";
import { Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import type { EditionId, PublisherEmsState } from "@/lib/publisher-types";
import { formatIdr } from "@/lib/publisher-types";
import {
  deleteDealInState,
  deleteInvoiceInState,
  deleteJournalInState,
  deleteLicenseInState,
  deletePoInState,
  deleteSkuInState,
  deleteTenantInState,
  deleteTicketInState,
  exportEmsRowsToCsv,
  updateDealInState,
  updateInvoiceInState,
  updateJournalInState,
  updateLicenseInState,
  updatePoInState,
  updateSkuInState,
  updateTenantInState,
  updateTicketInState,
} from "@/lib/publisher-crud";
import {
  printCommercialInvoice,
  printEmsTableReport,
  printLicenseCertificate,
  printVendorPurchaseOrder,
} from "@/lib/publisher-print";
import { computeBalanceSheet, computeIncomeStatement, computeTrialBalance } from "@/lib/accounting-engine";

export type EmsCrudTarget =
  | "overview"
  | "licenses"
  | "master_tenants"
  | "master_skus"
  | "crm_deals"
  | "crm_tickets"
  | "erp_invoices"
  | "erp_pos"
  | "accounting";

interface EmsRecordCommandBarProps {
  target: EmsCrudTarget;
  moduleTitle: string;
  state: PublisherEmsState;
  onUpdateState: (updater: (prev: PublisherEmsState) => PublisherEmsState) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
  onQuickInsert?: () => void;
}

export function EmsRecordCommandBar({
  target,
  moduleTitle,
  state,
  onUpdateState,
  onToast,
  onQuickInsert,
}: EmsRecordCommandBarProps) {
  const records = getRecordsForTarget(target, state);
  const [selectedId, setSelectedId] = useState<string>("");
  const effectiveSelectedId =
    records.some((r) => r.id === selectedId) ? selectedId : (records[0]?.id ?? "");

  const [editOpen, setEditOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [f3, setF3] = useState("");
  const [fNum, setFNum] = useState(0);

  const selectedRecord = records.find((r) => r.id === effectiveSelectedId) ?? null;

  function openEditModal() {
    if (!selectedRecord) return;
    setF1(selectedRecord.primary);
    setF2(selectedRecord.secondary);
    setF3(selectedRecord.status);
    setFNum(selectedRecord.amount);
    setEditOpen(true);
  }

  function openInsertModal() {
    if (onQuickInsert) {
      onQuickInsert();
      return;
    }
    setF1("");
    setF2("");
    setF3("active");
    setFNum(0);
    setInsertOpen(true);
  }

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!effectiveSelectedId) return;
    const v1 = f1.trim();
    const v2 = f2.trim();
    const v3 = f3.trim();
    const num = Number(fNum) || 0;

    onUpdateState((prev) => {
      switch (target) {
        case "master_tenants":
          return updateTenantInState(prev, effectiveSelectedId, {
            companyName: v1 || undefined,
            city: v2 || undefined,
            status: (v3 as "active" | "onboarding" | "at_risk" | "churned") || "active",
          });
        case "master_skus":
          return updateSkuInState(prev, effectiveSelectedId, {
            name: v1 || undefined,
            sku: v2 || undefined,
            unitPriceIdr: num,
          });
        case "licenses":
          return updateLicenseInState(prev, effectiveSelectedId, {
            tenantName: v1 || undefined,
            domain: v2 || undefined,
            notes: v3,
            monthlyValueIdr: num,
          });
        case "crm_deals":
          return updateDealInState(prev, effectiveSelectedId, {
            companyName: v1 || undefined,
            contactName: v2 || undefined,
            notes: v3,
            dealValueIdr: num,
          });
        case "crm_tickets":
          return updateTicketInState(prev, effectiveSelectedId, {
            subject: v1 || undefined,
            assignedTo: v2 || undefined,
            status: (v3 as "open" | "in_progress" | "waiting_client" | "resolved") || "open",
          });
        case "erp_invoices":
          return updateInvoiceInState(prev, effectiveSelectedId, {
            description: v1 || undefined,
            dueDate: v2 || undefined,
            subtotalIdr: num > 0 ? num : undefined,
            ppnAmountIdr: num > 0 ? Math.round(num * 0.11) : undefined,
            totalIdr: num > 0 ? Math.round(num * 1.11) : undefined,
          });
        case "erp_pos":
          return updatePoInState(prev, effectiveSelectedId, {
            description: v1 || undefined,
            orderDate: v2 || undefined,
            unitCostIdr: num > 0 ? num : undefined,
          });
        case "accounting":
          return updateJournalInState(prev, effectiveSelectedId, {
            description: v1 || undefined,
            reference: v2 || undefined,
            date: v3 || undefined,
          });
        default:
          return prev;
      }
    });
    setEditOpen(false);
    onToast(`Data ${moduleTitle} berhasil diperbarui (UPDATE).`, "success");
  }

  function handleSaveQuickInsert(e: FormEvent) {
    e.preventDefault();
    const v1 = f1.trim();
    if (!v1) return;
    const now = new Date().toISOString().slice(0, 10);
    const id = `rec-${Date.now()}`;
    onUpdateState((prev) => {
      if (target === "master_tenants") {
        return {
          ...prev,
          tenants: [
            {
              id,
              code: `TEN-${String(prev.tenants.length + 1).padStart(3, "0")}`,
              companyName: v1,
              npwp: "-",
              industry: "Enterprise & UMKM",
              picName: f2.trim() || "Owner",
              picEmail: `info@${v1.toLowerCase().replace(/[^a-z0-9]/g, "") || "tenant"}.id`,
              picWhatsapp: "081200000000",
              domain: `${v1.toLowerCase().replace(/[^a-z0-9]/g, "") || "tenant"}.wacrm.app`,
              city: f3.trim() || "Indonesia",
              resellerId: null,
              status: "active",
              monthlyCloudCogsIdr: 55_000,
              monthlyAiTokenCostIdr: 25_000,
              healthScore: 88,
              createdAt: now,
            },
            ...prev.tenants,
          ],
        };
      }
      if (target === "crm_deals") {
        return {
          ...prev,
          deals: [
            {
              id,
              code: `DEAL-${String(prev.deals.length + 1).padStart(3, "0")}`,
              companyName: v1,
              contactName: f2.trim() || "Direksi",
              contactWhatsapp: "081200000000",
              contactEmail: "sales@prospek.co.id",
              industry: "B2B Korporat",
              targetEdition: "enterprise" as EditionId,
              billingCycle: "annual",
              requestedSeats: 25,
              dealValueIdr: Number(fNum) || 6_790_000,
              probability: 65,
              stage: "proposal",
              ownerEmployeeId: prev.employees[0]?.id ?? "emp-01",
              resellerId: null,
              expectedCloseDate: now,
              notes: f3.trim() || "Ditambahkan via EMS Insert Toolbar",
            },
            ...prev.deals,
          ],
        };
      }
      return prev;
    });
    setInsertOpen(false);
    onToast(`Data baru berhasil ditambahkan ke ${moduleTitle} (INSERT).`, "success");
  }

  function handleDelete() {
    if (!selectedRecord) return;
    if (!window.confirm(`Konfirmasi DELETE: hapus "${selectedRecord.label}" dari ${moduleTitle}?`)) {
      return;
    }
    onUpdateState((prev) => {
      switch (target) {
        case "master_tenants":
          return deleteTenantInState(prev, selectedRecord.id);
        case "master_skus":
          return deleteSkuInState(prev, selectedRecord.id);
        case "licenses":
          return deleteLicenseInState(prev, selectedRecord.id);
        case "crm_deals":
          return deleteDealInState(prev, selectedRecord.id);
        case "crm_tickets":
          return deleteTicketInState(prev, selectedRecord.id);
        case "erp_invoices":
          return deleteInvoiceInState(prev, selectedRecord.id);
        case "erp_pos":
          return deletePoInState(prev, selectedRecord.id);
        case "accounting":
          return deleteJournalInState(prev, selectedRecord.id);
        default:
          return prev;
      }
    });
    onToast(`Record "${selectedRecord.primary}" berhasil dihapus (DELETE).`, "success");
  }

  function handlePrint() {
    if (target === "licenses" && effectiveSelectedId) {
      const lic = state.licenses.find((l) => l.id === effectiveSelectedId);
      if (lic) {
        printLicenseCertificate(state.profile, lic);
        return;
      }
    }
    if (target === "erp_invoices" && effectiveSelectedId) {
      const inv = state.invoices.find((i) => i.id === effectiveSelectedId);
      if (inv) {
        printCommercialInvoice(state.profile, inv);
        return;
      }
    }
    if (target === "erp_pos" && effectiveSelectedId) {
      const po = state.purchaseOrders.find((p) => p.id === effectiveSelectedId);
      if (po) {
        printVendorPurchaseOrder(state.profile, po);
        return;
      }
    }
    if (target === "accounting") {
      const tb = computeTrialBalance(state.coa, state.journals);
      const bs = computeBalanceSheet(state.coa, state.journals);
      const pl = computeIncomeStatement(state.coa, state.journals);
      printEmsTableReport({
        profile: state.profile,
        title: "Laporan Akuntansi Korporat PSAK 72 — Neraca Saldo & Jurnal",
        subtitle: `Status Neraca: ${bs.balanced ? "BALANCE 100%" : "PERLU CEK"} · Laba Bersih: ${formatIdr(pl.netProfit)}`,
        docCode: `PSAK-${new Date().toISOString().slice(0, 10)}`,
        columns: ["No. Jurnal", "Tanggal", "Referensi", "Keterangan", "Debit", "Kredit"],
        rows: state.journals.map((j) => [
          j.journalNumber,
          j.date,
          j.reference,
          j.description,
          formatIdr(j.totalDebit),
          formatIdr(j.totalCredit),
        ]),
        summaryNotes: [
          `Total Aset Neraca: ${formatIdr(bs.totalAssets)} | Kewajiban & Ekuitas: ${formatIdr(bs.totalLiabilitiesAndEquity)}`,
          `Total Debit Neraca Saldo: ${formatIdr(tb.sumEndingDebit)} | Kredit: ${formatIdr(tb.sumEndingCredit)}`,
          `Pendapatan Diakui: ${formatIdr(pl.totalRevenue)} | Gross Margin: ${pl.grossMarginPct}%`,
        ],
      });
      return;
    }

    printEmsTableReport({
      profile: state.profile,
      title: `Laporan Resmi EMS — ${moduleTitle}`,
      subtitle: `Dokumen operasional standar Enterprise Management System (${records.length} record).`,
      docCode: `EMS-${target.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`,
      columns: ["Kode / ID", "Nama / Deskripsi Utama", "Detail / Referensi", "Status", "Nilai (Rp)"],
      rows: records.map((r) => [r.code, r.primary, r.secondary, r.status.toUpperCase(), formatIdr(r.amount)]),
    });
  }

  function handleCsv() {
    exportEmsRowsToCsv(
      `wacrm-ems-${target}.csv`,
      ["Kode", "Utama", "Detail", "Status", "Nilai IDR"],
      records.map((r) => [r.code, r.primary, r.secondary, r.status, r.amount]),
    );
    onToast(`Export CSV ${moduleTitle} selesai.`, "success");
  }

  const canMutate = target !== "overview";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-emerald-500/25 bg-slate-900/95 px-3.5 py-2.5 text-xs shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
            EMS Toolbar · {moduleTitle}
          </span>
          {canMutate && records.length > 0 && (
            <select
              value={effectiveSelectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Pilih record aktif untuk Update, Delete atau Cetak"
              className="max-w-[260px] rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-white"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(target === "master_tenants" || target === "crm_deals" || onQuickInsert) && (
            <button
              type="button"
              onClick={openInsertModal}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Insert
            </button>
          )}
          {canMutate && (
            <>
              <button
                type="button"
                disabled={!selectedRecord}
                onClick={openEditModal}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-40"
              >
                <Pencil className="h-3.5 w-3.5" /> Update
              </button>
              <button
                type="button"
                disabled={!selectedRecord}
                onClick={handleDelete}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500/25 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25"
          >
            <Printer className="h-3.5 w-3.5" /> Cetak Dokumen
          </button>
          <button
            type="button"
            onClick={handleCsv}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* UPDATE MODAL */}
      {editOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">
                Update Data — {selectedRecord.code}
              </h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <label className="block text-slate-300">
              Nama / Deskripsi Utama *
              <input
                required
                value={f1}
                onChange={(e) => setF1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-slate-300">
              Detail / Kota / Referensi / Domain
              <input
                value={f2}
                onChange={(e) => setF2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-slate-300">
              Status / Catatan / Tanggal
              <input
                value={f3}
                onChange={(e) => setF3(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            {target !== "accounting" && target !== "crm_tickets" && target !== "master_tenants" && (
              <label className="block text-slate-300">
                Nilai Nominal (Rp)
                <input
                  type="number"
                  value={fNum}
                  onChange={(e) => setFNum(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-amber-400 px-5 py-2 font-extrabold text-slate-950 hover:bg-amber-300"
              >
                Simpan Update
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUICK INSERT MODAL */}
      {insertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveQuickInsert}
            className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Insert Baru — {moduleTitle}</h3>
              <button type="button" onClick={() => setInsertOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <label className="block text-slate-300">
              Nama Perusahaan / Record *
              <input
                required
                value={f1}
                onChange={(e) => setF1(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-slate-300">
              PIC / Kontak Utama
              <input
                value={f2}
                onChange={(e) => setF2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-slate-300">
              Kota / Catatan
              <input
                value={f3}
                onChange={(e) => setF3(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            {target === "crm_deals" && (
              <label className="block text-slate-300">
                Estimasi Nilai Kontrak (Rp)
                <input
                  type="number"
                  value={fNum}
                  onChange={(e) => setFNum(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInsertOpen(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                Insert Data
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

interface SimplifiedRecord {
  id: string;
  code: string;
  label: string;
  primary: string;
  secondary: string;
  status: string;
  amount: number;
}

function getRecordsForTarget(target: EmsCrudTarget, state: PublisherEmsState): SimplifiedRecord[] {
  switch (target) {
    case "overview":
    case "master_tenants":
      return state.tenants.map((t) => ({
        id: t.id,
        code: t.code,
        label: `${t.code} · ${t.companyName}`,
        primary: t.companyName,
        secondary: t.city,
        status: t.status,
        amount: t.monthlyCloudCogsIdr + t.monthlyAiTokenCostIdr,
      }));
    case "master_skus":
      return state.skus.map((s) => ({
        id: s.id,
        code: s.sku,
        label: `${s.sku} · ${s.name}`,
        primary: s.name,
        secondary: s.sku,
        status: s.isActive ? "active" : "inactive",
        amount: s.unitPriceIdr,
      }));
    case "licenses":
      return state.licenses.map((l) => ({
        id: l.id,
        code: l.licenseKey,
        label: `${l.tenantName} (${l.editionId.toUpperCase()})`,
        primary: l.tenantName,
        secondary: l.domain,
        status: l.notes || l.status,
        amount: l.monthlyValueIdr,
      }));
    case "crm_deals":
      return state.deals.map((d) => ({
        id: d.id,
        code: d.code,
        label: `${d.code} · ${d.companyName}`,
        primary: d.companyName,
        secondary: d.contactName,
        status: d.notes || d.stage,
        amount: d.dealValueIdr,
      }));
    case "crm_tickets":
      return state.tickets.map((t) => ({
        id: t.id,
        code: t.code,
        label: `${t.code} · ${t.subject}`,
        primary: t.subject,
        secondary: t.assignedTo,
        status: t.status,
        amount: t.slaHours,
      }));
    case "erp_invoices":
      return state.invoices.map((i) => ({
        id: i.id,
        code: i.invoiceNumber,
        label: `${i.invoiceNumber} · ${i.tenantName}`,
        primary: i.description,
        secondary: i.dueDate,
        status: i.status,
        amount: i.subtotalIdr,
      }));
    case "erp_pos":
      return state.purchaseOrders.map((p) => ({
        id: p.id,
        code: p.poNumber,
        label: `${p.poNumber} · ${p.vendorName}`,
        primary: p.description,
        secondary: p.orderDate,
        status: p.status,
        amount: p.unitCostIdr,
      }));
    case "accounting":
      return state.journals.map((j) => ({
        id: j.id,
        code: j.journalNumber,
        label: `${j.journalNumber} · ${j.description.slice(0, 36)}`,
        primary: j.description,
        secondary: j.reference,
        status: j.date,
        amount: j.totalDebit,
      }));
  }
}
