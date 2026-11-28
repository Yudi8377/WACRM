"use client";

import { useState, type FormEvent } from "react";
import { Pencil, ShieldCheck, Trash2, Users } from "lucide-react";
import { EmsActionToolbar } from "./ems-action-toolbar";
import type {
  PublisherCompanyProfile,
  PublisherEmployeeRecord,
} from "@/lib/publisher-types";
import { formatIdr } from "@/lib/publisher-types";
import { exportEmsRowsToCsv } from "@/lib/publisher-crud";
import { printEmsTableReport } from "@/lib/publisher-print";

export type HrSubModule = "directory_rbac" | "kpi_commission";

interface PublisherHrRbacViewProps {
  profile: PublisherCompanyProfile;
  subModule: HrSubModule;
  onSelectSubModule: (s: HrSubModule) => void;
  employees: PublisherEmployeeRecord[];
  onInsertEmployee: (emp: Omit<PublisherEmployeeRecord, "id" | "code">) => void;
  onUpdateEmployee: (id: string, patch: Partial<PublisherEmployeeRecord>) => void;
  onDeleteEmployee: (id: string) => void;
}

const ROLE_LABELS: Record<PublisherEmployeeRecord["role"], string> = {
  super_admin: "Super Admin Direksi",
  license_officer: "License Officer (LMS)",
  sales_ae: "Sales Account Executive",
  customer_success: "Customer Success SLA",
  finance_controller: "Finance Controller PSAK",
  devops_support: "DevOps & Cloud Security",
};

export function PublisherHrRbacView({
  profile,
  subModule,
  onSelectSubModule,
  employees,
  onInsertEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}: PublisherHrRbacViewProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(employees[0]?.id ?? "");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState<PublisherEmployeeRecord["role"]>("sales_ae");
  const [department, setDepartment] = useState("Commercial Sales");
  const [email, setEmail] = useState("");
  const [monthlySalaryIdr, setMonthlySalaryIdr] = useState(7_500_000);
  const [salesTargetMrrIdr, setSalesTargetMrrIdr] = useState(15_000_000);
  const [status, setStatus] = useState<PublisherEmployeeRecord["status"]>("active");

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    );
  });

  const selected = employees.find((e) => e.id === selectedId) ?? filtered[0] ?? null;
  const totalPayroll = filtered.reduce((s, e) => s + e.monthlySalaryIdr, 0);
  const totalTargetMrr = filtered.reduce((s, e) => s + e.salesTargetMrrIdr, 0);

  function openInsert() {
    setEditingId(null);
    setName("");
    setRole("sales_ae");
    setDepartment("Commercial Sales");
    setEmail("");
    setMonthlySalaryIdr(7_500_000);
    setSalesTargetMrrIdr(15_000_000);
    setStatus("active");
    setShowModal(true);
  }

  function openEdit(emp: PublisherEmployeeRecord) {
    setEditingId(emp.id);
    setName(emp.name);
    setRole(emp.role);
    setDepartment(emp.department);
    setEmail(emp.email);
    setMonthlySalaryIdr(emp.monthlySalaryIdr);
    setSalesTargetMrrIdr(emp.salesTargetMrrIdr);
    setStatus(emp.status);
    setShowModal(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (editingId) {
      onUpdateEmployee(editingId, {
        name: name.trim(),
        role,
        department: department.trim(),
        email: email.trim(),
        monthlySalaryIdr: Number(monthlySalaryIdr) || 0,
        salesTargetMrrIdr: Number(salesTargetMrrIdr) || 0,
        status,
      });
    } else {
      onInsertEmployee({
        name: name.trim(),
        role,
        department: department.trim(),
        email: email.trim(),
        monthlySalaryIdr: Number(monthlySalaryIdr) || 0,
        salesTargetMrrIdr: Number(salesTargetMrrIdr) || 0,
        status,
      });
    }
    setShowModal(false);
  }

  function handlePrint() {
    printEmsTableReport({
      profile,
      title:
        subModule === "directory_rbac"
          ? "Direktori Staf Penerbit & Matriks Akses RBAC"
          : "Laporan Target KPI & Struktur Komisi Tim Sales",
      subtitle: "Dokumen resmi modul Human Capital & RBAC WACRM Publisher HQ.",
      docCode: `HR-RBAC-${new Date().toISOString().slice(0, 10)}`,
      columns: ["Kode", "Nama Staf", "Peran RBAC", "Departemen", "Email", "Gaji / Bln", "Target MRR", "Status"],
      rows: filtered.map((e) => [
        e.code,
        e.name,
        ROLE_LABELS[e.role],
        e.department,
        e.email,
        formatIdr(e.monthlySalaryIdr),
        formatIdr(e.salesTargetMrrIdr),
        e.status.toUpperCase(),
      ]),
      summaryNotes: [
        `Total Staf Aktif: ${filtered.filter((e) => e.status === "active").length} orang`,
        `Total Beban Gaji Bulanan: ${formatIdr(totalPayroll)}`,
        `Total Target MRR Bulanan: ${formatIdr(totalTargetMrr)}`,
      ],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-white">
          Human Capital, Staf Internal &amp; Otoritas RBAC Penerbit
        </h2>
        <p className="text-xs text-slate-400">
          Kelola direktori tim internal penerbit WACRM, hak akses modul EMS (RBAC), beban gaji, dan target KPI sales.
        </p>
      </div>

      <EmsActionToolbar
        moduleName="HR & RBAC"
        subModules={[
          { id: "directory_rbac", label: "Direktori Staf & Peran RBAC", count: employees.length },
          { id: "kpi_commission", label: "Target KPI & Beban Payroll", count: employees.filter((e) => e.salesTargetMrrIdr > 0).length },
        ]}
        activeSubModule={subModule}
        onSelectSubModule={(id) => onSelectSubModule(id as HrSubModule)}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari nama staf, kode, departemen..."
        onInsert={openInsert}
        insertLabel="Insert Staf Baru"
        onUpdate={selected ? () => openEdit(selected) : undefined}
        updateDisabled={!selected}
        onDelete={
          selected
            ? () => {
                if (window.confirm(`Hapus data staf ${selected.name}?`)) onDeleteEmployee(selected.id);
              }
            : undefined
        }
        deleteDisabled={!selected}
        onPrint={handlePrint}
        printLabel="Cetak Direktori HR"
        onExportCsv={() =>
          exportEmsRowsToCsv(
            "wacrm-publisher-hr-rbac.csv",
            ["Kode", "Nama", "Peran", "Departemen", "Email", "Gaji Bulanan", "Target MRR", "Status"],
            filtered.map((e) => [
              e.code,
              e.name,
              ROLE_LABELS[e.role],
              e.department,
              e.email,
              e.monthlySalaryIdr,
              e.salesTargetMrrIdr,
              e.status,
            ]),
          )
        }
        selectedLabel={selected ? `${selected.code} · ${selected.name}` : null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-emerald-400" /> Total Staf Internal
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">{filtered.length} orang</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-amber-400" /> Beban Payroll / Bulan
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amber-300">{formatIdr(totalPayroll)}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
          <div className="text-xs text-slate-400">Target MRR Bulanan Tim</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-400">{formatIdr(totalTargetMrr)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] text-slate-400">
            <tr>
              <th className="px-4 py-2.5">Kode</th>
              <th className="px-4 py-2.5">Nama &amp; Email</th>
              <th className="px-4 py-2.5">Peran RBAC</th>
              <th className="px-4 py-2.5">Departemen</th>
              <th className="px-4 py-2.5 text-right">Gaji / Bln</th>
              <th className="px-4 py-2.5 text-right">Target MRR</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Aksi EMS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => setSelectedId(emp.id)}
                className={`cursor-pointer hover:bg-slate-800/40 ${
                  selected?.id === emp.id ? "bg-emerald-500/5" : ""
                }`}
              >
                <td className="px-4 py-3 font-mono font-bold text-emerald-300">{emp.code}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-white">{emp.name}</div>
                  <div className="text-[11px] text-slate-400">{emp.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-amber-300">
                    {ROLE_LABELS[emp.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{emp.department}</td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatIdr(emp.monthlySalaryIdr)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-300">
                  {formatIdr(emp.salesTargetMrrIdr)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      emp.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(emp);
                      }}
                      className="rounded-lg bg-amber-500/20 p-1.5 text-amber-300 hover:bg-amber-500/30"
                      title="Update Staf"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Hapus data staf ${emp.name}?`)) onDeleteEmployee(emp.id);
                      }}
                      className="rounded-lg bg-rose-500/20 p-1.5 text-rose-300 hover:bg-rose-500/30"
                      title="Delete Staf"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">
                {editingId ? "Update Data Staf & RBAC" : "Insert Staf Penerbit Baru"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-slate-300">
                Nama Lengkap *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Email Korporat *
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Peran RBAC
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as PublisherEmployeeRecord["role"])}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {Object.entries(ROLE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-slate-300">
                Departemen
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-slate-300">
                Gaji Bulanan (Rp)
                <input
                  type="number"
                  value={monthlySalaryIdr}
                  onChange={(e) => setMonthlySalaryIdr(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </label>
              <label className="block text-slate-300">
                Target MRR / Bln (Rp)
                <input
                  type="number"
                  value={salesTargetMrrIdr}
                  onChange={(e) => setSalesTargetMrrIdr(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                {editingId ? "Simpan Update" : "Simpan Staf"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
