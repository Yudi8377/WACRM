import { formatIdr, type StoreBusinessProfile } from "@/lib/crm-types";

export type PtkpStatus = "TK/0" | "TK/1" | "TK/2" | "TK/3" | "K/0" | "K/1" | "K/2" | "K/3";
export type EmploymentStatus = "PKWTT (Tetap)" | "PKWT (Kontrak)" | "Probation" | "Magang";
export type AttendanceCode = "hadir" | "sakit" | "izin" | "cuti" | "alfa";

export interface HrdEmployeeRecord {
  id: string;
  nik: string;
  fullName: string;
  position: string;
  department: string;
  branchName: string;
  employmentStatus: EmploymentStatus;
  joinDate: string;
  ptkpStatus: PtkpStatus;
  npwp: string;
  bankName: string;
  bankAccount: string;
  baseSalaryIdr: number;
  positionAllowanceIdr: number;
  mealTransportAllowanceIdr: number;
  bpjsKesehatanActive: boolean;
  bpjsKetenagakerjaanActive: boolean;
  annualLeaveQuota: number;
  annualLeaveUsed: number;
  kpiScore: number; // 0-100
  isActive: boolean;
}

export interface HrdAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceCode;
  overtimeHours: number;
  notes: string;
}

export interface HrdLeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "Cuti Tahunan" | "Sakit (Surat Dokter)" | "Izin Khusus" | "Dinas Luar";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export interface HrdPayrollLineItem {
  employee: HrdEmployeeRecord;
  periodLabel: string;
  overtimeHours: number;
  alfaDays: number;
  baseSalaryIdr: number;
  positionAllowanceIdr: number;
  mealTransportAllowanceIdr: number;
  overtimePayIdr: number;
  bonusIdr: number;
  grossIncomeIdr: number;
  // Company contributions (Biaya Perusahaan)
  bpjsKesCompanyIdr: number;
  bpjsJhtCompanyIdr: number;
  bpjsJkkCompanyIdr: number;
  bpjsJkmCompanyIdr: number;
  bpjsJpCompanyIdr: number;
  totalCompanyBpjsIdr: number;
  // Employee deductions (Potongan Karyawan)
  bpjsKesEmployeeIdr: number;
  bpjsJhtEmployeeIdr: number;
  bpjsJpEmployeeIdr: number;
  alfaDeductionIdr: number;
  terCategory: "A" | "B" | "C";
  terRatePct: number;
  pph21MonthlyIdr: number;
  totalDeductionsIdr: number;
  netTakeHomePayIdr: number;
  totalCompanyCostIdr: number;
}

export interface HrdPayrollSummary {
  periodLabel: string;
  employeeCount: number;
  totalGrossIdr: number;
  totalOvertimeIdr: number;
  totalBonusIdr: number;
  totalCompanyBpjsIdr: number;
  totalEmployeeBpjsIdr: number;
  totalPph21Idr: number;
  totalTakeHomePayIdr: number;
  totalCompanyCostIdr: number;
  lines: HrdPayrollLineItem[];
}

export interface HrdModuleState {
  employees: HrdEmployeeRecord[];
  attendance: HrdAttendanceRecord[];
  leaveRequests: HrdLeaveRequest[];
  bonusByEmployeeId: Record<string, number>;
  lastPostedPeriod: string | null;
}

/**
 * Official Indonesian TER Category mapping per PP 58/2023 & PMK 168/2023.
 */
export function getTerCategoryForPtkp(ptkp: PtkpStatus): "A" | "B" | "C" {
  if (ptkp === "K/3") return "C";
  if (ptkp === "TK/2" || ptkp === "TK/3" || ptkp === "K/1" || ptkp === "K/2") return "B";
  return "A";
}

/**
 * Official PPh 21 Tarif Efektif Rata-Rata (TER Bulanan — PP 58/2023) lookup (percentage).
 */
export function lookupPph21TerRatePct(grossTaxableIdr: number, category: "A" | "B" | "C"): number {
  const g = Math.max(0, grossTaxableIdr);
  if (category === "A") {
    if (g <= 5_400_000) return 0;
    if (g <= 5_650_000) return 0.25;
    if (g <= 5_950_000) return 0.5;
    if (g <= 6_300_000) return 0.75;
    if (g <= 6_750_000) return 1.0;
    if (g <= 7_500_000) return 1.25;
    if (g <= 8_550_000) return 1.5;
    if (g <= 9_650_000) return 1.75;
    if (g <= 10_050_000) return 2.0;
    if (g <= 11_050_000) return 2.5;
    if (g <= 12_500_000) return 3.5;
    if (g <= 15_100_000) return 5.0;
    if (g <= 18_200_000) return 7.0;
    if (g <= 25_000_000) return 10.0;
    if (g <= 40_000_000) return 15.0;
    return 20.0;
  }
  if (category === "B") {
    if (g <= 6_200_000) return 0;
    if (g <= 6_500_000) return 0.25;
    if (g <= 6_850_000) return 0.5;
    if (g <= 7_300_000) return 0.75;
    if (g <= 9_200_000) return 1.25;
    if (g <= 10_750_000) return 1.5;
    if (g <= 12_600_000) return 2.5;
    if (g <= 15_600_000) return 4.0;
    if (g <= 20_000_000) return 6.0;
    if (g <= 30_000_000) return 10.0;
    return 16.0;
  }
  // Category C (K/3)
  if (g <= 6_600_000) return 0;
  if (g <= 6_950_000) return 0.25;
  if (g <= 7_350_000) return 0.5;
  if (g <= 7_800_000) return 0.75;
  if (g <= 9_800_000) return 1.25;
  if (g <= 12_050_000) return 2.0;
  if (g <= 15_800_000) return 3.5;
  if (g <= 22_000_000) return 6.0;
  if (g <= 32_000_000) return 10.0;
  return 16.0;
}

/**
 * Computes statutory Indonesian Overtime pay per PP 35/2021:
 * Hourly base = 1/173 * (baseSalary + fixedPositionAllowance).
 * First hour = 1.5x, subsequent hours = 2.0x.
 */
export function computeIndonesianOvertimePay(
  fixedWageIdr: number,
  totalOvertimeHours: number,
): number {
  const hrs = Math.max(0, totalOvertimeHours);
  if (hrs === 0 || fixedWageIdr <= 0) return 0;
  const hourly = fixedWageIdr / 173;
  const firstHr = Math.min(1, hrs) * 1.5;
  const restHrs = Math.max(0, hrs - 1) * 2.0;
  return Math.round(hourly * (firstHr + restHrs));
}

const BPJS_KES_CAP_IDR = 12_000_000;
const BPJS_JP_CAP_IDR = 10_042_300;

export function calculateEmployeePayroll(input: {
  employee: HrdEmployeeRecord;
  periodLabel: string;
  overtimeHours: number;
  alfaDays: number;
  bonusIdr: number;
}): HrdPayrollLineItem {
  const { employee, periodLabel, overtimeHours, alfaDays, bonusIdr } = input;
  const fixedWage = Math.max(0, employee.baseSalaryIdr) + Math.max(0, employee.positionAllowanceIdr);
  const overtimePayIdr = computeIndonesianOvertimePay(fixedWage, overtimeHours);
  const cleanBonus = Math.max(0, bonusIdr);
  const grossIncomeIdr =
    fixedWage + Math.max(0, employee.mealTransportAllowanceIdr) + overtimePayIdr + cleanBonus;

  // BPJS Kesehatan (4% Company / 1% Employee, capped at Rp 12.000.000)
  const kesBasis = Math.min(fixedWage, BPJS_KES_CAP_IDR);
  const bpjsKesCompanyIdr = employee.bpjsKesehatanActive ? Math.round(kesBasis * 0.04) : 0;
  const bpjsKesEmployeeIdr = employee.bpjsKesehatanActive ? Math.round(kesBasis * 0.01) : 0;

  // BPJS Ketenagakerjaan (JHT 3.7%/2%, JKK 0.24%, JKM 0.30%, JP 2%/1% cap)
  const jpBasis = Math.min(fixedWage, BPJS_JP_CAP_IDR);
  const bpjsJhtCompanyIdr = employee.bpjsKetenagakerjaanActive ? Math.round(fixedWage * 0.037) : 0;
  const bpjsJhtEmployeeIdr = employee.bpjsKetenagakerjaanActive ? Math.round(fixedWage * 0.02) : 0;
  const bpjsJkkCompanyIdr = employee.bpjsKetenagakerjaanActive ? Math.round(fixedWage * 0.0024) : 0;
  const bpjsJkmCompanyIdr = employee.bpjsKetenagakerjaanActive ? Math.round(fixedWage * 0.003) : 0;
  const bpjsJpCompanyIdr = employee.bpjsKetenagakerjaanActive ? Math.round(jpBasis * 0.02) : 0;
  const bpjsJpEmployeeIdr = employee.bpjsKetenagakerjaanActive ? Math.round(jpBasis * 0.01) : 0;

  const totalCompanyBpjsIdr =
    bpjsKesCompanyIdr +
    bpjsJhtCompanyIdr +
    bpjsJkkCompanyIdr +
    bpjsJkmCompanyIdr +
    bpjsJpCompanyIdr;

  // Taxable gross for PPh 21 TER includes JKK, JKM & Company BPJS Kesehatan per PMK 168/2023
  const taxableGrossIdr =
    grossIncomeIdr + bpjsKesCompanyIdr + bpjsJkkCompanyIdr + bpjsJkmCompanyIdr;
  const terCategory = getTerCategoryForPtkp(employee.ptkpStatus);
  const terRatePct = lookupPph21TerRatePct(taxableGrossIdr, terCategory);
  const pph21MonthlyIdr = Math.round(taxableGrossIdr * (terRatePct / 100));

  // Unexcused absence (Alfa) deduction = (alfaDays / 25) * baseSalary
  const alfaDeductionIdr =
    alfaDays > 0 ? Math.round((Math.min(25, alfaDays) / 25) * employee.baseSalaryIdr) : 0;

  const totalDeductionsIdr =
    bpjsKesEmployeeIdr +
    bpjsJhtEmployeeIdr +
    bpjsJpEmployeeIdr +
    pph21MonthlyIdr +
    alfaDeductionIdr;

  const netTakeHomePayIdr = Math.max(0, grossIncomeIdr - totalDeductionsIdr);
  const totalCompanyCostIdr = grossIncomeIdr + totalCompanyBpjsIdr;

  return {
    employee,
    periodLabel,
    overtimeHours,
    alfaDays,
    baseSalaryIdr: employee.baseSalaryIdr,
    positionAllowanceIdr: employee.positionAllowanceIdr,
    mealTransportAllowanceIdr: employee.mealTransportAllowanceIdr,
    overtimePayIdr,
    bonusIdr: cleanBonus,
    grossIncomeIdr,
    bpjsKesCompanyIdr,
    bpjsJhtCompanyIdr,
    bpjsJkkCompanyIdr,
    bpjsJkmCompanyIdr,
    bpjsJpCompanyIdr,
    totalCompanyBpjsIdr,
    bpjsKesEmployeeIdr,
    bpjsJhtEmployeeIdr,
    bpjsJpEmployeeIdr,
    alfaDeductionIdr,
    terCategory,
    terRatePct,
    pph21MonthlyIdr,
    totalDeductionsIdr,
    netTakeHomePayIdr,
    totalCompanyCostIdr,
  };
}

export function buildMonthlyPayrollSummary(
  state: HrdModuleState,
  periodLabel: string,
): HrdPayrollSummary {
  const activeEmployees = state.employees.filter((e) => e.isActive);
  const lines = activeEmployees.map((emp) => {
    const empAtt = state.attendance.filter((a) => a.employeeId === emp.id);
    const overtimeHours = empAtt.reduce((s, a) => s + (a.overtimeHours || 0), 0);
    const alfaDays = empAtt.filter((a) => a.status === "alfa").length;
    const bonusIdr = state.bonusByEmployeeId[emp.id] ?? 0;
    return calculateEmployeePayroll({
      employee: emp,
      periodLabel,
      overtimeHours,
      alfaDays,
      bonusIdr,
    });
  });

  return {
    periodLabel,
    employeeCount: lines.length,
    totalGrossIdr: lines.reduce((s, l) => s + l.grossIncomeIdr, 0),
    totalOvertimeIdr: lines.reduce((s, l) => s + l.overtimePayIdr, 0),
    totalBonusIdr: lines.reduce((s, l) => s + l.bonusIdr, 0),
    totalCompanyBpjsIdr: lines.reduce((s, l) => s + l.totalCompanyBpjsIdr, 0),
    totalEmployeeBpjsIdr: lines.reduce(
      (s, l) => s + l.bpjsKesEmployeeIdr + l.bpjsJhtEmployeeIdr + l.bpjsJpEmployeeIdr,
      0,
    ),
    totalPph21Idr: lines.reduce((s, l) => s + l.pph21MonthlyIdr, 0),
    totalTakeHomePayIdr: lines.reduce((s, l) => s + l.netTakeHomePayIdr, 0),
    totalCompanyCostIdr: lines.reduce((s, l) => s + l.totalCompanyCostIdr, 0),
    lines,
  };
}

export function getDefaultHrdState(): HrdModuleState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    employees: [
      {
        id: "emp-1",
        nik: "EMP-2024-001",
        fullName: "Andi Pratama, S.E.",
        position: "Operations & Finance Manager",
        department: "Finance & Accounting",
        branchName: "Kantor Pusat",
        employmentStatus: "PKWTT (Tetap)",
        joinDate: "2024-02-01",
        ptkpStatus: "K/1",
        npwp: "41.234.567.8-601.000",
        bankName: "BCA",
        bankAccount: "8810234567",
        baseSalaryIdr: 9_500_000,
        positionAllowanceIdr: 2_000_000,
        mealTransportAllowanceIdr: 1_000_000,
        bpjsKesehatanActive: true,
        bpjsKetenagakerjaanActive: true,
        annualLeaveQuota: 12,
        annualLeaveUsed: 3,
        kpiScore: 94,
        isActive: true,
      },
      {
        id: "emp-2",
        nik: "EMP-2024-002",
        fullName: "Nadia Kusuma",
        position: "Senior Omnichannel Sales Lead",
        department: "Sales & CRM",
        branchName: "Kantor Pusat",
        employmentStatus: "PKWTT (Tetap)",
        joinDate: "2024-05-15",
        ptkpStatus: "TK/0",
        npwp: "52.345.678.9-602.000",
        bankName: "Mandiri",
        bankAccount: "140009912345",
        baseSalaryIdr: 6_500_000,
        positionAllowanceIdr: 1_200_000,
        mealTransportAllowanceIdr: 850_000,
        bpjsKesehatanActive: true,
        bpjsKetenagakerjaanActive: true,
        annualLeaveQuota: 12,
        annualLeaveUsed: 2,
        kpiScore: 91,
        isActive: true,
      },
      {
        id: "emp-3",
        nik: "EMP-2025-003",
        fullName: "Rizky Hidayat",
        position: "Warehouse & FIFO Supervisor",
        department: "ERP & Logistik",
        branchName: "Gudang Utama",
        employmentStatus: "PKWT (Kontrak)",
        joinDate: "2025-01-10",
        ptkpStatus: "K/0",
        npwp: "63.456.789.0-603.000",
        bankName: "BRI",
        bankAccount: "034101008899501",
        baseSalaryIdr: 5_200_000,
        positionAllowanceIdr: 650_000,
        mealTransportAllowanceIdr: 750_000,
        bpjsKesehatanActive: true,
        bpjsKetenagakerjaanActive: true,
        annualLeaveQuota: 12,
        annualLeaveUsed: 1,
        kpiScore: 88,
        isActive: true,
      },
      {
        id: "emp-4",
        nik: "EMP-2025-004",
        fullName: "Sinta Wulandari",
        position: "Kasir POS & Customer Care",
        department: "Retail & POS",
        branchName: "Outlet Cabang 1",
        employmentStatus: "PKWT (Kontrak)",
        joinDate: "2025-04-01",
        ptkpStatus: "TK/0",
        npwp: "-",
        bankName: "BCA",
        bankAccount: "8810998811",
        baseSalaryIdr: 4_500_000,
        positionAllowanceIdr: 400_000,
        mealTransportAllowanceIdr: 600_000,
        bpjsKesehatanActive: true,
        bpjsKetenagakerjaanActive: true,
        annualLeaveQuota: 12,
        annualLeaveUsed: 0,
        kpiScore: 89,
        isActive: true,
      },
    ],
    attendance: [
      { id: "att-1", employeeId: "emp-1", date: today, status: "hadir", overtimeHours: 4, notes: "Closing bulanan & audit" },
      { id: "att-2", employeeId: "emp-2", date: today, status: "hadir", overtimeHours: 6, notes: "Campaign flash sale WA" },
      { id: "att-3", employeeId: "emp-3", date: today, status: "hadir", overtimeHours: 5, notes: "Stock opname gudang FIFO" },
      { id: "att-4", employeeId: "emp-4", date: today, status: "hadir", overtimeHours: 2, notes: "Shift sore POS" },
    ],
    leaveRequests: [
      {
        id: "lv-1",
        employeeId: "emp-2",
        employeeName: "Nadia Kusuma",
        leaveType: "Cuti Tahunan",
        startDate: today,
        endDate: today,
        days: 2,
        reason: "Acara keluarga di luar kota",
        status: "pending",
      },
    ],
    bonusByEmployeeId: {
      "emp-2": 750_000,
    },
    lastPostedPeriod: null,
  };
}

const HRD_STORAGE_KEY_PREFIX = "wacrm_sovereign_hrd_v52_";

export function loadHrdState(tenantId: string): HrdModuleState {
  if (typeof window === "undefined") return getDefaultHrdState();
  try {
    const raw = window.localStorage.getItem(`${HRD_STORAGE_KEY_PREFIX}${tenantId}`);
    if (!raw) return getDefaultHrdState();
    const parsed = JSON.parse(raw) as Partial<HrdModuleState>;
    const def = getDefaultHrdState();
    return {
      employees: Array.isArray(parsed.employees) && parsed.employees.length > 0 ? parsed.employees : def.employees,
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : def.attendance,
      leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : def.leaveRequests,
      bonusByEmployeeId: parsed.bonusByEmployeeId ?? def.bonusByEmployeeId,
      lastPostedPeriod: parsed.lastPostedPeriod ?? null,
    };
  } catch {
    return getDefaultHrdState();
  }
}

export function saveHrdState(tenantId: string, state: HrdModuleState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${HRD_STORAGE_KEY_PREFIX}${tenantId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function escHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generates an official Indonesian Payslip (Slip Gaji Karyawan) ready for Direct PDF Preview & Printing.
 */
export function renderPayslipPrintHtml(
  line: HrdPayrollLineItem,
  storeProfile: StoreBusinessProfile,
): string {
  const emp = line.employee;
  return `
    <div style="border:2px solid #0f172a;padding:16px;font-size:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:12px;">
        <div>
          <h1 style="margin:0;font-size:19px;color:#0f172a;">${escHtml(storeProfile.businessName)}</h1>
          <div class="muted">${escHtml(storeProfile.address || "Divisi HRD & Payroll Korporat")}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:900;font-size:14px;color:#059669;">SLIP GAJI KARYAWAN (CONFIDENTIAL)</div>
          <div style="font-weight:700;">Periode: ${escHtml(line.periodLabel)}</div>
          <div class="muted">Dicetak: ${escHtml(new Date().toLocaleDateString("id-ID"))}</div>
        </div>
      </div>

      <table style="margin-bottom:12px;">
        <tbody>
          <tr><td><strong>NIK / Nama</strong></td><td>${escHtml(emp.nik)} · <strong>${escHtml(emp.fullName)}</strong></td><td><strong>Status PTKP / TER</strong></td><td>${escHtml(emp.ptkpStatus)} (Kategori ${line.terCategory} · ${line.terRatePct}%)</td></tr>
          <tr><td><strong>Jabatan / Dept</strong></td><td>${escHtml(emp.position)} (${escHtml(emp.department)})</td><td><strong>Rekening Bank</strong></td><td>${escHtml(emp.bankName)} · ${escHtml(emp.bankAccount)}</td></tr>
          <tr><td><strong>Cabang / Status</strong></td><td>${escHtml(emp.branchName)} · ${escHtml(emp.employmentStatus)}</td><td><strong>NPWP</strong></td><td>${escHtml(emp.npwp || "-")}</td></tr>
        </tbody>
      </table>

      <div style="display:flex;gap:16px;">
        <div style="flex:1;">
          <h3 style="margin:4px 0;color:#059669;">A. PENERIMAAN (EARNINGS)</h3>
          <table>
            <tbody>
              <tr><td>Gaji Pokok</td><td class="right">${escHtml(formatIdr(line.baseSalaryIdr))}</td></tr>
              <tr><td>Tunjangan Jabatan</td><td class="right">${escHtml(formatIdr(line.positionAllowanceIdr))}</td></tr>
              <tr><td>Tunjangan Makan &amp; Transport</td><td class="right">${escHtml(formatIdr(line.mealTransportAllowanceIdr))}</td></tr>
              <tr><td>Upah Lembur (${line.overtimeHours} jam · PP 35/2021)</td><td class="right">${escHtml(formatIdr(line.overtimePayIdr))}</td></tr>
              <tr><td>Bonus / Komisi Kinerja (KPI ${emp.kpiScore})</td><td class="right">${escHtml(formatIdr(line.bonusIdr))}</td></tr>
              <tr style="background:#f0fdf4;"><td><strong>TOTAL PENGHASILAN BRUTO</strong></td><td class="right"><strong>${escHtml(formatIdr(line.grossIncomeIdr))}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div style="flex:1;">
          <h3 style="margin:4px 0;color:#be123c;">B. POTONGAN (DEDUCTIONS)</h3>
          <table>
            <tbody>
              <tr><td>BPJS Kesehatan Karyawan (1%)</td><td class="right">${escHtml(formatIdr(line.bpjsKesEmployeeIdr))}</td></tr>
              <tr><td>BPJS Ketenagakerjaan JHT (2%)</td><td class="right">${escHtml(formatIdr(line.bpjsJhtEmployeeIdr))}</td></tr>
              <tr><td>BPJS Jaminan Pensiun JP (1%)</td><td class="right">${escHtml(formatIdr(line.bpjsJpEmployeeIdr))}</td></tr>
              <tr><td>PPh Pasal 21 TER (${line.terCategory} · ${line.terRatePct}%)</td><td class="right">${escHtml(formatIdr(line.pph21MonthlyIdr))}</td></tr>
              <tr><td>Potongan Alfa (${line.alfaDays} hari)</td><td class="right">${escHtml(formatIdr(line.alfaDeductionIdr))}</td></tr>
              <tr style="background:#fff1f2;"><td><strong>TOTAL POTONGAN</strong></td><td class="right"><strong>${escHtml(formatIdr(line.totalDeductionsIdr))}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top:12px;padding:12px;background:#ecfdf5;border:2px solid #059669;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;color:#065f46;font-weight:700;">GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
          <div class="muted">Iuran BPJS Ditanggung Perusahaan: ${escHtml(formatIdr(line.totalCompanyBpjsIdr))}</div>
        </div>
        <div style="font-size:20px;font-weight:900;color:#065f46;">${escHtml(formatIdr(line.netTakeHomePayIdr))}</div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:26px;text-align:center;">
        <div style="width:180px;"><div>Diterima Oleh,</div><div style="height:44px;"></div><div style="border-top:1px solid #64748b;padding-top:4px;font-weight:700;">${escHtml(emp.fullName)}</div></div>
        <div style="width:180px;"><div>Disetujui HRD &amp; Finance,</div><div style="height:44px;"></div><div style="border-top:1px solid #64748b;padding-top:4px;font-weight:700;">${escHtml(storeProfile.businessName)}</div></div>
      </div>
    </div>
  `;
}

/**
 * Generates an executive Monthly Payroll Register (Rekap Gaji & Pajak PPh 21 + BPJS) for PDF/Print.
 */
export function renderPayrollSummaryPrintHtml(
  summary: HrdPayrollSummary,
  storeProfile: StoreBusinessProfile,
): string {
  const rows = summary.lines
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td><strong>${escHtml(l.employee.fullName)}</strong><br/><span class="muted">${escHtml(l.employee.nik)} · ${escHtml(l.employee.department)}</span></td><td class="center">${escHtml(l.employee.ptkpStatus)}</td><td class="right">${escHtml(formatIdr(l.grossIncomeIdr))}</td><td class="right">${escHtml(formatIdr(l.bpjsKesEmployeeIdr + l.bpjsJhtEmployeeIdr + l.bpjsJpEmployeeIdr))}</td><td class="right">${escHtml(formatIdr(l.pph21MonthlyIdr))}</td><td class="right"><strong>${escHtml(formatIdr(l.netTakeHomePayIdr))}</strong></td></tr>`,
    )
    .join("");

  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;">
      <h1 style="margin:0;color:#0f172a;font-size:20px;">${escHtml(storeProfile.businessName)}</h1>
      <div style="font-size:14px;font-weight:700;color:#059669;margin-top:2px;">Rekapitulasi Payroll Bulanan, BPJS &amp; PPh Pasal 21 TER — ${escHtml(summary.periodLabel)}</div>
      <div class="muted">Total ${summary.employeeCount} Karyawan Aktif · Total Take Home Pay: ${escHtml(formatIdr(summary.totalTakeHomePayIdr))} · Total Biaya Perusahaan: ${escHtml(formatIdr(summary.totalCompanyCostIdr))}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Karyawan &amp; Dept</th><th class="center">PTKP</th><th class="right">Bruto</th><th class="right">BPJS Kary.</th><th class="right">PPh 21 TER</th><th class="right">Take Home Pay</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#ecfdf5;font-weight:800;">
          <td colspan="3">TOTAL PAYROLL (${summary.employeeCount} KARYAWAN)</td>
          <td class="right">${escHtml(formatIdr(summary.totalGrossIdr))}</td>
          <td class="right">${escHtml(formatIdr(summary.totalEmployeeBpjsIdr))}</td>
          <td class="right">${escHtml(formatIdr(summary.totalPph21Idr))}</td>
          <td class="right">${escHtml(formatIdr(summary.totalTakeHomePayIdr))}</td>
        </tr>
      </tfoot>
    </table>
    <p class="muted" style="margin-top:10px;">
      Total Iuran BPJS Ditanggung Perusahaan (Kesehatan 4%, JHT 3,7%, JKK 0,24%, JKM 0,30%, JP 2%): <strong>${escHtml(formatIdr(summary.totalCompanyBpjsIdr))}</strong> · Total Biaya Payroll Korporasi (Bruto + BPJS Perusahaan): <strong>${escHtml(formatIdr(summary.totalCompanyCostIdr))}</strong>.
    </p>
  `;
}
