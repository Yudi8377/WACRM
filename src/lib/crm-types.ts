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
