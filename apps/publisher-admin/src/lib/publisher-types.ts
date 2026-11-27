export type EditionId = "starter" | "pro" | "enterprise" | "sovereign";

export type BillingCycle = "monthly" | "annual" | "perpetual" | "trial";

export type LicenseStatus = "active" | "trial" | "grace_period" | "suspended" | "expired" | "revoked";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "cogs" | "expense";

export type DealStage =
  | "lead"
  | "discovery"
  | "proposal"
  | "trial_poc"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type TicketPriority = "p1_critical" | "p2_high" | "p3_normal";
export type TicketStatus = "open" | "in_progress" | "waiting_client" | "resolved";

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "void";
export type PoStatus = "draft" | "ordered" | "received" | "paid";

export interface PublisherCompanyProfile {
  companyName: string;
  legalEntity: string;
  npwp: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  defaultPpnRate: number; // e.g. 0.11 (11%)
  defaultPph23Rate: number; // e.g. 0.02 (2%)
  invoicePrefix: string;
  licenseApiUrl: string;
}

export interface TenantCustomerRecord {
  id: string;
  code: string;
  companyName: string;
  npwp: string;
  industry: string;
  picName: string;
  picEmail: string;
  picWhatsapp: string;
  domain: string;
  city: string;
  resellerId: string | null;
  status: "active" | "onboarding" | "at_risk" | "churned";
  monthlyCloudCogsIdr: number;
  monthlyAiTokenCostIdr: number;
  healthScore: number;
  createdAt: string;
  trialEndsAt?: string;
  signupPlatform?: "web" | "android";
  syncedFromLive?: boolean;
}

export interface ProductSkuRecord {
  id: string;
  sku: string;
  name: string;
  category: "license" | "addon" | "hardware" | "service";
  editionId?: EditionId;
  billingCycle: BillingCycle | "one_time";
  unitPriceIdr: number;
  costPriceIdr: number;
  stockQty: number; // for hardware bundles
  minStock: number;
  isActive: boolean;
}

export interface ResellerPartnerRecord {
  id: string;
  code: string;
  name: string;
  tier: "silver" | "gold" | "platinum";
  picName: string;
  email: string;
  phone: string;
  city: string;
  commissionRate: number; // e.g. 0.15 = 15%
  activeTenantsCount: number;
  totalCommissionEarnedIdr: number;
  status: "active" | "paused";
}

export interface VendorRecord {
  id: string;
  code: string;
  name: string;
  category: "cloud_db" | "hosting" | "ai_llm" | "whatsapp_bsp" | "hardware" | "payment_gateway";
  contactEmail: string;
  npwp: string;
  paymentTerms: string;
  monthlyEstimateIdr: number;
  status: "active" | "inactive";
}

export interface PublisherEmployeeRecord {
  id: string;
  code: string;
  name: string;
  role: "super_admin" | "license_officer" | "sales_ae" | "customer_success" | "finance_controller" | "devops_support";
  department: string;
  email: string;
  monthlySalaryIdr: number;
  salesTargetMrrIdr: number;
  status: "active" | "leave";
}

export interface ChartOfAccountRecord {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: "debit" | "credit";
  category: string;
  isSystem: boolean;
}

export interface LicenseRecord {
  id: string;
  licenseKey: string;
  tenantId: string;
  tenantName: string;
  domain: string;
  editionId: EditionId;
  billingCycle: BillingCycle;
  status: LicenseStatus;
  maxSeats: number;
  usedSeats: number;
  maxAiAgents: number;
  maxBranches: number;
  monthlyValueIdr: number;
  issuedAt: string;
  expiresAt: string;
  lastHeartbeatAt: string;
  entitlements: string[];
  notes: string;
}

export interface LicenseAuditLogRecord {
  id: string;
  timestamp: string;
  licenseKey: string;
  tenantName: string;
  action: "issued" | "verified" | "renewed" | "upgraded" | "suspended" | "reactivated" | "revoked";
  actor: string;
  detail: string;
}

export interface CrmDealRecord {
  id: string;
  code: string;
  companyName: string;
  contactName: string;
  contactWhatsapp: string;
  contactEmail: string;
  industry: string;
  targetEdition: EditionId;
  billingCycle: BillingCycle;
  requestedSeats: number;
  dealValueIdr: number; // total contract value
  probability: number; // 0..100
  stage: DealStage;
  ownerEmployeeId: string;
  resellerId: string | null;
  expectedCloseDate: string;
  notes: string;
  convertedLicenseId?: string;
}

export interface SupportTicketRecord {
  id: string;
  code: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  category: "license" | "billing" | "technical" | "onboarding" | "custom_apk";
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  slaHours: number;
  createdAt: string;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  licenseId: string | null;
  skuCode: string;
  description: string;
  billingCycle: BillingCycle | "one_time";
  periodMonths: number;
  subtotalIdr: number;
  ppnRate: number;
  ppnAmountIdr: number;
  totalIdr: number;
  resellerId: string | null;
  resellerCommissionIdr: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  journalId: string | null;
}

export interface VendorPurchaseOrderRecord {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  skuCode: string | null;
  description: string;
  category: "cloud_cogs" | "ai_api_cogs" | "hardware_inventory" | "opex";
  qty: number;
  unitCostIdr: number;
  subtotalIdr: number;
  ppnInputIdr: number;
  totalIdr: number;
  status: PoStatus;
  orderDate: string;
  paidDate: string | null;
  journalId: string | null;
}

export interface HardwareMovementRecord {
  id: string;
  skuCode: string;
  skuName: string;
  type: "in" | "out";
  qty: number;
  reference: string;
  note: string;
  date: string;
}

export interface JournalLineRecord {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntryRecord {
  id: string;
  journalNumber: string;
  date: string;
  reference: string;
  description: string;
  sourceModule: "opening" | "billing" | "revenue_recognition" | "procurement" | "payroll" | "manual";
  lines: JournalLineRecord[];
  totalDebit: number;
  totalCredit: number;
  postedBy: string;
}

export interface PublisherEmsState {
  profile: PublisherCompanyProfile;
  tenants: TenantCustomerRecord[];
  skus: ProductSkuRecord[];
  resellers: ResellerPartnerRecord[];
  vendors: VendorRecord[];
  employees: PublisherEmployeeRecord[];
  coa: ChartOfAccountRecord[];
  licenses: LicenseRecord[];
  licenseLogs: LicenseAuditLogRecord[];
  deals: CrmDealRecord[];
  tickets: SupportTicketRecord[];
  invoices: SubscriptionInvoiceRecord[];
  purchaseOrders: VendorPurchaseOrderRecord[];
  hardwareMovements: HardwareMovementRecord[];
  journals: JournalEntryRecord[];
}

export function formatIdr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const prefix = safe < 0 ? "-Rp " : "Rp ";
  return `${prefix}${Math.abs(safe).toLocaleString("id-ID")}`;
}
