"use client";

import type {
  AuditLogRecord,
  ChannelRecord,
  ChannelType,
  ContactRecord,
  ConversationNoteRecord,
  ConversationRecord,
  LifecycleStage,
  MessageRecord,
  MessageTemplateRecord,
  QuickReplyRecord,
  TeamMemberRecord,
  WorkspaceAnalytics,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

const STORAGE_KEY = "wacrm_demo_workspace_v1";

interface DemoState {
  workspaceName: string;
  workspaceSlug: string;
  contacts: ContactRecord[];
  channels: ChannelRecord[];
  conversations: ConversationRecord[];
  messages: Record<string, MessageRecord[]>;
  notes: Record<string, ConversationNoteRecord[]>;
  quickReplies: QuickReplyRecord[];
  templates: MessageTemplateRecord[];
  members: TeamMemberRecord[];
  auditLogs: AuditLogRecord[];
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function buildInitialDemoState(): DemoState {
  const c1 = "10000000-0000-4000-8000-000000000001";
  const c2 = "10000000-0000-4000-8000-000000000002";
  const c3 = "10000000-0000-4000-8000-000000000003";
  const c4 = "10000000-0000-4000-8000-000000000004";
  const c5 = "10000000-0000-4000-8000-000000000005";

  const chWa = "20000000-0000-4000-8000-000000000001";
  const chIg = "20000000-0000-4000-8000-000000000002";
  const chFb = "20000000-0000-4000-8000-000000000003";
  const chTt = "20000000-0000-4000-8000-000000000004";

  const conv1 = "30000000-0000-4000-8000-000000000001";
  const conv2 = "30000000-0000-4000-8000-000000000002";
  const conv3 = "30000000-0000-4000-8000-000000000003";
  const conv4 = "30000000-0000-4000-8000-000000000004";

  const m1 = "40000000-0000-4000-8000-000000000001";
  const m2 = "40000000-0000-4000-8000-000000000002";
  const m3 = "40000000-0000-4000-8000-000000000003";

  const contacts: ContactRecord[] = [
    {
      id: c1,
      displayName: "Siti Rahmawati",
      phoneE164: "+6281234567801",
      email: "siti.rahma@tokoberkah.id",
      company: "Toko Berkah Mandiri",
      notes: "Langganan paket grosir bulanan, pengiriman rutin area Surabaya & Kediri.",
      tags: ["vip", "grosir", "jatim"],
      lifecycleStage: "vip",
      channels: ["whatsapp"],
      createdAt: minutesAgo(4320),
      updatedAt: minutesAgo(4),
    },
    {
      id: c2,
      displayName: "Andi Pratama",
      phoneE164: "+6281398765432",
      email: "andi@kreatifstudio.co.id",
      company: "Kreatif Studio Nusantara",
      notes: "Menanyakan paket integrasi WhatsApp Cloud API untuk 5 admin CS.",
      tags: ["enterprise", "saas"],
      lifecycleStage: "prospect",
      channels: ["whatsapp", "instagram"],
      createdAt: minutesAgo(2880),
      updatedAt: minutesAgo(18),
    },
    {
      id: c3,
      displayName: "Dewi Lestari",
      phoneE164: "+6285712349876",
      email: "dewi.lestari@gmail.com",
      company: "Butik Anggun",
      notes: "Pernah order via Instagram DM bulan lalu.",
      tags: ["fashion", "repeat"],
      lifecycleStage: "customer",
      channels: ["instagram", "facebook_messenger"],
      createdAt: minutesAgo(1440),
      updatedAt: minutesAgo(52),
    },
    {
      id: c4,
      displayName: "Rizky Fadillah",
      phoneE164: "+6287811223344",
      email: "rizky@elektronikjaya.id",
      company: "Elektronik Jaya",
      notes: "Komplain keterlambatan resi kurir JNE.",
      tags: ["support", "urgensi"],
      lifecycleStage: "customer",
      channels: ["whatsapp"],
      createdAt: minutesAgo(960),
      updatedAt: minutesAgo(125),
    },
    {
      id: c5,
      displayName: "Nadia Kusuma",
      phoneE164: "+6282199887766",
      email: "nadia@glowskincare.id",
      company: "Glow Skincare ID",
      notes: "Prospek dari TikTok Business Messaging.",
      tags: ["tiktok", "skincare"],
      lifecycleStage: "lead",
      channels: ["tiktok"],
      createdAt: minutesAgo(360),
      updatedAt: minutesAgo(200),
    },
  ];

  const channels: ChannelRecord[] = [
    {
      id: chWa,
      channel: "whatsapp",
      displayName: "WhatsApp Official — CS Utama",
      externalAccountId: "109823456789012",
      externalBusinessId: "554433221100998",
      status: "connected",
      scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      tokenExpiresAt: null,
      metadata: { provider: "meta_cloud", display_phone_number: "+62 811-2233-4455", verified_name: "WACRM Official Store" },
      createdAt: minutesAgo(10000),
      updatedAt: minutesAgo(10),
    },
    {
      id: chIg,
      channel: "instagram",
      displayName: "Instagram @wacrm.indonesia",
      externalAccountId: "ig-17841400998877",
      externalBusinessId: null,
      status: "connected",
      scopes: ["instagram_manage_messages"],
      tokenExpiresAt: null,
      metadata: { provider: "meta_cloud" },
      createdAt: minutesAgo(8000),
      updatedAt: minutesAgo(45),
    },
    {
      id: chFb,
      channel: "facebook_messenger",
      displayName: "Halaman Facebook WACRM ID",
      externalAccountId: "fb-page-998877665",
      externalBusinessId: null,
      status: "pending",
      scopes: ["pages_messaging"],
      tokenExpiresAt: null,
      metadata: { provider: "meta_cloud" },
      createdAt: minutesAgo(6000),
      updatedAt: minutesAgo(120),
    },
    {
      id: chTt,
      channel: "tiktok",
      displayName: "TikTok Shop & Business CS",
      externalAccountId: "tt-biz-445566",
      externalBusinessId: null,
      status: "pending",
      scopes: [],
      tokenExpiresAt: null,
      metadata: { provider: "tiktok_api" },
      createdAt: minutesAgo(4000),
      updatedAt: minutesAgo(300),
    },
  ];

  const conversations: ConversationRecord[] = [
    {
      id: conv1,
      connectionId: chWa,
      contactId: c1,
      contactName: "Siti Rahmawati",
      contactPhone: "+6281234567801",
      contactEmail: "siti.rahma@tokoberkah.id",
      contactCompany: "Toko Berkah Mandiri",
      contactStage: "vip",
      channel: "whatsapp",
      channelDisplayName: "WhatsApp Official — CS Utama",
      externalConversationId: "6281234567801",
      status: "open",
      priority: "urgent",
      subject: "Repeat Order Paket Grosir 50 Karton",
      tags: ["vip", "order-baru"],
      unreadCount: 2,
      assignedUserId: m1,
      assignedUserName: "Yudi (Owner)",
      lastMessageAt: minutesAgo(4),
      lastMessageText: "Halo admin, apakah stok paket grosir bulan ini ready? Saya mau pesan 50 karton hari ini.",
      lastInboundAt: minutesAgo(4),
      withinServiceWindow: true,
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(4),
    },
    {
      id: conv2,
      connectionId: chIg,
      contactId: c2,
      contactName: "Andi Pratama",
      contactPhone: "+6281398765432",
      contactEmail: "andi@kreatifstudio.co.id",
      contactCompany: "Kreatif Studio Nusantara",
      contactStage: "prospect",
      channel: "instagram",
      channelDisplayName: "Instagram @wacrm.indonesia",
      externalConversationId: "ig-andi-pratama",
      status: "open",
      priority: "high",
      subject: "Penawaran CRM Multi-Admin & Android",
      tags: ["demo", "enterprise"],
      unreadCount: 1,
      assignedUserId: m2,
      assignedUserName: "Rina CS",
      lastMessageAt: minutesAgo(18),
      lastMessageText: "Kak, apakah aplikasi Android WACRM bisa dipakai bersamaan oleh 5 agen CS?",
      lastInboundAt: minutesAgo(18),
      withinServiceWindow: true,
      createdAt: minutesAgo(260),
      updatedAt: minutesAgo(18),
    },
    {
      id: conv3,
      connectionId: chWa,
      contactId: c4,
      contactName: "Rizky Fadillah",
      contactPhone: "+6287811223344",
      contactEmail: "rizky@elektronikjaya.id",
      contactCompany: "Elektronik Jaya",
      contactStage: "customer",
      channel: "whatsapp",
      channelDisplayName: "WhatsApp Official — CS Utama",
      externalConversationId: "6287811223344",
      status: "pending",
      priority: "normal",
      subject: "Cek Resi Pengiriman #INV-8821",
      tags: ["tracking"],
      unreadCount: 0,
      assignedUserId: m2,
      assignedUserName: "Rina CS",
      lastMessageAt: minutesAgo(62),
      lastMessageText: "Siap Pak Rizky, tim logistik sedang konfirmasi ke kurir. Kami kabari dalam 15 menit.",
      lastInboundAt: minutesAgo(95),
      withinServiceWindow: true,
      createdAt: minutesAgo(480),
      updatedAt: minutesAgo(62),
    },
    {
      id: conv4,
      connectionId: chTt,
      contactId: c5,
      contactName: "Nadia Kusuma",
      contactPhone: "+6282199887766",
      contactEmail: "nadia@glowskincare.id",
      contactCompany: "Glow Skincare ID",
      contactStage: "lead",
      channel: "tiktok",
      channelDisplayName: "TikTok Shop & Business CS",
      externalConversationId: "tt-nadia-kusuma",
      status: "resolved",
      priority: "low",
      subject: "Tanya Katalog Promo Live",
      tags: ["tiktok-live"],
      unreadCount: 0,
      assignedUserId: m3,
      assignedUserName: "Dika Sales",
      lastMessageAt: minutesAgo(240),
      lastMessageText: "Terima kasih infonya Kak, sudah saya checkout ya!",
      lastInboundAt: minutesAgo(240),
      withinServiceWindow: true,
      createdAt: minutesAgo(600),
      updatedAt: minutesAgo(240),
    },
  ];

  const messages: Record<string, MessageRecord[]> = {
    [conv1]: [
      {
        id: makeUuid(),
        conversationId: conv1,
        channel: "whatsapp",
        externalMessageId: "wamid.demo001",
        direction: "inbound",
        messageType: "text",
        bodyText: "Selamat siang Kak, ini Bu Siti dari Toko Berkah Mandiri.",
        deliveryStatus: "read",
        providerTimestamp: minutesAgo(12),
        createdAt: minutesAgo(12),
      },
      {
        id: makeUuid(),
        conversationId: conv1,
        channel: "whatsapp",
        externalMessageId: "wamid.demo002",
        direction: "outbound",
        messageType: "text",
        bodyText: "Selamat siang Bu Siti! Senang mendengar kabar dari Ibu. Ada yang bisa kami bantu untuk order bulan ini?",
        deliveryStatus: "read",
        providerTimestamp: minutesAgo(9),
        createdAt: minutesAgo(9),
      },
      {
        id: makeUuid(),
        conversationId: conv1,
        channel: "whatsapp",
        externalMessageId: "wamid.demo003",
        direction: "inbound",
        messageType: "text",
        bodyText: "Halo admin, apakah stok paket grosir bulan ini ready? Saya mau pesan 50 karton hari ini.",
        deliveryStatus: "received",
        providerTimestamp: minutesAgo(4),
        createdAt: minutesAgo(4),
      },
    ],
    [conv2]: [
      {
        id: makeUuid(),
        conversationId: conv2,
        channel: "instagram",
        externalMessageId: "ig.demo001",
        direction: "inbound",
        messageType: "text",
        bodyText: "Kak, apakah aplikasi Android WACRM bisa dipakai bersamaan oleh 5 agen CS?",
        deliveryStatus: "received",
        providerTimestamp: minutesAgo(18),
        createdAt: minutesAgo(18),
      },
    ],
    [conv3]: [
      {
        id: makeUuid(),
        conversationId: conv3,
        channel: "whatsapp",
        externalMessageId: "wamid.demo010",
        direction: "inbound",
        messageType: "text",
        bodyText: "Halo, resi pesanan #INV-8821 kok statusnya masih di gudang sejak kemarin?",
        deliveryStatus: "read",
        providerTimestamp: minutesAgo(95),
        createdAt: minutesAgo(95),
      },
      {
        id: makeUuid(),
        conversationId: conv3,
        channel: "whatsapp",
        externalMessageId: "wamid.demo011",
        direction: "outbound",
        messageType: "text",
        bodyText: "Siap Pak Rizky, tim logistik sedang konfirmasi ke kurir. Kami kabari dalam 15 menit.",
        deliveryStatus: "delivered",
        providerTimestamp: minutesAgo(62),
        createdAt: minutesAgo(62),
      },
    ],
    [conv4]: [
      {
        id: makeUuid(),
        conversationId: conv4,
        channel: "tiktok",
        externalMessageId: "tt.demo001",
        direction: "inbound",
        messageType: "text",
        bodyText: "Kak, voucher diskon live tadi masih berlaku?",
        deliveryStatus: "read",
        providerTimestamp: minutesAgo(260),
        createdAt: minutesAgo(260),
      },
      {
        id: makeUuid(),
        conversationId: conv4,
        channel: "tiktok",
        externalMessageId: "tt.demo002",
        direction: "outbound",
        messageType: "text",
        bodyText: "Masih Kak Nadia! Berlaku sampai pukul 22.00 WIB hari ini ya.",
        deliveryStatus: "read",
        providerTimestamp: minutesAgo(250),
        createdAt: minutesAgo(250),
      },
      {
        id: makeUuid(),
        conversationId: conv4,
        channel: "tiktok",
        externalMessageId: "tt.demo003",
        direction: "inbound",
        messageType: "text",
        bodyText: "Terima kasih infonya Kak, sudah saya checkout ya!",
        deliveryStatus: "received",
        providerTimestamp: minutesAgo(240),
        createdAt: minutesAgo(240),
      },
    ],
  };

  const notes: Record<string, ConversationNoteRecord[]> = {
    [conv1]: [
      {
        id: makeUuid(),
        conversationId: conv1,
        authorUserId: m1,
        authorName: "Yudi (Owner)",
        bodyText: "Berikan diskon loyalitas VIP 8% jika pembayaran dilakukan hari ini.",
        createdAt: minutesAgo(7),
      },
    ],
  };

  const quickReplies: QuickReplyRecord[] = [
    {
      id: makeUuid(),
      shortcut: "salam",
      title: "Salam Pembuka CS",
      bodyText: "Halo Kak! Terima kasih telah menghubungi kami melalui WACRM. Ada yang bisa kami bantu hari ini?",
      category: "pembuka",
      createdAt: minutesAgo(5000),
      updatedAt: minutesAgo(5000),
    },
    {
      id: makeUuid(),
      shortcut: "stok_ready",
      title: "Konfirmasi Stok Ready",
      bodyText: "Kabar baik Kak, stok produk saat ini tersedia dan siap dikirim hari ini juga. Apakah ingin kami buatkan invoice sekarang?",
      category: "penjualan",
      createdAt: minutesAgo(4500),
      updatedAt: minutesAgo(4500),
    },
    {
      id: makeUuid(),
      shortcut: "resi",
      title: "Cek Resi & Pengiriman",
      bodyText: "Mohon ditunggu sebentar ya Kak, tim kami sedang memeriksa status resi pengiriman pesanan Anda.",
      category: "dukungan",
      createdAt: minutesAgo(4000),
      updatedAt: minutesAgo(4000),
    },
    {
      id: makeUuid(),
      shortcut: "terimakasih",
      title: "Penutup Percakapan",
      bodyText: "Terima kasih kembali Kak! Jika ada pertanyaan lain, silakan hubungi kami kapan saja.",
      category: "penutup",
      createdAt: minutesAgo(3500),
      updatedAt: minutesAgo(3500),
    },
  ];

  const templates: MessageTemplateRecord[] = [
    {
      id: makeUuid(),
      channel: "whatsapp",
      name: "konfirmasi_pesanan_baru",
      category: "utility",
      language: "id",
      bodyText: "Halo {{1}}, pesanan #{{2}} senilai Rp {{3}} telah kami terima dan sedang diproses. Terima kasih!",
      status: "approved",
      createdAt: minutesAgo(9000),
      updatedAt: minutesAgo(200),
    },
    {
      id: makeUuid(),
      channel: "whatsapp",
      name: "update_resi_pengiriman",
      category: "utility",
      language: "id",
      bodyText: "Pesanan #{{1}} telah dikirim melalui {{2}} dengan nomor resi {{3}}. Pantau pengiriman secara berkala.",
      status: "approved",
      createdAt: minutesAgo(8500),
      updatedAt: minutesAgo(150),
    },
    {
      id: makeUuid(),
      channel: "whatsapp",
      name: "promo_pelanggan_vip",
      category: "marketing",
      language: "id",
      bodyText: "Khusus pelanggan VIP {{1}}: nikmati potongan {{2}}% untuk pemesanan bulan ini. Balas pesan ini untuk klaim.",
      status: "pending_approval",
      createdAt: minutesAgo(3000),
      updatedAt: minutesAgo(50),
    },
  ];

  const members: TeamMemberRecord[] = [
    { id: makeUuid(), userId: m1, displayName: "Yudi (Owner)", role: "owner", status: "active", createdAt: minutesAgo(12000) },
    { id: makeUuid(), userId: m2, displayName: "Rina CS", role: "admin", status: "active", createdAt: minutesAgo(8000) },
    { id: makeUuid(), userId: m3, displayName: "Dika Sales", role: "agent", status: "active", createdAt: minutesAgo(4000) },
  ];

  const auditLogs: AuditLogRecord[] = [
    {
      id: "104",
      actorUserId: m1,
      actorName: "Yudi (Owner)",
      action: "channel.whatsapp.connected",
      resourceType: "channel_connection",
      resourceId: chWa,
      details: { phoneNumberId: "109823456789012" },
      createdAt: minutesAgo(15),
    },
    {
      id: "103",
      actorUserId: m2,
      actorName: "Rina CS",
      action: "conversation.updated",
      resourceType: "conversation",
      resourceId: conv3,
      details: { status: "pending" },
      createdAt: minutesAgo(62),
    },
    {
      id: "102",
      actorUserId: m1,
      actorName: "Yudi (Owner)",
      action: "contact.created",
      resourceType: "contact",
      resourceId: c1,
      details: { lifecycleStage: "vip" },
      createdAt: minutesAgo(180),
    },
  ];

  return {
    workspaceName: "WACRM Demo Enterprise",
    workspaceSlug: "wacrm-demo-enterprise",
    contacts,
    channels,
    conversations,
    messages,
    notes,
    quickReplies,
    templates,
    members,
    auditLogs,
  };
}

function loadDemoState(): DemoState {
  if (typeof window === "undefined") return buildInitialDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialDemoState();
    return JSON.parse(raw) as DemoState;
  } catch {
    return buildInitialDemoState();
  }
}

function saveDemoState(state: DemoState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function computeAnalytics(state: DemoState): WorkspaceAnalytics {
  const byChannelMap = new Map<ChannelType, number>();
  for (const conv of state.conversations) {
    byChannelMap.set(conv.channel, (byChannelMap.get(conv.channel) ?? 0) + 1);
  }
  const byStageMap = new Map<LifecycleStage, number>();
  for (const c of state.contacts) {
    byStageMap.set(c.lifecycleStage, (byStageMap.get(c.lifecycleStage) ?? 0) + 1);
  }
  const allMessages = Object.values(state.messages).flat();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return {
    totalConversations: state.conversations.length,
    openConversations: state.conversations.filter((c) => c.status === "open").length,
    pendingConversations: state.conversations.filter((c) => c.status === "pending").length,
    resolvedConversations: state.conversations.filter((c) => c.status === "resolved").length,
    totalContacts: state.contacts.length,
    totalMessages: allMessages.length,
    messagesLast24h: allMessages.filter((m) => Date.parse(m.createdAt) >= dayAgo).length,
    connectedChannels: state.channels.filter((ch) => ch.status === "connected").length,
    byChannel: [...byChannelMap.entries()].map(([channel, count]) => ({ channel, count })),
    byStage: [...byStageMap.entries()].map(([stage, count]) => ({ stage, count })),
    recentAuditLogs: state.auditLogs.slice(0, 25),
  };
}

export function createDemoWorkspaceAdapter(): WorkspaceAdapter {
  let state = loadDemoState();

  const pushAudit = (action: string, resourceType: string, resourceId: string | null, details: Record<string, unknown> = {}) => {
    state.auditLogs.unshift({
      id: String(Date.now()),
      actorUserId: state.members[0]?.userId ?? null,
      actorName: state.members[0]?.displayName ?? "Admin Demo",
      action,
      resourceType,
      resourceId,
      details,
      createdAt: new Date().toISOString(),
    });
    state.auditLogs = state.auditLogs.slice(0, 40);
  };

  const commit = () => saveDemoState(state);

  return {
    mode: "demo",
    tenantId: "demo-workspace",
    async loadAll() {
      state = loadDemoState();
      return {
        workspaceName: state.workspaceName,
        workspaceSlug: state.workspaceSlug,
        currentRole: "owner",
        conversations: [...state.conversations].sort(
          (a, b) => Date.parse(b.lastMessageAt || b.updatedAt) - Date.parse(a.lastMessageAt || a.updatedAt),
        ),
        contacts: [...state.contacts].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
        channels: [...state.channels],
        quickReplies: [...state.quickReplies],
        templates: [...state.templates],
        members: [...state.members],
        analytics: computeAnalytics(state),
      };
    },
    async loadConversationDetail(conversationId) {
      state = loadDemoState();
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (!conversation) throw new Error("Percakapan tidak ditemukan.");
      return {
        conversation,
        messages: [...(state.messages[conversationId] ?? [])],
        notes: [...(state.notes[conversationId] ?? [])],
      };
    },
    async createContact(input) {
      const now = new Date().toISOString();
      const phone = input.phoneE164 ? (input.phoneE164.startsWith("+") ? input.phoneE164 : `+${input.phoneE164}`) : null;
      const contact: ContactRecord = {
        id: makeUuid(),
        displayName: input.displayName.trim(),
        phoneE164: phone,
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        notes: input.notes?.trim() || null,
        tags: (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
        lifecycleStage: input.lifecycleStage ?? "lead",
        channels: phone ? ["whatsapp"] : [],
        createdAt: now,
        updatedAt: now,
      };
      state.contacts.unshift(contact);
      pushAudit("contact.created", "contact", contact.id, { lifecycleStage: contact.lifecycleStage });
      commit();
      return contact;
    },
    async updateContact(contactId, input) {
      const idx = state.contacts.findIndex((c) => c.id === contactId);
      if (idx === -1) throw new Error("Kontak tidak ditemukan.");
      const updated: ContactRecord = {
        ...state.contacts[idx],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      state.contacts[idx] = updated;
      state.conversations = state.conversations.map((conv) =>
        conv.contactId === contactId
          ? {
              ...conv,
              contactName: updated.displayName,
              contactPhone: updated.phoneE164,
              contactEmail: updated.email,
              contactCompany: updated.company,
              contactStage: updated.lifecycleStage,
            }
          : conv,
      );
      pushAudit("contact.updated", "contact", contactId);
      commit();
      return updated;
    },
    async deleteContact(contactId) {
      state.contacts = state.contacts.filter((c) => c.id !== contactId);
      const removedConvs = state.conversations.filter((c) => c.contactId === contactId).map((c) => c.id);
      state.conversations = state.conversations.filter((c) => c.contactId !== contactId);
      for (const id of removedConvs) {
        delete state.messages[id];
        delete state.notes[id];
      }
      pushAudit("contact.deleted", "contact", contactId);
      commit();
    },
    async createConversation(input) {
      const contact = state.contacts.find((c) => c.id === input.contactId);
      if (!contact) throw new Error("Kontak tidak ditemukan.");
      const channelConn =
        state.channels.find((ch) => ch.id === input.connectionId) ??
        state.channels.find((ch) => ch.channel === input.channel) ??
        state.channels[0];
      const now = new Date().toISOString();
      const id = makeUuid();
      const conv: ConversationRecord = {
        id,
        connectionId: channelConn?.id ?? makeUuid(),
        contactId: contact.id,
        contactName: contact.displayName,
        contactPhone: contact.phoneE164,
        contactEmail: contact.email,
        contactCompany: contact.company,
        contactStage: contact.lifecycleStage,
        channel: input.channel,
        channelDisplayName: channelConn?.displayName ?? `Kanal ${input.channel}`,
        externalConversationId: contact.phoneE164?.replace(/^\+/, "") || id.slice(0, 8),
        status: "open",
        priority: input.priority ?? "normal",
        subject: input.subject?.trim() || null,
        tags: input.tags ?? [],
        unreadCount: input.initialDirection === "inbound" && input.initialMessage ? 1 : 0,
        assignedUserId: state.members[0]?.userId ?? null,
        assignedUserName: state.members[0]?.displayName ?? null,
        lastMessageAt: now,
        lastMessageText: input.initialMessage?.trim() || null,
        lastInboundAt: now,
        withinServiceWindow: true,
        createdAt: now,
        updatedAt: now,
      };
      state.conversations.unshift(conv);
      state.messages[id] = input.initialMessage?.trim()
        ? [
            {
              id: makeUuid(),
              conversationId: id,
              channel: input.channel,
              externalMessageId: null,
              direction: input.initialDirection ?? "inbound",
              messageType: "text",
              bodyText: input.initialMessage.trim(),
              deliveryStatus: input.initialDirection === "outbound" ? "sent" : "received",
              providerTimestamp: now,
              createdAt: now,
            },
          ]
        : [];
      state.notes[id] = [];
      pushAudit("conversation.created", "conversation", id, { channel: input.channel });
      commit();
      return { id };
    },
    async updateConversation(conversationId, input) {
      const idx = state.conversations.findIndex((c) => c.id === conversationId);
      if (idx === -1) throw new Error("Percakapan tidak ditemukan.");
      const curr = state.conversations[idx];
      const assignedMember =
        input.assignedUserId === undefined
          ? curr.assignedUserName
          : state.members.find((m) => m.userId === input.assignedUserId)?.displayName ?? null;
      state.conversations[idx] = {
        ...curr,
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.assignedUserId !== undefined ? { assignedUserId: input.assignedUserId, assignedUserName: assignedMember } : {}),
        ...(input.markRead ? { unreadCount: 0 } : {}),
        updatedAt: new Date().toISOString(),
      };
      pushAudit("conversation.updated", "conversation", conversationId, input);
      commit();
    },
    async deleteConversation(conversationId) {
      state.conversations = state.conversations.filter((c) => c.id !== conversationId);
      delete state.messages[conversationId];
      delete state.notes[conversationId];
      pushAudit("conversation.deleted", "conversation", conversationId);
      commit();
    },
    async sendMessage(conversationId, text) {
      const idx = state.conversations.findIndex((c) => c.id === conversationId);
      if (idx === -1) throw new Error("Percakapan tidak ditemukan.");
      const now = new Date().toISOString();
      const msg: MessageRecord = {
        id: makeUuid(),
        conversationId,
        channel: state.conversations[idx].channel,
        externalMessageId: `demo.${Date.now()}`,
        direction: "outbound",
        messageType: "text",
        bodyText: text.trim(),
        deliveryStatus: "delivered",
        providerTimestamp: now,
        createdAt: now,
      };
      state.messages[conversationId] = [...(state.messages[conversationId] ?? []), msg];
      state.conversations[idx] = {
        ...state.conversations[idx],
        lastMessageAt: now,
        lastMessageText: msg.bodyText,
        unreadCount: 0,
        updatedAt: now,
      };
      commit();
      return { messageId: msg.id, status: "delivered" };
    },
    async addNote(conversationId, bodyText) {
      const note: ConversationNoteRecord = {
        id: makeUuid(),
        conversationId,
        authorUserId: state.members[0]?.userId ?? null,
        authorName: state.members[0]?.displayName ?? "Admin Demo",
        bodyText: bodyText.trim(),
        createdAt: new Date().toISOString(),
      };
      state.notes[conversationId] = [note, ...(state.notes[conversationId] ?? [])];
      commit();
      return note;
    },
    async deleteNote(conversationId, noteId) {
      state.notes[conversationId] = (state.notes[conversationId] ?? []).filter((n) => n.id !== noteId);
      commit();
    },
    async createChannel(input) {
      const now = new Date().toISOString();
      const chan: ChannelRecord = {
        id: makeUuid(),
        channel: input.channel,
        displayName: input.displayName.trim(),
        externalAccountId: input.externalAccountId.trim(),
        externalBusinessId: input.externalBusinessId?.trim() || null,
        status: input.status ?? (input.accessToken ? "connected" : "pending"),
        scopes: input.channel === "whatsapp" ? ["whatsapp_business_management", "whatsapp_business_messaging"] : [],
        tokenExpiresAt: null,
        metadata: {
          provider: input.provider ?? "meta_cloud",
          ...(input.baseUrl ? { base_url: input.baseUrl } : {}),
          ...(input.instanceName ? { instance_name: input.instanceName } : {}),
        },
        createdAt: now,
        updatedAt: now,
      };
      state.channels.unshift(chan);
      pushAudit("channel.saved", "channel_connection", chan.id, { channel: chan.channel, status: chan.status });
      commit();
      return chan;
    },
    async connectMetaWhatsApp(input) {
      const now = new Date().toISOString();
      const chan: ChannelRecord = {
        id: makeUuid(),
        channel: "whatsapp",
        displayName: `WhatsApp ${input.phoneNumberId}`,
        externalAccountId: input.phoneNumberId,
        externalBusinessId: input.wabaId,
        status: "connected",
        scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
        tokenExpiresAt: null,
        metadata: { provider: "meta_cloud", waba_id: input.wabaId },
        createdAt: now,
        updatedAt: now,
      };
      state.channels.unshift(chan);
      pushAudit("channel.whatsapp.connected", "channel_connection", chan.id);
      commit();
      return { displayName: chan.displayName };
    },
    async updateChannel(channelId, input) {
      state.channels = state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...input, updatedAt: new Date().toISOString() } : ch,
      );
      pushAudit("channel.updated", "channel_connection", channelId, input);
      commit();
    },
    async deleteChannel(channelId) {
      state.channels = state.channels.filter((ch) => ch.id !== channelId);
      pushAudit("channel.deleted", "channel_connection", channelId);
      commit();
    },
    async createQuickReply(input) {
      const now = new Date().toISOString();
      const qr: QuickReplyRecord = {
        id: makeUuid(),
        shortcut: input.shortcut.trim().toLowerCase(),
        title: input.title.trim(),
        bodyText: input.bodyText.trim(),
        category: input.category.trim() || "umum",
        createdAt: now,
        updatedAt: now,
      };
      state.quickReplies = [qr, ...state.quickReplies.filter((item) => item.shortcut !== qr.shortcut)];
      commit();
      return qr;
    },
    async updateQuickReply(replyId, input) {
      const idx = state.quickReplies.findIndex((r) => r.id === replyId);
      if (idx === -1) throw new Error("Balasan cepat tidak ditemukan.");
      const updated = { ...state.quickReplies[idx], ...input, updatedAt: new Date().toISOString() };
      state.quickReplies[idx] = updated;
      commit();
      return updated;
    },
    async deleteQuickReply(replyId) {
      state.quickReplies = state.quickReplies.filter((r) => r.id !== replyId);
      commit();
    },
    async createTemplate(input) {
      const now = new Date().toISOString();
      const tpl: MessageTemplateRecord = {
        id: makeUuid(),
        ...input,
        name: input.name.trim().toLowerCase(),
        createdAt: now,
        updatedAt: now,
      };
      state.templates = [tpl, ...state.templates.filter((t) => !(t.channel === tpl.channel && t.name === tpl.name))];
      commit();
      return tpl;
    },
    async updateTemplate(templateId, input) {
      const idx = state.templates.findIndex((t) => t.id === templateId);
      if (idx === -1) throw new Error("Template tidak ditemukan.");
      const updated = { ...state.templates[idx], ...input, updatedAt: new Date().toISOString() };
      state.templates[idx] = updated;
      commit();
      return updated;
    },
    async deleteTemplate(templateId) {
      state.templates = state.templates.filter((t) => t.id !== templateId);
      commit();
    },
    async updateMember(memberId, input) {
      state.members = state.members.map((m) => (m.id === memberId ? { ...m, ...input } : m));
      pushAudit("member.updated", "organization_member", memberId, input);
      commit();
    },
    async deleteMember(memberId) {
      if (state.members.length <= 1) throw new Error("Minimal satu anggota pemilik harus tetap ada.");
      state.members = state.members.filter((m) => m.id !== memberId);
      pushAudit("member.removed", "organization_member", memberId);
      commit();
    },
    async updateWorkspace(name) {
      state.workspaceName = name.trim();
      pushAudit("workspace.updated", "organization", "demo-workspace", { name });
      commit();
    },
    async deleteWorkspace() {
      state = buildInitialDemoState();
      commit();
    },
    async resetDemo() {
      state = buildInitialDemoState();
      commit();
    },
  };
}
