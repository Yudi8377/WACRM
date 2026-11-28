import { loadLocalMasterData, loadProductImages, saveProductImage } from "@/lib/store-profile";
import type {
  AccountingEntryRecord,
  AiAgentKey,
  AiAgentRecord,
  AiAutoReplyExecutionResult,
  AiKnowledgeItemRecord,
  AiSecurityIncidentRecord,
  ChannelRecord,
  ChannelStatus,
  ChannelType,
  ContactRecord,
  ConversationNoteRecord,
  ConversationPriority,
  ConversationRecord,
  ConversationStatus,
  ErpProductRecord,
  ErpStockMovementRecord,
  ErpSupplierRecord,
  FinancialReportSummary,
  KnowledgeSourceType,
  LifecycleStage,
  MemberRole,
  MessageRecord,
  MessageTemplateRecord,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PosOrderRecord,
  QuickReplyRecord,
  TeamMemberRecord,
  TemplateCategory,
  TemplateStatus,
  WorkspaceAnalytics,
} from "@/lib/crm-types";

export interface WorkspaceSnapshot {
  workspaceName: string;
  workspaceSlug: string;
  currentRole: MemberRole;
  conversations: ConversationRecord[];
  contacts: ContactRecord[];
  channels: ChannelRecord[];
  quickReplies: QuickReplyRecord[];
  templates: MessageTemplateRecord[];
  members: TeamMemberRecord[];
  analytics: WorkspaceAnalytics;
  aiAgents: AiAgentRecord[];
  aiKnowledge: AiKnowledgeItemRecord[];
  aiIncidents: AiSecurityIncidentRecord[];
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  stockMovements: ErpStockMovementRecord[];
  orders: PosOrderRecord[];
  accountingEntries: AccountingEntryRecord[];
  financialReport: FinancialReportSummary;
  syncedAt: string;
}

export interface ConversationDetailPayload {
  conversation: ConversationRecord;
  messages: MessageRecord[];
  notes: ConversationNoteRecord[];
}

export interface WorkspaceAdapter {
  mode: "neon" | "demo";
  tenantId: string;
  loadAll(): Promise<WorkspaceSnapshot>;
  loadConversationDetail(conversationId: string): Promise<ConversationDetailPayload>;

  createContact(input: {
    displayName: string;
    phoneE164?: string;
    email?: string;
    company?: string;
    notes?: string;
    tags?: string[];
    lifecycleStage?: LifecycleStage;
  }): Promise<ContactRecord>;
  updateContact(
    contactId: string,
    input: Partial<{
      displayName: string;
      phoneE164: string | null;
      email: string | null;
      company: string | null;
      notes: string | null;
      tags: string[];
      lifecycleStage: LifecycleStage;
    }>,
  ): Promise<ContactRecord>;
  deleteContact(contactId: string): Promise<void>;

  createConversation(input: {
    contactId: string;
    connectionId?: string;
    channel: ChannelType;
    subject?: string;
    priority?: ConversationPriority;
    tags?: string[];
    initialMessage?: string;
    initialDirection?: "inbound" | "outbound" | "system";
  }): Promise<{ id: string }>;
  updateConversation(
    conversationId: string,
    input: Partial<{
      status: ConversationStatus;
      priority: ConversationPriority;
      subject: string | null;
      tags: string[];
      assignedUserId: string | null;
      markRead: boolean;
    }>,
  ): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;

  sendMessage(conversationId: string, text: string): Promise<{ messageId: string; status: string; note?: string }>;
  addNote(conversationId: string, bodyText: string): Promise<ConversationNoteRecord>;
  deleteNote(conversationId: string, noteId: string): Promise<void>;

  // Multi-Agent AI Swarm
  runAiAutoReply(conversationId: string, simulatedInboundText?: string): Promise<AiAutoReplyExecutionResult>;
  runAiProactiveFollowUp?(
    conversationId: string,
    attemptNumber: 1 | 2,
  ): Promise<AiAutoReplyExecutionResult>;
  updateAiAgent(
    agentKey: AiAgentKey,
    patch: Partial<{
      enabled: boolean;
      autoReplyEnabled: boolean;
      autonomousLearning: boolean;
      autonomousHealing: boolean;
      confidenceThreshold: number;
      systemPrompt: string;
    }>,
  ): Promise<AiAgentRecord>;
  runAiKnowledgeSync(): Promise<{ syncedCount: number }>;
  addAiKnowledge(input: {
    sourceType?: KnowledgeSourceType;
    title: string;
    content: string;
    tags?: string[];
  }): Promise<AiKnowledgeItemRecord>;
  deleteAiKnowledge(knowledgeId: string): Promise<void>;
  runAiGuardianScan(): Promise<{ healthScore: number; incidents: AiSecurityIncidentRecord[] }>;
  resolveIncident(incidentId: string): Promise<void>;

  // ERP Inventory & Suppliers
  createProduct(input: {
    sku: string;
    name: string;
    category: string;
    description?: string;
    unit?: string;
    unitPrice: number;
    costPrice?: number;
    stockQty: number;
    minStock?: number;
    imageUrl?: string | null;
    weightGrams?: number;
  }): Promise<ErpProductRecord>;
  updateProduct(
    productId: string,
    input: Partial<{
      name: string;
      category: string;
      description: string;
      unit: string;
      unitPrice: number;
      costPrice: number;
      stockQty: number;
      stockDelta: number;
      stockReason: string;
      minStock: number;
      isActive: boolean;
      imageUrl: string | null;
      weightGrams: number;
    }>,
  ): Promise<ErpProductRecord>;
  deleteProduct(productId: string): Promise<void>;
  createSupplier(input: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
  }): Promise<ErpSupplierRecord>;
  updateSupplier?(
    supplierId: string,
    input: Partial<{
      name: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
      paymentTerms: string;
      status: "active" | "inactive";
    }>,
  ): Promise<ErpSupplierRecord>;
  deleteSupplier?(supplierId: string): Promise<void>;

  // POS Orders & Invoice / QR Generator
  createPosOrder(input: {
    customerName: string;
    customerPhone?: string | null;
    shippingAddress: string;
    shippingCourier?: string | null;
    shippingService?: string | null;
    shippingCost?: number;
    shippingWeightKg?: number;
    channel?: ChannelType;
    paymentMethod: PaymentMethod;
    paymentStatus?: PaymentStatus;
    discountAmount?: number;
    taxRate?: number;
    aiGenerated?: boolean;
    conversationId?: string | null;
    contactId?: string | null;
    notes?: string | null;
    items: Array<{
      productId?: string | null;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      costPrice?: number;
    }>;
  }): Promise<PosOrderRecord>;
  updatePosOrder(
    orderId: string,
    input: Partial<{
      customerName: string;
      customerPhone: string | null;
      paymentStatus: PaymentStatus;
      orderStatus: OrderStatus;
      shippingAddress: string;
      shippingCourier: string;
      shippingService: string | null;
      shippingCost: number;
      notes: string;
    }>,
  ): Promise<void>;
  deletePosOrder(orderId: string): Promise<void>;

  // Double-Entry Accounting
  createAccountingEntry(input: {
    entryDate?: string;
    kind: "expense" | "income" | "capital";
    categoryName: string;
    amount: number;
    description: string;
  }): Promise<{ entryNumber: string }>;
  deleteAccountingEntry(entryNumber: string): Promise<void>;

  // Channels, Quick Replies, Templates, Team, Workspace
  createChannel(input: {
    channel: ChannelType;
    displayName: string;
    externalAccountId: string;
    externalBusinessId?: string;
    accessToken?: string;
    provider?: "meta_cloud" | "evolution_api" | "tiktok_api" | "youtube_api" | "manual";
    baseUrl?: string;
    instanceName?: string;
    status?: "pending" | "connected" | "disabled";
  }): Promise<ChannelRecord>;
  connectMetaWhatsApp(input: { wabaId: string; phoneNumberId: string; accessToken: string }): Promise<{ displayName: string }>;
  updateChannel(channelId: string, input: { displayName?: string; status?: ChannelStatus }): Promise<void>;
  deleteChannel(channelId: string): Promise<void>;

  createQuickReply(input: { shortcut: string; title: string; bodyText: string; category: string }): Promise<QuickReplyRecord>;
  updateQuickReply(
    replyId: string,
    input: Partial<{ shortcut: string; title: string; bodyText: string; category: string }>,
  ): Promise<QuickReplyRecord>;
  deleteQuickReply(replyId: string): Promise<void>;

  createTemplate(input: {
    channel: ChannelType;
    name: string;
    category: TemplateCategory;
    language: string;
    bodyText: string;
    status: TemplateStatus;
  }): Promise<MessageTemplateRecord>;
  updateTemplate(
    templateId: string,
    input: Partial<{ category: TemplateCategory; language: string; bodyText: string; status: TemplateStatus }>,
  ): Promise<MessageTemplateRecord>;
  deleteTemplate(templateId: string): Promise<void>;

  updateMember(memberId: string, input: { role?: MemberRole; status?: "invited" | "active" | "suspended" }): Promise<void>;
  deleteMember(memberId: string): Promise<void>;

  updateWorkspace(name: string): Promise<void>;
  deleteWorkspace(): Promise<void>;
  resetDemo?: () => Promise<void>;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal (HTTP ${res.status}).`);
  }
  return data;
}

export function createApiWorkspaceAdapter(
  tenantId: string,
  initialWorkspace: { name: string; slug: string; role: MemberRole },
): WorkspaceAdapter {
  const base = `/api/organizations/${tenantId}`;
  let workspaceName = initialWorkspace.name;
  let workspaceSlug = initialWorkspace.slug;
  const currentRole = initialWorkspace.role;

  return {
    mode: "neon",
    tenantId,
    async loadAll() {
      const [
        wsRes,
        convRes,
        contactRes,
        chanRes,
        qrRes,
        tplRes,
        memRes,
        anaRes,
        aiRes,
        erpRes,
        supRes,
        posRes,
        accRes,
      ] = await Promise.all([
        apiJson<{ workspace: { name: string; slug: string; role: MemberRole } }>(base),
        apiJson<{ conversations: ConversationRecord[] }>(`${base}/conversations`),
        apiJson<{ contacts: ContactRecord[] }>(`${base}/contacts`),
        apiJson<{ channels: ChannelRecord[] }>(`${base}/channels`),
        apiJson<{ quickReplies: QuickReplyRecord[] }>(`${base}/quick-replies`),
        apiJson<{ templates: MessageTemplateRecord[] }>(`${base}/templates`),
        apiJson<{ members: TeamMemberRecord[] }>(`${base}/members`),
        apiJson<{ analytics: WorkspaceAnalytics }>(`${base}/analytics`),
        apiJson<{
          agents: AiAgentRecord[];
          knowledge: AiKnowledgeItemRecord[];
          incidents: AiSecurityIncidentRecord[];
        }>(`${base}/ai`),
        apiJson<{ products: ErpProductRecord[]; movements: ErpStockMovementRecord[] }>(`${base}/erp/products`),
        apiJson<{ suppliers: ErpSupplierRecord[] }>(`${base}/erp/suppliers`),
        apiJson<{ orders: PosOrderRecord[] }>(`${base}/pos/orders`),
        apiJson<{ entries: AccountingEntryRecord[]; summary: FinancialReportSummary }>(`${base}/accounting`),
      ]);
      workspaceName = wsRes.workspace.name;
      workspaceSlug = wsRes.workspace.slug;
      const savedImages = loadProductImages(tenantId);
      const enrichedProducts = erpRes.products.map((p) => ({
        ...p,
        imageUrl: p.imageUrl ?? savedImages[p.id] ?? savedImages[p.sku] ?? null,
      }));
      return {
        workspaceName,
        workspaceSlug,
        currentRole: wsRes.workspace.role ?? currentRole,
        conversations: convRes.conversations,
        contacts: contactRes.contacts,
        channels: chanRes.channels,
        quickReplies: qrRes.quickReplies,
        templates: tplRes.templates,
        members: memRes.members,
        analytics: anaRes.analytics,
        aiAgents: aiRes.agents,
        aiKnowledge: aiRes.knowledge,
        aiIncidents: aiRes.incidents,
        products: enrichedProducts,
        suppliers: supRes.suppliers,
        stockMovements: erpRes.movements,
        orders: posRes.orders,
        accountingEntries: accRes.entries,
        financialReport: accRes.summary,
        syncedAt: new Date().toISOString(),
      };
    },
    async loadConversationDetail(conversationId) {
      return apiJson<ConversationDetailPayload>(`${base}/conversations/${conversationId}`);
    },
    async createContact(input) {
      const res = await apiJson<{ contact: ContactRecord }>(`${base}/contacts`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.contact;
    },
    async updateContact(contactId, input) {
      const res = await apiJson<{ contact: ContactRecord }>(`${base}/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return res.contact;
    },
    async deleteContact(contactId) {
      await apiJson(`${base}/contacts/${contactId}`, { method: "DELETE" });
    },
    async createConversation(input) {
      return apiJson<{ id: string }>(`${base}/conversations`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async updateConversation(conversationId, input) {
      await apiJson(`${base}/conversations/${conversationId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    async deleteConversation(conversationId) {
      await apiJson(`${base}/conversations/${conversationId}`, { method: "DELETE" });
    },
    async sendMessage(conversationId, text) {
      const idempotencyKey = crypto.randomUUID();
      return apiJson<{ messageId: string; status: string; note?: string }>(
        `${base}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({ text }),
        },
      );
    },
    async addNote(conversationId, bodyText) {
      const res = await apiJson<{ note: ConversationNoteRecord }>(`${base}/conversations/${conversationId}/notes`, {
        method: "POST",
        body: JSON.stringify({ bodyText }),
      });
      return res.note;
    },
    async deleteNote(conversationId, noteId) {
      await apiJson(`${base}/conversations/${conversationId}/notes?noteId=${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
    },
    async runAiAutoReply(conversationId, simulatedInboundText) {
      const couriers = loadLocalMasterData(tenantId).couriers;
      return apiJson<AiAutoReplyExecutionResult>(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "auto_reply", conversationId, simulatedInboundText, couriers }),
      });
    },
    async runAiProactiveFollowUp(conversationId, attemptNumber) {
      const couriers = loadLocalMasterData(tenantId).couriers;
      return apiJson<AiAutoReplyExecutionResult>(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "proactive_followup", conversationId, attemptNumber, couriers }),
      });
    },
    async updateAiAgent(agentKey, patch) {
      const res = await apiJson<{ agent: AiAgentRecord }>(`${base}/ai`, {
        method: "PATCH",
        body: JSON.stringify({ agentKey, ...patch }),
      });
      return res.agent;
    },
    async runAiKnowledgeSync() {
      return apiJson<{ syncedCount: number }>(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "learn_sync" }),
      });
    },
    async addAiKnowledge(input) {
      const res = await apiJson<{ knowledgeItem: AiKnowledgeItemRecord }>(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "add_knowledge", ...input }),
      });
      return res.knowledgeItem;
    },
    async deleteAiKnowledge(knowledgeId) {
      await apiJson(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "delete_knowledge", knowledgeId }),
      });
    },
    async runAiGuardianScan() {
      return apiJson<{ healthScore: number; incidents: AiSecurityIncidentRecord[] }>(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "guardian_scan" }),
      });
    },
    async resolveIncident(incidentId) {
      await apiJson(`${base}/ai`, {
        method: "POST",
        body: JSON.stringify({ action: "resolve_incident", incidentId }),
      });
    },
    async createProduct(input) {
      const { imageUrl, ...rest } = input;
      const res = await apiJson<{ product: ErpProductRecord }>(`${base}/erp/products`, {
        method: "POST",
        body: JSON.stringify(rest),
      });
      if (imageUrl !== undefined) {
        saveProductImage(tenantId, res.product.id, imageUrl);
      }
      return {
        ...res.product,
        imageUrl: imageUrl ?? res.product.imageUrl ?? null,
        weightGrams: input.weightGrams ?? res.product.weightGrams ?? 500,
      };
    },
    async updateProduct(productId, input) {
      const { imageUrl, ...rest } = input;
      const res = await apiJson<{ product: ErpProductRecord }>(`${base}/erp/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(rest),
      });
      if (imageUrl !== undefined) {
        saveProductImage(tenantId, productId, imageUrl);
      }
      return {
        ...res.product,
        imageUrl: imageUrl !== undefined ? imageUrl : (res.product.imageUrl ?? loadProductImages(tenantId)[productId] ?? null),
      };
    },
    async deleteProduct(productId) {
      await apiJson(`${base}/erp/products/${productId}`, { method: "DELETE" });
    },
    async createSupplier(input) {
      const res = await apiJson<{ supplier: ErpSupplierRecord }>(`${base}/erp/suppliers`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.supplier;
    },
    async updateSupplier(supplierId, input) {
      const res = await apiJson<{ supplier: ErpSupplierRecord }>(`${base}/erp/suppliers`, {
        method: "PATCH",
        body: JSON.stringify({ id: supplierId, ...input }),
      });
      return res.supplier;
    },
    async deleteSupplier(supplierId) {
      await apiJson(`${base}/erp/suppliers?supplierId=${encodeURIComponent(supplierId)}`, {
        method: "DELETE",
      });
    },
    async createPosOrder(input) {
      const res = await apiJson<{ order: PosOrderRecord }>(`${base}/pos/orders`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.order;
    },
    async updatePosOrder(orderId, input) {
      await apiJson(`${base}/pos/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    async deletePosOrder(orderId) {
      await apiJson(`${base}/pos/orders/${orderId}`, { method: "DELETE" });
    },
    async createAccountingEntry(input) {
      return apiJson<{ entryNumber: string }>(`${base}/accounting`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async deleteAccountingEntry(entryNumber) {
      await apiJson(`${base}/accounting?entryNumber=${encodeURIComponent(entryNumber)}`, { method: "DELETE" });
    },
    async createChannel(input) {
      const res = await apiJson<{ channel: ChannelRecord }>(`${base}/channels`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.channel;
    },
    async connectMetaWhatsApp(input) {
      return apiJson<{ displayName: string }>(`${base}/channels/whatsapp`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    async updateChannel(channelId, input) {
      await apiJson(`${base}/channels/${channelId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
    async deleteChannel(channelId) {
      await apiJson(`${base}/channels/${channelId}`, { method: "DELETE" });
    },
    async createQuickReply(input) {
      const res = await apiJson<{ quickReply: QuickReplyRecord }>(`${base}/quick-replies`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.quickReply;
    },
    async updateQuickReply(replyId, input) {
      const res = await apiJson<{ quickReply: QuickReplyRecord }>(`${base}/quick-replies/${replyId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return res.quickReply;
    },
    async deleteQuickReply(replyId) {
      await apiJson(`${base}/quick-replies/${replyId}`, { method: "DELETE" });
    },
    async createTemplate(input) {
      const res = await apiJson<{ template: MessageTemplateRecord }>(`${base}/templates`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.template;
    },
    async updateTemplate(templateId, input) {
      const res = await apiJson<{ template: MessageTemplateRecord }>(`${base}/templates/${templateId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return res.template;
    },
    async deleteTemplate(templateId) {
      await apiJson(`${base}/templates/${templateId}`, { method: "DELETE" });
    },
    async updateMember(memberId, input) {
      await apiJson(`${base}/members`, {
        method: "PATCH",
        body: JSON.stringify({ memberId, ...input }),
      });
    },
    async deleteMember(memberId) {
      await apiJson(`${base}/members?memberId=${encodeURIComponent(memberId)}`, { method: "DELETE" });
    },
    async updateWorkspace(name) {
      await apiJson(base, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    },
    async deleteWorkspace() {
      await apiJson(base, { method: "DELETE" });
    },
  };
}
