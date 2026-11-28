"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Award,
  BookOpenCheck,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Crown,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { ReportExportHub } from "@/components/report-export-hub";
import { UniversalPrintPanel } from "@/components/universal-print-panel";
import {
  formatIdr,
  type AppEditionId,
  type StoreBusinessProfile,
} from "@/lib/crm-types";
import {
  buildMonthlyPayrollSummary,
  loadHrdState,
  renderPayrollSummaryPrintHtml,
  renderPayslipPrintHtml,
  saveHrdState,
  type AttendanceCode,
  type EmploymentStatus,
  type HrdEmployeeRecord,
  type HrdLeaveRequest,
  type HrdModuleState,
  type HrdPayrollLineItem,
  type PtkpStatus,
} from "@/lib/hrd-payroll";
import { buildEscPosTextReport } from "@/lib/printer";

interface HrdPayrollViewProps {
  tenantId: string;
  editionId: AppEditionId;
  storeProfile: StoreBusinessProfile;
  onPostPayrollToAccounting?: (summary: {
    periodLabel: string;
    totalTakeHomePayIdr: number;
    totalPph21Idr: number;
    totalCompanyBpjsIdr: number;
    totalCompanyCostIdr: number;
  }) => Promise<void>;
  onOpenEditions?: () => void;
  onToast: (message: string, tone?: "ok" | "error") => void;
}

type HrdSubTab = "payroll" | "employees" | "attendance" | "leaves" | "kpi";

const PTKP_OPTIONS: PtkpStatus[] = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];
const EMP_STATUS_OPTIONS: EmploymentStatus[] = [
  "PKWTT (Tetap)",
  "PKWT (Kontrak)",
  "Probation",
  "Magang",
];

export function HrdPayrollView({
  tenantId,
  editionId,
  storeProfile,
  onPostPayrollToAccounting,
  onOpenEditions,
  onToast,
}: HrdPayrollViewProps) {
  const isSovereign = editionId === "sovereign";
  const [subTab, setSubTab] = useState<HrdSubTab>("payroll");
  const [periodLabel, setPeriodLabel] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  });

  const [state, setState] = useState<HrdModuleState>(() => loadHrdState(tenantId));
  const [selectedPayslipEmpId, setSelectedPayslipEmpId] = useState<string | null>(null);
  const [postingAccounting, setPostingAccounting] = useState(false);

  // Employee modal state
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({
    nik: "",
    fullName: "",
    position: "",
    department: "Operasional",
    branchName: "Kantor Pusat",
    employmentStatus: "PKWTT (Tetap)" as EmploymentStatus,
    ptkpStatus: "TK/0" as PtkpStatus,
    npwp: "",
    bankName: "BCA",
    bankAccount: "",
    baseSalaryIdr: 5_500_000,
    positionAllowanceIdr: 750_000,
    mealTransportAllowanceIdr: 650_000,
    bpjsKesehatanActive: true,
    bpjsKetenagakerjaanActive: true,
  });

  // Attendance form state
  const [attEmpId, setAttEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState<AttendanceCode>("hadir");
  const [attOvertime, setAttOvertime] = useState(2);
  const [attNotes, setAttNotes] = useState("");

  // Leave form state
  const [leaveEmpId, setLeaveEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [leaveType, setLeaveType] = useState<HrdLeaveRequest["leaveType"]>("Cuti Tahunan");
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState("");

  function updateState(updater: (prev: HrdModuleState) => HrdModuleState) {
    setState((prev) => {
      const next = updater(prev);
      saveHrdState(tenantId, next);
      return next;
    });
  }

  const payroll = useMemo(
    () => buildMonthlyPayrollSummary(state, periodLabel),
    [state, periodLabel],
  );

  const selectedPayslipLine: HrdPayrollLineItem | null = useMemo(
    () =>
      selectedPayslipEmpId
        ? payroll.lines.find((l) => l.employee.id === selectedPayslipEmpId) ?? null
        : null,
    [payroll.lines, selectedPayslipEmpId],
  );

  function handleAddEmployee(e: FormEvent) {
    e.preventDefault();
    if (!empForm.fullName.trim() || !empForm.position.trim()) return;
    const seq = state.employees.length + 1;
    const newEmp: HrdEmployeeRecord = {
      id: `emp-${seq}-${empForm.fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}`,
      nik: empForm.nik.trim() || `EMP-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`,
      fullName: empForm.fullName.trim(),
      position: empForm.position.trim(),
      department: empForm.department.trim() || "Operasional",
      branchName: empForm.branchName.trim() || "Kantor Pusat",
      employmentStatus: empForm.employmentStatus,
      joinDate: new Date().toISOString().slice(0, 10),
      ptkpStatus: empForm.ptkpStatus,
      npwp: empForm.npwp.trim() || "-",
      bankName: empForm.bankName.trim() || "BCA",
      bankAccount: empForm.bankAccount.trim() || "-",
      baseSalaryIdr: Math.max(0, Number(empForm.baseSalaryIdr) || 0),
      positionAllowanceIdr: Math.max(0, Number(empForm.positionAllowanceIdr) || 0),
      mealTransportAllowanceIdr: Math.max(0, Number(empForm.mealTransportAllowanceIdr) || 0),
      bpjsKesehatanActive: empForm.bpjsKesehatanActive,
      bpjsKetenagakerjaanActive: empForm.bpjsKetenagakerjaanActive,
      annualLeaveQuota: 12,
      annualLeaveUsed: 0,
      kpiScore: 85,
      isActive: true,
    };
    updateState((prev) => ({
      ...prev,
      employees: [newEmp, ...prev.employees],
    }));
    setEmpModalOpen(false);
    setEmpForm((prev) => ({ ...prev, nik: "", fullName: "", position: "", bankAccount: "" }));
    onToast(`Karyawan "${newEmp.fullName}" berhasil ditambahkan ke HRD & Payroll!`, "ok");
  }

  function handleAddAttendance(e: FormEvent) {
    e.preventDefault();
    const targetId = attEmpId || state.employees[0]?.id;
    if (!targetId) return;
    updateState((prev) => ({
      ...prev,
      attendance: [
        {
          id: `att-${prev.attendance.length + 1}-${attDate}`,
          employeeId: targetId,
          date: attDate,
          status: attStatus,
          overtimeHours: Math.max(0, attOvertime),
          notes: attNotes.trim() || "Tercatat di sistem HRD",
        },
        ...prev.attendance,
      ],
    }));
    setAttNotes("");
    onToast("Absensi & jam lembur berhasil dicatat — Payroll otomatis terhitung ulang!", "ok");
  }

  function handleAddLeave(e: FormEvent) {
    e.preventDefault();
    const emp = state.employees.find((x) => x.id === (leaveEmpId || state.employees[0]?.id));
    if (!emp || !leaveReason.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    updateState((prev) => ({
      ...prev,
      leaveRequests: [
        {
          id: `lv-${prev.leaveRequests.length + 1}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          leaveType,
          startDate: today,
          endDate: today,
          days: Math.max(1, leaveDays),
          reason: leaveReason.trim(),
          status: "pending",
        },
        ...prev.leaveRequests,
      ],
    }));
    setLeaveReason("");
    onToast(`Pengajuan ${leaveType} untuk ${emp.fullName} dicatat.`, "ok");
  }

  function handleApproveLeave(lv: HrdLeaveRequest, decision: "approved" | "rejected") {
    updateState((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((item) =>
        item.id === lv.id ? { ...item, status: decision } : item,
      ),
      employees:
        decision === "approved" && lv.leaveType === "Cuti Tahunan"
          ? prev.employees.map((e) =>
              e.id === lv.employeeId
                ? { ...e, annualLeaveUsed: e.annualLeaveUsed + lv.days }
                : e,
            )
          : prev.employees,
    }));
    onToast(
      decision === "approved"
        ? `Cuti ${lv.employeeName} (${lv.days} hari) disetujui!`
        : `Pengajuan cuti ${lv.employeeName} ditolak.`,
      "ok",
    );
  }

  async function handlePostPayrollToAccounting() {
    if (!onPostPayrollToAccounting) return;
    setPostingAccounting(true);
    try {
      await onPostPayrollToAccounting({
        periodLabel,
        totalTakeHomePayIdr: payroll.totalTakeHomePayIdr,
        totalPph21Idr: payroll.totalPph21Idr,
        totalCompanyBpjsIdr: payroll.totalCompanyBpjsIdr,
        totalCompanyCostIdr: payroll.totalCompanyCostIdr,
      });
      updateState((prev) => ({ ...prev, lastPostedPeriod: periodLabel }));
      onToast(
        `Jurnal Beban Gaji, BPJS & PPh 21 periode ${periodLabel} berhasil diposting ke Akuntansi!`,
        "ok",
      );
    } catch {
      onToast("Gagal memposting jurnal gaji ke Akuntansi.", "error");
    } finally {
      setPostingAccounting(false);
    }
  }

  return (
    <div className="space-y-5 p-4 text-slate-100 md:p-6">
      {/* HERO HEADER */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/25 to-emerald-950/35 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Sovereign Corporate Exclusive · HRD, Absensi, Lembur, BPJS &amp; Payroll PPh 21 TER
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              HRD &amp; Payroll Enterprise — {storeProfile.businessName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Manajemen SDM korporat lengkap sesuai regulasi Indonesia: Database Karyawan PKWTT/PKWT, Absensi &amp; Lembur (PP 35/2021 1/173), Persetujuan Cuti, Kalkulasi Otomatis BPJS Kesehatan/JHT/JKK/JKM/JP &amp; PPh Pasal 21 TER 2024 (PP 58/2023), Slip Gaji PDF, KPI, serta Posting Jurnal Otomatis ke Akuntansi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <span className="text-[10px] text-slate-400">Periode Payroll:</span>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="w-32 bg-transparent font-bold text-emerald-300 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setEmpModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <UserPlus className="h-4 w-4" /> Tambah Karyawan
            </button>
            {!isSovereign && onOpenEditions && (
              <button
                type="button"
                onClick={onOpenEditions}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
              >
                <Crown className="h-4 w-4" /> Aktivasi Sovereign Corporate
              </button>
            )}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[11px] text-slate-400">Karyawan Aktif</div>
            <div className="mt-1 text-xl font-extrabold text-white">{payroll.employeeCount} Orang</div>
            <div className="text-[10px] text-emerald-300">
              {state.employees.filter((e) => e.employmentStatus.includes("Tetap")).length} Tetap ·{" "}
              {state.employees.filter((e) => !e.employmentStatus.includes("Tetap")).length} Kontrak
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[11px] text-slate-400">Total Take Home Pay</div>
            <div className="mt-1 font-mono text-base font-extrabold text-emerald-300">
              {formatIdr(payroll.totalTakeHomePayIdr)}
            </div>
            <div className="text-[10px] text-slate-400">Siap transfer bank karyawan</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[11px] text-slate-400">Total PPh Pasal 21 TER</div>
            <div className="mt-1 font-mono text-base font-extrabold text-amber-300">
              {formatIdr(payroll.totalPph21Idr)}
            </div>
            <div className="text-[10px] text-slate-400">PP 58/2023 (SPT Masa 21)</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[11px] text-slate-400">Total BPJS (Perusahaan + Kary.)</div>
            <div className="mt-1 font-mono text-base font-extrabold text-cyan-300">
              {formatIdr(payroll.totalCompanyBpjsIdr + payroll.totalEmployeeBpjsIdr)}
            </div>
            <div className="text-[10px] text-slate-400">Kesehatan + JHT + JKK + JKM + JP</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 col-span-2 lg:col-span-1">
            <div className="text-[11px] text-slate-400">Total Biaya Perusahaan</div>
            <div className="mt-1 font-mono text-base font-extrabold text-white">
              {formatIdr(payroll.totalCompanyCostIdr)}
            </div>
            <div className="text-[10px] text-emerald-300">Bruto + BPJS Perusahaan</div>
          </div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "payroll", label: "Penggajian, PPh 21 & Slip Gaji", icon: Wallet },
            { id: "employees", label: `Database Karyawan (${state.employees.length})`, icon: Users },
            { id: "attendance", label: `Absensi & Lembur (${state.attendance.length})`, icon: Clock },
            {
              id: "leaves",
              label: `Cuti & Izin (${state.leaveRequests.filter((l) => l.status === "pending").length} Pending)`,
              icon: CalendarCheck,
            },
            { id: "kpi", label: "KPI & Evaluasi Kinerja", icon: Award },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                subTab === t.id
                  ? "bg-amber-400 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: PAYROLL, PPH 21 TER, BPJS & SLIP GAJI */}
      {subTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
            <div className="text-xs text-slate-300">
              <strong className="text-white">Otomasi Payroll ke Akuntansi:</strong> Klik tombol di samping untuk mencatat otomatis Beban Gaji, BPJS &amp; Utang PPh 21 periode <strong>{periodLabel}</strong> ke Buku Besar Akuntansi.
              {state.lastPostedPeriod && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Terakhir diposting: {state.lastPostedPeriod}
                </span>
              )}
            </div>
            {onPostPayrollToAccounting && (
              <button
                type="button"
                disabled={postingAccounting}
                onClick={() => void handlePostPayrollToAccounting()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                <BookOpenCheck className="h-4 w-4" />
                {postingAccounting ? "Memposting Jurnal..." : "Posting Jurnal Gaji ke Akuntansi"}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Karyawan &amp; PTKP</th>
                  <th className="px-3 py-2.5 text-right">Gaji + Tunj.</th>
                  <th className="px-3 py-2.5 text-right">Lembur</th>
                  <th className="px-3 py-2.5 text-right">Bonus (Edit)</th>
                  <th className="px-3 py-2.5 text-right">BPJS Kary.</th>
                  <th className="px-3 py-2.5 text-right">PPh 21 TER</th>
                  <th className="px-3 py-2.5 text-right">Take Home Pay</th>
                  <th className="px-3 py-2.5 text-right">Slip Gaji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payroll.lines.map((line) => (
                  <tr key={line.employee.id} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-white">{line.employee.fullName}</div>
                      <div className="text-[10px] text-slate-400">
                        {line.employee.nik} · {line.employee.position} ·{" "}
                        <span className="text-amber-300">
                          {line.employee.ptkpStatus} (TER {line.terCategory} {line.terRatePct}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatIdr(
                        line.baseSalaryIdr +
                          line.positionAllowanceIdr +
                          line.mealTransportAllowanceIdr,
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-cyan-300">
                      {formatIdr(line.overtimePayIdr)}
                      <div className="text-[10px] text-slate-500">{line.overtimeHours} jam</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step={50000}
                        value={state.bonusByEmployeeId[line.employee.id] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          updateState((prev) => ({
                            ...prev,
                            bonusByEmployeeId: {
                              ...prev.bonusByEmployeeId,
                              [line.employee.id]: val,
                            },
                          }));
                        }}
                        className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-[11px] text-emerald-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-300">
                      ({formatIdr(line.bpjsKesEmployeeIdr + line.bpjsJhtEmployeeIdr + line.bpjsJpEmployeeIdr)})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-300">
                      ({formatIdr(line.pph21MonthlyIdr)})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-300">
                      {formatIdr(line.netTakeHomePayIdr)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayslipEmpId(line.employee.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[10px] font-extrabold text-cyan-200 hover:bg-cyan-500/30"
                      >
                        <Printer className="h-3 w-3" /> Slip PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Individual Payslip Print Panel when selected */}
          {selectedPayslipLine && (
            <div className="rounded-3xl border border-cyan-500/40 bg-slate-900 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-cyan-300">
                  Studio Cetak Slip Gaji — {selectedPayslipLine.employee.fullName} ({periodLabel})
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedPayslipEmpId(null)}
                  className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <UniversalPrintPanel
                documentLabel={`Slip Gaji ${selectedPayslipLine.employee.fullName}`}
                jobTitle={`Slip Gaji ${selectedPayslipLine.employee.fullName} — ${periodLabel}`}
                filenameBase={`slip-gaji-${selectedPayslipLine.employee.nik}`}
                defaultPaper="a4"
                buildHtml={() => renderPayslipPrintHtml(selectedPayslipLine, storeProfile)}
                buildEscPos={() =>
                  buildEscPosTextReport(
                    `SLIP GAJI ${periodLabel}`,
                    storeProfile,
                    [
                      `${selectedPayslipLine.employee.nik} - ${selectedPayslipLine.employee.fullName}`,
                      `Jabatan: ${selectedPayslipLine.employee.position}`,
                      `Bruto: ${formatIdr(selectedPayslipLine.grossIncomeIdr)}`,
                      `BPJS Kary: -${formatIdr(selectedPayslipLine.bpjsKesEmployeeIdr + selectedPayslipLine.bpjsJhtEmployeeIdr + selectedPayslipLine.bpjsJpEmployeeIdr)}`,
                      `PPh 21 TER: -${formatIdr(selectedPayslipLine.pph21MonthlyIdr)}`,
                      `TAKE HOME PAY: ${formatIdr(selectedPayslipLine.netTakeHomePayIdr)}`,
                    ],
                  )
                }
                onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              />
            </div>
          )}

          {/* Monthly Payroll Register Print & Export */}
          <UniversalPrintPanel
            documentLabel={`Rekap Payroll Bulanan (${periodLabel})`}
            jobTitle={`Rekap Payroll & PPh 21 TER ${periodLabel} — ${storeProfile.businessName}`}
            filenameBase={`rekap-payroll-${periodLabel}`}
            defaultPaper="a4"
            buildHtml={() => renderPayrollSummaryPrintHtml(payroll, storeProfile)}
            buildEscPos={() =>
              buildEscPosTextReport(
                `REKAP PAYROLL ${periodLabel}`,
                storeProfile,
                [
                  `Karyawan: ${payroll.employeeCount}`,
                  `Total Bruto: ${formatIdr(payroll.totalGrossIdr)}`,
                  `Total PPh 21: ${formatIdr(payroll.totalPph21Idr)}`,
                  `Total THP: ${formatIdr(payroll.totalTakeHomePayIdr)}`,
                  `Total Biaya Corp: ${formatIdr(payroll.totalCompanyCostIdr)}`,
                ],
              )
            }
            onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
            compact
          />

          <ReportExportHub
            heading="Ekspor Rekap Payroll, File Transfer Bank & Laporan BPJS/PPh 21 (Excel / PDF / CSV) ke Desktop"
            onToast={onToast}
            buildPayload={() => ({
              reportTitle: `Rekap Payroll Korporat, BPJS & PPh 21 TER — ${periodLabel}`,
              subtitle: `${payroll.employeeCount} Karyawan · Total THP ${formatIdr(payroll.totalTakeHomePayIdr)} · Total PPh 21 ${formatIdr(payroll.totalPph21Idr)}`,
              businessName: storeProfile.businessName,
              filenameBase: `payroll-hrd-sovereign-${periodLabel}`,
              kpis: [
                { label: "Total Bruto", value: formatIdr(payroll.totalGrossIdr) },
                { label: "Total PPh 21 TER", value: formatIdr(payroll.totalPph21Idr) },
                { label: "Total BPJS Perusahaan", value: formatIdr(payroll.totalCompanyBpjsIdr) },
                { label: "Total Take Home Pay", value: formatIdr(payroll.totalTakeHomePayIdr) },
              ],
              sheets: [
                {
                  sheetName: "Rekap Payroll Bulanan",
                  headers: [
                    "NIK",
                    "Nama Karyawan",
                    "Jabatan",
                    "Departemen",
                    "PTKP",
                    "Bruto (Rp)",
                    "Lembur (Rp)",
                    "Bonus (Rp)",
                    "BPJS Karyawan (Rp)",
                    "PPh 21 TER (Rp)",
                    "Take Home Pay (Rp)",
                    "Biaya Perusahaan (Rp)",
                  ],
                  rows: payroll.lines.map((l) => [
                    l.employee.nik,
                    l.employee.fullName,
                    l.employee.position,
                    l.employee.department,
                    l.employee.ptkpStatus,
                    l.grossIncomeIdr,
                    l.overtimePayIdr,
                    l.bonusIdr,
                    l.bpjsKesEmployeeIdr + l.bpjsJhtEmployeeIdr + l.bpjsJpEmployeeIdr,
                    l.pph21MonthlyIdr,
                    l.netTakeHomePayIdr,
                    l.totalCompanyCostIdr,
                  ]),
                },
                {
                  sheetName: "File Transfer Bank",
                  headers: ["Bank", "No. Rekening", "Nama Penerima", "Nominal Transfer THP (Rp)", "Keterangan"],
                  rows: payroll.lines.map((l) => [
                    l.employee.bankName,
                    l.employee.bankAccount,
                    l.employee.fullName,
                    l.netTakeHomePayIdr,
                    `Gaji ${periodLabel} - ${l.employee.nik}`,
                  ]),
                },
              ],
            })}
          />
        </div>
      )}

      {/* SUB-TAB 2: DATABASE KARYAWAN */}
      {subTab === "employees" && (
        <div className="grid gap-3 md:grid-cols-2">
          {state.employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-amber-300">{emp.nik}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      {emp.employmentStatus}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-extrabold text-white">{emp.fullName}</h4>
                  <div className="text-[11px] text-slate-400">
                    <Briefcase className="mr-1 inline h-3 w-3" />
                    {emp.position} · {emp.department} ({emp.branchName})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateState((prev) => ({
                      ...prev,
                      employees: prev.employees.filter((x) => x.id !== emp.id),
                    }));
                    onToast(`Data karyawan "${emp.fullName}" dihapus.`, "ok");
                  }}
                  className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                  title="Hapus Karyawan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400">Gaji Pokok:</span>{" "}
                  <strong className="font-mono text-white">{formatIdr(emp.baseSalaryIdr)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Tunjangan:</span>{" "}
                  <strong className="font-mono text-emerald-300">
                    {formatIdr(emp.positionAllowanceIdr + emp.mealTransportAllowanceIdr)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">PTKP / NPWP:</span>{" "}
                  <strong className="text-amber-300">{emp.ptkpStatus}</strong> · {emp.npwp}
                </div>
                <div>
                  <span className="text-slate-400">Bank:</span> {emp.bankName} {emp.bankAccount}
                </div>
                <div>
                  <span className="text-slate-400">Sisa Cuti:</span>{" "}
                  <strong className="text-cyan-300">
                    {Math.max(0, emp.annualLeaveQuota - emp.annualLeaveUsed)} / {emp.annualLeaveQuota} hari
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">BPJS:</span>{" "}
                  <strong className="text-emerald-300">
                    {emp.bpjsKesehatanActive ? "Kes✓ " : ""}
                    {emp.bpjsKetenagakerjaanActive ? "TK✓" : ""}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: ABSENSI & LEMBUR */}
      {subTab === "attendance" && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddAttendance}
            className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs sm:grid-cols-6"
          >
            <select
              value={attEmpId}
              onChange={(e) => setAttEmpId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white sm:col-span-2"
            >
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nik} — {e.fullName}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <select
              value={attStatus}
              onChange={(e) => setAttStatus(e.target.value as AttendanceCode)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            >
              <option value="hadir">Hadir</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="cuti">Cuti</option>
              <option value="alfa">Alfa (Potong Gaji)</option>
            </select>
            <input
              type="number"
              min={0}
              max={12}
              value={attOvertime}
              onChange={(e) => setAttOvertime(Number(e.target.value) || 0)}
              placeholder="Jam Lembur"
              title="Jam Lembur (PP 35/2021)"
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> Catat
            </button>
          </form>

          <div className="space-y-2">
            {state.attendance.map((a) => {
              const emp = state.employees.find((e) => e.id === a.employeeId);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs"
                >
                  <div>
                    <strong className="text-white">{emp?.fullName || a.employeeId}</strong> ·{" "}
                    <span className="font-mono text-slate-400">{a.date}</span>
                    <div className="text-[11px] text-slate-400">{a.notes}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        a.status === "hadir"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : a.status === "alfa"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {a.status}
                    </span>
                    {a.overtimeHours > 0 && (
                      <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        Lembur +{a.overtimeHours} Jam
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CUTI & IZIN */}
      {subTab === "leaves" && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddLeave}
            className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs sm:grid-cols-5"
          >
            <select
              value={leaveEmpId}
              onChange={(e) => setLeaveEmpId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            >
              {state.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as HrdLeaveRequest["leaveType"])}
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            >
              <option>Cuti Tahunan</option>
              <option>Sakit (Surat Dokter)</option>
              <option>Izin Khusus</option>
              <option>Dinas Luar</option>
            </select>
            <input
              type="number"
              min={1}
              max={12}
              value={leaveDays}
              onChange={(e) => setLeaveDays(Math.max(1, Number(e.target.value) || 1))}
              placeholder="Hari"
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <input
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Alasan cuti / izin..."
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-400 px-3 py-2 font-extrabold text-slate-950 hover:bg-amber-300"
            >
              <Plus className="h-3.5 w-3.5" /> Ajukan
            </button>
          </form>

          <div className="space-y-2">
            {state.leaveRequests.map((lv) => (
              <div
                key={lv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs"
              >
                <div>
                  <strong className="text-white">{lv.employeeName}</strong> ·{" "}
                  <span className="text-amber-300">{lv.leaveType}</span> ({lv.days} hari)
                  <div className="text-[11px] text-slate-400">{lv.reason}</div>
                </div>
                {lv.status === "pending" ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApproveLeave(lv, "approved")}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveLeave(lv, "rejected")}
                      className="rounded-lg bg-rose-500/20 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30"
                    >
                      Tolak
                    </button>
                  </div>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${
                      lv.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {lv.status === "approved" ? "✓ Disetujui" : "Ditolak"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: KPI & PERFORMANCE APPRAISAL */}
      {subTab === "kpi" && (
        <div className="grid gap-3 md:grid-cols-2">
          {state.employees.map((emp) => {
            const grade =
              emp.kpiScore >= 90
                ? "A (Istimewa)"
                : emp.kpiScore >= 80
                  ? "B (Sangat Baik)"
                  : emp.kpiScore >= 70
                    ? "C (Baik)"
                    : "D (Perlu Coaching)";
            return (
              <div
                key={emp.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-white">{emp.fullName}</div>
                    <div className="text-[11px] text-slate-400">
                      {emp.position} · {emp.department}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-extrabold text-emerald-300">
                    {emp.kpiScore}/100 · {grade}
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={emp.kpiScore}
                  onChange={(e) => {
                    const nextScore = Number(e.target.value);
                    updateState((prev) => ({
                      ...prev,
                      employees: prev.employees.map((x) =>
                        x.id === emp.id ? { ...x, kpiScore: nextScore } : x,
                      ),
                    }));
                  }}
                  className="w-full accent-emerald-500"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Geser skor penilaian kinerja kuartalan</span>
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> Tersimpan di profil HRD
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Tambah Karyawan Baru (HRD Corporate)</h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={empForm.nik}
                  onChange={(e) => setEmpForm({ ...empForm, nik: e.target.value })}
                  placeholder="NIK (Kosong = Otomatis)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  required
                  value={empForm.fullName}
                  onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                  placeholder="Nama Lengkap *"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  required
                  value={empForm.position}
                  onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                  placeholder="Jabatan *"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  placeholder="Departemen"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <select
                  value={empForm.employmentStatus}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, employmentStatus: e.target.value as EmploymentStatus })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {EMP_STATUS_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <select
                  value={empForm.ptkpStatus}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, ptkpStatus: e.target.value as PtkpStatus })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {PTKP_OPTIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="number"
                  required
                  min={0}
                  value={empForm.baseSalaryIdr}
                  onChange={(e) => setEmpForm({ ...empForm, baseSalaryIdr: Number(e.target.value) })}
                  placeholder="Gaji Pokok (Rp)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={empForm.positionAllowanceIdr}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, positionAllowanceIdr: Number(e.target.value) })
                  }
                  placeholder="Tunjangan Jabatan (Rp)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={empForm.mealTransportAllowanceIdr}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, mealTransportAllowanceIdr: Number(e.target.value) })
                  }
                  placeholder="Tunjangan Makan/Transport (Rp)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <input
                  value={empForm.npwp}
                  onChange={(e) => setEmpForm({ ...empForm, npwp: e.target.value })}
                  placeholder="NPWP (opsional)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <input
                  value={empForm.bankName}
                  onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                  placeholder="Bank (BCA/Mandiri/BRI)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  value={empForm.bankAccount}
                  onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                  placeholder="No. Rekening Gaji"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={empForm.bpjsKesehatanActive}
                    onChange={(e) => setEmpForm({ ...empForm, bpjsKesehatanActive: e.target.checked })}
                    className="accent-emerald-500"
                  />
                  BPJS Kesehatan (4% / 1%)
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={empForm.bpjsKetenagakerjaanActive}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, bpjsKetenagakerjaanActive: e.target.checked })
                    }
                    className="accent-emerald-500"
                  />
                  BPJS Ketenagakerjaan (JHT/JKK/JKM/JP)
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
