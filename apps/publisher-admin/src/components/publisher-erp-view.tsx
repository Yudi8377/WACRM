"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";
import {
  formatIdr,
  type PublisherEmsState,
  type SubscriptionInvoiceRecord,
  type VendorPurchaseOrderRecord,
} from "@/lib/publisher-types";

interface PublisherErpViewProps {
  state: PublisherEmsState;
  onUpdateState: (updater: (prev: PublisherEmsState) => PublisherEmsState) => void;
  onMarkInvoicePaid: (invoiceId: string) => void;
  onPayVendorPo: (poId: string) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
  externalSubTab?: "billing" | "procurement" | "inventory";
}

export function PublisherErpView({
  state,
  onUpdateState,
  onMarkInvoicePaid,
  onPayVendorPo,
  onToast,
  externalSubTab,
}: PublisherErpViewProps) {
  const [subTab, setSubTab] = useState<"billing" | "procurement" | "inventory">(
    externalSubTab ?? "billing",
  );
  useEffect(() => {
    if (externalSubTab) setSubTab(externalSubTab);
  }, [externalSubTab]);
  const [invModal, setInvModal] = useState(false);
  const [poModal, setPoModal] = useState(false);

  const [invForm, setInvForm] = useState({
    tenantId: state.tenants[0]?.id ?? "",
    skuCode: "LIC-ENT-Y",
    description: "",
    periodMonths: 12,
    subtotalIdr: 19_900_000,
    resellerId: "",
  });

  const [poForm, setPoForm] = useState({
    vendorId: state.vendors[0]?.id ?? "",
    category: "cloud_cogs" as VendorPurchaseOrderRecord["category"],
    skuCode: "",
    description: "",
    qty: 1,
    unitCostIdr: 4_200_000,
  });

  function handleCreateInvoice(e: FormEvent) {
    e.preventDefault();
    const tenant = state.tenants.find((t) => t.id === invForm.tenantId);
    if (!tenant) return;
    const reseller = invForm.resellerId
      ? state.resellers.find((r) => r.id === invForm.resellerId)
      : null;
    const subtotal = Math.round(Number(invForm.subtotalIdr) || 0);
    const ppnRate = state.profile.defaultPpnRate;
    const ppnAmount = Math.round(subtotal * ppnRate);
    const resellerComm = reseller ? Math.round(subtotal * reseller.commissionRate) : 0;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
    const linkedLic = state.licenses.find((l) => l.tenantId === tenant.id);

    const next: SubscriptionInvoiceRecord = {
      id: `inv-${Date.now().toString(36)}`,
      invoiceNumber: `${state.profile.invoicePrefix}-${new Date().getFullYear()}-${String(state.invoices.length + 1).padStart(4, "0")}`,
      tenantId: tenant.id,
      tenantName: tenant.companyName,
      licenseId: linkedLic?.id ?? null,
      skuCode: invForm.skuCode,
      description:
        invForm.description.trim() ||
        `Tagihan ${invForm.skuCode} (${invForm.periodMonths} bulan) — ${tenant.companyName}`,
      billingCycle: invForm.periodMonths >= 12 ? "annual" : "monthly",
      periodMonths: Number(invForm.periodMonths) || 1,
      subtotalIdr: subtotal,
      ppnRate,
      ppnAmountIdr: ppnAmount,
      totalIdr: subtotal + ppnAmount,
      resellerId: invForm.resellerId || null,
      resellerCommissionIdr: resellerComm,
      status: "issued",
      issuedDate: today,
      dueDate: due,
      paidDate: null,
      journalId: null,
    };

    onUpdateState((prev) => ({ ...prev, invoices: [next, ...prev.invoices] }));
    setInvModal(false);
    onToast(`Invoice ${next.invoiceNumber} (${formatIdr(next.totalIdr)} incl. PPN 11%) diterbitkan.`);
  }

  function handleCreatePo(e: FormEvent) {
    e.preventDefault();
    const vendor = state.vendors.find((v) => v.id === poForm.vendorId);
    if (!vendor) return;
    const qty = Math.max(1, Number(poForm.qty) || 1);
    const unitCost = Math.max(0, Number(poForm.unitCostIdr) || 0);
    const subtotal = qty * unitCost;
    const ppnInput = Math.round(subtotal * state.profile.defaultPpnRate);

    const next: VendorPurchaseOrderRecord = {
      id: `po-${Date.now().toString(36)}`,
      poNumber: `PO-${new Date().getFullYear()}-${String(state.purchaseOrders.length + 1).padStart(4, "0")}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      skuCode: poForm.category === "hardware_inventory" ? poForm.skuCode || "HW-PRN-80" : null,
      description: poForm.description.trim() || `Pengadaan ${vendor.name}`,
      category: poForm.category,
      qty,
      unitCostIdr: unitCost,
      subtotalIdr: subtotal,
      ppnInputIdr: ppnInput,
      totalIdr: subtotal + ppnInput,
      status: "ordered",
      orderDate: new Date().toISOString().slice(0, 10),
      paidDate: null,
      journalId: null,
    };

    onUpdateState((prev) => ({ ...prev, purchaseOrders: [next, ...prev.purchaseOrders] }));
    setPoModal(false);
    onToast(`Purchase Order ${next.poNumber} dibuat.`);
  }

  const hardwareSkus = state.skus.filter((s) => s.category === "hardware");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Publisher ERP — Recurring Billing, Procurement Cloud/AI &amp; Gudang Hardware
          </h2>
          <p className="text-xs text-slate-400">
            Setiap pelunasan Invoice Langganan dan PO Vendor secara otomatis memposting Jurnal
            Double-Entry ke Akuntansi PSAK &amp; memperbarui stok persediaan.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInvModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Buat Invoice Langganan
          </button>
          <button
            type="button"
            onClick={() => setPoModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            <ShoppingCart className="h-4 w-4 text-amber-400" /> Buat PO Vendor
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab("billing")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
            subTab === "billing"
              ? "bg-emerald-500 text-slate-950"
              : "border border-slate-800 bg-slate-900 text-slate-300"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Subscription Billing ({state.invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("procurement")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
            subTab === "procurement"
              ? "bg-emerald-500 text-slate-950"
              : "border border-slate-800 bg-slate-900 text-slate-300"
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" /> PO Cloud, AI &amp; Hardware (
          {state.purchaseOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("inventory")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${
            subTab === "inventory"
              ? "bg-emerald-500 text-slate-950"
              : "border border-slate-800 bg-slate-900 text-slate-300"
          }`}
        >
          <Boxes className="h-3.5 w-3.5" /> Stok Bundling Hardware ({hardwareSkus.length})
        </button>
      </div>

      {/* BILLING TAB */}
      {subTab === "billing" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">No Invoice</th>
                <th className="px-3 py-2">Tenant &amp; Deskripsi</th>
                <th className="px-3 py-2 text-right">DPP (Subtotal)</th>
                <th className="px-3 py-2 text-right">PPN 11%</th>
                <th className="px-3 py-2 text-right">Total Tagihan</th>
                <th className="px-3 py-2">Status &amp; Jatuh Tempo</th>
                <th className="pl-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 font-mono font-bold text-indigo-300">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-white">{inv.tenantName}</div>
                    <div className="text-[11px] text-slate-400">
                      {inv.description}
                      {inv.resellerCommissionIdr > 0
                        ? ` · Komisi Reseller ${formatIdr(inv.resellerCommissionIdr)}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-200">
                    {formatIdr(inv.subtotalIdr)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-300">
                    {formatIdr(inv.ppnAmountIdr)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                    {formatIdr(inv.totalIdr)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : inv.status === "overdue"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {inv.status}
                    </span>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {inv.paidDate ? `Lunas: ${inv.paidDate}` : `Jatuh tempo: ${inv.dueDate}`}
                    </div>
                  </td>
                  <td className="pl-3 py-2.5 text-right">
                    {inv.status !== "paid" ? (
                      <button
                        type="button"
                        onClick={() => onMarkInvoicePaid(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                      >
                        <Wallet className="h-3 w-3" /> Lunasi &amp; Jurnal
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Terjurnal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PROCUREMENT TAB */}
      {subTab === "procurement" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">No PO</th>
                <th className="px-3 py-2">Vendor &amp; Item</th>
                <th className="px-3 py-2">Kategori Akun</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Total (incl. PPN)</th>
                <th className="px-3 py-2">Status</th>
                <th className="pl-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 pr-3 font-mono font-bold text-amber-300">{po.poNumber}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-white">{po.vendorName}</div>
                    <div className="text-[11px] text-slate-400">{po.description}</div>
                  </td>
                  <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-cyan-300">
                    {po.category.replace("_", " ")}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-200">{po.qty}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-white">
                    {formatIdr(po.totalIdr)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        po.status === "paid"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="pl-3 py-2.5 text-right">
                    {po.status !== "paid" ? (
                      <button
                        type="button"
                        onClick={() => onPayVendorPo(po.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
                      >
                        <Wallet className="h-3 w-3" /> Bayar &amp; Posting
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Terbayar
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* HARDWARE INVENTORY TAB */}
      {subTab === "inventory" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {hardwareSkus.map((hw) => (
              <div
                key={hw.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-indigo-300">{hw.sku}</span>
                    <h4 className="mt-1 text-sm font-bold text-white">{hw.name}</h4>
                  </div>
                  <span className="rounded-xl bg-emerald-500/15 px-3 py-1.5 font-mono text-sm font-extrabold text-emerald-300">
                    {hw.stockQty} unit
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-slate-400">
                  <span>HPP: {formatIdr(hw.costPriceIdr)}</span>
                  <span>Harga Bundling: {formatIdr(hw.unitPriceIdr)}</span>
                  <span>Min Stok: {hw.minStock}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs">
            <h4 className="font-bold text-white">Riwayat Mutasi Gudang Hardware Penerbit</h4>
            <div className="mt-3 space-y-2">
              {state.hardwareMovements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-2"
                >
                  <div>
                    <span
                      className={`mr-2 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        m.type === "in"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {m.type === "in" ? `+${m.qty} MASUK` : `-${m.qty} KELUAR`}
                    </span>
                    <strong className="text-white">{m.skuName}</strong>{" "}
                    <span className="text-slate-400">({m.reference})</span>
                    <div className="text-[11px] text-slate-400">{m.note}</div>
                  </div>
                  <span className="text-slate-500">{m.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Buat Invoice Langganan SaaS</h3>
              <button
                type="button"
                onClick={() => setInvModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-3 text-xs">
              <select
                value={invForm.tenantId}
                onChange={(e) => setInvForm({ ...invForm, tenantId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {state.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.companyName}
                  </option>
                ))}
              </select>
              <select
                value={invForm.skuCode}
                onChange={(e) => {
                  const found = state.skus.find((s) => s.sku === e.target.value);
                  setInvForm({
                    ...invForm,
                    skuCode: e.target.value,
                    subtotalIdr: found?.unitPriceIdr ?? invForm.subtotalIdr,
                    periodMonths: found?.billingCycle === "annual" ? 12 : 1,
                  });
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {state.skus.map((s) => (
                  <option key={s.id} value={s.sku}>
                    {s.sku} — {s.name} ({formatIdr(s.unitPriceIdr)})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  placeholder="DPP Subtotal (IDR)"
                  value={invForm.subtotalIdr}
                  onChange={(e) =>
                    setInvForm({ ...invForm, subtotalIdr: Number(e.target.value) })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  type="number"
                  min={1}
                  max={36}
                  placeholder="Periode (Bulan)"
                  value={invForm.periodMonths}
                  onChange={(e) =>
                    setInvForm({ ...invForm, periodMonths: Number(e.target.value) })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
              <select
                value={invForm.resellerId}
                onChange={(e) => setInvForm({ ...invForm, resellerId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="">Tanpa Reseller (Direct)</option>
                {state.resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Komisi {(r.commissionRate * 100).toFixed(0)}%)
                  </option>
                ))}
              </select>
              <div className="rounded-xl bg-slate-950 p-3 text-slate-300">
                Estimasi Total (+PPN 11%):{" "}
                <strong className="text-emerald-400">
                  {formatIdr(Math.round(invForm.subtotalIdr * 1.11))}
                </strong>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInvModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950"
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO MODAL */}
      {poModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Buat PO Vendor Cloud / Hardware</h3>
              <button
                type="button"
                onClick={() => setPoModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePo} className="mt-4 space-y-3 text-xs">
              <select
                value={poForm.vendorId}
                onChange={(e) => setPoForm({ ...poForm, vendorId: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                {state.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                value={poForm.category}
                onChange={(e) =>
                  setPoForm({
                    ...poForm,
                    category: e.target.value as VendorPurchaseOrderRecord["category"],
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="cloud_cogs">HPP Cloud &amp; Database (5101)</option>
                <option value="ai_api_cogs">HPP API LLM &amp; WA BSP (5102)</option>
                <option value="hardware_inventory">Persediaan Hardware POS/Printer (1301)</option>
                <option value="opex">Beban Operasional Kantor (6104)</option>
              </select>
              <input
                required
                placeholder="Deskripsi Pengadaan *"
                value={poForm.description}
                onChange={(e) => setPoForm({ ...poForm, description: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={poForm.qty}
                  onChange={(e) => setPoForm({ ...poForm, qty: Number(e.target.value) })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  type="number"
                  min={1000}
                  placeholder="Harga Satuan (IDR)"
                  value={poForm.unitCostIdr}
                  onChange={(e) => setPoForm({ ...poForm, unitCostIdr: Number(e.target.value) })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPoModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-4 py-2 font-extrabold text-slate-950"
                >
                  Simpan PO Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
