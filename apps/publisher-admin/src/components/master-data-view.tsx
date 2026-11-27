"use client";

import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Building2,
  Handshake,
  Package,
  Plus,
  Server,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  formatIdr,
  type AccountType,
  type ChartOfAccountRecord,
  type ProductSkuRecord,
  type PublisherEmployeeRecord,
  type PublisherEmsState,
  type ResellerPartnerRecord,
  type TenantCustomerRecord,
  type VendorRecord,
} from "@/lib/publisher-types";

interface MasterDataViewProps {
  state: PublisherEmsState;
  onUpdateState: (updater: (prev: PublisherEmsState) => PublisherEmsState) => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

type MasterSubTab = "tenants" | "skus" | "resellers" | "vendors" | "employees" | "coa";

export function MasterDataView({ state, onUpdateState, onToast }: MasterDataViewProps) {
  const [subTab, setSubTab] = useState<MasterSubTab>("tenants");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Forms per entity
  const [tenantForm, setTenantForm] = useState({
    companyName: "",
    npwp: "",
    industry: "Retail & Distribusi",
    picName: "",
    picEmail: "",
    picWhatsapp: "+628",
    domain: "",
    city: "Jakarta",
    resellerId: "",
  });

  const [skuForm, setSkuForm] = useState({
    sku: "",
    name: "",
    category: "addon" as ProductSkuRecord["category"],
    billingCycle: "one_time" as ProductSkuRecord["billingCycle"],
    unitPriceIdr: 1_000_000,
    costPriceIdr: 350_000,
    stockQty: 50,
    minStock: 5,
  });

  const [resellerForm, setResellerForm] = useState({
    name: "",
    tier: "gold" as ResellerPartnerRecord["tier"],
    picName: "",
    email: "",
    phone: "+628",
    city: "Surabaya",
    commissionRate: 12,
  });

  const [vendorForm, setVendorForm] = useState({
    name: "",
    category: "cloud_db" as VendorRecord["category"],
    contactEmail: "",
    npwp: "",
    paymentTerms: "Net 30",
    monthlyEstimateIdr: 2_500_000,
  });

  const [empForm, setEmpForm] = useState({
    name: "",
    role: "sales_ae" as PublisherEmployeeRecord["role"],
    department: "B2B Sales",
    email: "",
    monthlySalaryIdr: 6_000_000,
    salesTargetMrrIdr: 10_000_000,
  });

  const [coaForm, setCoaForm] = useState({
    code: "",
    name: "",
    type: "expense" as AccountType,
    category: "Beban Operasional",
  });

  const q = search.trim().toLowerCase();

  function handleSaveModal(e: FormEvent) {
    e.preventDefault();
    const uid = `${Date.now().toString(36)}`;

    if (subTab === "tenants") {
      const next: TenantCustomerRecord = {
        id: `ten-${uid}`,
        code: `CUST-${String(state.tenants.length + 1).padStart(3, "0")}`,
        companyName: tenantForm.companyName.trim(),
        npwp: tenantForm.npwp.trim() || "-",
        industry: tenantForm.industry.trim(),
        picName: tenantForm.picName.trim(),
        picEmail: tenantForm.picEmail.trim(),
        picWhatsapp: tenantForm.picWhatsapp.trim(),
        domain:
          tenantForm.domain.trim() ||
          `${tenantForm.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16)}.wacrm.app`,
        city: tenantForm.city.trim(),
        resellerId: tenantForm.resellerId || null,
        status: "onboarding",
        monthlyCloudCogsIdr: 150_000,
        monthlyAiTokenCostIdr: 100_000,
        healthScore: 95,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onUpdateState((prev) => ({ ...prev, tenants: [next, ...prev.tenants] }));
      onToast(`Tenant ${next.companyName} ditambahkan ke Master Data.`);
    } else if (subTab === "skus") {
      const next: ProductSkuRecord = {
        id: `sku-${uid}`,
        sku: skuForm.sku.trim().toUpperCase(),
        name: skuForm.name.trim(),
        category: skuForm.category,
        billingCycle: skuForm.billingCycle,
        unitPriceIdr: Number(skuForm.unitPriceIdr) || 0,
        costPriceIdr: Number(skuForm.costPriceIdr) || 0,
        stockQty: Number(skuForm.stockQty) || 0,
        minStock: Number(skuForm.minStock) || 0,
        isActive: true,
      };
      onUpdateState((prev) => ({ ...prev, skus: [next, ...prev.skus] }));
      onToast(`SKU ${next.sku} ditambahkan.`);
    } else if (subTab === "resellers") {
      const next: ResellerPartnerRecord = {
        id: `rsl-${uid}`,
        code: `PTR-${String(state.resellers.length + 1).padStart(3, "0")}`,
        name: resellerForm.name.trim(),
        tier: resellerForm.tier,
        picName: resellerForm.picName.trim(),
        email: resellerForm.email.trim(),
        phone: resellerForm.phone.trim(),
        city: resellerForm.city.trim(),
        commissionRate: (Number(resellerForm.commissionRate) || 10) / 100,
        activeTenantsCount: 0,
        totalCommissionEarnedIdr: 0,
        status: "active",
      };
      onUpdateState((prev) => ({ ...prev, resellers: [next, ...prev.resellers] }));
      onToast(`Partner Reseller ${next.name} ditambahkan.`);
    } else if (subTab === "vendors") {
      const next: VendorRecord = {
        id: `vnd-${uid}`,
        code: `VND-${String(state.vendors.length + 1).padStart(3, "0")}`,
        name: vendorForm.name.trim(),
        category: vendorForm.category,
        contactEmail: vendorForm.contactEmail.trim(),
        npwp: vendorForm.npwp.trim() || "-",
        paymentTerms: vendorForm.paymentTerms.trim(),
        monthlyEstimateIdr: Number(vendorForm.monthlyEstimateIdr) || 0,
        status: "active",
      };
      onUpdateState((prev) => ({ ...prev, vendors: [next, ...prev.vendors] }));
      onToast(`Vendor ${next.name} ditambahkan.`);
    } else if (subTab === "employees") {
      const next: PublisherEmployeeRecord = {
        id: `emp-${uid}`,
        code: `EMP-${String(state.employees.length + 1).padStart(3, "0")}`,
        name: empForm.name.trim(),
        role: empForm.role,
        department: empForm.department.trim(),
        email: empForm.email.trim(),
        monthlySalaryIdr: Number(empForm.monthlySalaryIdr) || 0,
        salesTargetMrrIdr: Number(empForm.salesTargetMrrIdr) || 0,
        status: "active",
      };
      onUpdateState((prev) => ({ ...prev, employees: [next, ...prev.employees] }));
      onToast(`Karyawan ${next.name} ditambahkan.`);
    } else if (subTab === "coa") {
      if (state.coa.some((c) => c.code === coaForm.code.trim())) {
        onToast("Kode akun CoA sudah terdaftar.", "error");
        return;
      }
      const normalBalance: "debit" | "credit" =
        coaForm.type === "asset" || coaForm.type === "cogs" || coaForm.type === "expense"
          ? "debit"
          : "credit";
      const next: ChartOfAccountRecord = {
        code: coaForm.code.trim(),
        name: coaForm.name.trim(),
        type: coaForm.type,
        normalBalance,
        category: coaForm.category.trim(),
        isSystem: false,
      };
      onUpdateState((prev) => ({
        ...prev,
        coa: [...prev.coa, next].sort((a, b) => a.code.localeCompare(b.code)),
      }));
      onToast(`Akun CoA ${next.code} (${next.name}) ditambahkan.`);
    }

    setModalOpen(false);
  }

  const tabs: Array<{ id: MasterSubTab; label: string; count: number; icon: typeof Building2 }> = [
    { id: "tenants", label: "Perusahaan Tenant", count: state.tenants.length, icon: Building2 },
    { id: "skus", label: "SKU Produk & Edisi", count: state.skus.length, icon: Package },
    { id: "resellers", label: "Reseller & Partner", count: state.resellers.length, icon: Handshake },
    { id: "vendors", label: "Vendor Cloud & HW", count: state.vendors.length, icon: Server },
    { id: "employees", label: "Tim & Sales Penerbit", count: state.employees.length, icon: Users },
    { id: "coa", label: "Chart of Accounts (CoA)", count: state.coa.length, icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white">
            Master Data Perusahaan Penerbit WACRM
          </h2>
          <p className="text-xs text-slate-400">
            6 registri induk terpusat (Tenant B2B, SKU Edisi &amp; Hardware, Partner Reseller,
            Vendor Infrastruktur, Tim Penerbit, dan CoA PSAK 72).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Tambah Data Baru
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSubTab(t.id);
                setSearch("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                subTab === t.id
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Cari di ${tabs.find((t) => t.id === subTab)?.label}...`}
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-white placeholder:text-slate-500"
      />

      {/* Tables */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        {subTab === "tenants" && (
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode</th>
                <th className="px-3 py-2">Perusahaan &amp; Domain</th>
                <th className="px-3 py-2">NPWP &amp; Industri</th>
                <th className="px-3 py-2">PIC / Kontak</th>
                <th className="px-3 py-2 text-right">Est. COGS Cloud+AI</th>
                <th className="px-3 py-2">Status</th>
                <th className="pl-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.tenants
                .filter(
                  (t) =>
                    !q ||
                    t.companyName.toLowerCase().includes(q) ||
                    t.domain.toLowerCase().includes(q) ||
                    t.city.toLowerCase().includes(q),
                )
                .map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono text-emerald-300">{t.code}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-white">{t.companyName}</div>
                      <div className="text-[11px] text-slate-400">
                        {t.domain} · {t.city}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-mono text-[11px] text-slate-300">{t.npwp}</div>
                      <div className="text-[11px] text-slate-400">{t.industry}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-white">{t.picName}</div>
                      <div className="text-[11px] text-slate-400">{t.picEmail}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-200">
                      {formatIdr(t.monthlyCloudCogsIdr + t.monthlyAiTokenCostIdr)}/bln
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        {t.status}
                      </span>
                    </td>
                    <td className="pl-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateState((prev) => ({
                            ...prev,
                            tenants: prev.tenants.filter((x) => x.id !== t.id),
                          }));
                          onToast(`Tenant ${t.companyName} dihapus dari Master Data.`);
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {subTab === "skus" && (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode SKU</th>
                <th className="px-3 py-2">Nama Produk / Lisensi</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Siklus</th>
                <th className="px-3 py-2 text-right">Harga Jual</th>
                <th className="px-3 py-2 text-right">HPP / Cost</th>
                <th className="pl-3 py-2 text-right">Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.skus
                .filter(
                  (s) =>
                    !q || s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
                )
                .map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono font-bold text-indigo-300">{s.sku}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{s.name}</td>
                    <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-slate-300">
                      {s.category}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{s.billingCycle}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                      {formatIdr(s.unitPriceIdr)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {formatIdr(s.costPriceIdr)}
                    </td>
                    <td className="pl-3 py-2.5 text-right font-mono text-white">
                      {s.category === "hardware" ? `${s.stockQty} unit` : "Digital ∞"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {subTab === "resellers" && (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode</th>
                <th className="px-3 py-2">Partner Reseller</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">PIC &amp; Kota</th>
                <th className="px-3 py-2 text-right">Komisi %</th>
                <th className="pl-3 py-2 text-right">Total Komisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.resellers
                .filter((r) => !q || r.name.toLowerCase().includes(q))
                .map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono text-amber-300">{r.code}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{r.name}</td>
                    <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-indigo-300">
                      {r.tier}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {r.picName} · {r.city}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-white">
                      {(r.commissionRate * 100).toFixed(0)}%
                    </td>
                    <td className="pl-3 py-2.5 text-right font-bold text-emerald-400">
                      {formatIdr(r.totalCommissionEarnedIdr)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {subTab === "vendors" && (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode</th>
                <th className="px-3 py-2">Nama Vendor</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">NPWP / Termin</th>
                <th className="pl-3 py-2 text-right">Est. Biaya / Bln</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.vendors
                .filter((v) => !q || v.name.toLowerCase().includes(q))
                .map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono text-cyan-300">{v.code}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{v.name}</td>
                    <td className="px-3 py-2.5 uppercase text-[10px] text-slate-300">
                      {v.category.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {v.npwp} · {v.paymentTerms}
                    </td>
                    <td className="pl-3 py-2.5 text-right font-bold text-amber-300">
                      {formatIdr(v.monthlyEstimateIdr)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {subTab === "employees" && (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode</th>
                <th className="px-3 py-2">Nama &amp; Email</th>
                <th className="px-3 py-2">Role &amp; Departemen</th>
                <th className="px-3 py-2 text-right">Gaji Bulanan</th>
                <th className="pl-3 py-2 text-right">Target MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.employees
                .filter((e) => !q || e.name.toLowerCase().includes(q))
                .map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono text-emerald-300">{e.code}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-white">{e.name}</div>
                      <div className="text-[11px] text-slate-400">{e.email}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {e.role.replace("_", " ")} · {e.department}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-200">
                      {formatIdr(e.monthlySalaryIdr)}
                    </td>
                    <td className="pl-3 py-2.5 text-right font-bold text-indigo-300">
                      {formatIdr(e.salesTargetMrrIdr)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {subTab === "coa" && (
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Kode Akun</th>
                <th className="px-3 py-2">Nama Akun (PSAK SaaS)</th>
                <th className="px-3 py-2">Tipe</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="pl-3 py-2 text-right">Saldo Normal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.coa
                .filter(
                  (c) =>
                    !q || c.code.includes(q) || c.name.toLowerCase().includes(q),
                )
                .map((c) => (
                  <tr key={c.code} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-mono font-bold text-emerald-300">{c.code}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{c.name}</td>
                    <td className="px-3 py-2.5 uppercase text-[10px] font-bold text-indigo-300">
                      {c.type}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{c.category}</td>
                    <td className="pl-3 py-2.5 text-right uppercase font-mono text-[11px] text-slate-300">
                      {c.normalBalance}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* UNIVERSAL ADD MASTER DATA MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                Tambah {tabs.find((t) => t.id === subTab)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-3 text-xs">
              {subTab === "tenants" && (
                <>
                  <input
                    required
                    placeholder="Nama Perusahaan (PT / CV) *"
                    value={tenantForm.companyName}
                    onChange={(e) => setTenantForm({ ...tenantForm, companyName: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="NPWP"
                      value={tenantForm.npwp}
                      onChange={(e) => setTenantForm({ ...tenantForm, npwp: e.target.value })}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                    <input
                      placeholder="Kota"
                      value={tenantForm.city}
                      onChange={(e) => setTenantForm({ ...tenantForm, city: e.target.value })}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <input
                    required
                    placeholder="Nama PIC *"
                    value={tenantForm.picName}
                    onChange={(e) => setTenantForm({ ...tenantForm, picName: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      type="email"
                      placeholder="Email PIC *"
                      value={tenantForm.picEmail}
                      onChange={(e) => setTenantForm({ ...tenantForm, picEmail: e.target.value })}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                    <input
                      placeholder="WhatsApp PIC"
                      value={tenantForm.picWhatsapp}
                      onChange={(e) => setTenantForm({ ...tenantForm, picWhatsapp: e.target.value })}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <input
                    placeholder="Domain Instansi (opsional)"
                    value={tenantForm.domain}
                    onChange={(e) => setTenantForm({ ...tenantForm, domain: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </>
              )}

              {subTab === "skus" && (
                <>
                  <input
                    required
                    placeholder="Kode SKU (misal: ADD-WA-EXTRA) *"
                    value={skuForm.sku}
                    onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                  <input
                    required
                    placeholder="Nama Produk / Paket *"
                    value={skuForm.name}
                    onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={skuForm.category}
                      onChange={(e) =>
                        setSkuForm({
                          ...skuForm,
                          category: e.target.value as ProductSkuRecord["category"],
                        })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="license">License</option>
                      <option value="addon">Add-On</option>
                      <option value="hardware">Hardware</option>
                      <option value="service">Service / Onboarding</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Harga Jual (IDR)"
                      value={skuForm.unitPriceIdr}
                      onChange={(e) =>
                        setSkuForm({ ...skuForm, unitPriceIdr: Number(e.target.value) })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                </>
              )}

              {subTab === "resellers" && (
                <>
                  <input
                    required
                    placeholder="Nama Perusahaan Reseller *"
                    value={resellerForm.name}
                    onChange={(e) => setResellerForm({ ...resellerForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      required
                      placeholder="Nama PIC *"
                      value={resellerForm.picName}
                      onChange={(e) =>
                        setResellerForm({ ...resellerForm, picName: e.target.value })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                    <input
                      type="number"
                      min={5}
                      max={40}
                      placeholder="Komisi (%)"
                      value={resellerForm.commissionRate}
                      onChange={(e) =>
                        setResellerForm({
                          ...resellerForm,
                          commissionRate: Number(e.target.value),
                        })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Email Partner *"
                    value={resellerForm.email}
                    onChange={(e) => setResellerForm({ ...resellerForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </>
              )}

              {subTab === "vendors" && (
                <>
                  <input
                    required
                    placeholder="Nama Vendor *"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <select
                    value={vendorForm.category}
                    onChange={(e) =>
                      setVendorForm({
                        ...vendorForm,
                        category: e.target.value as VendorRecord["category"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="cloud_db">Cloud Database</option>
                    <option value="hosting">Hosting</option>
                    <option value="ai_llm">AI LLM Provider</option>
                    <option value="whatsapp_bsp">WhatsApp Cloud BSP</option>
                    <option value="hardware">Hardware Distributor</option>
                  </select>
                  <input
                    required
                    type="email"
                    placeholder="Email Billing Vendor *"
                    value={vendorForm.contactEmail}
                    onChange={(e) =>
                      setVendorForm({ ...vendorForm, contactEmail: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </>
              )}

              {subTab === "employees" && (
                <>
                  <input
                    required
                    placeholder="Nama Lengkap *"
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email Perusahaan *"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={empForm.role}
                      onChange={(e) =>
                        setEmpForm({
                          ...empForm,
                          role: e.target.value as PublisherEmployeeRecord["role"],
                        })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="sales_ae">Sales AE</option>
                      <option value="customer_success">Customer Success</option>
                      <option value="finance_controller">Finance Controller</option>
                      <option value="devops_support">DevOps &amp; Support</option>
                      <option value="license_officer">License Officer</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Gaji Bulanan (IDR)"
                      value={empForm.monthlySalaryIdr}
                      onChange={(e) =>
                        setEmpForm({ ...empForm, monthlySalaryIdr: Number(e.target.value) })
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                </>
              )}

              {subTab === "coa" && (
                <>
                  <input
                    required
                    placeholder="Kode Akun (misal: 6105) *"
                    value={coaForm.code}
                    onChange={(e) => setCoaForm({ ...coaForm, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                  />
                  <input
                    required
                    placeholder="Nama Akun PSAK *"
                    value={coaForm.name}
                    onChange={(e) => setCoaForm({ ...coaForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                  <select
                    value={coaForm.type}
                    onChange={(e) =>
                      setCoaForm({ ...coaForm, type: e.target.value as AccountType })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  >
                    <option value="asset">Asset (1xxx)</option>
                    <option value="liability">Liability (2xxx)</option>
                    <option value="equity">Equity (3xxx)</option>
                    <option value="revenue">Revenue (4xxx)</option>
                    <option value="cogs">COGS / HPP (5xxx)</option>
                    <option value="expense">Operating Expense (6xxx)</option>
                  </select>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  Simpan Master Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
