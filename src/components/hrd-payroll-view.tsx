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
  Edit3,
  Plus,
  Printer,
  RotateCcw,
  Search,
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
  computeIndonesianOvertimePay,
  computeWeightedKpiScore,
  loadHrdState,
  renderHrdAttendancePrintHtml,
  renderHrdEmployeesPrintHtml,
  renderHrdKpiPrintHtml,
  renderHrdLeavesPrintHtml,
  renderPayrollSummaryPrintHtml,
  renderPayslipPrintHtml,
  renderSptPph21RegisterPrintHtml,
  saveHrdState,
  type AttendanceCode,
  type EmploymentStatus,
  type HrdAttendanceRecord,
  type HrdEmployeeRecord,
  type HrdKpiEvaluation,
  type HrdLeaveRequest,
  type HrdModuleState,
  type HrdPayrollAdjustment,
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
const ADJUSTMENT_CATEGORIES: HrdPayrollAdjustment["category"][] = [
  "THR / Bonus Khusus",
  "Komisi Penjualan",
  "Reimbursement",
  "Kasbon / Pinjaman",
  "Potongan Keterlambatan",
];

function emptyEmpForm() {
  return {
    nik: "",
    fullName: "",
    position: "",
    department: "Operasional",
    branchName: "Kantor Pusat",
    employmentStatus: "PKWTT (Tetap)" as EmploymentStatus,
    joinDate: new Date().toISOString().slice(0, 10),
    ptkpStatus: "TK/0" as PtkpStatus,
    npwp: "",
    bankName: "BCA",
    bankAccount: "",
    baseSalaryIdr: 5_500_000,
    positionAllowanceIdr: 750_000,
    mealTransportAllowanceIdr: 650_000,
    annualLeaveQuota: 12,
    bpjsKesehatanActive: true,
    bpjsKetenagakerjaanActive: true,
    isActive: true,
  };
}

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
  const [periodLabel, setPeriodLabel] = useState(() =>
    new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
  );
  const [state, setState] = useState<HrdModuleState>(() => loadHrdState(tenantId));
  const [selectedPayslipEmpId, setSelectedPayslipEmpId] = useState<string | null>(null);
  const [payrollPrintMode, setPayrollPrintMode] = useState<"register" | "spt_pph21">("register");
  const [postingAccounting, setPostingAccounting] = useState(false);

  // Employee CRUD modal + search/filter
  const [empSearch, setEmpSearch] = useState("");
  const [empDeptFilter, setEmpDeptFilter] = useState("ALL");
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState(emptyEmpForm);
  const [showEmpPrint, setShowEmpPrint] = useState(false);

  // Payroll Adjustment CRUD (THR / Komisi / Kasbon / Potongan)
  const [editingAdjId, setEditingAdjId] = useState<string | null>(null);
  const [adjEmpId, setAdjEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [adjType, setAdjType] = useState<"earning" | "deduction">("earning");
  const [adjCategory, setAdjCategory] =
    useState<HrdPayrollAdjustment["category"]>("Komisi Penjualan");
  const [adjAmount, setAdjAmount] = useState(250_000);
  const [adjNotes, setAdjNotes] = useState("");

  // Attendance CRUD + filter + print
  const [attFilterEmp, setAttFilterEmp] = useState("ALL");
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [attEmpId, setAttEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState<AttendanceCode>("hadir");
  const [attCheckIn, setAttCheckIn] = useState("08:30");
  const [attCheckOut, setAttCheckOut] = useState("17:30");
  const [attOvertime, setAttOvertime] = useState(2);
  const [attNotes, setAttNotes] = useState("");
  const [showAttPrint, setShowAttPrint] = useState(false);

  // Leaves CRUD + print
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveEmpId, setLeaveEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [leaveType, setLeaveType] = useState<HrdLeaveRequest["leaveType"]>("Cuti Tahunan");
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState("");
  const [showLeavePrint, setShowLeavePrint] = useState(false);

  // KPI Multi-Dimensional Evaluation CRUD + print
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [kpiEmpId, setKpiEmpId] = useState(() => state.employees[0]?.id ?? "");
  const [kpiPeriod, setKpiPeriod] = useState("Q4 2026");
  const [kpiTargetScore, setKpiTargetScore] = useState(90);
  const [kpiDisciplineScore, setKpiDisciplineScore] = useState(88);
  const [kpiQualityScore, setKpiQualityScore] = useState(90);
  const [kpiCollabScore, setKpiCollabScore] = useState(86);
  const [kpiManagerNotes, setKpiManagerNotes] = useState("");
  const [kpiNextOkr, setKpiNextOkr] = useState("");
  const [kpiRecommendation, setKpiRecommendation] = useState("Bonus Kinerja & Pengembangan Skill");
  const [showKpiPrint, setShowKpiPrint] = useState(false);

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

  const departments = useMemo(
    () => Array.from(new Set(state.employees.map((e) => e.department))).sort(),
    [state.employees],
  );

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return state.employees.filter((e) => {
      if (empDeptFilter !== "ALL" && e.department !== empDeptFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.nik.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    });
  }, [state.employees, empSearch, empDeptFilter]);

  const filteredAttendance = useMemo(
    () =>
      state.attendance.filter((a) =>
        attFilterEmp === "ALL" ? true : a.employeeId === attFilterEmp,
      ),
    [state.attendance, attFilterEmp],
  );

  // ---------------- EMPLOYEE INSERT / UPDATE / DELETE ----------------
  function openCreateEmployeeModal() {
    setEditingEmpId(null);
    setEmpForm(emptyEmpForm());
    setEmpModalOpen(true);
  }

  function openEditEmployeeModal(emp: HrdEmployeeRecord) {
    setEditingEmpId(emp.id);
    setEmpForm({
      nik: emp.nik,
      fullName: emp.fullName,
      position: emp.position,
      department: emp.department,
      branchName: emp.branchName,
      employmentStatus: emp.employmentStatus,
      joinDate: emp.joinDate,
      ptkpStatus: emp.ptkpStatus,
      npwp: emp.npwp,
      bankName: emp.bankName,
      bankAccount: emp.bankAccount,
      baseSalaryIdr: emp.baseSalaryIdr,
      positionAllowanceIdr: emp.positionAllowanceIdr,
      mealTransportAllowanceIdr: emp.mealTransportAllowanceIdr,
      annualLeaveQuota: emp.annualLeaveQuota,
      bpjsKesehatanActive: emp.bpjsKesehatanActive,
      bpjsKetenagakerjaanActive: emp.bpjsKetenagakerjaanActive,
      isActive: emp.isActive,
    });
    setEmpModalOpen(true);
  }

  function handleSaveEmployee(e: FormEvent) {
    e.preventDefault();
    if (!empForm.fullName.trim() || !empForm.position.trim()) return;

    if (editingEmpId) {
      updateState((prev) => ({
        ...prev,
        employees: prev.employees.map((item) =>
          item.id === editingEmpId
            ? {
                ...item,
                nik: empForm.nik.trim() || item.nik,
                fullName: empForm.fullName.trim(),
                position: empForm.position.trim(),
                department: empForm.department.trim() || "Operasional",
                branchName: empForm.branchName.trim() || "Kantor Pusat",
                employmentStatus: empForm.employmentStatus,
                joinDate: empForm.joinDate || item.joinDate,
                ptkpStatus: empForm.ptkpStatus,
                npwp: empForm.npwp.trim() || "-",
                bankName: empForm.bankName.trim() || "BCA",
                bankAccount: empForm.bankAccount.trim() || "-",
                baseSalaryIdr: Math.max(0, Number(empForm.baseSalaryIdr) || 0),
                positionAllowanceIdr: Math.max(0, Number(empForm.positionAllowanceIdr) || 0),
                mealTransportAllowanceIdr: Math.max(
                  0,
                  Number(empForm.mealTransportAllowanceIdr) || 0,
                ),
                annualLeaveQuota: Math.max(0, Number(empForm.annualLeaveQuota) || 12),
                bpjsKesehatanActive: empForm.bpjsKesehatanActive,
                bpjsKetenagakerjaanActive: empForm.bpjsKetenagakerjaanActive,
                isActive: empForm.isActive,
              }
            : item,
        ),
      }));
      onToast(`Data karyawan "${empForm.fullName.trim()}" berhasil diperbarui!`, "ok");
    } else {
      const seq = state.employees.length + 1;
      const newEmp: HrdEmployeeRecord = {
        id: `emp-${seq}-${empForm.fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}`,
        nik:
          empForm.nik.trim() ||
          `EMP-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`,
        fullName: empForm.fullName.trim(),
        position: empForm.position.trim(),
        department: empForm.department.trim() || "Operasional",
        branchName: empForm.branchName.trim() || "Kantor Pusat",
        employmentStatus: empForm.employmentStatus,
        joinDate: empForm.joinDate || new Date().toISOString().slice(0, 10),
        ptkpStatus: empForm.ptkpStatus,
        npwp: empForm.npwp.trim() || "-",
        bankName: empForm.bankName.trim() || "BCA",
        bankAccount: empForm.bankAccount.trim() || "-",
        baseSalaryIdr: Math.max(0, Number(empForm.baseSalaryIdr) || 0),
        positionAllowanceIdr: Math.max(0, Number(empForm.positionAllowanceIdr) || 0),
        mealTransportAllowanceIdr: Math.max(0, Number(empForm.mealTransportAllowanceIdr) || 0),
        bpjsKesehatanActive: empForm.bpjsKesehatanActive,
        bpjsKetenagakerjaanActive: empForm.bpjsKetenagakerjaanActive,
        annualLeaveQuota: Math.max(0, Number(empForm.annualLeaveQuota) || 12),
        annualLeaveUsed: 0,
        kpiScore: 85,
        isActive: empForm.isActive,
      };
      updateState((prev) => ({
        ...prev,
        employees: [newEmp, ...prev.employees],
      }));
      onToast(`Karyawan "${newEmp.fullName}" berhasil ditambahkan!`, "ok");
    }
    setEmpModalOpen(false);
    setEditingEmpId(null);
  }

  function handleDeleteEmployee(emp: HrdEmployeeRecord) {
    updateState((prev) => ({
      ...prev,
      employees: prev.employees.filter((x) => x.id !== emp.id),
      attendance: prev.attendance.filter((a) => a.employeeId !== emp.id),
      leaveRequests: prev.leaveRequests.filter((l) => l.employeeId !== emp.id),
      adjustments: prev.adjustments.filter((adj) => adj.employeeId !== emp.id),
      kpiEvaluations: prev.kpiEvaluations.filter((k) => k.employeeId !== emp.id),
    }));
    onToast(`Data karyawan "${emp.fullName}" & relasinya berhasil dihapus.`, "ok");
  }

  // ---------------- PAYROLL ADJUSTMENT INSERT / UPDATE / DELETE ----------------
  function handleSaveAdjustment(e: FormEvent) {
    e.preventDefault();
    const targetEmpId = adjEmpId || state.employees[0]?.id;
    if (!targetEmpId || adjAmount <= 0) return;

    if (editingAdjId) {
      updateState((prev) => ({
        ...prev,
        adjustments: prev.adjustments.map((item) =>
          item.id === editingAdjId
            ? {
                ...item,
                employeeId: targetEmpId,
                type: adjType,
                category: adjCategory,
                amountIdr: Math.max(0, adjAmount),
                notes: adjNotes.trim() || adjCategory,
              }
            : item,
        ),
      }));
      setEditingAdjId(null);
      onToast("Item penyesuaian payroll diperbarui — PPh 21 & THP terhitung ulang!", "ok");
    } else {
      const nextAdj: HrdPayrollAdjustment = {
        id: `adj-${state.adjustments.length + 1}-${Date.now().toString().slice(-4)}`,
        employeeId: targetEmpId,
        type: adjType,
        category: adjCategory,
        amountIdr: Math.max(0, adjAmount),
        notes: adjNotes.trim() || adjCategory,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      updateState((prev) => ({
        ...prev,
        adjustments: [nextAdj, ...prev.adjustments],
      }));
      onToast("Item penyesuaian gaji berhasil ditambahkan ke payroll!", "ok");
    }
    setAdjNotes("");
  }

  function handleEditAdjustment(adj: HrdPayrollAdjustment) {
    setEditingAdjId(adj.id);
    setAdjEmpId(adj.employeeId);
    setAdjType(adj.type);
    setAdjCategory(adj.category);
    setAdjAmount(adj.amountIdr);
    setAdjNotes(adj.notes);
  }

  function handleDeleteAdjustment(id: string) {
    updateState((prev) => ({
      ...prev,
      adjustments: prev.adjustments.filter((a) => a.id !== id),
    }));
    if (editingAdjId === id) setEditingAdjId(null);
    onToast("Item penyesuaian gaji dihapus.", "ok");
  }

  // ---------------- ATTENDANCE INSERT / UPDATE / DELETE ----------------
  function handleSaveAttendance(e: FormEvent) {
    e.preventDefault();
    const targetId = attEmpId || state.employees[0]?.id;
    if (!targetId) return;

    if (editingAttId) {
      updateState((prev) => ({
        ...prev,
        attendance: prev.attendance.map((item) =>
          item.id === editingAttId
            ? {
                ...item,
                employeeId: targetId,
                date: attDate,
                status: attStatus,
                checkInTime: attCheckIn,
                checkOutTime: attCheckOut,
                overtimeHours: Math.max(0, attOvertime),
                notes: attNotes.trim() || "Diperbarui di sistem HRD",
              }
            : item,
        ),
      }));
      setEditingAttId(null);
      onToast("Catatan absensi & lembur berhasil diperbarui!", "ok");
    } else {
      updateState((prev) => ({
        ...prev,
        attendance: [
          {
            id: `att-${prev.attendance.length + 1}-${attDate}-${Date.now().toString().slice(-3)}`,
            employeeId: targetId,
            date: attDate,
            status: attStatus,
            checkInTime: attCheckIn,
            checkOutTime: attCheckOut,
            overtimeHours: Math.max(0, attOvertime),
            notes: attNotes.trim() || "Tercatat di sistem HRD",
          },
          ...prev.attendance,
        ],
      }));
      onToast("Absensi & jam lembur dicatat — Upah lembur PP 35/2021 otomatis dihitung!", "ok");
    }
    setAttNotes("");
  }

  function handleEditAttendance(rec: HrdAttendanceRecord) {
    setEditingAttId(rec.id);
    setAttEmpId(rec.employeeId);
    setAttDate(rec.date);
    setAttStatus(rec.status);
    setAttCheckIn(rec.checkInTime || "08:30");
    setAttCheckOut(rec.checkOutTime || "17:30");
    setAttOvertime(rec.overtimeHours);
    setAttNotes(rec.notes);
  }

  function handleDeleteAttendance(id: string) {
    updateState((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== id),
    }));
    if (editingAttId === id) setEditingAttId(null);
    onToast("Catatan absensi & lembur dihapus.", "ok");
  }

  // ---------------- LEAVES INSERT / UPDATE / APPROVE / DELETE ----------------
  function handleSaveLeave(e: FormEvent) {
    e.preventDefault();
    const emp = state.employees.find((x) => x.id === (leaveEmpId || state.employees[0]?.id));
    if (!emp || !leaveReason.trim()) return;

    if (editingLeaveId) {
      updateState((prev) => ({
        ...prev,
        leaveRequests: prev.leaveRequests.map((lv) =>
          lv.id === editingLeaveId
            ? {
                ...lv,
                employeeId: emp.id,
                employeeName: emp.fullName,
                leaveType,
                startDate: leaveStart,
                endDate: leaveEnd,
                days: Math.max(1, leaveDays),
                reason: leaveReason.trim(),
              }
            : lv,
        ),
      }));
      setEditingLeaveId(null);
      onToast(`Pengajuan cuti/izin ${emp.fullName} berhasil diperbarui!`, "ok");
    } else {
      updateState((prev) => ({
        ...prev,
        leaveRequests: [
          {
            id: `lv-${prev.leaveRequests.length + 1}-${Date.now().toString().slice(-3)}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            leaveType,
            startDate: leaveStart,
            endDate: leaveEnd,
            days: Math.max(1, leaveDays),
            reason: leaveReason.trim(),
            status: "pending",
          },
          ...prev.leaveRequests,
        ],
      }));
      onToast(`Pengajuan ${leaveType} untuk ${emp.fullName} berhasil diajukan.`, "ok");
    }
    setLeaveReason("");
  }

  function handleEditLeave(lv: HrdLeaveRequest) {
    setEditingLeaveId(lv.id);
    setLeaveEmpId(lv.employeeId);
    setLeaveType(lv.leaveType);
    setLeaveStart(lv.startDate);
    setLeaveEnd(lv.endDate);
    setLeaveDays(lv.days);
    setLeaveReason(lv.reason);
  }

  function handleChangeLeaveStatus(
    lv: HrdLeaveRequest,
    nextStatus: "approved" | "rejected" | "pending",
  ) {
    const wasApprovedAnnual = lv.status === "approved" && lv.leaveType === "Cuti Tahunan";
    const willBeApprovedAnnual = nextStatus === "approved" && lv.leaveType === "Cuti Tahunan";
    const deltaDays = (willBeApprovedAnnual ? lv.days : 0) - (wasApprovedAnnual ? lv.days : 0);

    updateState((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.map((item) =>
        item.id === lv.id ? { ...item, status: nextStatus } : item,
      ),
      employees:
        deltaDays !== 0
          ? prev.employees.map((e) =>
              e.id === lv.employeeId
                ? { ...e, annualLeaveUsed: Math.max(0, e.annualLeaveUsed + deltaDays) }
                : e,
            )
          : prev.employees,
    }));
    onToast(
      `Status cuti ${lv.employeeName} diperbarui menjadi ${nextStatus.toUpperCase()}.`,
      "ok",
    );
  }

  function handleDeleteLeave(lv: HrdLeaveRequest) {
    const refundDays = lv.status === "approved" && lv.leaveType === "Cuti Tahunan" ? lv.days : 0;
    updateState((prev) => ({
      ...prev,
      leaveRequests: prev.leaveRequests.filter((x) => x.id !== lv.id),
      employees:
        refundDays > 0
          ? prev.employees.map((e) =>
              e.id === lv.employeeId
                ? { ...e, annualLeaveUsed: Math.max(0, e.annualLeaveUsed - refundDays) }
                : e,
            )
          : prev.employees,
    }));
    if (editingLeaveId === lv.id) setEditingLeaveId(null);
    onToast(
      `Pengajuan cuti ${lv.employeeName} dihapus${refundDays > 0 ? ` (+${refundDays} hari kuota dikembalikan)` : ""}.`,
      "ok",
    );
  }

  // ---------------- KPI MULTI-DIMENSIONAL INSERT / UPDATE / DELETE ----------------
  function handleSaveKpiEvaluation(e: FormEvent) {
    e.preventDefault();
    const targetEmpId = kpiEmpId || state.employees[0]?.id;
    if (!targetEmpId) return;
    const weightedScore = computeWeightedKpiScore({
      targetOutputScore: kpiTargetScore,
      disciplineScore: kpiDisciplineScore,
      qualityScore: kpiQualityScore,
      collaborationScore: kpiCollabScore,
    });
    const today = new Date().toISOString().slice(0, 10);

    if (editingKpiId) {
      updateState((prev) => ({
        ...prev,
        kpiEvaluations: prev.kpiEvaluations.map((ev) =>
          ev.id === editingKpiId
            ? {
                ...ev,
                employeeId: targetEmpId,
                periodLabel: kpiPeriod.trim() || "Q4 2026",
                targetOutputScore: kpiTargetScore,
                disciplineScore: kpiDisciplineScore,
                qualityScore: kpiQualityScore,
                collaborationScore: kpiCollabScore,
                weightedScore,
                managerNotes: kpiManagerNotes.trim() || "Evaluasi diperbarui.",
                nextOkrTarget: kpiNextOkr.trim() || "Pertahankan performa kuartal berikutnya.",
                recommendedAction: kpiRecommendation.trim() || "Review Reguler",
                updatedAt: today,
              }
            : ev,
        ),
        employees: prev.employees.map((emp) =>
          emp.id === targetEmpId ? { ...emp, kpiScore: weightedScore } : emp,
        ),
      }));
      setEditingKpiId(null);
      onToast(`Evaluasi KPI diperbarui (Skor Terbobot ${weightedScore}/100)!`, "ok");
    } else {
      const nextEv: HrdKpiEvaluation = {
        id: `kpi-${state.kpiEvaluations.length + 1}-${Date.now().toString().slice(-3)}`,
        employeeId: targetEmpId,
        periodLabel: kpiPeriod.trim() || "Q4 2026",
        targetOutputScore: kpiTargetScore,
        disciplineScore: kpiDisciplineScore,
        qualityScore: kpiQualityScore,
        collaborationScore: kpiCollabScore,
        weightedScore,
        managerNotes: kpiManagerNotes.trim() || "Pencapaian target kuartalan terukur.",
        nextOkrTarget: kpiNextOkr.trim() || "Tingkatkan efisiensi & output +15%.",
        recommendedAction: kpiRecommendation.trim() || "Bonus Kinerja",
        updatedAt: today,
      };
      updateState((prev) => ({
        ...prev,
        kpiEvaluations: [nextEv, ...prev.kpiEvaluations],
        employees: prev.employees.map((emp) =>
          emp.id === targetEmpId ? { ...emp, kpiScore: weightedScore } : emp,
        ),
      }));
      onToast(`Evaluasi KPI baru dicatat (Skor ${weightedScore}/100)!`, "ok");
    }
    setKpiManagerNotes("");
    setKpiNextOkr("");
  }

  function handleEditKpi(ev: HrdKpiEvaluation) {
    setEditingKpiId(ev.id);
    setKpiEmpId(ev.employeeId);
    setKpiPeriod(ev.periodLabel);
    setKpiTargetScore(ev.targetOutputScore);
    setKpiDisciplineScore(ev.disciplineScore);
    setKpiQualityScore(ev.qualityScore);
    setKpiCollabScore(ev.collaborationScore);
    setKpiManagerNotes(ev.managerNotes);
    setKpiNextOkr(ev.nextOkrTarget);
    setKpiRecommendation(ev.recommendedAction);
  }

  function handleDeleteKpi(id: string) {
    updateState((prev) => ({
      ...prev,
      kpiEvaluations: prev.kpiEvaluations.filter((k) => k.id !== id),
    }));
    if (editingKpiId === id) setEditingKpiId(null);
    onToast("Catatan evaluasi KPI dihapus.", "ok");
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

  const pendingLeavesCount = state.leaveRequests.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-5 p-4 text-slate-100 md:p-6">
      {/* HERO HEADER */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/25 to-emerald-950/35 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold text-amber-200">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Sovereign Corporate Exclusive · HRD, Absensi, Lembur, Cuti, KPI &amp; Payroll PPh 21 TER
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              HRD &amp; Payroll Enterprise — {storeProfile.businessName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Navigasi CRUD lengkap (Insert, Update, Delete, Filter &amp; Print PDF/Thermal) pada seluruh 5 sub-modul HRD: Penggajian &amp; SPT PPh 21 TER (PP 58/2023), Database Karyawan, Absensi &amp; Lembur (PP 35/2021 1/173), Cuti &amp; Saldo Kuota, serta KPI Multi-Dimensi &amp; OKR.
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
              onClick={openCreateEmployeeModal}
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
                <Crown className="h-4 w-4" /> Aktivasi Sovereign
              </button>
            )}
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="text-[11px] text-slate-400">Karyawan Aktif</div>
            <div className="mt-1 text-xl font-extrabold text-white">{payroll.employeeCount} Orang</div>
            <div className="text-[10px] text-emerald-300">
              Total {state.employees.length} terdaftar ({state.employees.filter((e) => !e.isActive).length} nonaktif)
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
            <div className="text-[11px] text-slate-400">Total BPJS (Corp + Kary.)</div>
            <div className="mt-1 font-mono text-base font-extrabold text-cyan-300">
              {formatIdr(payroll.totalCompanyBpjsIdr + payroll.totalEmployeeBpjsIdr)}
            </div>
            <div className="text-[10px] text-slate-400">Kesehatan + JHT + JKK + JKM + JP</div>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 lg:col-span-1">
            <div className="text-[11px] text-slate-400">Total Biaya Perusahaan</div>
            <div className="mt-1 font-mono text-base font-extrabold text-white">
              {formatIdr(payroll.totalCompanyCostIdr)}
            </div>
            <div className="text-[10px] text-emerald-300">Bruto + BPJS Perusahaan</div>
          </div>
        </div>
      </div>

      {/* 5 SUB-MODULE NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "payroll", label: "Penggajian, PPh 21 & Slip Gaji", icon: Wallet },
            { id: "employees", label: `Database Karyawan (${state.employees.length})`, icon: Users },
            { id: "attendance", label: `Absensi & Lembur (${state.attendance.length})`, icon: Clock },
            {
              id: "leaves",
              label: `Cuti & Izin (${pendingLeavesCount} Pending)`,
              icon: CalendarCheck,
            },
            {
              id: "kpi",
              label: `KPI & Evaluasi Kinerja (${state.kpiEvaluations.length})`,
              icon: Award,
            },
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

      {/* ===================================================================== */}
      {/* SUB-TAB 1: PENGGAJIAN, PPH 21 TER, PENYESUAIAN & SLIP GAJI           */}
      {/* ===================================================================== */}
      {subTab === "payroll" && (
        <div className="space-y-4">
          {/* Action bar: Post to accounting + Print switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
            <div className="text-xs text-slate-300">
              <strong className="text-white">Otomasi Payroll &amp; SPT Masa PPh 21:</strong> Edit bonus/penyesuaian kapan saja, cetak slip individual atau daftar SPT Masa 21, lalu posting otomatis ke Buku Besar Akuntansi.
              {state.lastPostedPeriod && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Terakhir diposting: {state.lastPostedPeriod}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateState((prev) => ({ ...prev, bonusByEmployeeId: {} }))
                }
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Bonus
              </button>
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
          </div>

          {/* Payroll Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/95">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">Karyawan &amp; PTKP</th>
                  <th className="px-3 py-2.5 text-right">Gaji + Tunj.</th>
                  <th className="px-3 py-2.5 text-right">Lembur</th>
                  <th className="px-3 py-2.5 text-right">Bonus (Edit)</th>
                  <th className="px-3 py-2.5 text-right">Adj. (+/-)</th>
                  <th className="px-3 py-2.5 text-right">BPJS Kary.</th>
                  <th className="px-3 py-2.5 text-right">PPh 21 TER</th>
                  <th className="px-3 py-2.5 text-right">Take Home Pay</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
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
                    <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                      {line.extraEarningsIdr > 0 && (
                        <div className="text-emerald-300">+{formatIdr(line.extraEarningsIdr)}</div>
                      )}
                      {line.extraDeductionsIdr > 0 && (
                        <div className="text-rose-300">-{formatIdr(line.extraDeductionsIdr)}</div>
                      )}
                      {line.extraEarningsIdr === 0 && line.extraDeductionsIdr === 0 && (
                        <span className="text-slate-500">—</span>
                      )}
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
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditEmployeeModal(line.employee)}
                          className="rounded-lg border border-slate-700 bg-slate-950 p-1.5 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                          title="Edit Gaji / PTKP Karyawan"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPayslipEmpId(line.employee.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-[10px] font-extrabold text-cyan-200 hover:bg-cyan-500/30"
                        >
                          <Printer className="h-3 w-3" /> Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUB-MODULE: PENYESUAIAN PAYROLL (THR / KOMISI / REIMBURSE / KASBON) — INSERT / UPDATE / DELETE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-amber-300">
                  Sub-Modul Penyesuaian Payroll (THR, Komisi, Reimbursement &amp; Potongan Kasbon)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tambah, ubah, atau hapus komponen tambahan — langsung dihitung ke Bruto, PPh 21 TER, &amp; Take Home Pay.
                </p>
              </div>
              {editingAdjId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAdjId(null);
                    setAdjNotes("");
                  }}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveAdjustment} className="grid gap-2 text-xs sm:grid-cols-6">
              <select
                value={adjEmpId}
                onChange={(e) => setAdjEmpId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as "earning" | "deduction")}
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                <option value="earning">+ Tambahan Penerimaan</option>
                <option value="deduction">- Potongan / Kasbon</option>
              </select>
              <select
                value={adjCategory}
                onChange={(e) =>
                  setAdjCategory(e.target.value as HrdPayrollAdjustment["category"])
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                {ADJUSTMENT_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                min={1000}
                step={25000}
                value={adjAmount}
                onChange={(e) => setAdjAmount(Math.max(0, Number(e.target.value) || 0))}
                placeholder="Nominal (Rp)"
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-white"
              />
              <input
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="Keterangan penyesuaian..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-400 px-3 py-2 font-extrabold text-slate-950 hover:bg-amber-300"
              >
                <Plus className="h-3.5 w-3.5" /> {editingAdjId ? "Update" : "Insert"}
              </button>
            </form>

            {state.adjustments.length > 0 && (
              <div className="space-y-1.5">
                {state.adjustments.map((adj) => {
                  const emp = state.employees.find((e) => e.id === adj.employeeId);
                  return (
                    <div
                      key={adj.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                    >
                      <div>
                        <strong className="text-white">{emp?.fullName || adj.employeeId}</strong> ·{" "}
                        <span className="text-cyan-300">{adj.category}</span> —{" "}
                        <span className="text-slate-400">{adj.notes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-extrabold ${
                            adj.type === "earning" ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {adj.type === "earning" ? "+" : "-"}
                          {formatIdr(adj.amountIdr)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditAdjustment(adj)}
                          className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                          title="Edit Penyesuaian"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                          title="Hapus Penyesuaian"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual Payslip Print Panel */}
          {selectedPayslipLine && (
            <div className="space-y-3 rounded-3xl border border-cyan-500/40 bg-slate-900 p-4">
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
                  buildEscPosTextReport(`SLIP GAJI ${periodLabel}`, storeProfile, [
                    `${selectedPayslipLine.employee.nik} - ${selectedPayslipLine.employee.fullName}`,
                    `Jabatan: ${selectedPayslipLine.employee.position}`,
                    `Bruto: ${formatIdr(selectedPayslipLine.grossIncomeIdr)}`,
                    `BPJS Kary: -${formatIdr(selectedPayslipLine.bpjsKesEmployeeIdr + selectedPayslipLine.bpjsJhtEmployeeIdr + selectedPayslipLine.bpjsJpEmployeeIdr)}`,
                    `PPh 21 TER: -${formatIdr(selectedPayslipLine.pph21MonthlyIdr)}`,
                    `TAKE HOME PAY: ${formatIdr(selectedPayslipLine.netTakeHomePayIdr)}`,
                  ])
                }
                onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              />
            </div>
          )}

          {/* Monthly Payroll Register & SPT Masa PPh 21 Print Studio */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-extrabold text-emerald-300">
                Pusat Cetak Payroll &amp; SPT Masa PPh 21 (PDF / Printer)
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPayrollPrintMode("register")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    payrollPrintMode === "register"
                      ? "bg-emerald-500 text-slate-950"
                      : "border border-slate-700 bg-slate-950 text-slate-300"
                  }`}
                >
                  Rekap Payroll Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollPrintMode("spt_pph21")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    payrollPrintMode === "spt_pph21"
                      ? "bg-amber-400 text-slate-950"
                      : "border border-slate-700 bg-slate-950 text-slate-300"
                  }`}
                >
                  Daftar SPT Masa PPh 21 &amp; BPJS
                </button>
              </div>
            </div>
            <UniversalPrintPanel
              documentLabel={
                payrollPrintMode === "register"
                  ? `Rekap Payroll (${periodLabel})`
                  : `SPT Masa PPh 21 & BPJS (${periodLabel})`
              }
              jobTitle={`${payrollPrintMode === "register" ? "Rekap Payroll" : "SPT Masa PPh 21"} ${periodLabel} — ${storeProfile.businessName}`}
              filenameBase={`${payrollPrintMode}-${periodLabel}`}
              defaultPaper="a4"
              buildHtml={() =>
                payrollPrintMode === "register"
                  ? renderPayrollSummaryPrintHtml(payroll, storeProfile)
                  : renderSptPph21RegisterPrintHtml(payroll, storeProfile)
              }
              buildEscPos={() =>
                buildEscPosTextReport(`PAYROLL & PPH 21 ${periodLabel}`, storeProfile, [
                  `Karyawan: ${payroll.employeeCount}`,
                  `Total Bruto: ${formatIdr(payroll.totalGrossIdr)}`,
                  `Total PPh 21: ${formatIdr(payroll.totalPph21Idr)}`,
                  `Total THP: ${formatIdr(payroll.totalTakeHomePayIdr)}`,
                  `Total Biaya Corp: ${formatIdr(payroll.totalCompanyCostIdr)}`,
                ])
              }
              onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              compact
            />
          </div>

          <ReportExportHub
            heading="Ekspor Rekap Payroll, File Transfer Bank & Laporan SPT PPh 21/BPJS (Excel / PDF / CSV)"
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

      {/* ===================================================================== */}
      {/* SUB-TAB 2: DATABASE KARYAWAN (INSERT / UPDATE / DELETE / PRINT)       */}
      {/* ===================================================================== */}
      {subTab === "employees" && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Cari NIK, nama, jabatan..."
                  className="rounded-xl border border-slate-700 bg-slate-950 py-2 pl-8 pr-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={empDeptFilter}
                onChange={(e) => setEmpDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="ALL">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreateEmployeeModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <UserPlus className="h-3.5 w-3.5" /> Insert Karyawan
              </button>
              <button
                type="button"
                onClick={() => setShowEmpPrint((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Printer className="h-3.5 w-3.5" /> {showEmpPrint ? "Tutup Cetak" : "Print Daftar Karyawan"}
              </button>
            </div>
          </div>

          {showEmpPrint && (
            <UniversalPrintPanel
              documentLabel={`Database Karyawan (${filteredEmployees.length} Orang)`}
              jobTitle={`Database Induk Karyawan — ${storeProfile.businessName}`}
              filenameBase="database-karyawan-hrd"
              defaultPaper="a4"
              buildHtml={() => renderHrdEmployeesPrintHtml(filteredEmployees, storeProfile)}
              buildEscPos={() =>
                buildEscPosTextReport(
                  "DATABASE KARYAWAN",
                  storeProfile,
                  filteredEmployees.map(
                    (e) =>
                      `${e.nik} ${e.fullName} | ${e.position} | ${formatIdr(e.baseSalaryIdr)}`,
                  ),
                )
              }
              onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              compact
            />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className={`space-y-2 rounded-2xl border bg-slate-900/90 p-4 text-xs ${
                  emp.isActive ? "border-slate-800" : "border-rose-500/30 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-amber-300">{emp.nik}</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        {emp.employmentStatus}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          emp.isActive
                            ? "bg-cyan-500/15 text-cyan-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {emp.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <h4 className="mt-1 text-sm font-extrabold text-white">{emp.fullName}</h4>
                    <div className="text-[11px] text-slate-400">
                      <Briefcase className="mr-1 inline h-3 w-3" />
                      {emp.position} · {emp.department} ({emp.branchName}) · Masuk {emp.joinDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditEmployeeModal(emp)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
                      title="Update / Edit Karyawan"
                    >
                      <Edit3 className="h-3 w-3" /> Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp)}
                      className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                      title="Delete Karyawan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                      {Math.max(0, emp.annualLeaveQuota - emp.annualLeaveUsed)} / {emp.annualLeaveQuota} hr
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">BPJS &amp; KPI:</span>{" "}
                    <strong className="text-emerald-300">
                      {emp.bpjsKesehatanActive ? "Kes✓ " : ""}
                      {emp.bpjsKetenagakerjaanActive ? "TK✓ " : ""}· KPI {emp.kpiScore}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: ABSENSI & LEMBUR (INSERT / UPDATE / DELETE / PRINT)        */}
      {/* ===================================================================== */}
      {subTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Filter Karyawan:</span>
              <select
                value={attFilterEmp}
                onChange={(e) => setAttFilterEmp(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
              >
                <option value="ALL">Semua Karyawan ({state.attendance.length} log)</option>
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {editingAttId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAttId(null);
                    setAttNotes("");
                  }}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-slate-300"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAttPrint((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Printer className="h-3.5 w-3.5" /> {showAttPrint ? "Tutup Cetak" : "Print Absensi & Lembur"}
              </button>
            </div>
          </div>

          {showAttPrint && (
            <UniversalPrintPanel
              documentLabel={`Rekap Absensi & Lembur (${filteredAttendance.length})`}
              jobTitle={`Laporan Absensi & Lembur PP 35/2021 — ${storeProfile.businessName}`}
              filenameBase="rekap-absensi-lembur-hrd"
              defaultPaper="a4"
              buildHtml={() =>
                renderHrdAttendancePrintHtml(filteredAttendance, state.employees, storeProfile)
              }
              buildEscPos={() =>
                buildEscPosTextReport(
                  "REKAP ABSENSI & LEMBUR",
                  storeProfile,
                  filteredAttendance.slice(0, 15).map((a) => {
                    const emp = state.employees.find((e) => e.id === a.employeeId);
                    return `${a.date} ${emp?.fullName || a.employeeId} | ${a.status.toUpperCase()} | OT ${a.overtimeHours}j`;
                  }),
                )
              }
              onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              compact
            />
          )}

          {/* Insert / Update Attendance Form */}
          <form
            onSubmit={handleSaveAttendance}
            className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs sm:grid-cols-4 lg:grid-cols-8"
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
              <option value="alfa">Alfa (Potong)</option>
            </select>
            <div className="flex gap-1">
              <input
                type="time"
                value={attCheckIn}
                onChange={(e) => setAttCheckIn(e.target.value)}
                title="Jam Masuk"
                className="w-1/2 rounded-xl border border-slate-700 bg-slate-950 px-1.5 py-2 text-white"
              />
              <input
                type="time"
                value={attCheckOut}
                onChange={(e) => setAttCheckOut(e.target.value)}
                title="Jam Pulang"
                className="w-1/2 rounded-xl border border-slate-700 bg-slate-950 px-1.5 py-2 text-white"
              />
            </div>
            <input
              type="number"
              min={0}
              max={12}
              value={attOvertime}
              onChange={(e) => setAttOvertime(Math.max(0, Number(e.target.value) || 0))}
              placeholder="Lembur (jam)"
              title="Jam Lembur (PP 35/2021)"
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <input
              value={attNotes}
              onChange={(e) => setAttNotes(e.target.value)}
              placeholder="Catatan..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" /> {editingAttId ? "Update" : "Insert"}
            </button>
          </form>

          {/* Attendance Log Rows with Update & Delete + Calculated PP 35/2021 Overtime */}
          <div className="space-y-2">
            {filteredAttendance.map((a) => {
              const emp = state.employees.find((e) => e.id === a.employeeId);
              const fixedWage = emp ? emp.baseSalaryIdr + emp.positionAllowanceIdr : 0;
              const otWage = computeIndonesianOvertimePay(fixedWage, a.overtimeHours);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs"
                >
                  <div>
                    <strong className="text-white">{emp?.fullName || a.employeeId}</strong> ·{" "}
                    <span className="font-mono text-slate-400">{a.date}</span> ·{" "}
                    <span className="text-slate-400">
                      {a.checkInTime || "08:30"} – {a.checkOutTime || "17:30"}
                    </span>
                    <div className="text-[11px] text-slate-400">{a.notes}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                        Lembur +{a.overtimeHours}j ({formatIdr(otWage)})
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditAttendance(a)}
                      className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                      title="Edit Absensi"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttendance(a.id)}
                      className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                      title="Hapus Absensi"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: CUTI & IZIN (INSERT / UPDATE / APPROVE / DELETE / PRINT)   */}
      {/* ===================================================================== */}
      {subTab === "leaves" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs">
            <div>
              <strong className="text-white">Manajemen Cuti, Izin &amp; Saldo Kuota Tahunan</strong>
              <span className="ml-2 text-amber-300">{pendingLeavesCount} menunggu persetujuan</span>
            </div>
            <div className="flex gap-2">
              {editingLeaveId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLeaveId(null);
                    setLeaveReason("");
                  }}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-slate-300"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLeavePrint((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Printer className="h-3.5 w-3.5" /> {showLeavePrint ? "Tutup Cetak" : "Print Cuti & Saldo Kuota"}
              </button>
            </div>
          </div>

          {showLeavePrint && (
            <UniversalPrintPanel
              documentLabel={`Laporan Cuti & Saldo Kuota (${state.leaveRequests.length})`}
              jobTitle={`Laporan Cuti & Saldo Kuota Karyawan — ${storeProfile.businessName}`}
              filenameBase="laporan-cuti-izin-hrd"
              defaultPaper="a4"
              buildHtml={() =>
                renderHrdLeavesPrintHtml(state.leaveRequests, state.employees, storeProfile)
              }
              buildEscPos={() =>
                buildEscPosTextReport(
                  "LAPORAN CUTI & IZIN",
                  storeProfile,
                  state.leaveRequests.map(
                    (l) => `${l.employeeName} | ${l.leaveType} (${l.days}hr) | ${l.status.toUpperCase()}`,
                  ),
                )
              }
              onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              compact
            />
          )}

          {/* Insert / Update Leave Request Form */}
          <form
            onSubmit={handleSaveLeave}
            className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs sm:grid-cols-4 lg:grid-cols-7"
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
              type="date"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
              title="Tanggal Mulai"
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <input
              type="date"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
              title="Tanggal Selesai"
              className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
            />
            <input
              type="number"
              min={1}
              max={30}
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
              <Plus className="h-3.5 w-3.5" /> {editingLeaveId ? "Update" : "Ajukan"}
            </button>
          </form>

          {/* Leave Requests List */}
          <div className="space-y-2">
            {state.leaveRequests.map((lv) => (
              <div
                key={lv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs"
              >
                <div>
                  <strong className="text-white">{lv.employeeName}</strong> ·{" "}
                  <span className="text-amber-300">{lv.leaveType}</span> ({lv.days} hari ·{" "}
                  {lv.startDate} s.d. {lv.endDate})
                  <div className="text-[11px] text-slate-400">{lv.reason}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {lv.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => handleChangeLeaveStatus(lv, "approved")}
                      className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-slate-950 hover:bg-emerald-400"
                    >
                      Setujui
                    </button>
                  )}
                  {lv.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => handleChangeLeaveStatus(lv, "rejected")}
                      className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/30"
                    >
                      Tolak
                    </button>
                  )}
                  {lv.status !== "pending" && (
                    <button
                      type="button"
                      onClick={() => handleChangeLeaveStatus(lv, "pending")}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300"
                    >
                      Reset Pending
                    </button>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      lv.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : lv.status === "rejected"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {lv.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEditLeave(lv)}
                    className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                    title="Edit Cuti"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLeave(lv)}
                    className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                    title="Hapus Cuti"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sub-Module: Annual Leave Quota Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
            <h4 className="mb-2 text-xs font-extrabold text-cyan-300">
              Sub-Modul Saldo Kuota Cuti Tahunan Seluruh Karyawan
            </h4>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[11px] text-slate-400">
                <tr>
                  <th className="px-3 py-2">NIK</th>
                  <th className="px-3 py-2">Nama Karyawan</th>
                  <th className="px-3 py-2 text-center">Kuota/Tahun</th>
                  <th className="px-3 py-2 text-center">Terpakai</th>
                  <th className="px-3 py-2 text-center">Sisa Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {state.employees.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-mono text-amber-300">{e.nik}</td>
                    <td className="px-3 py-2 font-bold text-white">{e.fullName}</td>
                    <td className="px-3 py-2 text-center">{e.annualLeaveQuota} hari</td>
                    <td className="px-3 py-2 text-center text-amber-300">{e.annualLeaveUsed} hari</td>
                    <td className="px-3 py-2 text-center font-extrabold text-emerald-300">
                      {Math.max(0, e.annualLeaveQuota - e.annualLeaveUsed)} hari
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 5: KPI MULTI-DIMENSI & OKR (INSERT / UPDATE / DELETE / PRINT) */}
      {/* ===================================================================== */}
      {subTab === "kpi" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs">
            <div>
              <strong className="text-white">
                Sub-Modul Penilaian KPI Multi-Dimensi &amp; OKR Karyawan
              </strong>
              <p className="text-[11px] text-slate-400">
                Bobot resmi: Target Output (40%) · Disiplin/Absensi (20%) · Kualitas Kerja (20%) · Kolaborasi &amp; Inisiatif (20%).
              </p>
            </div>
            <div className="flex gap-2">
              {editingKpiId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKpiId(null);
                    setKpiManagerNotes("");
                    setKpiNextOkr("");
                  }}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-slate-300"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKpiPrint((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Printer className="h-3.5 w-3.5" /> {showKpiPrint ? "Tutup Cetak" : "Print Laporan KPI & OKR"}
              </button>
            </div>
          </div>

          {showKpiPrint && (
            <UniversalPrintPanel
              documentLabel={`Evaluasi KPI & OKR (${state.kpiEvaluations.length})`}
              jobTitle={`Laporan Evaluasi KPI Multi-Dimensi — ${storeProfile.businessName}`}
              filenameBase="laporan-kpi-evaluasi-hrd"
              defaultPaper="a4"
              buildHtml={() =>
                renderHrdKpiPrintHtml(state.kpiEvaluations, state.employees, storeProfile)
              }
              buildEscPos={() =>
                buildEscPosTextReport(
                  "LAPORAN KPI & EVALUASI",
                  storeProfile,
                  state.kpiEvaluations.map((ev) => {
                    const emp = state.employees.find((e) => e.id === ev.employeeId);
                    return `${emp?.fullName || ev.employeeId} (${ev.periodLabel}): ${ev.weightedScore}/100`;
                  }),
                )
              }
              onResult={(res) => onToast(res.message, res.ok ? "ok" : "error")}
              compact
            />
          )}

          {/* Insert / Update KPI Evaluation Form */}
          <form
            onSubmit={handleSaveKpiEvaluation}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs"
          >
            <div className="grid gap-2 sm:grid-cols-4">
              <select
                value={kpiEmpId}
                onChange={(e) => setKpiEmpId(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              >
                {state.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.position})
                  </option>
                ))}
              </select>
              <input
                value={kpiPeriod}
                onChange={(e) => setKpiPeriod(e.target.value)}
                placeholder="Periode (mis. Q4 2026)"
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <input
                value={kpiRecommendation}
                onChange={(e) => setKpiRecommendation(e.target.value)}
                placeholder="Rekomendasi HRD (Bonus/Promosi/Coaching)"
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white sm:col-span-2"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <label className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Target &amp; Output (40%)</span>
                  <strong className="text-emerald-300">{kpiTargetScore}</strong>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={kpiTargetScore}
                  onChange={(e) => setKpiTargetScore(Number(e.target.value))}
                  className="mt-1 w-full accent-emerald-500"
                />
              </label>
              <label className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Disiplin &amp; Absensi (20%)</span>
                  <strong className="text-cyan-300">{kpiDisciplineScore}</strong>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={kpiDisciplineScore}
                  onChange={(e) => setKpiDisciplineScore(Number(e.target.value))}
                  className="mt-1 w-full accent-cyan-500"
                />
              </label>
              <label className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Kualitas Kerja (20%)</span>
                  <strong className="text-amber-300">{kpiQualityScore}</strong>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={kpiQualityScore}
                  onChange={(e) => setKpiQualityScore(Number(e.target.value))}
                  className="mt-1 w-full accent-amber-500"
                />
              </label>
              <label className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Kolaborasi &amp; Inisiatif (20%)</span>
                  <strong className="text-violet-300">{kpiCollabScore}</strong>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={kpiCollabScore}
                  onChange={(e) => setKpiCollabScore(Number(e.target.value))}
                  className="mt-1 w-full accent-violet-500"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={kpiManagerNotes}
                onChange={(e) => setKpiManagerNotes(e.target.value)}
                placeholder="Catatan Review Manajer..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <input
                value={kpiNextOkr}
                onChange={(e) => setKpiNextOkr(e.target.value)}
                placeholder="Target OKR Kuartal Berikutnya..."
                className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="h-3.5 w-3.5" />
                {editingKpiId ? "Update Evaluasi KPI" : "Insert Evaluasi KPI"} (Skor{" "}
                {computeWeightedKpiScore({
                  targetOutputScore: kpiTargetScore,
                  disciplineScore: kpiDisciplineScore,
                  qualityScore: kpiQualityScore,
                  collaborationScore: kpiCollabScore,
                })}
                )
              </button>
            </div>
          </form>

          {/* KPI Evaluation Cards */}
          <div className="grid gap-3 md:grid-cols-2">
            {state.kpiEvaluations.map((ev) => {
              const emp = state.employees.find((e) => e.id === ev.employeeId);
              const grade =
                ev.weightedScore >= 90
                  ? "A (Istimewa)"
                  : ev.weightedScore >= 80
                    ? "B (Sangat Baik)"
                    : ev.weightedScore >= 70
                      ? "C (Baik)"
                      : "D (Coaching)";
              return (
                <div
                  key={ev.id}
                  className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-white">
                        {emp?.fullName || ev.employeeId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {emp?.position || "-"} · Periode {ev.periodLabel} · Update {ev.updatedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-extrabold text-emerald-300">
                        {ev.weightedScore}/100 · {grade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditKpi(ev)}
                        className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                        title="Edit Evaluasi KPI"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKpi(ev.id)}
                        className="rounded-lg border border-slate-700 p-1 text-slate-400 hover:border-rose-500 hover:text-rose-400"
                        title="Hapus Evaluasi KPI"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-950 p-2 text-center text-[10px]">
                    <div>
                      <div className="text-slate-400">Output</div>
                      <strong className="font-mono text-emerald-300">{ev.targetOutputScore}</strong>
                    </div>
                    <div>
                      <div className="text-slate-400">Disiplin</div>
                      <strong className="font-mono text-cyan-300">{ev.disciplineScore}</strong>
                    </div>
                    <div>
                      <div className="text-slate-400">Kualitas</div>
                      <strong className="font-mono text-amber-300">{ev.qualityScore}</strong>
                    </div>
                    <div>
                      <div className="text-slate-400">Kolaborasi</div>
                      <strong className="font-mono text-violet-300">{ev.collaborationScore}</strong>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div>
                      <strong className="text-white">Review Manajer:</strong> {ev.managerNotes}
                    </div>
                    <div>
                      <strong className="text-cyan-300">Target OKR:</strong> {ev.nextOkrTarget}
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                      <ShieldCheck className="h-3 w-3" /> {ev.recommendedAction}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INSERT / UPDATE EMPLOYEE MODAL */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">
                {editingEmpId ? "Update Data Karyawan (HRD Corporate)" : "Insert Karyawan Baru (HRD Corporate)"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEmpModalOpen(false);
                  setEditingEmpId(null);
                }}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="mt-3 space-y-2.5">
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
                <input
                  value={empForm.branchName}
                  onChange={(e) => setEmpForm({ ...empForm, branchName: e.target.value })}
                  placeholder="Cabang / Lokasi"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  type="date"
                  value={empForm.joinDate}
                  onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })}
                  title="Tanggal Bergabung"
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
                  type="number"
                  min={0}
                  max={30}
                  value={empForm.annualLeaveQuota}
                  onChange={(e) =>
                    setEmpForm({ ...empForm, annualLeaveQuota: Number(e.target.value) })
                  }
                  placeholder="Kuota Cuti Tahunan (hari)"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <input
                  value={empForm.npwp}
                  onChange={(e) => setEmpForm({ ...empForm, npwp: e.target.value })}
                  placeholder="NPWP"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
                />
                <div className="flex gap-1.5">
                  <input
                    value={empForm.bankName}
                    onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                    placeholder="Bank"
                    className="w-2/5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-white"
                  />
                  <input
                    value={empForm.bankAccount}
                    onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                    placeholder="No. Rekening"
                    className="w-3/5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-white"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={empForm.bpjsKesehatanActive}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, bpjsKesehatanActive: e.target.checked })
                    }
                    className="accent-emerald-500"
                  />
                  BPJS Kesehatan (4%/1%)
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
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={empForm.isActive}
                    onChange={(e) => setEmpForm({ ...empForm, isActive: e.target.checked })}
                    className="accent-cyan-500"
                  />
                  Status Aktif (Masuk Payroll)
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmpModalOpen(false);
                    setEditingEmpId(null);
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 font-extrabold text-slate-950 hover:bg-emerald-400"
                >
                  {editingEmpId ? "Simpan Perubahan" : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
