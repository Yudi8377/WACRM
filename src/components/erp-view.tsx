"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Bluetooth,
  Boxes,
  Building2,
  Download,
  PackagePlus,
  Plus,
  Trash2,
  Wifi,
} from "lucide-react";
import {
  formatIdr,
  type ErpProductRecord,
  type ErpStockMovementRecord,
  type ErpSupplierRecord,
} from "@/lib/crm-types";
import {
  buildEscPosTextReport,
  printViaBluetooth,
  printViaWifiHtml,
  renderErpReportPrintHtml,
} from "@/lib/printer";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface ErpViewProps {
  adapter: WorkspaceAdapter;
  workspaceName: string;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  movements: ErpStockMovementRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

export function ErpView({
  adapter,
  workspaceName,
  products,
  suppliers,
  movements,
  onRefresh,
  onToast,
}: ErpViewProps) {
  const [tab, setTab] = useState<"products" | "suppliers" | "movements">("products");

  // New Product form
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Umum");
  const [unit, setUnit] = useState("pcs");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("20");
  const [minStock, setMinStock] = useState("5");
  const [description, setDescription] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // New Supplier form
  const [supName, setSupName] = useState("");
  const [supPic, setSupPic] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supTerms, setSupTerms] = useState("NET 14");
  const [savingSupplier, setSavingSupplier] = useState(false);

  const totalUnits = products.reduce((s, p) => s + p.stockQty, 0);
  const inventoryValue = products.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
  const lowStockProducts = products.filter((p) => p.isActive && p.stockQty <= p.minStock);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return;
    setSavingProduct(true);
    try {
      await adapter.createProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim() || "Umum",
        unit: unit.trim() || "pcs",
        unitPrice: Number(unitPrice) || 0,
        costPrice: Number(costPrice) || 0,
        stockQty: Number(stockQty) || 0,
        minStock: Number(minStock) || 5,
        description: description.trim(),
      });
      setSku("");
      setName("");
      setUnitPrice("");
      setCostPrice("");
      setDescription("");
      await onRefresh();
      onToast("Produk ERP baru disimpan & otomatis dipelajari oleh Multi-Agent AI!");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menambah produk ERP.", "error");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleAdjustStock(product: ErpProductRecord, delta: number) {
    try {
      await adapter.updateProduct(product.id, {
        stockDelta: delta,
        stockReason: delta > 0 ? "Restok gudang ERP" : "Penyesuaian stok keluar",
      });
      await onRefresh();
      onToast(
        `Stok ${product.sku} ${delta > 0 ? `+${delta}` : delta} diperbarui & disinkronkan ke AI.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui stok.", "error");
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supName.trim()) return;
    setSavingSupplier(true);
    try {
      await adapter.createSupplier({
        name: supName.trim(),
        contactPerson: supPic.trim() || undefined,
        phone: supPhone.trim() || undefined,
        email: supEmail.trim() || undefined,
        address: supAddress.trim() || undefined,
        paymentTerms: supTerms.trim() || "NET 14",
      });
      setSupName("");
      setSupPic("");
      setSupPhone("");
      setSupEmail("");
      setSupAddress("");
      await onRefresh();
      onToast("Supplier ERP berhasil ditambahkan.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menambah supplier.", "error");
    } finally {
      setSavingSupplier(false);
    }
  }

  function handleExportCsv() {
    const header = "SKU,Nama Produk,Kategori,Satuan,Harga Jual,HPP,Stok,Stok Minimum\n";
    const rows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category}","${p.unit}",${p.unitPrice},${p.costPrice},${p.stockQty},${p.minStock}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `erp-inventaris-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Data inventaris ERP diekspor ke CSV.");
  }

  function handlePrintWifi() {
    const html = renderErpReportPrintHtml(products, workspaceName);
    const res = printViaWifiHtml("Laporan Inventaris ERP", html);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  async function handlePrintBluetooth() {
    const esc = buildEscPosTextReport(
      "LAPORAN STOK ERP",
      workspaceName,
      [
        `Total SKU: ${products.length}`,
        `Total Unit: ${totalUnits}`,
        `Nilai Stok: ${formatIdr(inventoryValue)}`,
        `Stok Menipis: ${lowStockProducts.length} SKU`,
        "--------------------------------",
        ...products.slice(0, 12).map((p) => `${p.sku} (${p.stockQty}): ${formatIdr(p.unitPrice)}`),
      ],
    );
    const res = await printViaBluetooth(esc);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Boxes className="h-3.5 w-3.5" />
            ERP Gudang, Inventaris &amp; Supply Chain — Sinkron Real-Time ke AI &amp; POS
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">Manajemen ERP &amp; Inventaris</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={handlePrintBluetooth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
          >
            <Bluetooth className="h-3.5 w-3.5" /> Cetak BT
          </button>
          <button
            type="button"
            onClick={handlePrintWifi}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Wifi className="h-3.5 w-3.5" /> Cetak WiFi
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Total Produk / SKU</div>
          <div className="mt-1 text-2xl font-bold text-white">{products.length}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Total Stok Gudang</div>
          <div className="mt-1 text-2xl font-bold text-cyan-300">{totalUnits} unit</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Nilai Aset Persediaan</div>
          <div className="mt-1 text-xl font-bold text-emerald-400">{formatIdr(inventoryValue)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-xs text-slate-400">Peringatan Stok Menipis</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-300">
            {lowStockProducts.length}
            {lowStockProducts.length > 0 && <AlertTriangle className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "products" as const, label: `Produk & Stok (${products.length})`, icon: Boxes },
          { id: "suppliers" as const, label: `Supplier (${suppliers.length})`, icon: Building2 },
          { id: "movements" as const, label: `Mutasi Stok (${movements.length})`, icon: ArrowDownUp },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="grid gap-5 xl:grid-cols-12">
          <form
            onSubmit={handleCreateProduct}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 xl:col-span-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <PackagePlus className="h-4 w-4 text-emerald-400" />
              Tambah Produk ERP Baru
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400">SKU *</label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="KOPI-01"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Kategori</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Nama Produk *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kopi Arabika Robusta 500gr"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400">Harga Jual (Rp) *</label>
                <input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="150000"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Harga Modal / HPP</label>
                <input
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="95000"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">Stok Awal</label>
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Min Stok</label>
                <input
                  type="number"
                  min={0}
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Satuan</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Deskripsi (Dipelajari Otomatis oleh AI)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Keunggulan produk, promo, atau detail pengiriman..."
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingProduct}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {savingProduct ? "Menyimpan..." : "Simpan Produk ke ERP + AI"}
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 xl:col-span-8">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">SKU &amp; Produk</th>
                  <th className="px-4 py-3">Harga Jual / HPP</th>
                  <th className="px-4 py-3">Stok Gudang</th>
                  <th className="px-4 py-3 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] font-bold text-cyan-400">{p.sku}</div>
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-400">{formatIdr(p.unitPrice)}</div>
                      <div className="text-[11px] text-slate-400">HPP: {formatIdr(p.costPrice)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          p.stockQty <= p.minStock
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {p.stockQty} {p.unit}
                      </span>
                      <div className="mt-0.5 text-[10px] text-slate-500">Min: {p.minStock}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, 10)}
                          className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, -1)}
                          className="rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await adapter.deleteProduct(p.id);
                            await onRefresh();
                            onToast(`Produk ${p.sku} dihapus.`);
                          }}
                          className="rounded-lg p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <form
            onSubmit={handleCreateSupplier}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4 text-emerald-400" />
              Tambah Supplier ERP
            </div>
            <input
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              placeholder="Nama Perusahaan Supplier *"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              required
            />
            <input
              value={supPic}
              onChange={(e) => setSupPic(e.target.value)}
              placeholder="Nama Kontak / PIC"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              placeholder="Nomor Telepon / WA"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={supEmail}
              onChange={(e) => setSupEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={supAddress}
              onChange={(e) => setSupAddress(e.target.value)}
              placeholder="Alamat Gudang Supplier"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              value={supTerms}
              onChange={(e) => setSupTerms(e.target.value)}
              placeholder="Termin Pembayaran (NET 14)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              disabled={savingSupplier}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              {savingSupplier ? "Menyimpan..." : "Simpan Supplier"}
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{sup.name}</h4>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    {sup.paymentTerms}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-slate-300">
                  <div>PIC: {sup.contactPerson ?? "-"}</div>
                  <div>Telp: {sup.phone ?? "-"}</div>
                  <div>Email: {sup.email ?? "-"}</div>
                  <div className="text-slate-400">{sup.address ?? "-"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Movements Tab */}
      {tab === "movements" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-slate-400">
                    {new Date(m.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-white">
                    {m.sku ? `${m.sku} — ` : ""}
                    {m.productName ?? m.productId}
                  </td>
                  <td className="px-4 py-2.5 uppercase text-cyan-300">{m.movementType}</td>
                  <td
                    className={`px-4 py-2.5 font-bold ${
                      m.quantity >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{m.notes ?? m.referenceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
