export type ChannelType = "whatsapp" | "facebook_messenger" | "instagram" | "tiktok" | "youtube";
export type ConversationStatus = "open" | "pending" | "resolved" | "archived";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type LifecycleStage = "lead" | "prospect" | "customer" | "vip" | "inactive";
export type MemberRole = "owner" | "admin" | "supervisor" | "agent" | "viewer";
export type ChannelStatus = "pending" | "connected" | "needs_reauth" | "disabled" | "error";
export type DeliveryStatus = "received" | "queued" | "sent" | "delivered" | "read" | "failed";
export type TemplateStatus = "draft" | "pending_approval" | "approved" | "rejected" | "archived";
export type TemplateCategory = "utility" | "marketing" | "authentication" | "service";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  status?: string;
  createdAt?: string;
  stats?: {
    openConversations: number;
    totalContacts: number;
    connectedChannels: number;
    membersCount: number;
  };
}

export interface ContactRecord {
  id: string;
  displayName: string;
  phoneE164: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  tags: string[];
  lifecycleStage: LifecycleStage;
  createdAt: string;
  updatedAt: string;
  channels?: ChannelType[];
}

export interface ChannelRecord {
  id: string;
  channel: ChannelType;
  displayName: string;
  externalAccountId: string;
  externalBusinessId: string | null;
  status: ChannelStatus;
  scopes: string[];
  tokenExpiresAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationNoteRecord {
  id: string;
  conversationId: string;
  authorUserId: string | null;
  authorName: string;
  bodyText: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  channel: ChannelType;
  externalMessageId: string | null;
  direction: "inbound" | "outbound" | "system";
  messageType: string;
  bodyText: string | null;
  deliveryStatus: DeliveryStatus;
  providerTimestamp: string | null;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  connectionId: string;
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail?: string | null;
  contactCompany?: string | null;
  contactStage?: LifecycleStage;
  channel: ChannelType;
  channelDisplayName: string;
  externalConversationId: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  subject: string | null;
  tags: string[];
  unreadCount: number;
  assignedUserId: string | null;
  assignedUserName?: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  lastInboundAt?: string | null;
  withinServiceWindow?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyRecord {
  id: string;
  shortcut: string;
  title: string;
  bodyText: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateRecord {
  id: string;
  channel: ChannelType;
  name: string;
  category: TemplateCategory;
  language: string;
  bodyText: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberRecord {
  id: string;
  userId: string;
  displayName: string;
  role: MemberRole;
  status: "invited" | "active" | "suspended";
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceAnalytics {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  totalContacts: number;
  totalMessages: number;
  messagesLast24h: number;
  connectedChannels: number;
  byChannel: Array<{ channel: ChannelType; count: number }>;
  byStage: Array<{ stage: LifecycleStage; count: number }>;
  recentAuditLogs: AuditLogRecord[];
}

export const CHANNEL_META: Record<
  ChannelType,
  { label: string; shortLabel: string; color: string; bgClass: string; textClass: string; badgeClass: string }
> = {
  whatsapp: {
    label: "WhatsApp Business",
    shortLabel: "WhatsApp",
    color: "#16a34a",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  facebook_messenger: {
    label: "Facebook Messenger",
    shortLabel: "Messenger",
    color: "#2563eb",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  instagram: {
    label: "Instagram DM",
    shortLabel: "Instagram",
    color: "#db2777",
    bgClass: "bg-pink-50",
    textClass: "text-pink-700",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
  },
  tiktok: {
    label: "TikTok Business",
    shortLabel: "TikTok",
    color: "#0f172a",
    bgClass: "bg-slate-100",
    textClass: "text-slate-800",
    badgeClass: "bg-slate-200 text-slate-900 border-slate-300",
  },
  youtube: {
    label: "YouTube Komentar",
    shortLabel: "YouTube",
    color: "#dc2626",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
};

export const LIFECYCLE_LABELS: Record<LifecycleStage, { label: string; badgeClass: string }> = {
  lead: { label: "Prospek Baru", badgeClass: "bg-sky-100 text-sky-800" },
  prospect: { label: "Tertarik", badgeClass: "bg-amber-100 text-amber-800" },
  customer: { label: "Pelanggan", badgeClass: "bg-emerald-100 text-emerald-800" },
  vip: { label: "VIP", badgeClass: "bg-purple-100 text-purple-800" },
  inactive: { label: "Tidak Aktif", badgeClass: "bg-slate-100 text-slate-600" },
};

export const STATUS_LABELS: Record<ConversationStatus, { label: string; badgeClass: string }> = {
  open: { label: "Terbuka", badgeClass: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Menunggu", badgeClass: "bg-amber-100 text-amber-800" },
  resolved: { label: "Selesai", badgeClass: "bg-slate-100 text-slate-700" },
  archived: { label: "Diarsipkan", badgeClass: "bg-zinc-100 text-zinc-500" },
};

export const PRIORITY_LABELS: Record<ConversationPriority, { label: string; badgeClass: string }> = {
  low: { label: "Rendah", badgeClass: "bg-slate-100 text-slate-600" },
  normal: { label: "Normal", badgeClass: "bg-blue-50 text-blue-700" },
  high: { label: "Tinggi", badgeClass: "bg-orange-100 text-orange-800" },
  urgent: { label: "Mendesak", badgeClass: "bg-red-100 text-red-800" },
};

// =============================================================================
// Multi-Agent AI Swarm, POS + Invoice + QR, ERP Inventory & Double-Entry Accounting
// =============================================================================

export type AiAgentKey =
  | "cs_sales"
  | "order_pos"
  | "knowledge_learner"
  | "fraud_sentinel"
  | "system_guardian"
  | "companion_guide"
  | "followup_hunter"
  | "procurement_forecast"
  | "seo_growth";

// =============================================================================
// Multi-Edition Versioning, Universal Printing, SEO AI & Super Admin Telemetry
// =============================================================================

export type AppEditionId = "starter" | "pro" | "enterprise" | "sovereign";
export type SubscriptionStatus = "active" | "trial" | "past_due" | "suspended";

export type PrinterPaperProfile = "a4" | "thermal58" | "thermal80" | "label100" | "edc";
export type PrinterTransportMode =
  | "usb_otg"
  | "usb_serial_edc"
  | "bluetooth"
  | "wifi_airprint"
  | "pdf_share";

export interface ProductSeoAudit {
  productId: string;
  sku: string;
  productName: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  issues: string[];
  strengths: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
}

export interface OmnichannelSeoPack {
  productId: string;
  sku: string;
  productName: string;
  generatedAt: string;
  audit: ProductSeoAudit;
  google: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
    keywords: string[];
    jsonLd: string;
  };
  whatsapp: {
    catalogTitle: string;
    broadcastCopy: string;
    ctaLine: string;
  };
  instagram: {
    hook: string;
    caption: string;
    hashtags: string[];
  };
  tiktok: {
    videoHook: string;
    seoCaption: string;
    searchTags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
  facebook: {
    marketplaceTitle: string;
    postCopy: string;
  };
}

export interface SuperAdminTenantRecord {
  tenantId: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  editionId: AppEditionId;
  subscriptionStatus: SubscriptionStatus;
  monthlyPriceIdr: number;
  activeAgents: number;
  totalContacts: number;
  totalConversations: number;
  connectedChannels: number;
  ordersCount: number;
  gmvIdr: number;
  healthScore: number;
  seoScore: number;
  aiAutoReplyRatePct: number;
  escalationCount: number;
  lowStockCount: number;
  ledgerBalanced: boolean;
  lastActiveAt: string;
  renewsAt: string;
  isCurrentWorkspace?: boolean;
  detectedIssues: string[];
}

export interface PlatformSwotInsight {
  id: string;
  type: "strength" | "weakness" | "opportunity";
  title: string;
  metric: string;
  detail: string;
  recommendedFix?: string;
}

export interface SuperAdminOverview {
  generatedAt: string;
  source: "neon" | "demo";
  summary: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    pastDueOrSuspended: number;
    totalUsersAgents: number;
    totalOrders: number;
    totalGmvIdr: number;
    mrrIdr: number;
    arrIdr: number;
    avgHealthScore: number;
    avgSeoScore: number;
    avgAiAutomationPct: number;
  };
  editionBreakdown: Array<{
    editionId: AppEditionId;
    label: string;
    count: number;
    mrrIdr: number;
  }>;
  tenants: SuperAdminTenantRecord[];
  strengths: PlatformSwotInsight[];
  weaknesses: PlatformSwotInsight[];
  opportunities: PlatformSwotInsight[];
}

export interface StoreBusinessProfile {
  businessName: string;
  businessTagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  taxId: string;
  invoiceFooter: string;
  defaultCourier: string;
}

export interface MasterCategoryRecord {
  id: string;
  name: string;
  description: string;
}

export interface MasterUnitRecord {
  id: string;
  code: string;
  name: string;
}

export interface MasterCourierRecord {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  baseRate: number;
  estimatedDays: string;
  isActive: boolean;
}

export interface MasterPaymentAccountRecord {
  id: string;
  method: PaymentMethod;
  providerName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
}

export type KnowledgeSourceType = "product" | "chat" | "order" | "sop" | "autonomous_learning";

export type SecurityIncidentCategory =
  | "fraud_order"
  | "price_anomaly"
  | "duplicate_invoice"
  | "stock_mismatch"
  | "ledger_imbalance"
  | "webhook_stall"
  | "auth_anomaly"
  | "system_health";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";
export type SecurityIncidentStatus = "open" | "mitigated" | "resolved" | "false_positive";

export interface AiAgentRecord {
  id: string;
  agentKey: AiAgentKey;
  name: string;
  roleDescription: string;
  enabled: boolean;
  autoReplyEnabled: boolean;
  autonomousLearning: boolean;
  autonomousHealing: boolean;
  confidenceThreshold: number;
  systemPrompt: string;
  actionsExecuted: number;
  lastRunAt: string | null;
}

export interface AiKnowledgeItemRecord {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string | null;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
  usageCount: number;
  autoGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiSecurityIncidentRecord {
  id: string;
  agentKey: "fraud_sentinel" | "system_guardian";
  category: SecurityIncidentCategory;
  severity: SecuritySeverity;
  riskScore: number;
  title: string;
  description: string;
  selfHealed: boolean;
  healingAction: string | null;
  status: SecurityIncidentStatus;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ErpProductRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ErpSupplierRecord {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface ErpStockMovementRecord {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  movementType: "in" | "out" | "adjustment" | "auto_restock";
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export type PaymentMethod = "qris" | "bank_transfer" | "cash" | "cod" | "credit";
export type PaymentStatus = "unpaid" | "paid" | "refunded" | "flagged";
export type OrderStatus = "draft" | "confirmed" | "packed" | "shipped" | "completed" | "cancelled";

export interface PosOrderItemRecord {
  id: string;
  productId: string | null;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
}

export interface PosOrderRecord {
  id: string;
  invoiceNumber: string;
  conversationId: string | null;
  contactId: string | null;
  customerName: string;
  customerPhone: string | null;
  shippingAddress: string;
  channel: ChannelType;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  qrPayload: string;
  aiGenerated: boolean;
  fraudRiskScore: number;
  shippingCourier?: string | null;
  trackingCode?: string | null;
  paidAt?: string | null;
  notes: string | null;
  items: PosOrderItemRecord[];
  createdAt: string;
  updatedAt: string;
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense" | "cogs";

export interface AccountingEntryRecord {
  id: string;
  entryNumber: string;
  entryDate: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debit: number;
  credit: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string;
  aiVerified: boolean;
  createdAt: string;
}

export interface FinancialReportSummary {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPct: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  cashBalance: number;
  inventoryValue: number;
  receivablesBalance: number;
}

export interface AiAutoReplyExecutionResult {
  replyMessage: MessageRecord;
  agentTrace: Array<{
    agentKey: AiAgentKey;
    agentName: string;
    action: string;
    status: "ok" | "warning" | "blocked" | "healed";
  }>;
  confidence: number;
  fraudRiskScore: number;
  detectedIntent?: string;
  escalationRequired?: boolean;
  escalationReason?: string | null;
  createdOrder: PosOrderRecord | null;
  learnedKnowledge: AiKnowledgeItemRecord | null;
  securityIncident: AiSecurityIncidentRecord | null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  qris: "QRIS Otomatis",
  bank_transfer: "Transfer Bank",
  cash: "Tunai / Kasir",
  cod: "COD (Bayar di Tempat)",
  credit: "Tempo / Invoice",
};

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

