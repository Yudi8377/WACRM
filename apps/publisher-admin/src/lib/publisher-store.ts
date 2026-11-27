import {
  buildJournalEntry,
  computeBalanceSheet,
  computeIncomeStatement,
  computeTrialBalance,
  DEFAULT_PUBLISHER_COA,
} from "./accounting-engine";
import { issueSignedLicenseKey, PUBLISHER_EDITIONS } from "./license-engine";
import type {
  BillingCycle,
  EditionId,
  LicenseRecord,
  LicenseStatus,
  PublisherEmsState,
  SubscriptionInvoiceRecord,
  TenantCustomerRecord,
} from "./publisher-types";

const STORAGE_KEY = "wacrm_publisher_hq_ems_state_v1";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nextSeq(prefix: string, count: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export function buildInitialPublisherState(): PublisherEmsState {
  const coa = DEFAULT_PUBLISHER_COA;

  const keySov = issueSignedLicenseKey({
    editionId: "sovereign",
    expiryYear: 2027,
    expiryMonth: 11,
    maxSeats: 9999,
  });
  const keyEnt1 = issueSignedLicenseKey({
    editionId: "enterprise",
    expiryYear: 2027,
    expiryMonth: 10,
    maxSeats: 50,
  });
  const keyEnt2 = issueSignedLicenseKey({
    editionId: "enterprise",
    expiryYear: 2027,
    expiryMonth: 6,
    maxSeats: 35,
  });
  const keyPro1 = issueSignedLicenseKey({
    editionId: "pro",
    expiryYear: 2027,
    expiryMonth: 5,
    maxSeats: 15,
  });
  const keyPro2 = issueSignedLicenseKey({
    editionId: "pro",
    expiryYear: 2026,
    expiryMonth: 12,
    maxSeats: 15,
  });
  const keyStr = issueSignedLicenseKey({
    editionId: "starter",
    expiryYear: 2027,
    expiryMonth: 12,
    maxSeats: 3,
  });

  const journals = [
    buildJournalEntry({
      id: "jrn-001",
      journalNumber: "JRN-2026-0001",
      date: "2026-09-01",
      reference: "OPENING-CAP",
      description: "Setoran Modal Awal PT WACRM Digital Nusantara & Aset Server R&D",
      sourceModule: "opening",
      postedBy: "Finance Controller",
      coa,
      rawLines: [
        { accountCode: "1101", debit: 350_000_000, credit: 0, memo: "Kas & Bank BCA Operasional" },
        { accountCode: "1102", debit: 120_000_000, credit: 0, memo: "Bank Mandiri Escrow" },
        { accountCode: "1301", debit: 45_000_000, credit: 0, memo: "Stok Awal Printer Thermal & EDC" },
        { accountCode: "1501", debit: 85_000_000, credit: 0, memo: "Server DevOps & Perangkat R&D" },
        { accountCode: "3101", debit: 0, credit: 500_000_000, memo: "Modal Disetor Pendiri" },
        { accountCode: "3201", debit: 0, credit: 100_000_000, memo: "Laba Ditahan Periode Sebelumnya" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-002",
      journalNumber: "JRN-2026-0002",
      date: "2026-10-05",
      reference: "PUB-INV-2026-0001",
      description: "Pembayaran Lisensi Tahunan Sovereign Corporate — PT Nusantara Retail Group",
      sourceModule: "billing",
      postedBy: "Billing Engine",
      coa,
      rawLines: [
        { accountCode: "1101", debit: 66_489_000, credit: 0, memo: "Penerimaan Bank BCA (incl. PPN 11%)" },
        { accountCode: "2201", debit: 0, credit: 59_900_000, memo: "Deferred SaaS Revenue 12 bulan" },
        { accountCode: "2103", debit: 0, credit: 6_589_000, memo: "PPN Keluaran 11%" },
        { accountCode: "6102", debit: 8_985_000, credit: 0, memo: "Komisi Reseller Platinum 15%" },
        { accountCode: "2102", debit: 0, credit: 8_985_000, memo: "Hutang Komisi PT Sinergi Cloud" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-003",
      journalNumber: "JRN-2026-0003",
      date: "2026-10-12",
      reference: "PUB-INV-2026-0002",
      description: "Pembayaran Lisensi Tahunan Enterprise AI — CV Berkah Kopi Nusantara",
      sourceModule: "billing",
      postedBy: "Billing Engine",
      coa,
      rawLines: [
        { accountCode: "1101", debit: 22_089_000, credit: 0, memo: "Transfer BCA (incl. PPN 11%)" },
        { accountCode: "2201", debit: 0, credit: 19_900_000, memo: "Deferred SaaS Revenue 12 bulan" },
        { accountCode: "2103", debit: 0, credit: 2_189_000, memo: "PPN Keluaran 11%" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-004",
      journalNumber: "JRN-2026-0004",
      date: "2026-10-20",
      reference: "PUB-INV-2026-0003",
      description: "Pembayaran Lisensi Enterprise AI + Bundling 5 Printer Thermal — Klinik Medika Sehat",
      sourceModule: "billing",
      postedBy: "Billing Engine",
      coa,
      rawLines: [
        { accountCode: "1102", debit: 29_304_000, credit: 0, memo: "Escrow Mandiri (incl. PPN 11%)" },
        { accountCode: "2201", debit: 0, credit: 19_900_000, memo: "Deferred SaaS License 12 bulan" },
        { accountCode: "4103", debit: 0, credit: 6_500_000, memo: "Pendapatan Hardware & Onboarding" },
        { accountCode: "2103", debit: 0, credit: 2_904_000, memo: "PPN Keluaran 11%" },
        { accountCode: "5103", debit: 3_750_000, credit: 0, memo: "HPP 5 unit Printer Thermal 80mm" },
        { accountCode: "1301", debit: 0, credit: 3_750_000, memo: "Pengeluaran Persediaan Hardware" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-005",
      journalNumber: "JRN-2026-0005",
      date: "2026-11-01",
      reference: "REV-REC-2026-11",
      description: "Pengakuan Pendapatan Bulanan (Amortisasi Deferred SaaS Revenue Nov 2026)",
      sourceModule: "revenue_recognition",
      postedBy: "Finance Controller",
      coa,
      rawLines: [
        { accountCode: "2201", debit: 16_600_000, credit: 0, memo: "Amortisasi 2 bulan kontrak tahunan" },
        { accountCode: "4101", debit: 0, credit: 16_600_000, memo: "Pendapatan Lisensi SaaS Diakui" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-006",
      journalNumber: "JRN-2026-0006",
      date: "2026-11-08",
      reference: "PUB-INV-2026-0004",
      description: "Langganan Growth Pro + Add-on 2M Token AI — Batik Kediri Heritage",
      sourceModule: "billing",
      postedBy: "Billing Engine",
      coa,
      rawLines: [
        { accountCode: "1101", debit: 6_648_900, credit: 0, memo: "Penerimaan QRIS/Transfer BCA" },
        { accountCode: "4101", debit: 0, credit: 4_990_000, memo: "Lisensi Growth Pro" },
        { accountCode: "4102", debit: 0, credit: 1_000_000, memo: "Add-On Paket AI Token" },
        { accountCode: "2103", debit: 0, credit: 658_900, memo: "PPN Keluaran 11%" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-007",
      journalNumber: "JRN-2026-0007",
      date: "2026-11-12",
      reference: "PO-2026-0001",
      description: "Pembayaran Infrastruktur Cloud Neon DB & Vercel Enterprise Nov 2026",
      sourceModule: "procurement",
      postedBy: "DevOps Finance",
      coa,
      rawLines: [
        { accountCode: "5101", debit: 4_200_000, credit: 0, memo: "HPP Neon DB Cluster & Vercel Pro" },
        { accountCode: "1401", debit: 462_000, credit: 0, memo: "PPN Masukan 11%" },
        { accountCode: "1101", debit: 0, credit: 4_662_000, memo: "Pembayaran Bank BCA" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-008",
      journalNumber: "JRN-2026-0008",
      date: "2026-11-15",
      reference: "PO-2026-0002",
      description: "Pembayaran Kuota API LLM AI & WhatsApp Cloud BSP Nov 2026",
      sourceModule: "procurement",
      postedBy: "DevOps Finance",
      coa,
      rawLines: [
        { accountCode: "5102", debit: 3_150_000, credit: 0, memo: "HPP API LLM & WA BSP" },
        { accountCode: "1401", debit: 346_500, credit: 0, memo: "PPN Masukan 11%" },
        { accountCode: "1101", debit: 0, credit: 3_496_500, memo: "Pembayaran Bank BCA" },
      ],
    }),
    buildJournalEntry({
      id: "jrn-009",
      journalNumber: "JRN-2026-0009",
      date: "2026-11-25",
      reference: "PAYROLL-2026-11",
      description: "Gaji Tim Engineering, Sales & Support SLA Bulan November 2026",
      sourceModule: "payroll",
      postedBy: "Finance Controller",
      coa,
      rawLines: [
        { accountCode: "6101", debit: 18_500_000, credit: 0, memo: "Beban Gaji Tim Inti" },
        { accountCode: "6103", debit: 2_400_000, credit: 0, memo: "Beban Pemasaran & SEO B2B" },
        { accountCode: "6104", debit: 1_650_000, credit: 0, memo: "Operasional & Support SLA" },
        { accountCode: "2104", debit: 0, credit: 1_250_000, memo: "PPh 21 Terutang" },
        { accountCode: "1101", debit: 0, credit: 21_300_000, memo: "Transfer Payroll BCA" },
      ],
    }),
  ];

  return {
    profile: {
      companyName: "PT WACRM Digital Nusantara",
      legalEntity: "Perseroan Terbatas (PKP)",
      npwp: "09.482.110.5-622.000",
      address: "Jl. Raya Darmo Permai No. 88, Surabaya, Jawa Timur 60226",
      phone: "+62-31-8800-4900",
      email: "licensing@wacrm-publisher.id",
      website: "https://wacrm-seven-dusky.vercel.app",
      bankName: "Bank Central Asia (BCA)",
      bankAccountNo: "8290-7711-2026",
      bankAccountHolder: "PT WACRM DIGITAL NUSANTARA",
      defaultPpnRate: 0.11,
      defaultPph23Rate: 0.02,
      invoicePrefix: "PUB-INV",
      licenseApiUrl: "https://publisher.wacrm.id/api/licenses/verify",
    },
    tenants: [
      {
        id: "ten-001",
        code: "CUST-001",
        companyName: "PT Nusantara Retail Group",
        npwp: "01.345.678.9-012.000",
        industry: "Retail Multi-Cabang",
        picName: "Hendra Wijaya",
        picEmail: "hendra@nusantararetail.co.id",
        picWhatsapp: "+628113400991",
        domain: "crm.nusantararetail.co.id",
        city: "Jakarta Selatan",
        resellerId: "rsl-001",
        status: "active",
        monthlyCloudCogsIdr: 780_000,
        monthlyAiTokenCostIdr: 520_000,
        healthScore: 98,
        createdAt: "2026-10-05",
      },
      {
        id: "ten-002",
        code: "CUST-002",
        companyName: "CV Berkah Kopi Nusantara",
        npwp: "02.881.204.3-655.000",
        industry: "F&B Roastery & Distributor",
        picName: "Rina Kartika",
        picEmail: "rina@berkahkopi.id",
        picWhatsapp: "+6281234567890",
        domain: "app.berkahkopi.id",
        city: "Kediri",
        resellerId: null,
        status: "active",
        monthlyCloudCogsIdr: 320_000,
        monthlyAiTokenCostIdr: 240_000,
        healthScore: 95,
        createdAt: "2026-10-12",
      },
      {
        id: "ten-003",
        code: "CUST-003",
        companyName: "Klinik Medika Sehat Grup",
        npwp: "03.112.900.1-609.000",
        industry: "Kesehatan & Farmasi",
        picName: "dr. Dimas Pratama",
        picEmail: "dimas@medikasehat.id",
        picWhatsapp: "+6281399887766",
        domain: "portal.medikasehat.id",
        city: "Surabaya",
        resellerId: "rsl-002",
        status: "active",
        monthlyCloudCogsIdr: 350_000,
        monthlyAiTokenCostIdr: 290_000,
        healthScore: 94,
        createdAt: "2026-10-20",
      },
      {
        id: "ten-004",
        code: "CUST-004",
        companyName: "Batik Kediri Heritage",
        npwp: "08.221.440.9-655.000",
        industry: "Fashion & Craft UMKM",
        picName: "Sari Rahmawati",
        picEmail: "sari@batikkediri.id",
        picWhatsapp: "+6285645123300",
        domain: "toko.batikkediri.id",
        city: "Kediri",
        resellerId: "rsl-002",
        status: "active",
        monthlyCloudCogsIdr: 120_000,
        monthlyAiTokenCostIdr: 95_000,
        healthScore: 91,
        createdAt: "2026-11-08",
      },
      {
        id: "ten-005",
        code: "CUST-005",
        companyName: "UD Sumber Makmur Elektronik",
        npwp: "04.778.102.4-614.000",
        industry: "Grosir Elektronik",
        picName: "Bambang Setiawan",
        picEmail: "bambang@sumbermakmur.co.id",
        picWhatsapp: "+6281822334455",
        domain: "wacrm.sumbermakmur.co.id",
        city: "Malang",
        resellerId: "rsl-001",
        status: "at_risk",
        monthlyCloudCogsIdr: 140_000,
        monthlyAiTokenCostIdr: 110_000,
        healthScore: 68,
        createdAt: "2026-09-18",
      },
      {
        id: "ten-006",
        code: "CUST-006",
        companyName: "Warung Kopi & Roti Al-Barokah",
        npwp: "-",
        industry: "UMKM Kuliner",
        picName: "Ahmad Fauzi",
        picEmail: "fauzi@albarokah.id",
        picWhatsapp: "+6285712349900",
        domain: "albarokah.wacrm.app",
        city: "Sidoarjo",
        resellerId: null,
        status: "onboarding",
        monthlyCloudCogsIdr: 35_000,
        monthlyAiTokenCostIdr: 20_000,
        healthScore: 86,
        createdAt: "2026-11-20",
      },
    ],
    skus: [
      { id: "sku-01", sku: "LIC-STR-M", name: "Lisensi WACRM Starter UMKM (Gratis)", category: "license", editionId: "starter", billingCycle: "monthly", unitPriceIdr: 0, costPriceIdr: 35_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-02", sku: "LIC-PRO-M", name: "Lisensi WACRM Growth Pro (Bulanan)", category: "license", editionId: "pro", billingCycle: "monthly", unitPriceIdr: 499_000, costPriceIdr: 130_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-03", sku: "LIC-PRO-Y", name: "Lisensi WACRM Growth Pro (Tahunan)", category: "license", editionId: "pro", billingCycle: "annual", unitPriceIdr: 4_990_000, costPriceIdr: 1_560_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-04", sku: "LIC-ENT-M", name: "Lisensi WACRM Enterprise AI Suite (Bulanan)", category: "license", editionId: "enterprise", billingCycle: "monthly", unitPriceIdr: 1_990_000, costPriceIdr: 520_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-05", sku: "LIC-ENT-Y", name: "Lisensi WACRM Enterprise AI Suite (Tahunan)", category: "license", editionId: "enterprise", billingCycle: "annual", unitPriceIdr: 19_900_000, costPriceIdr: 6_240_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-06", sku: "LIC-SOV-Y", name: "Lisensi WACRM Sovereign Corporate (Tahunan)", category: "license", editionId: "sovereign", billingCycle: "annual", unitPriceIdr: 59_900_000, costPriceIdr: 14_400_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-07", sku: "ADD-AI-2M", name: "Add-On Paket 2 Juta Token AI Multi-Agent", category: "addon", billingCycle: "one_time", unitPriceIdr: 1_000_000, costPriceIdr: 320_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-08", sku: "SVC-APK-WL", name: "Jasa Build Android APK White-Label + Signing", category: "service", billingCycle: "one_time", unitPriceIdr: 4_500_000, costPriceIdr: 1_200_000, stockQty: 9999, minStock: 0, isActive: true },
      { id: "sku-09", sku: "HW-PRN-80", name: "Printer Thermal 80mm USB-OTG/Bluetooth/WiFi", category: "hardware", billingCycle: "one_time", unitPriceIdr: 1_300_000, costPriceIdr: 750_000, stockQty: 28, minStock: 10, isActive: true },
      { id: "sku-10", sku: "HW-EDC-POS", name: "Terminal Android POS + EDC Thermal Built-In", category: "hardware", billingCycle: "one_time", unitPriceIdr: 2_850_000, costPriceIdr: 1_850_000, stockQty: 12, minStock: 5, isActive: true },
    ],
    resellers: [
      { id: "rsl-001", code: "PTR-001", name: "PT Sinergi Cloud Indonesia", tier: "platinum", picName: "Reza Mahendra", email: "reza@sinergicloud.co.id", phone: "+628119008811", city: "Jakarta", commissionRate: 0.15, activeTenantsCount: 2, totalCommissionEarnedIdr: 8_985_000, status: "active" },
      { id: "rsl-002", code: "PTR-002", name: "CV Jatim Digital Solusi", tier: "gold", picName: "Dewi Lestari", email: "dewi@jatimdigital.id", phone: "+6281231002200", city: "Surabaya", commissionRate: 0.12, activeTenantsCount: 2, totalCommissionEarnedIdr: 2_986_800, status: "active" },
      { id: "rsl-003", code: "PTR-003", name: "Karya ERP Nusantara", tier: "silver", picName: "Agus Salim", email: "agus@karyaerp.id", phone: "+6281322114400", city: "Bandung", commissionRate: 0.1, activeTenantsCount: 0, totalCommissionEarnedIdr: 0, status: "active" },
    ],
    vendors: [
      { id: "vnd-001", code: "VND-CLOUD", name: "Neon PostgreSQL & Vercel Enterprise", category: "cloud_db", contactEmail: "billing@neon.tech", npwp: "INTL-US-001", paymentTerms: "Net 15", monthlyEstimateIdr: 4_200_000, status: "active" },
      { id: "vnd-002", code: "VND-AI", name: "OpenAI & Gemini Enterprise API", category: "ai_llm", contactEmail: "ar@ai-provider.com", npwp: "INTL-US-002", paymentTerms: "Prepaid", monthlyEstimateIdr: 2_250_000, status: "active" },
      { id: "vnd-003", code: "VND-WA", name: "Meta WhatsApp Cloud API BSP", category: "whatsapp_bsp", contactEmail: "billing@meta-bsp.id", npwp: "01.999.222.1-011.000", paymentTerms: "Net 30", monthlyEstimateIdr: 900_000, status: "active" },
      { id: "vnd-004", code: "VND-HW", name: "PT Mitra Perangkat Kasir Indonesia", category: "hardware", contactEmail: "sales@mitrakasir.co.id", npwp: "02.444.881.2-054.000", paymentTerms: "Net 30", monthlyEstimateIdr: 7_500_000, status: "active" },
    ],
    employees: [
      { id: "emp-001", code: "EMP-001", name: "Yudi Pratama", role: "super_admin", department: "Executive & Licensing", email: "yudi@wacrm-publisher.id", monthlySalaryIdr: 0, salesTargetMrrIdr: 0, status: "active" },
      { id: "emp-002", code: "EMP-002", name: "Nadia Kusuma", role: "finance_controller", department: "Finance & Tax PSAK", email: "nadia@wacrm-publisher.id", monthlySalaryIdr: 7_500_000, salesTargetMrrIdr: 0, status: "active" },
      { id: "emp-003", code: "EMP-003", name: "Farhan Hakim", role: "sales_ae", department: "B2B Enterprise Sales", email: "farhan@wacrm-publisher.id", monthlySalaryIdr: 5_500_000, salesTargetMrrIdr: 15_000_000, status: "active" },
      { id: "emp-004", code: "EMP-004", name: "Putri Maharani", role: "customer_success", department: "Customer Success & SLA", email: "putri@wacrm-publisher.id", monthlySalaryIdr: 5_500_000, salesTargetMrrIdr: 5_000_000, status: "active" },
    ],
    coa,
    licenses: [
      {
        id: "lic-001",
        licenseKey: keySov,
        tenantId: "ten-001",
        tenantName: "PT Nusantara Retail Group",
        domain: "crm.nusantararetail.co.id",
        editionId: "sovereign",
        billingCycle: "annual",
        status: "active",
        maxSeats: 9999,
        usedSeats: 118,
        maxAiAgents: 9,
        maxBranches: 999,
        monthlyValueIdr: 5_990_000,
        issuedAt: "2026-10-05",
        expiresAt: "2027-11-30",
        lastHeartbeatAt: "2026-11-26T06:15:00Z",
        entitlements: PUBLISHER_EDITIONS.sovereign.entitlements,
        notes: "Dedicated cluster + Custom Branded APK aktif.",
      },
      {
        id: "lic-002",
        licenseKey: keyEnt1,
        tenantId: "ten-002",
        tenantName: "CV Berkah Kopi Nusantara",
        domain: "app.berkahkopi.id",
        editionId: "enterprise",
        billingCycle: "annual",
        status: "active",
        maxSeats: 50,
        usedSeats: 24,
        maxAiAgents: 9,
        maxBranches: 20,
        monthlyValueIdr: 1_990_000,
        issuedAt: "2026-10-12",
        expiresAt: "2027-10-31",
        lastHeartbeatAt: "2026-11-26T06:28:00Z",
        entitlements: PUBLISHER_EDITIONS.enterprise.entitlements,
        notes: "Aktif di 4 cabang Kediri & Surabaya.",
      },
      {
        id: "lic-003",
        licenseKey: keyEnt2,
        tenantId: "ten-003",
        tenantName: "Klinik Medika Sehat Grup",
        domain: "portal.medikasehat.id",
        editionId: "enterprise",
        billingCycle: "annual",
        status: "active",
        maxSeats: 35,
        usedSeats: 29,
        maxAiAgents: 9,
        maxBranches: 20,
        monthlyValueIdr: 1_990_000,
        issuedAt: "2026-10-20",
        expiresAt: "2027-06-30",
        lastHeartbeatAt: "2026-11-26T05:45:00Z",
        entitlements: PUBLISHER_EDITIONS.enterprise.entitlements,
        notes: "Bundling 5 printer thermal 80mm USB-OTG.",
      },
      {
        id: "lic-004",
        licenseKey: keyPro1,
        tenantId: "ten-004",
        tenantName: "Batik Kediri Heritage",
        domain: "toko.batikkediri.id",
        editionId: "pro",
        billingCycle: "annual",
        status: "active",
        maxSeats: 15,
        usedSeats: 9,
        maxAiAgents: 6,
        maxBranches: 3,
        monthlyValueIdr: 499_000,
        issuedAt: "2026-11-08",
        expiresAt: "2027-05-31",
        lastHeartbeatAt: "2026-11-26T06:10:00Z",
        entitlements: PUBLISHER_EDITIONS.pro.entitlements,
        notes: "Add-on 2M AI Token aktif.",
      },
      {
        id: "lic-005",
        licenseKey: keyPro2,
        tenantId: "ten-005",
        tenantName: "UD Sumber Makmur Elektronik",
        domain: "wacrm.sumbermakmur.co.id",
        editionId: "pro",
        billingCycle: "monthly",
        status: "grace_period",
        maxSeats: 15,
        usedSeats: 14,
        maxAiAgents: 6,
        maxBranches: 3,
        monthlyValueIdr: 499_000,
        issuedAt: "2026-09-18",
        expiresAt: "2026-12-31",
        lastHeartbeatAt: "2026-11-25T14:20:00Z",
        entitlements: PUBLISHER_EDITIONS.pro.entitlements,
        notes: "Tagihan perpanjangan overdue 5 hari (masa tenggang aktif).",
      },
      {
        id: "lic-006",
        licenseKey: keyStr,
        tenantId: "ten-006",
        tenantName: "Warung Kopi & Roti Al-Barokah",
        domain: "albarokah.wacrm.app",
        editionId: "starter",
        billingCycle: "trial",
        status: "trial",
        maxSeats: 3,
        usedSeats: 2,
        maxAiAgents: 3,
        maxBranches: 1,
        monthlyValueIdr: 0,
        issuedAt: "2026-11-20",
        expiresAt: "2027-12-31",
        lastHeartbeatAt: "2026-11-26T04:55:00Z",
        entitlements: PUBLISHER_EDITIONS.starter.entitlements,
        notes: "Prospek upgrade ke Growth Pro bulan depan.",
      },
    ],
    licenseLogs: [
      { id: "log-001", timestamp: "2026-11-26T06:28:00Z", licenseKey: keyEnt1, tenantName: "CV Berkah Kopi Nusantara", action: "verified", actor: "WACRM Client Heartbeat", detail: "Validasi kriptografi & kursi (24/50) sukses." },
      { id: "log-002", timestamp: "2026-11-26T06:15:00Z", licenseKey: keySov, tenantName: "PT Nusantara Retail Group", action: "verified", actor: "WACRM Client Heartbeat", detail: "Cluster Sovereign aktif — 118 pengguna simultan." },
      { id: "log-003", timestamp: "2026-11-08T09:10:00Z", licenseKey: keyPro1, tenantName: "Batik Kediri Heritage", action: "issued", actor: "Yudi Pratama (Super Admin)", detail: "Penerbitan lisensi tahunan Growth Pro (15 kursi)." },
    ],
    deals: [
      {
        id: "dl-001",
        code: "DEAL-2026-014",
        companyName: "PT Sinar Logistik Express",
        contactName: "Irwan Saputra",
        contactWhatsapp: "+6281188776655",
        contactEmail: "irwan@sinarlogistik.co.id",
        industry: "Logistik & Ekspedisi",
        targetEdition: "sovereign",
        billingCycle: "annual",
        requestedSeats: 120,
        dealValueIdr: 59_900_000,
        probability: 80,
        stage: "negotiation",
        ownerEmployeeId: "emp-003",
        resellerId: "rsl-001",
        expectedCloseDate: "2026-12-05",
        notes: "Sudah lulus PoC cetak label QR resi USB-OTG & 9 AI Agent; finalisasi kontrak legal.",
      },
      {
        id: "dl-002",
        code: "DEAL-2026-015",
        companyName: "Apotek Sehat Sentosa (12 Cabang)",
        contactName: "Apt. Laila Nur",
        contactWhatsapp: "+6281299004411",
        contactEmail: "laila@apoteksentosa.id",
        industry: "Farmasi Retail",
        targetEdition: "enterprise",
        billingCycle: "annual",
        requestedSeats: 40,
        dealValueIdr: 19_900_000,
        probability: 70,
        stage: "trial_poc",
        ownerEmployeeId: "emp-003",
        resellerId: "rsl-002",
        expectedCloseDate: "2026-12-10",
        notes: "Sedang uji coba integrasi POS, stok ERP multi-cabang & WhatsApp Cloud API.",
      },
      {
        id: "dl-003",
        code: "DEAL-2026-016",
        companyName: "CV Karya Furniture Jepara",
        contactName: "Taufik Hidayat",
        contactWhatsapp: "+6281355667788",
        contactEmail: "taufik@karyafurniture.id",
        industry: "Manufaktur & Ekspor",
        targetEdition: "pro",
        billingCycle: "annual",
        requestedSeats: 15,
        dealValueIdr: 4_990_000,
        probability: 55,
        stage: "proposal",
        ownerEmployeeId: "emp-003",
        resellerId: null,
        expectedCloseDate: "2026-12-15",
        notes: "Meminta penawaran paket Growth Pro + AI Template CS Bahasa Inggris.",
      },
      {
        id: "dl-004",
        code: "DEAL-2026-017",
        companyName: "Hotel Grand Dhoho Kediri",
        contactName: "Ratna Dewi",
        contactWhatsapp: "+6281577889900",
        contactEmail: "ratna@granddhoho.com",
        industry: "Hospitality",
        targetEdition: "enterprise",
        billingCycle: "monthly",
        requestedSeats: 30,
        dealValueIdr: 1_990_000,
        probability: 35,
        stage: "discovery",
        ownerEmployeeId: "emp-004",
        resellerId: "rsl-002",
        expectedCloseDate: "2026-12-22",
        notes: "Demo dijadwalkan untuk sistem reservasi WhatsApp AI + akuntansi.",
      },
    ],
    tickets: [
      { id: "tkt-001", code: "SLA-2026-101", tenantId: "ten-001", tenantName: "PT Nusantara Retail Group", subject: "Build ulang Custom Branded Android APK v4.1 dengan logo cabang baru", category: "custom_apk", priority: "p2_high", status: "in_progress", assignedTo: "Yudi Pratama", slaHours: 8, createdAt: "2026-11-25" },
      { id: "tkt-002", code: "SLA-2026-102", tenantId: "ten-005", tenantName: "UD Sumber Makmur Elektronik", subject: "Perpanjangan masa tenggang & penerbitan Faktur Pajak PPN November", category: "billing", priority: "p1_critical", status: "open", assignedTo: "Nadia Kusuma", slaHours: 4, createdAt: "2026-11-26" },
      { id: "tkt-003", code: "SLA-2026-103", tenantId: "ten-003", tenantName: "Klinik Medika Sehat Grup", subject: "Panduan pairing printer thermal USB-C OTG di tablet kasir cabang 3", category: "technical", priority: "p3_normal", status: "resolved", assignedTo: "Putri Maharani", slaHours: 24, createdAt: "2026-11-22" },
    ],
    invoices: [
      {
        id: "inv-001",
        invoiceNumber: "PUB-INV-2026-0001",
        tenantId: "ten-001",
        tenantName: "PT Nusantara Retail Group",
        licenseId: "lic-001",
        skuCode: "LIC-SOV-Y",
        description: "Lisensi Tahunan WACRM Sovereign Corporate (12 Bulan)",
        billingCycle: "annual",
        periodMonths: 12,
        subtotalIdr: 59_900_000,
        ppnRate: 0.11,
        ppnAmountIdr: 6_589_000,
        totalIdr: 66_489_000,
        resellerId: "rsl-001",
        resellerCommissionIdr: 8_985_000,
        status: "paid",
        issuedDate: "2026-10-01",
        dueDate: "2026-10-15",
        paidDate: "2026-10-05",
        journalId: "jrn-002",
      },
      {
        id: "inv-002",
        invoiceNumber: "PUB-INV-2026-0002",
        tenantId: "ten-002",
        tenantName: "CV Berkah Kopi Nusantara",
        licenseId: "lic-002",
        skuCode: "LIC-ENT-Y",
        description: "Lisensi Tahunan WACRM Enterprise AI Suite (12 Bulan)",
        billingCycle: "annual",
        periodMonths: 12,
        subtotalIdr: 19_900_000,
        ppnRate: 0.11,
        ppnAmountIdr: 2_189_000,
        totalIdr: 22_089_000,
        resellerId: null,
        resellerCommissionIdr: 0,
        status: "paid",
        issuedDate: "2026-10-08",
        dueDate: "2026-10-22",
        paidDate: "2026-10-12",
        journalId: "jrn-003",
      },
      {
        id: "inv-003",
        invoiceNumber: "PUB-INV-2026-0003",
        tenantId: "ten-003",
        tenantName: "Klinik Medika Sehat Grup",
        licenseId: "lic-003",
        skuCode: "LIC-ENT-Y",
        description: "Lisensi Enterprise AI (12 Bln) + 5 Unit Printer Thermal 80mm",
        billingCycle: "annual",
        periodMonths: 12,
        subtotalIdr: 26_400_000,
        ppnRate: 0.11,
        ppnAmountIdr: 2_904_000,
        totalIdr: 29_304_000,
        resellerId: "rsl-002",
        resellerCommissionIdr: 2_388_000,
        status: "paid",
        issuedDate: "2026-10-18",
        dueDate: "2026-11-01",
        paidDate: "2026-10-20",
        journalId: "jrn-004",
      },
      {
        id: "inv-004",
        invoiceNumber: "PUB-INV-2026-0004",
        tenantId: "ten-004",
        tenantName: "Batik Kediri Heritage",
        licenseId: "lic-004",
        skuCode: "LIC-PRO-Y",
        description: "Lisensi Growth Pro (Tahunan) + Add-On 2M Token AI",
        billingCycle: "annual",
        periodMonths: 12,
        subtotalIdr: 5_990_000,
        ppnRate: 0.11,
        ppnAmountIdr: 658_900,
        totalIdr: 6_648_900,
        resellerId: "rsl-002",
        resellerCommissionIdr: 598_800,
        status: "paid",
        issuedDate: "2026-11-05",
        dueDate: "2026-11-15",
        paidDate: "2026-11-08",
        journalId: "jrn-006",
      },
      {
        id: "inv-005",
        invoiceNumber: "PUB-INV-2026-0005",
        tenantId: "ten-005",
        tenantName: "UD Sumber Makmur Elektronik",
        licenseId: "lic-005",
        skuCode: "LIC-PRO-M",
        description: "Perpanjangan Bulanan Lisensi WACRM Growth Pro (Nov–Des 2026)",
        billingCycle: "monthly",
        periodMonths: 1,
        subtotalIdr: 499_000,
        ppnRate: 0.11,
        ppnAmountIdr: 54_890,
        totalIdr: 553_890,
        resellerId: "rsl-001",
        resellerCommissionIdr: 74_850,
        status: "overdue",
        issuedDate: "2026-11-10",
        dueDate: "2026-11-21",
        paidDate: null,
        journalId: null,
      },
    ],
    purchaseOrders: [
      {
        id: "po-001",
        poNumber: "PO-2026-0001",
        vendorId: "vnd-001",
        vendorName: "Neon PostgreSQL & Vercel Enterprise",
        skuCode: null,
        description: "Cluster Database Neon & Hosting Vercel Enterprise Nov 2026",
        category: "cloud_cogs",
        qty: 1,
        unitCostIdr: 4_200_000,
        subtotalIdr: 4_200_000,
        ppnInputIdr: 462_000,
        totalIdr: 4_662_000,
        status: "paid",
        orderDate: "2026-11-01",
        paidDate: "2026-11-12",
        journalId: "jrn-007",
      },
      {
        id: "po-002",
        poNumber: "PO-2026-0002",
        vendorId: "vnd-002",
        vendorName: "OpenAI & Gemini Enterprise API",
        skuCode: null,
        description: "Deposit Kuota Token LLM AI & WA Cloud API Nov 2026",
        category: "ai_api_cogs",
        qty: 1,
        unitCostIdr: 3_150_000,
        subtotalIdr: 3_150_000,
        ppnInputIdr: 346_500,
        totalIdr: 3_496_500,
        status: "paid",
        orderDate: "2026-11-05",
        paidDate: "2026-11-15",
        journalId: "jrn-008",
      },
      {
        id: "po-003",
        poNumber: "PO-2026-0003",
        vendorId: "vnd-004",
        vendorName: "PT Mitra Perangkat Kasir Indonesia",
        skuCode: "HW-PRN-80",
        description: "Restok 10 Unit Printer Thermal 80mm USB-OTG/Bluetooth",
        category: "hardware_inventory",
        qty: 10,
        unitCostIdr: 750_000,
        subtotalIdr: 7_500_000,
        ppnInputIdr: 825_000,
        totalIdr: 8_325_000,
        status: "ordered",
        orderDate: "2026-11-24",
        paidDate: null,
        journalId: null,
      },
    ],
    hardwareMovements: [
      { id: "hm-001", skuCode: "HW-PRN-80", skuName: "Printer Thermal 80mm USB-OTG/Bluetooth/WiFi", type: "out", qty: 5, reference: "PUB-INV-2026-0003", note: "Bundling dikirim ke Klinik Medika Sehat Grup", date: "2026-10-20" },
      { id: "hm-002", skuCode: "HW-EDC-POS", skuName: "Terminal Android POS + EDC Thermal Built-In", type: "in", qty: 12, reference: "OPENING-INV", note: "Stok awal gudang pusat Surabaya", date: "2026-09-01" },
    ],
    journals,
  };
}

export function loadPublisherState(): PublisherEmsState {
  if (typeof window === "undefined") return buildInitialPublisherState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialPublisherState();
    const parsed = JSON.parse(raw) as PublisherEmsState;
    if (!parsed.profile || !Array.isArray(parsed.licenses) || !Array.isArray(parsed.journals)) {
      return buildInitialPublisherState();
    }
    return parsed;
  } catch {
    return buildInitialPublisherState();
  }
}

export function savePublisherState(state: PublisherEmsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export function resetPublisherState(): PublisherEmsState {
  const fresh = buildInitialPublisherState();
  savePublisherState(fresh);
  return fresh;
}

/**
 * Issue a brand new cryptographically signed license key and attach audit trail.
 */
export function issueLicenseInState(
  state: PublisherEmsState,
  input: {
    tenantId: string;
    editionId: EditionId;
    billingCycle: BillingCycle;
    maxSeats: number;
    expiryYear: number;
    expiryMonth: number;
    domain?: string;
    notes?: string;
    actor?: string;
  },
): { state: PublisherEmsState; license: LicenseRecord } {
  const tenant = state.tenants.find((t) => t.id === input.tenantId);
  if (!tenant) throw new Error("Tenant tidak ditemukan di Master Data.");

  const spec = PUBLISHER_EDITIONS[input.editionId];
  const licenseKey = issueSignedLicenseKey({
    editionId: input.editionId,
    expiryYear: input.expiryYear,
    expiryMonth: input.expiryMonth,
    maxSeats: input.maxSeats,
  });
  const expiryDate = new Date(Date.UTC(input.expiryYear, input.expiryMonth, 0))
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const license: LicenseRecord = {
    id: uid("lic"),
    licenseKey,
    tenantId: tenant.id,
    tenantName: tenant.companyName,
    domain: input.domain?.trim() || tenant.domain,
    editionId: input.editionId,
    billingCycle: input.billingCycle,
    status: input.billingCycle === "trial" ? "trial" : "active",
    maxSeats: input.maxSeats,
    usedSeats: 1,
    maxAiAgents: spec.maxAiAgents,
    maxBranches: spec.maxBranches,
    monthlyValueIdr: spec.monthlyPriceIdr,
    issuedAt: today,
    expiresAt: expiryDate,
    lastHeartbeatAt: new Date().toISOString(),
    entitlements: spec.entitlements,
    notes: input.notes?.trim() || `Diterbitkan untuk ${tenant.companyName}`,
  };

  const log = {
    id: uid("log"),
    timestamp: new Date().toISOString(),
    licenseKey,
    tenantName: tenant.companyName,
    action: "issued" as const,
    actor: input.actor || "Super Admin",
    detail: `Lisensi ${spec.name} (${input.maxSeats >= 9999 ? "Unlimited" : input.maxSeats} kursi) berlaku s/d ${expiryDate}.`,
  };

  return {
    license,
    state: {
      ...state,
      licenses: [license, ...state.licenses],
      licenseLogs: [log, ...state.licenseLogs],
    },
  };
}

/**
 * Update license status, renew expiry (+12 months), or upgrade edition (re-signs key).
 */
export function mutateLicenseInState(
  state: PublisherEmsState,
  licenseId: string,
  action: "renew_12m" | "suspend" | "reactivate" | "revoke" | "upgrade",
  upgradeEdition?: EditionId,
): PublisherEmsState {
  const existing = state.licenses.find((l) => l.id === licenseId);
  if (!existing) return state;

  let nextLic: LicenseRecord = { ...existing };
  let logAction: PublisherEmsState["licenseLogs"][number]["action"] = "renewed";
  let detail = "";

  if (action === "renew_12m") {
    const baseYear = Number.parseInt(existing.expiresAt.slice(0, 4), 10) || 2026;
    const baseMonth = Number.parseInt(existing.expiresAt.slice(5, 7), 10) || 11;
    const nextYear = baseYear + 1;
    const newKey = issueSignedLicenseKey({
      editionId: existing.editionId,
      expiryYear: nextYear,
      expiryMonth: baseMonth,
      maxSeats: existing.maxSeats,
    });
    const newExpiry = new Date(Date.UTC(nextYear, baseMonth, 0)).toISOString().slice(0, 10);
    nextLic = { ...existing, licenseKey: newKey, expiresAt: newExpiry, status: "active" };
    logAction = "renewed";
    detail = `Perpanjangan 12 bulan hingga ${newExpiry}. Key diperbarui.`;
  } else if (action === "upgrade" && upgradeEdition) {
    const spec = PUBLISHER_EDITIONS[upgradeEdition];
    const expYear = Number.parseInt(existing.expiresAt.slice(0, 4), 10) || 2027;
    const expMonth = Number.parseInt(existing.expiresAt.slice(5, 7), 10) || 12;
    const newSeats = Math.max(existing.maxSeats, spec.defaultSeats);
    const newKey = issueSignedLicenseKey({
      editionId: upgradeEdition,
      expiryYear: expYear,
      expiryMonth: expMonth,
      maxSeats: newSeats,
    });
    nextLic = {
      ...existing,
      licenseKey: newKey,
      editionId: upgradeEdition,
      maxSeats: newSeats,
      maxAiAgents: spec.maxAiAgents,
      maxBranches: spec.maxBranches,
      monthlyValueIdr: spec.monthlyPriceIdr,
      entitlements: spec.entitlements,
      status: "active",
    };
    logAction = "upgraded";
    detail = `Upgrade edisi ke ${spec.name} (${newSeats >= 9999 ? "Unlimited" : newSeats} kursi).`;
  } else if (action === "suspend") {
    nextLic.status = "suspended";
    logAction = "suspended";
    detail = "Lisensi ditangguhkan sementara oleh Super Admin.";
  } else if (action === "reactivate") {
    nextLic.status = "active";
    logAction = "reactivated";
    detail = "Lisensi diaktifkan kembali.";
  } else if (action === "revoke") {
    nextLic.status = "revoked";
    logAction = "revoked";
    detail = "Lisensi dicabut permanen.";
  }

  return {
    ...state,
    licenses: state.licenses.map((l) => (l.id === licenseId ? nextLic : l)),
    licenseLogs: [
      {
        id: uid("log"),
        timestamp: new Date().toISOString(),
        licenseKey: nextLic.licenseKey,
        tenantName: nextLic.tenantName,
        action: logAction,
        actor: "Super Admin",
        detail,
      },
      ...state.licenseLogs,
    ],
  };
}

/**
 * Mark a Subscription Invoice PAID → Posts balanced double-entry PSAK journal
 * (Dr Bank, Cr Deferred Revenue / Recognized Revenue + PPN Keluaran + Reseller Commission Accrual)
 * and automatically activates any grace_period/trial license linked to the invoice!
 */
export function markInvoicePaidInState(
  state: PublisherEmsState,
  invoiceId: string,
): PublisherEmsState {
  const inv = state.invoices.find((i) => i.id === invoiceId);
  if (!inv || inv.status === "paid") return state;

  const today = new Date().toISOString().slice(0, 10);
  const revenueCreditAccount = inv.periodMonths >= 3 ? "2201" : "4101";
  const revenueMemo =
    inv.periodMonths >= 3
      ? `Deferred SaaS Revenue (${inv.periodMonths} bln) — ${inv.tenantName}`
      : `Pendapatan Lisensi Bulanan — ${inv.tenantName}`;

  const rawLines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }> = [
    { accountCode: "1101", debit: inv.totalIdr, credit: 0, memo: `Pelunasan ${inv.invoiceNumber}` },
    { accountCode: revenueCreditAccount, debit: 0, credit: inv.subtotalIdr, memo: revenueMemo },
  ];
  if (inv.ppnAmountIdr > 0) {
    rawLines.push({
      accountCode: "2103",
      debit: 0,
      credit: inv.ppnAmountIdr,
      memo: `PPN Keluaran ${(inv.ppnRate * 100).toFixed(0)}%`,
    });
  }
  if (inv.resellerCommissionIdr > 0) {
    rawLines.push(
      {
        accountCode: "6102",
        debit: inv.resellerCommissionIdr,
        credit: 0,
        memo: `Komisi Reseller untuk ${inv.invoiceNumber}`,
      },
      {
        accountCode: "2102",
        debit: 0,
        credit: inv.resellerCommissionIdr,
        memo: "Hutang Komisi Reseller",
      },
    );
  }

  const journal = buildJournalEntry({
    id: uid("jrn"),
    journalNumber: nextSeq("JRN", state.journals.length),
    date: today,
    reference: inv.invoiceNumber,
    description: `Pembayaran Invoice ${inv.invoiceNumber} — ${inv.tenantName}`,
    sourceModule: "billing",
    postedBy: "Billing Auto-Poster",
    coa: state.coa,
    rawLines,
  });

  const nextInvoices = state.invoices.map((i) =>
    i.id === invoiceId
      ? { ...i, status: "paid" as const, paidDate: today, journalId: journal.id }
      : i,
  );

  const nextLicenses = inv.licenseId
    ? state.licenses.map((l) =>
        l.id === inv.licenseId ? { ...l, status: "active" as LicenseStatus } : l,
      )
    : state.licenses;

  const nextResellers = inv.resellerId
    ? state.resellers.map((r) =>
        r.id === inv.resellerId
          ? {
              ...r,
              totalCommissionEarnedIdr: r.totalCommissionEarnedIdr + inv.resellerCommissionIdr,
            }
          : r,
      )
    : state.resellers;

  const nextTenants = state.tenants.map((t) =>
    t.id === inv.tenantId ? { ...t, status: "active" as const, healthScore: Math.max(t.healthScore, 92) } : t,
  );

  return {
    ...state,
    invoices: nextInvoices,
    licenses: nextLicenses,
    resellers: nextResellers,
    tenants: nextTenants,
    journals: [journal, ...state.journals],
  };
}

/**
 * End-to-End Publisher Enterprise Flow:
 * Convert a B2B CRM Deal to Closed Won → Create Tenant Customer (Master Data) →
 * Issue Signed License Key (LMS) → Generate & Pay Subscription Invoice (ERP) →
 * Post Balanced PSAK Double-Entry Accounting Journal (Accounting)!
 */
export function convertDealToClosedWonInState(
  state: PublisherEmsState,
  dealId: string,
): { state: PublisherEmsState; license: LicenseRecord; invoice: SubscriptionInvoiceRecord } {
  const deal = state.deals.find((d) => d.id === dealId);
  if (!deal) throw new Error("Deal CRM tidak ditemukan.");

  const today = new Date().toISOString().slice(0, 10);
  const existingTenant = state.tenants.find(
    (t) => t.companyName.toLowerCase() === deal.companyName.toLowerCase(),
  );

  let workingState = state;
  let tenant: TenantCustomerRecord;

  if (existingTenant) {
    tenant = existingTenant;
  } else {
    tenant = {
      id: uid("ten"),
      code: `CUST-${String(state.tenants.length + 1).padStart(3, "0")}`,
      companyName: deal.companyName,
      npwp: "-",
      industry: deal.industry,
      picName: deal.contactName,
      picEmail: deal.contactEmail,
      picWhatsapp: deal.contactWhatsapp,
      domain: `${deal.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16)}.wacrm.app`,
      city: "Indonesia",
      resellerId: deal.resellerId,
      status: "active",
      monthlyCloudCogsIdr: deal.targetEdition === "sovereign" ? 680_000 : 280_000,
      monthlyAiTokenCostIdr: deal.targetEdition === "sovereign" ? 420_000 : 190_000,
      healthScore: 96,
      createdAt: today,
    };
    workingState = {
      ...workingState,
      tenants: [tenant, ...workingState.tenants],
    };
  }

  const now = new Date();
  const expiryYear = deal.billingCycle === "annual" ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const expiryMonth =
    deal.billingCycle === "annual"
      ? now.getUTCMonth() + 1
      : ((now.getUTCMonth() + 1) % 12) + 1;

  const issued = issueLicenseInState(workingState, {
    tenantId: tenant.id,
    editionId: deal.targetEdition,
    billingCycle: deal.billingCycle,
    maxSeats: deal.requestedSeats,
    expiryYear: expiryMonth === 1 && deal.billingCycle !== "annual" ? expiryYear + 1 : expiryYear,
    expiryMonth,
    notes: `Diterbitkan otomatis dari CRM Deal ${deal.code}`,
    actor: "CRM → LMS Auto-Provisioner",
  });
  workingState = issued.state;

  const reseller = deal.resellerId
    ? workingState.resellers.find((r) => r.id === deal.resellerId)
    : null;
  const ppnRate = workingState.profile.defaultPpnRate;
  const subtotal = Math.round(deal.dealValueIdr);
  const ppnAmount = Math.round(subtotal * ppnRate);
  const resellerComm = reseller ? Math.round(subtotal * reseller.commissionRate) : 0;

  const invoice: SubscriptionInvoiceRecord = {
    id: uid("inv"),
    invoiceNumber: nextSeq(workingState.profile.invoicePrefix, workingState.invoices.length),
    tenantId: tenant.id,
    tenantName: tenant.companyName,
    licenseId: issued.license.id,
    skuCode:
      deal.targetEdition === "sovereign"
        ? "LIC-SOV-Y"
        : deal.targetEdition === "enterprise"
          ? deal.billingCycle === "annual"
            ? "LIC-ENT-Y"
            : "LIC-ENT-M"
          : "LIC-PRO-Y",
    description: `Konversi Deal ${deal.code} — Lisensi ${PUBLISHER_EDITIONS[deal.targetEdition].name} (${deal.billingCycle})`,
    billingCycle: deal.billingCycle,
    periodMonths: deal.billingCycle === "annual" ? 12 : 1,
    subtotalIdr: subtotal,
    ppnRate,
    ppnAmountIdr: ppnAmount,
    totalIdr: subtotal + ppnAmount,
    resellerId: deal.resellerId,
    resellerCommissionIdr: resellerComm,
    status: "issued",
    issuedDate: today,
    dueDate: today,
    paidDate: null,
    journalId: null,
  };

  workingState = {
    ...workingState,
    invoices: [invoice, ...workingState.invoices],
    deals: workingState.deals.map((d) =>
      d.id === dealId
        ? {
            ...d,
            stage: "closed_won" as const,
            probability: 100,
            convertedLicenseId: issued.license.id,
          }
        : d,
    ),
  };

  workingState = markInvoicePaidInState(workingState, invoice.id);
  const paidInvoice = workingState.invoices.find((i) => i.id === invoice.id) || invoice;

  return {
    state: workingState,
    license: issued.license,
    invoice: paidInvoice,
  };
}

/**
 * Monthly Deferred SaaS Revenue Recognition (PSAK 72):
 * Dr 2201 Pendapatan Ditangguhkan / Cr 4101 Pendapatan Lisensi SaaS Diakui.
 */
export function runMonthlyRevenueRecognitionInState(
  state: PublisherEmsState,
  amountIdr: number,
  periodLabel: string,
): PublisherEmsState {
  const bs = computeBalanceSheet(state.coa, state.journals);
  const safeAmount = Math.min(Math.round(amountIdr), Math.max(0, bs.deferredRevenueBalance));
  if (safeAmount <= 0) {
    throw new Error("Saldo Pendapatan Ditangguhkan (2201) tidak mencukupi untuk diamortisasi.");
  }

  const journal = buildJournalEntry({
    id: uid("jrn"),
    journalNumber: nextSeq("JRN", state.journals.length),
    date: new Date().toISOString().slice(0, 10),
    reference: `REV-REC-${periodLabel.replace(/\s+/g, "-").toUpperCase()}`,
    description: `Pengakuan Pendapatan Lisensi SaaS PSAK 72 — ${periodLabel}`,
    sourceModule: "revenue_recognition",
    postedBy: "Finance Controller",
    coa: state.coa,
    rawLines: [
      { accountCode: "2201", debit: safeAmount, credit: 0, memo: `Amortisasi Deferred Revenue ${periodLabel}` },
      { accountCode: "4101", debit: 0, credit: safeAmount, memo: `Pengakuan Pendapatan Lisensi ${periodLabel}` },
    ],
  });

  return {
    ...state,
    journals: [journal, ...state.journals],
  };
}

/**
 * Mark Vendor PO Paid → Updates Hardware Inventory (if hardware PO) & Posts Double-Entry Journal.
 */
export function payVendorPoInState(state: PublisherEmsState, poId: string): PublisherEmsState {
  const po = state.purchaseOrders.find((p) => p.id === poId);
  if (!po || po.status === "paid") return state;

  const today = new Date().toISOString().slice(0, 10);
  const debitAcc =
    po.category === "cloud_cogs"
      ? "5101"
      : po.category === "ai_api_cogs"
        ? "5102"
        : po.category === "hardware_inventory"
          ? "1301"
          : "6104";

  const rawLines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }> = [
    { accountCode: debitAcc, debit: po.subtotalIdr, credit: 0, memo: po.description },
  ];
  if (po.ppnInputIdr > 0) {
    rawLines.push({ accountCode: "1401", debit: po.ppnInputIdr, credit: 0, memo: "PPN Masukan 11%" });
  }
  rawLines.push({
    accountCode: "1101",
    debit: 0,
    credit: po.totalIdr,
    memo: `Pembayaran PO ${po.poNumber} ke ${po.vendorName}`,
  });

  const journal = buildJournalEntry({
    id: uid("jrn"),
    journalNumber: nextSeq("JRN", state.journals.length),
    date: today,
    reference: po.poNumber,
    description: `Pembayaran PO Vendor ${po.poNumber} — ${po.vendorName}`,
    sourceModule: "procurement",
    postedBy: "ERP Procurement",
    coa: state.coa,
    rawLines,
  });

  const nextSkus =
    po.category === "hardware_inventory" && po.skuCode
      ? state.skus.map((s) => (s.sku === po.skuCode ? { ...s, stockQty: s.stockQty + po.qty } : s))
      : state.skus;

  const nextMovements =
    po.category === "hardware_inventory" && po.skuCode
      ? [
          {
            id: uid("hm"),
            skuCode: po.skuCode,
            skuName: state.skus.find((s) => s.sku === po.skuCode)?.name || po.skuCode,
            type: "in" as const,
            qty: po.qty,
            reference: po.poNumber,
            note: `Penerimaan stok dari ${po.vendorName}`,
            date: today,
          },
          ...state.hardwareMovements,
        ]
      : state.hardwareMovements;

  return {
    ...state,
    purchaseOrders: state.purchaseOrders.map((p) =>
      p.id === poId ? { ...p, status: "paid" as const, paidDate: today, journalId: journal.id } : p,
    ),
    skus: nextSkus,
    hardwareMovements: nextMovements,
    journals: [journal, ...state.journals],
  };
}

export interface PublisherOverviewMetrics {
  mrrIdr: number;
  arrIdr: number;
  activeLicenses: number;
  paidLicenses: number;
  trialLicenses: number;
  graceOrSuspendedLicenses: number;
  openPipelineValueIdr: number;
  weightedPipelineIdr: number;
  unpaidArIdr: number;
  cashBalanceIdr: number;
  deferredRevenueIdr: number;
  recognizedRevenueIdr: number;
  grossMarginPct: number;
  netProfitIdr: number;
  ledgerBalanced: boolean;
  balanceSheetBalanced: boolean;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export function computePublisherOverview(state: PublisherEmsState): PublisherOverviewMetrics {
  const activePaid = state.licenses.filter(
    (l) => (l.status === "active" || l.status === "grace_period") && l.monthlyValueIdr > 0,
  );
  const mrrIdr = activePaid.reduce((s, l) => s + l.monthlyValueIdr, 0);
  const arrIdr = mrrIdr * 12;

  const openDeals = state.deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
  );
  const openPipelineValueIdr = openDeals.reduce((s, d) => s + d.dealValueIdr, 0);
  const weightedPipelineIdr = Math.round(
    openDeals.reduce((s, d) => s + (d.dealValueIdr * d.probability) / 100, 0),
  );

  const unpaidArIdr = state.invoices
    .filter((i) => i.status === "issued" || i.status === "overdue")
    .reduce((s, i) => s + i.totalIdr, 0);

  const tb = computeTrialBalance(state.coa, state.journals);
  const pl = computeIncomeStatement(state.coa, state.journals);
  const bs = computeBalanceSheet(state.coa, state.journals);

  const graceCount = state.licenses.filter(
    (l) => l.status === "grace_period" || l.status === "suspended" || l.status === "expired",
  ).length;
  const trialCount = state.licenses.filter((l) => l.status === "trial").length;
  const openTickets = state.tickets.filter((t) => t.status !== "resolved").length;

  const strengths = [
    `Saldo Kas & Bank Penerbit kuat (${(bs.cashAndBankBalance / 1_000_000).toFixed(1)} Juta) dengan Neraca & Buku Besar 100% seimbang (PSAK 72).`,
    `Gross Margin SaaS mencapai ${pl.grossMarginPct}% berkat efisiensi klaster Neon DB & model multi-tier Sovereign/Enterprise.`,
    `Pendapatan Ditangguhkan (Deferred Revenue) Rp ${(bs.deferredRevenueBalance / 1_000_000).toFixed(1)} Juta menjamin visibilitas arus kas 12 bulan ke depan.`,
  ];

  const weaknesses: string[] = [];
  if (graceCount > 0) {
    weaknesses.push(
      `${graceCount} lisensi berada di status masa tenggang/ditangguhkan — perlu penagihan AR Rp ${(unpaidArIdr / 1_000).toFixed(0)}rb.`,
    );
  }
  if (openTickets > 0) {
    weaknesses.push(`${openTickets} tiket Support SLA Enterprise masih terbuka dan butuh penyelesaian cepat.`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push("Tidak ada tunggakan lisensi kritis; terus pantau utilisasi kursi & token AI per tenant.");
  }

  const opportunities = [
    `Pipeline B2B CRM aktif senilai Rp ${(openPipelineValueIdr / 1_000_000).toFixed(1)} Juta (terbobot Rp ${(weightedPipelineIdr / 1_000_000).toFixed(1)} Juta) siap dikonversi ke lisensi tahunan.`,
    `${trialCount} tenant Starter/Trial berpotensi di-upsell ke Growth Pro + bundling printer thermal USB-OTG.`,
    `Kanal Reseller aktif (${state.resellers.filter((r) => r.status === "active").length} partner) dapat mempercepat akuisisi tanpa menaikkan biaya gaji tetap.`,
  ];

  const threats = [
    "Kenaikan biaya API LLM AI pada tenant volume tinggi bila batas kuota token tidak dipantau per edisi.",
    "Risiko keterlambatan pelaporan Faktur Pajak PPN 11% dan rekonsiliasi komisi reseller jika tidak diautomatisasi.",
  ];

  return {
    mrrIdr,
    arrIdr,
    activeLicenses: state.licenses.filter((l) => l.status === "active").length,
    paidLicenses: activePaid.length,
    trialLicenses: trialCount,
    graceOrSuspendedLicenses: graceCount,
    openPipelineValueIdr,
    weightedPipelineIdr,
    unpaidArIdr,
    cashBalanceIdr: bs.cashAndBankBalance,
    deferredRevenueIdr: bs.deferredRevenueBalance,
    recognizedRevenueIdr: pl.totalRevenue,
    grossMarginPct: pl.grossMarginPct,
    netProfitIdr: pl.netProfit,
    ledgerBalanced: tb.balanced,
    balanceSheetBalanced: bs.balanced,
    strengths,
    weaknesses,
    opportunities,
    threats,
  };
}
