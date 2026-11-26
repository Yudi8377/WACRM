import type {
  ChannelRecord,
  ChannelStatus,
  ChannelType,
  ContactRecord,
  ConversationNoteRecord,
  ConversationPriority,
  ConversationRecord,
  ConversationStatus,
  LifecycleStage,
  MemberRole,
  MessageRecord,
  MessageTemplateRecord,
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
      const [wsRes, convRes, contactRes, chanRes, qrRes, tplRes, memRes, anaRes] = await Promise.all([
        apiJson<{ workspace: { name: string; slug: string; role: MemberRole } }>(base),
        apiJson<{ conversations: ConversationRecord[] }>(`${base}/conversations`),
        apiJson<{ contacts: ContactRecord[] }>(`${base}/contacts`),
        apiJson<{ channels: ChannelRecord[] }>(`${base}/channels`),
        apiJson<{ quickReplies: QuickReplyRecord[] }>(`${base}/quick-replies`),
        apiJson<{ templates: MessageTemplateRecord[] }>(`${base}/templates`),
        apiJson<{ members: TeamMemberRecord[] }>(`${base}/members`),
        apiJson<{ analytics: WorkspaceAnalytics }>(`${base}/analytics`),
      ]);
      workspaceName = wsRes.workspace.name;
      workspaceSlug = wsRes.workspace.slug;
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
