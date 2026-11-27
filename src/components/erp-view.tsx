"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  Bluetooth,
  Boxes,
  Building2,
  Cable,
  Download,
  Wifi,
  X,
} from "lucide-react";
import { CrudToolbar, PaginationBar } from "@/components/crud-toolbar";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import {
  formatIdr,
  type ErpProductRecord,
  type ErpStockMovementRecord,
  type ErpSupplierRecord,
  type StoreBusinessProfile,
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
  storeProfile: StoreBusinessProfile;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  movements: ErpStockMovementRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

const PAGE_SIZE = 6;

export function ErpView({
  adapter,
  storeProfile,
  products,
  suppliers,
  movements,
  onRefresh,
  onToast,
}: ErpViewProps) {
  const [tab, setTab] = useState<"products" | "suppliers" | "movements">("products");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"none" | "create" | "edit">("none");
  const [showPrintStudio, setShowPrintStudio] = useState(false);

  // Product form
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Umum");
  const [unit, setUnit] = useState("pcs");
  const [unitPrice, setUnitPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("20");
  const [minStock, setMinStock] = useState("5");
  const [description, setDescription] = useState("");

  // Supplier form
  const [supName, setSupName] = useState("");
  const [supPic, setSupPic] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supTerms, setSupTerms] = useState("NET 14");
  const [saving, setSaving] = useState(false);

  const totalUnits = products.reduce((s, p) => s + p.stockQty, 0);
  const inventoryValue = products.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
  const lowStockProducts = products.filter((p) => p.isActive && p.stockQty <= p.minStock);

  const q = search.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !q ||
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      ),
    [products, q],
  );
  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.contactPerson ?? "").toLowerCase().includes(q) ||
          (s.phone ?? "").toLowerCase().includes(q),
      ),
    [suppliers, q],
  );
  const filteredMovements = useMemo(
    () =>
      movements.filter(
        (m) =>
          !q ||
          (m.productName ?? "").toLowerCase().includes(q) ||
          (m.sku ?? "").toLowerCase().includes(q) ||
          (m.notes ?? "").toLowerCase().includes(q),
      ),
    [movements, q],
  );

  const totalItems =
    tab === "products"
      ? filteredProducts.length
      : tab === "suppliers"
        ? filteredSuppliers.length
        : filteredMovements.length;

  function openCreateModal() {
    if (tab === "movements") {
      setTab("products");
    }
    setSku("");
    setName("");
    setCategory("Umum");
    setUnit("pcs");
    setUnitPrice("");
    setCostPrice("");
    setStockQty("20");
    setMinStock("5");
    setDescription("");
    setSupName("");
    setSupPic("");
    setSupPhone("");
    setSupEmail("");
    setSupAddress("");
    setSupTerms("NET 14");
    setModalMode("create");
  }

  function openEditModal() {
    if (!selectedId) return;
    if (tab === "products") {
      const p = products.find((x) => x.id === selectedId);
      if (!p) return;
      setSku(p.sku);
      setName(p.name);
      setCategory(p.category);
      setUnit(p.unit);
      setUnitPrice(String(p.unitPrice));
      setCostPrice(String(p.costPrice));
      setStockQty(String(p.stockQty));
      setMinStock(String(p.minStock));
      setDescription(p.description);
      setModalMode("edit");
    } else if (tab === "suppliers") {
      const s = suppliers.find((x) => x.id === selectedId);
      if (!s) return;
      setSupName(s.name);
      setSupPic(s.contactPerson ?? "");
      setSupPhone(s.phone ?? "");
      setSupEmail(s.email ?? "");
      setSupAddress(s.address ?? "");
      setSupTerms(s.paymentTerms);
      setModalMode("edit");
    }
  }

  async function handleDeleteSelected() {
    if (!selectedId) return;
    if (!window.confirm("Hapus data ERP yang dipilih?")) return;
    try {
      if (tab === "products") {
        await adapter.deleteProduct(selectedId);
        onToast("Produk ERP dihapus.");
      } else if (tab === "suppliers" && adapter.deleteSupplier) {
        await adapter.deleteSupplier(selectedId);
        onToast("Supplier ERP dihapus.");
      }
      setSelectedId(null);
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus data.", "error");
    }
  }

  async function handleSaveForm(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (tab === "suppliers") {
        if (modalMode === "create") {
          await adapter.createSupplier({
            name: supName.trim(),
            contactPerson: supPic.trim() || undefined,
            phone: supPhone.trim() || undefined,
            email: supEmail.trim() || undefined,
            address: supAddress.trim() || undefined,
            paymentTerms: supTerms.trim() || "NET 14",
          });
          onToast("Supplier baru berhasil ditambahkan.");
        } else if (selectedId && adapter.updateSupplier) {
          await adapter.updateSupplier(selectedId, {
            name: supName.trim(),
            contactPerson: supPic.trim() || undefined,
            phone: supPhone.trim() || undefined,
            email: supEmail.trim() || undefined,
            address: supAddress.trim() || undefined,
            paymentTerms: supTerms.trim() || "NET 14",
          });
          onToast("Data supplier diperbarui.");
        }
      } else {
        if (modalMode === "create") {
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
          onToast("Produk ERP baru disimpan & otomatis dipelajari oleh AI.");
        } else if (selectedId) {
          await adapter.updateProduct(selectedId, {
            name: name.trim(),
            category: category.trim() || "Umum",
            unitPrice: Number(unitPrice) || 0,
            costPrice: Number(costPrice) || 0,
            minStock: Number(minStock) || 5,
            description: description.trim(),
          });
          onToast("Data produk ERP berhasil diperbarui.");
        }
      }
      setModalMode("none");
      await onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan data ERP.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjustStock(product: ErpProductRecord, delta: number) {
    try {
      await adapter.updateProduct(product.id, {
        stockDelta: delta,
        stockReason: delta > 0 ? "Restok gudang ERP" : "Penyesuaian stok keluar",
      });
      await onRefresh();
      onToast(`Stok ${product.sku} ${delta > 0 ? `+${delta}` : delta} diperbarui.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal memperbarui stok.", "error");
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
    a.download = `inventaris-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Data inventaris diekspor ke CSV.");
  }

  function handlePrintWifi() {
    const html = renderErpReportPrintHtml(products, storeProfile);
    const res = printViaWifiHtml(`Laporan Inventaris - ${storeProfile.businessName}`, html);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  async function handlePrintBluetooth() {
    const esc = buildEscPosTextReport("LAPORAN STOK GUDANG", storeProfile, [
      `Total SKU: ${products.length}`,
      `Total Unit: ${totalUnits}`,
      `Nilai Stok: ${formatIdr(inventoryValue)}`,
      `Stok Menipis: ${lowStockProducts.length} SKU`,
      "--------------------------------",
      ...products.slice(0, 12).map((p) => `${p.sku} (${p.stockQty}): ${formatIdr(p.unitPrice)}`),
    ]);
    const res = await printViaBluetooth(esc);
    onToast(res.message, res.ok ? "ok" : "error");
  }

  const start = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Boxes className="h-3.5 w-3.5" />
            {storeProfile.businessName} · ERP Gudang &amp; Inventaris
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">Manajemen ERP, Gudang &amp; Supplier</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button type="button" onClick={handlePrintBluetooth} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25">
            <Bluetooth className="h-3.5 w-3.5" /> Cetak BT
          </button>
          <button type="button" onClick={handlePrintWifi} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
            <Wifi className="h-3.5 w-3.5" /> Cetak Laporan WiFi
          </button>
          <button
            type="button"
            onClick={() => setShowPrintStudio((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25"
          >
            <Cable className="h-3.5 w-3.5" /> Cetak USB / Inkjet / EDC
          </button>
        </div>
      </div>

      {showPrintStudio && (
        <UniversalPrintPanel
          documentLabel="Laporan Stok & Inventaris Gudang ERP"
          jobTitle={`Laporan Inventaris - ${storeProfile.businessName}`}
          filenameBase={`inventaris-${new Date().toISOString().slice(0, 10)}`}
          defaultPaper="a4"
          buildHtml={() => renderErpReportPrintHtml(products, storeProfile)}
          buildEscPos={() =>
            buildEscPosTextReport("LAPORAN STOK GUDANG", storeProfile, [
              `Total SKU: ${products.length}`,
              `Total Unit: ${totalUnits}`,
              `Nilai Stok: ${formatIdr(inventoryValue)}`,
              `Stok Menipis: ${lowStockProducts.length} SKU`,
              "--------------------------------",
              ...products.slice(0, 12).map((p) => `${p.sku} (${p.stockQty}): ${formatIdr(p.unitPrice)}`),
            ])
          }
          onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
        />
      )}

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
              onClick={() => {
                setTab(item.id);
                setSelectedId(null);
                setPage(1);
              }}
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

      {/* CRUD Toolbar */}
      <CrudToolbar
        dark
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder={`Cari ${tab === "products" ? "SKU / nama produk" : tab === "suppliers" ? "nama supplier" : "mutasi stok"}...`}
        onAddNew={tab !== "movements" ? openCreateModal : undefined}
        addNewLabel={tab === "suppliers" ? "Tambah Supplier Baru" : "Tambah Produk Baru"}
        hasSelection={Boolean(selectedId) && tab !== "movements"}
        onEditSelected={tab !== "movements" ? openEditModal : undefined}
        onDeleteSelected={tab !== "movements" ? () => void handleDeleteSelected() : undefined}
        onRefresh={() => void onRefresh()}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
        {tab === "products" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU &amp; Produk</th>
                <th className="px-4 py-3">Harga Jual / HPP</th>
                <th className="px-4 py-3">Stok Gudang</th>
                <th className="px-4 py-3 text-right">Penyesuaian Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProducts.slice(start, start + PAGE_SIZE).map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer ${selectedId === p.id ? "bg-emerald-500/15" : "hover:bg-slate-800/40"}`}
                >
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
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${p.stockQty <= p.minStock ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {p.stockQty} {p.unit}
                    </span>
                    <div className="mt-0.5 text-[10px] text-slate-500">Min: {p.minStock}</div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1.5">
                      <button type="button" onClick={() => void handleAdjustStock(p, 10)} className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25">+10</button>
                      <button type="button" onClick={() => void handleAdjustStock(p, -1)} className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700">-1</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "suppliers" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Supplier</th>
                <th className="px-4 py-3">PIC &amp; Kontak</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Termin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSuppliers.slice(start, start + PAGE_SIZE).map((sup) => (
                <tr
                  key={sup.id}
                  onClick={() => setSelectedId(sup.id)}
                  className={`cursor-pointer ${selectedId === sup.id ? "bg-emerald-500/15" : "hover:bg-slate-800/40"}`}
                >
                  <td className="px-4 py-3 font-bold text-white">{sup.name}</td>
                  <td className="px-4 py-3 text-slate-300">{sup.contactPerson ?? "-"} · {sup.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-400">{sup.address ?? "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">{sup.paymentTerms}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "movements" && (
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
              {filteredMovements.slice(start, start + PAGE_SIZE).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-slate-400">{new Date(m.createdAt).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-2.5 font-semibold text-white">{m.sku ? `${m.sku} — ` : ""}{m.productName ?? m.productId}</td>
                  <td className="px-4 py-2.5 uppercase text-cyan-300">{m.movementType}</td>
                  <td className={`px-4 py-2.5 font-bold ${m.quantity >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className="px-4 py-2.5 text-slate-300">{m.notes ?? m.referenceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <PaginationBar dark page={page} pageSize={PAGE_SIZE} totalItems={totalItems} onPageChange={setPage} />

      {/* Sub-Module Modal */}
      {modalMode !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">
                {modalMode === "create"
                  ? tab === "suppliers"
                    ? "Sub-Modul Tambah Supplier Baru"
                    : "Sub-Modul Tambah Produk ERP Baru"
                  : tab === "suppliers"
                    ? "Ubah Data Supplier"
                    : "Ubah Data Produk ERP"}
              </h3>
              <button type="button" onClick={() => setModalMode("none")} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="mt-4 space-y-3 text-xs">
              {tab === "suppliers" ? (
                <>
                  <input required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="Nama Perusahaan Supplier *" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={supPic} onChange={(e) => setSupPic(e.target.value)} placeholder="PIC" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    <input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="Telepon / WA" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    <input value={supTerms} onChange={(e) => setSupTerms(e.target.value)} placeholder="NET 14" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </div>
                  <input value={supAddress} onChange={(e) => setSupAddress(e.target.value)} placeholder="Alamat Gudang Supplier" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input required disabled={modalMode === "edit"} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-60" />
                    <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </div>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Produk *" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Harga Jual *" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    <input type="number" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="Harga Modal / HPP" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min={0} disabled={modalMode === "edit"} value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="Stok" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-60" />
                    <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="Min Stok" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Satuan" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </div>
                  <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi produk..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                </>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={() => setModalMode("none")} className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300">Batal</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
