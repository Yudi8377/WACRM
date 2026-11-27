"use client";

import { useState, type FormEvent } from "react";
import {
  Boxes,
  Building2,
  CreditCard,
  Layers,
  Truck,
  Users,
  X,
} from "lucide-react";
import { CrudToolbar, PaginationBar } from "@/components/crud-toolbar";
import {
  formatIdr,
  LIFECYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
  type ContactRecord,
  type ErpProductRecord,
  type ErpSupplierRecord,
  type LifecycleStage,
  type MasterCategoryRecord,
  type MasterCourierRecord,
  type MasterPaymentAccountRecord,
  type MasterUnitRecord,
  type PaymentMethod,
} from "@/lib/crm-types";
import {
  loadLocalMasterData,
  saveLocalMasterData,
  type LocalMasterDataState,
} from "@/lib/store-profile";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

interface MasterDataViewProps {
  adapter: WorkspaceAdapter;
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  contacts: ContactRecord[];
  onRefresh: () => Promise<void>;
  onToast: (message: string, tone?: "success" | "error") => void;
}

type MasterSubTab = "products" | "suppliers" | "customers" | "categories" | "couriers" | "payments";

const PAGE_SIZE = 5;

export function MasterDataView({
  adapter,
  products,
  suppliers,
  contacts,
  onRefresh,
  onToast,
}: MasterDataViewProps) {
  const [subTab, setSubTab] = useState<MasterSubTab>("products");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localMaster, setLocalMaster] = useState<LocalMasterDataState>(() =>
    loadLocalMasterData(adapter.tenantId),
  );

  // Modal state ("none" | "create" | "edit")
  const [modalMode, setModalMode] = useState<"none" | "create" | "edit">("none");
  const [saving, setSaving] = useState(false);

  // Form states for Product
  const [pSku, setPSku] = useState("");
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState("Umum");
  const [pUnit, setPUnit] = useState("pcs");
  const [pPrice, setPPrice] = useState("0");
  const [pCost, setPCost] = useState("0");
  const [pStock, setPStock] = useState("10");
  const [pMinStock, setPMinStock] = useState("5");
  const [pDesc, setPDesc] = useState("");

  // Form states for Supplier
  const [sName, setSName] = useState("");
  const [sPic, setSPic] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sAddr, setSAddr] = useState("");
  const [sTerms, setSTerms] = useState("NET 14");

  // Form states for Customer
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCompany, setCCompany] = useState("");
  const [cStage, setCStage] = useState<LifecycleStage>("lead");
  const [cNotes, setCNotes] = useState("");

  // Form states for Category / Unit
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");

  // Form states for Courier
  const [curCode, setCurCode] = useState("");
  const [curName, setCurName] = useState("");
  const [curService, setCurService] = useState("Reguler");
  const [curRate, setCurRate] = useState("15000");
  const [curEta, setCurEta] = useState("2-3 hari");

  // Form states for Payment Account
  const [payMethod, setPayMethod] = useState<PaymentMethod>("bank_transfer");
  const [payProvider, setPayProvider] = useState("");
  const [payNumber, setPayNumber] = useState("");
  const [payHolder, setPayHolder] = useState("");

  function commitLocal(next: LocalMasterDataState) {
    setLocalMaster(saveLocalMasterData(adapter.tenantId, next));
  }

  function switchSubTab(next: MasterSubTab) {
    setSubTab(next);
    setSelectedId(null);
    setSearch("");
    setPage(1);
    setModalMode("none");
  }

  const q = search.trim().toLowerCase();

  const filteredProducts = products.filter(
    (p) => !q || `${p.sku} ${p.name} ${p.category}`.toLowerCase().includes(q),
  );
  const filteredSuppliers = suppliers.filter(
    (s) => !q || `${s.name} ${s.contactPerson ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q),
  );
  const filteredContacts = contacts.filter(
    (c) => !q || `${c.displayName} ${c.phoneE164 ?? ""} ${c.company ?? ""}`.toLowerCase().includes(q),
  );
  const filteredCategories = localMaster.categories.filter(
    (c) => !q || `${c.name} ${c.description}`.toLowerCase().includes(q),
  );
  const filteredCouriers = localMaster.couriers.filter(
    (c) => !q || `${c.code} ${c.name} ${c.serviceType}`.toLowerCase().includes(q),
  );
  const filteredPayments = localMaster.paymentAccounts.filter(
    (p) => !q || `${p.providerName} ${p.accountNumber} ${p.accountHolder}`.toLowerCase().includes(q),
  );

  const totalCurrent =
    subTab === "products"
      ? filteredProducts.length
      : subTab === "suppliers"
        ? filteredSuppliers.length
        : subTab === "customers"
          ? filteredContacts.length
          : subTab === "categories"
            ? filteredCategories.length
            : subTab === "couriers"
              ? filteredCouriers.length
              : filteredPayments.length;

  const startIdx = (page - 1) * PAGE_SIZE;

  function openCreateModal() {
    setPSku("");
    setPName("");
    setPCategory(localMaster.categories[0]?.name ?? "Umum");
    setPUnit(localMaster.units[0]?.code ?? "pcs");
    setPPrice("");
    setPCost("");
    setPStock("20");
    setPMinStock("5");
    setPDesc("");

    setSName("");
    setSPic("");
    setSPhone("");
    setSEmail("");
    setSAddr("");
    setSTerms("NET 14");

    setCName("");
    setCPhone("");
    setCEmail("");
    setCCompany("");
    setCStage("lead");
    setCNotes("");

    setCatName("");
    setCatDesc("");
    setUnitCode("");
    setUnitName("");

    setCurCode("");
    setCurName("");
    setCurService("Reguler");
    setCurRate("18000");
    setCurEta("2-3 hari");

    setPayMethod("bank_transfer");
    setPayProvider("");
    setPayNumber("");
    setPayHolder("");

    setModalMode("create");
  }

  function openEditModal(overrideId?: string) {
    const id = overrideId ?? selectedId;
    if (!id) return;
    setSelectedId(id);

    if (subTab === "products") {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      setPSku(p.sku);
      setPName(p.name);
      setPCategory(p.category);
      setPUnit(p.unit);
      setPPrice(String(p.unitPrice));
      setPCost(String(p.costPrice));
      setPStock(String(p.stockQty));
      setPMinStock(String(p.minStock));
      setPDesc(p.description);
    } else if (subTab === "suppliers") {
      const s = suppliers.find((x) => x.id === id);
      if (!s) return;
      setSName(s.name);
      setSPic(s.contactPerson ?? "");
      setSPhone(s.phone ?? "");
      setSEmail(s.email ?? "");
      setSAddr(s.address ?? "");
      setSTerms(s.paymentTerms);
    } else if (subTab === "customers") {
      const c = contacts.find((x) => x.id === id);
      if (!c) return;
      setCName(c.displayName);
      setCPhone(c.phoneE164 ?? "");
      setCEmail(c.email ?? "");
      setCCompany(c.company ?? "");
      setCStage(c.lifecycleStage);
      setCNotes(c.notes ?? "");
    } else if (subTab === "categories") {
      const cat = localMaster.categories.find((x) => x.id === id);
      if (!cat) return;
      setCatName(cat.name);
      setCatDesc(cat.description);
    } else if (subTab === "couriers") {
      const cur = localMaster.couriers.find((x) => x.id === id);
      if (!cur) return;
      setCurCode(cur.code);
      setCurName(cur.name);
      setCurService(cur.serviceType);
      setCurRate(String(cur.baseRate));
      setCurEta(cur.estimatedDays);
    } else if (subTab === "payments") {
      const pay = localMaster.paymentAccounts.find((x) => x.id === id);
      if (!pay) return;
      setPayMethod(pay.method);
      setPayProvider(pay.providerName);
      setPayNumber(pay.accountNumber);
      setPayHolder(pay.accountHolder);
    }

    setModalMode("edit");
  }

  async function handleDelete(overrideId?: string) {
    const id = overrideId ?? selectedId;
    if (!id) return;
    if (!window.confirm("Yakin ingin menghapus data Master ini?")) return;

    try {
      if (subTab === "products") {
        await adapter.deleteProduct(id);
        await onRefresh();
      } else if (subTab === "suppliers") {
        if (adapter.deleteSupplier) {
          await adapter.deleteSupplier(id);
          await onRefresh();
        } else {
          onToast("Penghapusan supplier tidak tersedia di mode ini.", "error");
          return;
        }
      } else if (subTab === "customers") {
        await adapter.deleteContact(id);
        await onRefresh();
      } else if (subTab === "categories") {
        commitLocal({
          ...localMaster,
          categories: localMaster.categories.filter((c) => c.id !== id),
        });
      } else if (subTab === "couriers") {
        commitLocal({
          ...localMaster,
          couriers: localMaster.couriers.filter((c) => c.id !== id),
        });
      } else if (subTab === "payments") {
        commitLocal({
          ...localMaster,
          paymentAccounts: localMaster.paymentAccounts.filter((p) => p.id !== id),
        });
      }
      setSelectedId(null);
      onToast("Data berhasil dihapus.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menghapus data.", "error");
    }
  }

  async function handleSubmitModal(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (subTab === "products") {
        if (modalMode === "create") {
          await adapter.createProduct({
            sku: pSku.trim().toUpperCase(),
            name: pName.trim(),
            category: pCategory.trim() || "Umum",
            unit: pUnit.trim() || "pcs",
            unitPrice: Number(pPrice) || 0,
            costPrice: Number(pCost) || 0,
            stockQty: Number(pStock) || 0,
            minStock: Number(pMinStock) || 5,
            description: pDesc.trim(),
          });
          onToast("Master Barang baru ditambahkan & disinkronkan ke POS + AI.");
        } else if (selectedId) {
          await adapter.updateProduct(selectedId, {
            name: pName.trim(),
            category: pCategory.trim() || "Umum",
            unit: pUnit.trim() || "pcs",
            unitPrice: Number(pPrice) || 0,
            costPrice: Number(pCost) || 0,
            stockQty: Number(pStock) || 0,
            minStock: Number(pMinStock) || 5,
            description: pDesc.trim(),
          });
          onToast("Master Barang diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "suppliers") {
        if (modalMode === "create") {
          await adapter.createSupplier({
            name: sName.trim(),
            contactPerson: sPic.trim() || undefined,
            phone: sPhone.trim() || undefined,
            email: sEmail.trim() || undefined,
            address: sAddr.trim() || undefined,
            paymentTerms: sTerms.trim() || "NET 14",
          });
          onToast("Master Supplier baru ditambahkan.");
        } else if (selectedId && adapter.updateSupplier) {
          await adapter.updateSupplier(selectedId, {
            name: sName.trim(),
            contactPerson: sPic.trim(),
            phone: sPhone.trim(),
            email: sEmail.trim(),
            address: sAddr.trim(),
            paymentTerms: sTerms.trim() || "NET 14",
          });
          onToast("Master Supplier diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "customers") {
        if (modalMode === "create") {
          await adapter.createContact({
            displayName: cName.trim(),
            phoneE164: cPhone.trim() || undefined,
            email: cEmail.trim() || undefined,
            company: cCompany.trim() || undefined,
            lifecycleStage: cStage,
            notes: cNotes.trim() || undefined,
            tags: [cStage],
          });
          onToast("Master Pelanggan baru ditambahkan.");
        } else if (selectedId) {
          await adapter.updateContact(selectedId, {
            displayName: cName.trim(),
            phoneE164: cPhone.trim() || null,
            email: cEmail.trim() || null,
            company: cCompany.trim() || null,
            lifecycleStage: cStage,
            notes: cNotes.trim() || null,
          });
          onToast("Master Pelanggan diperbarui.");
        }
        await onRefresh();
      } else if (subTab === "categories") {
        const record: MasterCategoryRecord = {
          id: modalMode === "edit" && selectedId ? selectedId : `cat-${Date.now()}`,
          name: catName.trim(),
          description: catDesc.trim(),
        };
        const nextCats =
          modalMode === "edit"
            ? localMaster.categories.map((c) => (c.id === record.id ? record : c))
            : [record, ...localMaster.categories];
        const nextUnits: MasterUnitRecord[] =
          unitCode.trim() && unitName.trim()
            ? [
                { id: `u-${Date.now()}`, code: unitCode.trim().toLowerCase(), name: unitName.trim() },
                ...localMaster.units,
              ]
            : localMaster.units;
        commitLocal({ ...localMaster, categories: nextCats, units: nextUnits });
        onToast("Master Kategori & Satuan disimpan.");
      } else if (subTab === "couriers") {
        const record: MasterCourierRecord = {
          id: modalMode === "edit" && selectedId ? selectedId : `cur-${Date.now()}`,
          code: curCode.trim().toUpperCase(),
          name: curName.trim(),
          serviceType: curService.trim() || "Reguler",
          baseRate: Number(curRate) || 0,
          estimatedDays: curEta.trim() || "2-3 hari",
          isActive: true,
        };
        const next =
          modalMode === "edit"
            ? localMaster.couriers.map((c) => (c.id === record.id ? record : c))
            : [record, ...localMaster.couriers];
        commitLocal({ ...localMaster, couriers: next });
        onToast("Master Kurir & Ekspedisi disimpan.");
      } else if (subTab === "payments") {
        const record: MasterPaymentAccountRecord = {
          id: modalMode === "edit" && selectedId ? selectedId : `pay-${Date.now()}`,
          method: payMethod,
          providerName: payProvider.trim(),
          accountNumber: payNumber.trim(),
          accountHolder: payHolder.trim(),
          isActive: true,
        };
        const next =
          modalMode === "edit"
            ? localMaster.paymentAccounts.map((p) => (p.id === record.id ? record : p))
            : [record, ...localMaster.paymentAccounts];
        commitLocal({ ...localMaster, paymentAccounts: next });
        onToast("Master Rekening Pembayaran disimpan.");
      }
      setModalMode("none");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Gagal menyimpan data Master.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-xl font-bold text-white">Master Data Usaha</h2>
        <p className="text-xs text-slate-400">
          Kelola seluruh data induk (Barang, Supplier, Pelanggan, Kategori/Satuan, Kurir Ekspedisi &amp; Rekening Pembayaran) dengan operasi standar Tambah Baru, Ubah, Hapus, Back &amp; Next.
        </p>
      </div>

      {/* Sub-module Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "products" as const, label: `Barang (${products.length})`, icon: Boxes },
          { id: "suppliers" as const, label: `Supplier (${suppliers.length})`, icon: Building2 },
          { id: "customers" as const, label: `Pelanggan (${contacts.length})`, icon: Users },
          { id: "categories" as const, label: `Kategori & Satuan (${localMaster.categories.length})`, icon: Layers },
          { id: "couriers" as const, label: `Kurir Ekspedisi (${localMaster.couriers.length})`, icon: Truck },
          { id: "payments" as const, label: `Rekening Bayar (${localMaster.paymentAccounts.length})`, icon: CreditCard },
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchSubTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Standard Business CRUD Toolbar */}
      <CrudToolbar
        dark
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Cari di Master Data..."
        onAddNew={openCreateModal}
        addNewLabel="Tambah Baru"
        hasSelection={Boolean(selectedId)}
        onEditSelected={() => openEditModal()}
        onDeleteSelected={() => void handleDelete()}
        onRefresh={() => void onRefresh()}
      />

      {/* Data Table per Sub-Module */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
        {subTab === "products" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">HPP</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProducts.slice(startIdx, startIdx + PAGE_SIZE).map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer transition ${
                    selectedId === p.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-cyan-400">{p.sku}</td>
                  <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                  <td className="px-4 py-3 text-slate-300">{p.category}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatIdr(p.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{formatIdr(p.costPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 font-bold text-white">
                      {p.stockQty} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(p.id)}
                        className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(p.id)}
                        className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {subTab === "suppliers" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Supplier</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Telepon / Email</th>
                <th className="px-4 py-3">Termin</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSuppliers.slice(startIdx, startIdx + PAGE_SIZE).map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`cursor-pointer transition ${
                    selectedId === s.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-white">
                    {s.name}
                    <div className="text-[11px] font-normal text-slate-400">{s.address ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.contactPerson ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{s.phone ?? "-"}</div>
                    <div className="text-[11px] text-slate-400">{s.email ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-300">{s.paymentTerms}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(s.id)}
                        className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(s.id)}
                        className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {subTab === "customers" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Pelanggan</th>
                <th className="px-4 py-3">Telepon / WA</th>
                <th className="px-4 py-3">Perusahaan / Toko</th>
                <th className="px-4 py-3">Tahap</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredContacts.slice(startIdx, startIdx + PAGE_SIZE).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer transition ${
                    selectedId === c.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-white">{c.displayName}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{c.phoneE164 ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{c.company ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                      {LIFECYCLE_LABELS[c.lifecycleStage].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(c.id)}
                        className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(c.id)}
                        className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {subTab === "categories" && (
          <div className="divide-y divide-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama Kategori</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCategories.slice(startIdx, startIdx + PAGE_SIZE).map((cat) => (
                  <tr
                    key={cat.id}
                    onClick={() => setSelectedId(cat.id)}
                    className={`cursor-pointer ${selectedId === cat.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                  >
                    <td className="px-4 py-3 font-bold text-white">{cat.name}</td>
                    <td className="px-4 py-3 text-slate-300">{cat.description}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => openEditModal(cat.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                        <button type="button" onClick={() => void handleDelete(cat.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4">
              <div className="text-xs font-bold text-slate-300">Satuan Barang Terdaftar:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {localMaster.units.map((u) => (
                  <span key={u.id} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-cyan-300">
                    <strong>{u.code}</strong> · {u.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === "couriers" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Ekspedisi</th>
                <th className="px-4 py-3">Layanan</th>
                <th className="px-4 py-3 text-right">Tarif Dasar</th>
                <th className="px-4 py-3">Estimasi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCouriers.slice(startIdx, startIdx + PAGE_SIZE).map((cur) => (
                <tr
                  key={cur.id}
                  onClick={() => setSelectedId(cur.id)}
                  className={`cursor-pointer ${selectedId === cur.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                >
                  <td className="px-4 py-3 font-mono font-bold text-cyan-400">{cur.code}</td>
                  <td className="px-4 py-3 font-bold text-white">{cur.name}</td>
                  <td className="px-4 py-3 text-slate-300">{cur.serviceType}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400">{formatIdr(cur.baseRate)}</td>
                  <td className="px-4 py-3 text-slate-300">{cur.estimatedDays}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openEditModal(cur.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                      <button type="button" onClick={() => void handleDelete(cur.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {subTab === "payments" && (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
              <tr>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Bank / Penyedia</th>
                <th className="px-4 py-3">Nomor Rekening / ID</th>
                <th className="px-4 py-3">Atas Nama</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPayments.slice(startIdx, startIdx + PAGE_SIZE).map((pay) => (
                <tr
                  key={pay.id}
                  onClick={() => setSelectedId(pay.id)}
                  className={`cursor-pointer ${selectedId === pay.id ? "bg-emerald-500/15" : "hover:bg-slate-800/50"}`}
                >
                  <td className="px-4 py-3 font-semibold text-cyan-300">{PAYMENT_METHOD_LABELS[pay.method]}</td>
                  <td className="px-4 py-3 font-bold text-white">{pay.providerName}</td>
                  <td className="px-4 py-3 font-mono text-emerald-300">{pay.accountNumber}</td>
                  <td className="px-4 py-3 text-slate-300">{pay.accountHolder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => openEditModal(pay.id)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">Ubah</button>
                      <button type="button" onClick={() => void handleDelete(pay.id)} className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Back / Next Pagination */}
      <PaginationBar
        dark
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={totalCurrent}
        onPageChange={setPage}
      />

      {/* STANDARD SUB-MODULE FORM MODAL (Tambah Baru / Ubah) */}
      {modalMode !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold">
                {modalMode === "create" ? "Tambah Baru" : "Ubah Data"} —{" "}
                {subTab === "products"
                  ? "Master Barang"
                  : subTab === "suppliers"
                    ? "Master Supplier"
                    : subTab === "customers"
                      ? "Master Pelanggan"
                      : subTab === "categories"
                        ? "Master Kategori & Satuan"
                        : subTab === "couriers"
                          ? "Master Kurir Ekspedisi"
                          : "Master Rekening Pembayaran"}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode("none")}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-3 text-xs">
              {subTab === "products" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Kode SKU *
                      <input
                        required
                        disabled={modalMode === "edit"}
                        value={pSku}
                        onChange={(e) => setPSku(e.target.value)}
                        placeholder="KOPI-01"
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      Kategori
                      <select
                        value={pCategory}
                        onChange={(e) => setPCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      >
                        {localMaster.categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value="Umum">Umum</option>
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    Nama Barang *
                    <input required value={pName} onChange={(e) => setPName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Harga Jual (Rp) *
                      <input required type="number" min={0} value={pPrice} onChange={(e) => setPPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Harga Modal / HPP (Rp)
                      <input type="number" min={0} value={pCost} onChange={(e) => setPCost(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      Stok
                      <input type="number" min={0} value={pStock} onChange={(e) => setPStock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Stok Min
                      <input type="number" min={0} value={pMinStock} onChange={(e) => setPMinStock(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Satuan
                      <select value={pUnit} onChange={(e) => setPUnit(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        {localMaster.units.map((u) => (
                          <option key={u.id} value={u.code}>{u.code}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    Deskripsi Barang
                    <textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "suppliers" && (
                <>
                  <label className="block">
                    Nama Supplier *
                    <input required value={sName} onChange={(e) => setSName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      PIC / Kontak
                      <input value={sPic} onChange={(e) => setSPic(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      No. Telepon / WA
                      <input value={sPhone} onChange={(e) => setSPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Email
                      <input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Termin Pembayaran
                      <input value={sTerms} onChange={(e) => setSTerms(e.target.value)} placeholder="NET 14" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <label className="block">
                    Alamat Gudang Supplier
                    <input value={sAddr} onChange={(e) => setSAddr(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "customers" && (
                <>
                  <label className="block">
                    Nama Pelanggan *
                    <input required value={cName} onChange={(e) => setCName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      No. HP / WhatsApp
                      <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+62812..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Segmen Pelanggan
                      <select value={cStage} onChange={(e) => setCStage(e.target.value as LifecycleStage)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                        {(Object.keys(LIFECYCLE_LABELS) as LifecycleStage[]).map((st) => (
                          <option key={st} value={st}>{LIFECYCLE_LABELS[st].label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Email
                      <input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Toko / Perusahaan
                      <input value={cCompany} onChange={(e) => setCCompany(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <label className="block">
                    Catatan &amp; Alamat Default
                    <textarea rows={2} value={cNotes} onChange={(e) => setCNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              {subTab === "categories" && (
                <>
                  <label className="block">
                    Nama Kategori *
                    <input required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Contoh: Makanan Ringan" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    Deskripsi
                    <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                    <label className="block">
                      Tambah Satuan Baru (opsional)
                      <input value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="box / lusin" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Nama Satuan
                      <input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="Box / Lusin" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                </>
              )}

              {subTab === "couriers" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      Kode Kurir *
                      <input required value={curCode} onChange={(e) => setCurCode(e.target.value)} placeholder="POS-KILAT" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Nama Ekspedisi *
                      <input required value={curName} onChange={(e) => setCurName(e.target.value)} placeholder="Pos Indonesia" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      Layanan
                      <input value={curService} onChange={(e) => setCurService(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Tarif Dasar (Rp)
                      <input type="number" min={0} value={curRate} onChange={(e) => setCurRate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      Estimasi
                      <input value={curEta} onChange={(e) => setCurEta(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                    </label>
                  </div>
                </>
              )}

              {subTab === "payments" && (
                <>
                  <label className="block">
                    Metode Pembayaran
                    <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white">
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Bank / Penyedia *
                    <input required value={payProvider} onChange={(e) => setPayProvider(e.target.value)} placeholder="Bank BRI / QRIS Toko" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    No. Rekening / Merchant ID *
                    <input required value={payNumber} onChange={(e) => setPayNumber(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                  <label className="block">
                    Atas Nama *
                    <input required value={payHolder} onChange={(e) => setPayHolder(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
                  </label>
                </>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setModalMode("none")}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
