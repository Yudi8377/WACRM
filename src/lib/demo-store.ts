"use client";

import {
  buildDefaultAiAgents,
  buildDoubleEntryForOrder,
  buildOrderRecord,
  buildProactiveFollowUpReply,
  computeFinancialReport,
  evaluateFraudRisk,
  orchestrateMultiAgentReply,
  runSystemGuardianAudit,
} from "@/lib/ai-agents";
import { buildInvoiceQrPayload } from "@/lib/qr-generator";
import { sanitizeImageUrl } from "@/lib/security";
import { buildCourierKnowledgeSummary, loadLocalMasterData, loadProductImages, saveProductImage } from "@/lib/store-profile";
import {
  formatIdr,
  type AccountingEntryRecord,
  type AiAgentRecord,
  type AiKnowledgeItemRecord,
  type AiSecurityIncidentRecord,
  type AuditLogRecord,
  type ChannelRecord,
  type ChannelType,
  type ContactRecord,
  type ConversationNoteRecord,
  type ConversationRecord,
  type ErpProductRecord,
  type ErpStockMovementRecord,
  type ErpSupplierRecord,
  type LifecycleStage,
  type MessageRecord,
  type MessageTemplateRecord,
  type PosOrderRecord,
  type QuickReplyRecord,
  type TeamMemberRecord,
  type WorkspaceAnalytics,
} from "@/lib/crm-types";
import type { WorkspaceAdapter } from "@/lib/workspace-adapter";

const STORAGE_KEY = "wacrm_demo_workspace_v3";

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
  aiAgents: AiAgentRecord[];
  aiKnowledge: AiKnowledgeItemRecord[];
  aiIncidents: AiSecurityIncidentRecord[];
  products: ErpProductRecord[];
  suppliers: ErpSupplierRecord[];
  stockMovements: ErpStockMovementRecord[];
  orders: PosOrderRecord[];
  accountingEntries: AccountingEntryRecord[];
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

  const p1 = "60000000-0000-4000-8000-000000000001";
  const p2 = "60000000-0000-4000-8000-000000000002";
  const p3 = "60000000-0000-4000-8000-000000000003";
  const p4 = "60000000-0000-4000-8000-000000000004";
  const p5 = "60000000-0000-4000-8000-000000000005";
  const p6 = "60000000-0000-4000-8000-000000000006";

  const products: ErpProductRecord[] = [
    {
      id: p1,
      sku: "GROSIR-50",
      name: "Paket Grosir Sembako Premium",
      category: "Grosir",
      description: "Paket grosir lengkap untuk toko & reseller (beras, minyak, gula, kopi). Gratis ongkir area Jawa Timur minimal 10 karton.",
      unit: "karton",
      unitPrice: 425000,
      costPrice: 310000,
      stockQty: 84,
      minStock: 15,
      isActive: true,
      createdAt: minutesAgo(4800),
      updatedAt: minutesAgo(20),
    },
    {
      id: p2,
      sku: "KOPI-GAYO",
      name: "Kopi Arabika Gayo Roasted 1Kg",
      category: "Minuman",
      description: "Biji kopi Arabika Gayo grade specialty medium roast, aroma cokelat & floral. Cocok untuk kafe & kedai.",
      unit: "kg",
      unitPrice: 185000,
      costPrice: 112000,
      stockQty: 42,
      minStock: 10,
      isActive: true,
      createdAt: minutesAgo(4200),
      updatedAt: minutesAgo(45),
    },
    {
      id: p3,
      sku: "TUMBLER-PRO",
      name: "Tumbler Stainless Vacuum 750ml",
      category: "Merchandise",
      description: "Botol minum stainless steel tahan panas/dingin 18 jam, bisa custom grafir logo perusahaan.",
      unit: "pcs",
      unitPrice: 145000,
      costPrice: 78000,
      stockQty: 65,
      minStock: 12,
      isActive: true,
      createdAt: minutesAgo(3600),
      updatedAt: minutesAgo(90),
    },
    {
      id: p4,
      sku: "MATCHA-PREM",
      name: "Bubuk Matcha Ceremonial 500gr",
      category: "Minuman",
      description: "Matcha impor Uji Jepang warna hijau cerah untuk latte & dessert kafe.",
      unit: "pack",
      unitPrice: 260000,
      costPrice: 165000,
      stockQty: 6,
      minStock: 10,
      isActive: true,
      createdAt: minutesAgo(3200),
      updatedAt: minutesAgo(30),
    },
    {
      id: p5,
      sku: "PRINTER-BT58",
      name: "Printer Thermal Bluetooth 58mm Portable",
      category: "Perangkat POS",
      description: "Printer struk kasir Bluetooth & USB kompatibel penuh dengan aplikasi Android WACRM & ESC/POS.",
      unit: "unit",
      unitPrice: 365000,
      costPrice: 230000,
      stockQty: 19,
      minStock: 5,
      isActive: true,
      createdAt: minutesAgo(2400),
      updatedAt: minutesAgo(60),
    },
    {
      id: p6,
      sku: "BUNDLE-UMKM",
      name: "Paket Bundling Kasir & CRM UMKM",
      category: "Perangkat POS",
      description: "Paket siap jualan berisi Printer Bluetooth 58mm, 10 roll kertas thermal, dan setup katalog ERP + AI Auto-Reply.",
      unit: "paket",
      unitPrice: 890000,
      costPrice: 520000,
      stockQty: 11,
      minStock: 4,
      isActive: true,
      createdAt: minutesAgo(1800),
      updatedAt: minutesAgo(15),
    },
  ];

  const suppliers: ErpSupplierRecord[] = [
    {
      id: "70000000-0000-4000-8000-000000000001",
      name: "PT Agro Nusantara Sentosa",
      contactPerson: "Pak Hendra Wijaya",
      phone: "+628113456001",
      email: "supply@agronusantara.co.id",
      address: "Kawasan Industri Rungkut Blok D-14, Surabaya",
      paymentTerms: "NET 14",
      status: "active",
      createdAt: minutesAgo(9000),
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      name: "CV Kopi Gayo Mandiri",
      contactPerson: "Ibu Ratna Dewi",
      phone: "+6281277889900",
      email: "order@kopigayomandiri.id",
      address: "Jl. Takengon Raya No. 22, Aceh Tengah",
      paymentTerms: "NET 7",
      status: "active",
      createdAt: minutesAgo(7200),
    },
    {
      id: "70000000-0000-4000-8000-000000000003",
      name: "PT TechPOS Indonesia",
      contactPerson: "Bapak Dimas Pratama",
      phone: "+6281599001122",
      email: "b2b@techpos.id",
      address: "Harco Mangga Dua Blok B2 No. 8, Jakarta",
      paymentTerms: "NET 30",
      status: "active",
      createdAt: minutesAgo(6000),
    },
  ];

  const workspaceName = "Toko Berkah Nusantara";
  const ord1 = buildOrderRecord({
    id: "80000000-0000-4000-8000-000000000001",
    workspaceName,
    customerName: "Siti Rahmawati",
    customerPhone: "+6281234567801",
    shippingAddress: "Jl. Dhoho No. 88, Kota Kediri, Jawa Timur",
    channel: "whatsapp",
    paymentMethod: "qris",
    paymentStatus: "paid",
    discountAmount: 250000,
    items: [
      { id: "81000000-0000-4000-8000-000000000001", productId: p1, sku: "GROSIR-50", productName: "Paket Grosir Sembako Premium", quantity: 10, unitPrice: 425000, costPrice: 310000 },
      { id: "81000000-0000-4000-8000-000000000002", productId: p2, sku: "KOPI-GAYO", productName: "Kopi Arabika Gayo Roasted 1Kg", quantity: 4, unitPrice: 185000, costPrice: 112000 },
    ],
    aiGenerated: true,
    fraudRiskScore: 6,
    conversationId: conv1,
    contactId: c1,
    notes: "Diekstrak otomatis dari chat WhatsApp oleh AI Order & POS Agent",
  });
  ord1.invoiceNumber = "INV-20261126-1001";

  const ord2 = buildOrderRecord({
    id: "80000000-0000-4000-8000-000000000002",
    workspaceName,
    customerName: "Andi Pratama",
    customerPhone: "+6281398765402",
    shippingAddress: "Jl. Diponegoro No. 19, Surabaya",
    channel: "instagram",
    paymentMethod: "bank_transfer",
    paymentStatus: "paid",
    items: [
      { id: "81000000-0000-4000-8000-000000000003", productId: p6, sku: "BUNDLE-UMKM", productName: "Paket Bundling Kasir & CRM UMKM", quantity: 2, unitPrice: 890000, costPrice: 520000 },
      { id: "81000000-0000-4000-8000-000000000004", productId: p3, sku: "TUMBLER-PRO", productName: "Tumbler Stainless Vacuum 750ml", quantity: 5, unitPrice: 145000, costPrice: 78000 },
    ],
    aiGenerated: true,
    fraudRiskScore: 9,
    conversationId: conv2,
    contactId: c2,
    notes: "Order otomatis dari DM Instagram + QR Invoice terkirim",
  });
  ord2.invoiceNumber = "INV-20261126-1002";

  const ord3 = buildOrderRecord({
    id: "80000000-0000-4000-8000-000000000003",
    workspaceName,
    customerName: "Rizky Fadillah",
    customerPhone: "+6285711223303",
    shippingAddress: "Jl. Brawijaya No. 41, Pare, Kediri",
    channel: "whatsapp",
    paymentMethod: "qris",
    paymentStatus: "unpaid",
    items: [
      { id: "81000000-0000-4000-8000-000000000005", productId: p2, sku: "KOPI-GAYO", productName: "Kopi Arabika Gayo Roasted 1Kg", quantity: 6, unitPrice: 185000, costPrice: 112000 },
      { id: "81000000-0000-4000-8000-000000000006", productId: p5, sku: "PRINTER-BT58", productName: "Printer Thermal Bluetooth 58mm Portable", quantity: 1, unitPrice: 365000, costPrice: 230000 },
    ],
    aiGenerated: false,
    fraudRiskScore: 8,
    conversationId: conv3,
    contactId: c3,
    notes: "Menunggu scan pembayaran QRIS",
  });
  ord3.invoiceNumber = "INV-20261126-1003";

  const orders = [ord1, ord2, ord3];
  const todayStr = new Date().toISOString().slice(0, 10);

  const accountingEntries: AccountingEntryRecord[] = [
    {
      id: "90000000-0000-4000-8000-000000000001",
      entryNumber: "JE-INIT-001",
      entryDate: todayStr,
      accountCode: "1100",
      accountName: "Kas & Bank / QRIS",
      accountType: "asset",
      debit: 35000000,
      credit: 0,
      referenceType: "capital",
      referenceId: null,
      description: "Setoran Modal Kerja Awal Kas & Rekening Operasional",
      aiVerified: true,
      createdAt: minutesAgo(4800),
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      entryNumber: "JE-INIT-001",
      entryDate: todayStr,
      accountCode: "1300",
      accountName: "Persediaan Barang Dagang",
      accountType: "asset",
      debit: 45000000,
      credit: 0,
      referenceType: "capital",
      referenceId: null,
      description: "Nilai Persediaan Awal Gudang ERP",
      aiVerified: true,
      createdAt: minutesAgo(4800),
    },
    {
      id: "90000000-0000-4000-8000-000000000003",
      entryNumber: "JE-INIT-001",
      entryDate: todayStr,
      accountCode: "3100",
      accountName: "Modal Pemilik",
      accountType: "equity",
      debit: 0,
      credit: 80000000,
      referenceType: "capital",
      referenceId: null,
      description: "Ekuitas Awal Perusahaan WACRM",
      aiVerified: true,
      createdAt: minutesAgo(4800),
    },
    ...orders.flatMap((o, idx) =>
      buildDoubleEntryForOrder(o).map((line, lIdx) => ({
        ...line,
        id: `90000000-0000-4000-8000-000000001${idx}${lIdx}`,
        createdAt: minutesAgo(120 - idx * 30),
      })),
    ),
    {
      id: "90000000-0000-4000-8000-000000000090",
      entryNumber: "JE-EXP-001",
      entryDate: todayStr,
      accountCode: "6100",
      accountName: "Beban Operasional & Pengiriman",
      accountType: "expense",
      debit: 650000,
      credit: 0,
      referenceType: "manual",
      referenceId: null,
      description: "Biaya pengiriman logistik & listrik kantor minggu ini",
      aiVerified: true,
      createdAt: minutesAgo(60),
    },
    {
      id: "90000000-0000-4000-8000-000000000091",
      entryNumber: "JE-EXP-001",
      entryDate: todayStr,
      accountCode: "1100",
      accountName: "Kas & Bank / QRIS",
      accountType: "asset",
      debit: 0,
      credit: 650000,
      referenceType: "manual",
      referenceId: null,
      description: "Pembayaran biaya logistik & listrik",
      aiVerified: true,
      createdAt: minutesAgo(60),
    },
  ];

  const stockMovements: ErpStockMovementRecord[] = [
    {
      id: "75000000-0000-4000-8000-000000000001",
      productId: p1,
      productName: "Paket Grosir Sembako Premium",
      sku: "GROSIR-50",
      movementType: "out",
      quantity: -10,
      referenceType: "pos_order",
      referenceId: ord1.id,
      notes: "Penjualan otomatis AI INV-20261126-1001",
      createdAt: minutesAgo(95),
    },
    {
      id: "75000000-0000-4000-8000-000000000002",
      productId: p6,
      productName: "Paket Bundling Kasir & CRM UMKM",
      sku: "BUNDLE-UMKM",
      movementType: "out",
      quantity: -2,
      referenceType: "pos_order",
      referenceId: ord2.id,
      notes: "Penjualan DM Instagram INV-20261126-1002",
      createdAt: minutesAgo(62),
    },
    {
      id: "75000000-0000-4000-8000-000000000003",
      productId: p2,
      productName: "Kopi Arabika Gayo Roasted 1Kg",
      sku: "KOPI-GAYO",
      movementType: "in",
      quantity: 30,
      referenceType: "purchase_order",
      referenceId: "PO-2026-018",
      notes: "Restok dari CV Kopi Gayo Mandiri",
      createdAt: minutesAgo(400),
    },
  ];

  const aiAgents: AiAgentRecord[] = buildDefaultAiAgents().map((a, i) => ({
    ...a,
    id: `50000000-0000-4000-8000-00000000000${i + 1}`,
  }));

  const aiKnowledge: AiKnowledgeItemRecord[] = [
    {
      id: "51000000-0000-4000-8000-000000000088",
      sourceType: "sop",
      sourceId: null,
      title: "Akses Multi-Agen Bersamaan (Android & Desktop)",
      content: "Aplikasi dapat digunakan secara bersamaan oleh banyak agen CS/Admin (5 agen atau lebih sekaligus) di ponsel Android maupun komputer Desktop dengan sinkronisasi real-time, pembagian peran RBAC (Owner, Admin, Supervisor, Agent), serta penugasan chat agar balasan tidak tumpang tindih.",
      tags: ["multi-agen", "android", "desktop", "tim", "cs", "bersamaan"],
      confidence: 0.99,
      usageCount: 28,
      autoGenerated: false,
      createdAt: minutesAgo(3600),
      updatedAt: minutesAgo(30),
    },
    {
      id: "51000000-0000-4000-8000-000000000089",
      sourceType: "sop",
      sourceId: null,
      title: "Jam Operasional, Pembayaran & Pengiriman Ekspedisi",
      content: "Layanan order otomatis aktif 24/7. Pengiriman same-day untuk pembayaran sebelum pukul 15.00 WIB area Kediri & Jawa Timur. Mendukung JNE, J&T, SiCepat, dan Kurir Toko. Pembayaran resmi via QRIS, Transfer BCA/Mandiri, Tunai, dan COD.",
      tags: ["operasional", "jam-buka", "pengiriman", "ekspedisi", "pembayaran", "qris"],
      confidence: 0.99,
      usageCount: 41,
      autoGenerated: false,
      createdAt: minutesAgo(3400),
      updatedAt: minutesAgo(60),
    },
    ...products.map((p, idx) => ({
      id: `51000000-0000-4000-8000-00000000000${idx + 1}`,
      sourceType: "product" as const,
      sourceId: p.id,
      title: `Produk ${p.name} (${p.sku})`,
      content: `${p.name} [${p.sku}] kategori ${p.category}. Harga ${formatIdr(p.unitPrice)}/${p.unit}. Stok gudang ERP: ${p.stockQty} ${p.unit}. ${p.description}`,
      tags: ["produk", p.sku.toLowerCase(), p.category.toLowerCase()],
      confidence: 0.97,
      usageCount: 18 - idx * 2,
      autoGenerated: true,
      createdAt: minutesAgo(1440),
      updatedAt: minutesAgo(15),
    })),
    {
      id: "51000000-0000-4000-8000-000000000090",
      sourceType: "sop",
      sourceId: null,
      title: "Kebijakan Diskon, PPN & Garansi Resmi",
      content: "Diskon VIP maksimal 10% untuk pembelian >= 10 unit. Semua invoice otomatis dikenakan PPN 11% dan dilengkapi kode QR label pesanan & verifikasi. Garansi tukar baru 7 hari jika segel cacat/rusak dengan bukti video unboxing (ditangani oleh Admin).",
      tags: ["sop", "diskon", "ongkir", "garansi", "ppn"],
      confidence: 0.99,
      usageCount: 34,
      autoGenerated: false,
      createdAt: minutesAgo(3000),
      updatedAt: minutesAgo(120),
    },
  ];

  const aiIncidents: AiSecurityIncidentRecord[] = [
    {
      id: "52000000-0000-4000-8000-000000000001",
      agentKey: "fraud_sentinel",
      category: "fraud_order",
      severity: "high",
      riskScore: 84,
      title: "Percobaan Order COD Fiktif & Permintaan Diskon 90% Diblokir",
      description: "Fraud Sentinel mendeteksi chat dengan indikasi manipulasi harga & permintaan kirim tanpa pembayaran resmi.",
      selfHealed: true,
      healingAction: "Order otomatis ditahan, balasan verifikasi pembayaran QRIS resmi dikirim, dan sesi tercatat di audit keamanan.",
      status: "mitigated",
      relatedEntityType: "conversation",
      relatedEntityId: conv4,
      createdAt: minutesAgo(90),
      resolvedAt: null,
    },
    {
      id: "52000000-0000-4000-8000-000000000002",
      agentKey: "system_guardian",
      category: "stock_mismatch",
      severity: "medium",
      riskScore: 44,
      title: "Stok Bubuk Matcha Ceremonial 500gr Menipis (Sisa 6 pack)",
      description: "Stok berada di bawah batas minimum ERP (10 pack).",
      selfHealed: true,
      healingAction: "Basis pengetahuan CS diperbarui otomatis & draf rekomendasi restok disiapkan untuk supplier.",
      status: "resolved",
      relatedEntityType: "erp_products",
      relatedEntityId: p4,
      createdAt: minutesAgo(40),
      resolvedAt: minutesAgo(38),
    },
  ];

  return {
    workspaceName,
    workspaceSlug: "wacrm-ai-enterprise",
    contacts,
    channels,
    conversations,
    messages,
    notes,
    quickReplies,
    templates,
    members,
    auditLogs,
    aiAgents,
    aiKnowledge,
    aiIncidents,
    products,
    suppliers,
    stockMovements,
    orders,
    accountingEntries,
  };
}

let memoryFallbackState: DemoState | null = null;

function loadDemoState(): DemoState {
  if (typeof window === "undefined") {
    if (!memoryFallbackState) memoryFallbackState = buildInitialDemoState();
    return memoryFallbackState;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryFallbackState ?? buildInitialDemoState();
    const parsed = JSON.parse(raw) as DemoState;
    // Automatically append any newly released AI agents (e.g. v4.0.0 seo_growth) without losing user data
    if (Array.isArray(parsed.aiAgents)) {
      const defaults = buildDefaultAiAgents();
      const existingKeys = new Set(parsed.aiAgents.map((a) => a.agentKey));
      let nextIdx = parsed.aiAgents.length + 1;
      for (const def of defaults) {
        if (!existingKeys.has(def.agentKey)) {
          parsed.aiAgents.push({
            ...def,
            id: `50000000-0000-4000-8000-0000000000${String(nextIdx).padStart(2, "0")}`,
          });
          nextIdx += 1;
        }
      }
    }
    return parsed;
  } catch {
    if (!memoryFallbackState) memoryFallbackState = buildInitialDemoState();
    return memoryFallbackState;
  }
}

function saveDemoState(state: DemoState) {
  memoryFallbackState = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // fallback already preserved in memoryFallbackState
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
      const savedImages = loadProductImages("demo-workspace");
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
        aiAgents: [...state.aiAgents],
        aiKnowledge: [...state.aiKnowledge],
        aiIncidents: [...state.aiIncidents],
        products: state.products.map((p) => ({
          ...p,
          imageUrl: p.imageUrl ?? savedImages[p.id] ?? savedImages[p.sku] ?? null,
        })),
        suppliers: [...state.suppliers],
        stockMovements: [...state.stockMovements],
        orders: [...state.orders],
        accountingEntries: [...state.accountingEntries],
        financialReport: computeFinancialReport(state.accountingEntries, state.products),
        syncedAt: new Date().toISOString(),
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

    // =========================================================================
    // Multi-Agent AI Swarm, POS + Invoice + QR, ERP & Double-Entry Accounting
    // =========================================================================
    async runAiAutoReply(conversationId, simulatedInboundText) {
      state = loadDemoState();
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) throw new Error("Percakapan tidak ditemukan.");
      const now = new Date().toISOString();

      let incoming = simulatedInboundText?.trim() ?? "";
      if (incoming) {
        const inboundMsg: MessageRecord = {
          id: makeUuid(),
          conversationId,
          channel: conv.channel,
          externalMessageId: null,
          direction: "inbound",
          messageType: "text",
          bodyText: incoming,
          deliveryStatus: "received",
          providerTimestamp: now,
          createdAt: now,
        };
        state.messages[conversationId] = [...(state.messages[conversationId] ?? []), inboundMsg];
      } else {
        const msgs = state.messages[conversationId] ?? [];
        const lastInbound = [...msgs].reverse().find((m) => m.direction === "inbound");
        incoming = lastInbound?.bodyText ?? "Halo, minta info katalog produk & stok terbaru.";
      }

      const couriers = loadLocalMasterData("demo-workspace").couriers;
      const existingConversationOrder =
        state.orders.find(
          (o) =>
            o.conversationId === conversationId &&
            o.orderStatus !== "cancelled" &&
            o.orderStatus !== "completed",
        ) ?? null;

      const plan = orchestrateMultiAgentReply({
        incomingMessage: incoming,
        customerName: conv.contactName,
        customerPhone: conv.contactPhone,
        workspaceName: state.workspaceName,
        products: state.products,
        knowledgeItems: state.aiKnowledge,
        agents: state.aiAgents,
        couriers,
        existingConversationOrder,
        recentMessages: state.messages[conversationId] ?? [],
      });

      let createdOrder: PosOrderRecord | null = null;
      let updatedOrder: PosOrderRecord | null = null;

      if (plan.extractedOrder && !plan.fraud.blocked) {
        const draft = plan.extractedOrder;
        createdOrder = buildOrderRecord({
          id: makeUuid(),
          workspaceName: state.workspaceName,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
          shippingAddress: draft.shippingAddress,
          shippingCourier: draft.shippingCourier,
          shippingService: draft.shippingService,
          shippingCost: draft.shippingCost,
          shippingWeightKg: draft.shippingWeightKg,
          channel: conv.channel,
          paymentMethod: draft.paymentMethod,
          paymentStatus: "unpaid",
          items: draft.items.map((i) => ({
            id: makeUuid(),
            productId: i.product.id,
            sku: i.product.sku,
            productName: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.unitPrice,
            costPrice: i.product.costPrice,
          })),
          aiGenerated: true,
          fraudRiskScore: plan.fraud.riskScore,
          conversationId,
          contactId: conv.contactId,
          notes: "Dibuat otomatis oleh Multi-Agent AI dari chat pelanggan",
        });

        state.orders = [createdOrder, ...state.orders];

        // Deduct ERP stock & log movements
        for (const item of draft.items) {
          state.products = state.products.map((p) =>
            p.id === item.product.id
              ? { ...p, stockQty: Math.max(0, p.stockQty - item.quantity), updatedAt: now }
              : p,
          );
          state.stockMovements.unshift({
            id: makeUuid(),
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            movementType: "out",
            quantity: -item.quantity,
            referenceType: "pos_order",
            referenceId: createdOrder.id,
            notes: `Order AI ${createdOrder.invoiceNumber}`,
            createdAt: now,
          });
        }

        // Post balanced double-entry journal lines
        const journal = buildDoubleEntryForOrder(createdOrder).map((l) => ({
          ...l,
          id: makeUuid(),
          createdAt: now,
        }));
        state.accountingEntries = [...journal, ...state.accountingEntries];
      } else if (plan.shippingUpdate && existingConversationOrder && !plan.fraud.blocked) {
        const upd = plan.shippingUpdate;
        const nextCustomerName = upd.customerName ?? existingConversationOrder.customerName;
        const nextCustomerPhone = upd.customerPhone ?? existingConversationOrder.customerPhone;
        const nextPaymentMethod = upd.paymentMethod ?? existingConversationOrder.paymentMethod;
        const nextTotal =
          Math.max(0, existingConversationOrder.subtotal - existingConversationOrder.discountAmount) +
          existingConversationOrder.taxAmount +
          upd.shippingCost;
        const nextQr = buildInvoiceQrPayload({
          invoiceNumber: existingConversationOrder.invoiceNumber,
          customerName: nextCustomerName,
          shippingAddress: upd.shippingAddress,
          totalAmount: nextTotal,
          paymentMethod: nextPaymentMethod,
          workspaceName: state.workspaceName,
        });

        updatedOrder = {
          ...existingConversationOrder,
          customerName: nextCustomerName,
          customerPhone: nextCustomerPhone,
          shippingAddress: upd.shippingAddress,
          shippingCourier: upd.shippingCourier,
          shippingService: upd.shippingService,
          shippingCost: upd.shippingCost,
          paymentMethod: nextPaymentMethod,
          totalAmount: nextTotal,
          qrPayload: nextQr,
          notes: "Alamat & ekspedisi diperbarui otomatis oleh Multi-Agent AI dari chat pelanggan",
          updatedAt: now,
        };
        state.orders = state.orders.map((o) => (o.id === existingConversationOrder.id ? updatedOrder! : o));

        // Keep double-entry journal balanced if shipping cost was added
        const prevShip = existingConversationOrder.shippingCost ?? 0;
        const shipDiff = upd.shippingCost - prevShip;
        if (shipDiff > 0) {
          const jeNum = `JE-SHP-${existingConversationOrder.invoiceNumber.replace(/^INV-/, "")}`;
          state.accountingEntries = [
            {
              id: makeUuid(),
              entryNumber: jeNum,
              entryDate: now.slice(0, 10),
              accountCode: existingConversationOrder.paymentStatus === "paid" ? "1100" : "1120",
              accountName:
                existingConversationOrder.paymentStatus === "paid"
                  ? "Kas & Bank / QRIS"
                  : "Piutang Usaha (AR)",
              accountType: "asset",
              debit: shipDiff,
              credit: 0,
              referenceType: "pos_order",
              referenceId: existingConversationOrder.id,
              description: `Penambahan Ongkir ${upd.shippingService || upd.shippingCourier} — ${existingConversationOrder.invoiceNumber}`,
              aiVerified: true,
              createdAt: now,
            },
            {
              id: makeUuid(),
              entryNumber: jeNum,
              entryDate: now.slice(0, 10),
              accountCode: "4200",
              accountName: "Pendapatan Pengiriman / Ongkir",
              accountType: "revenue",
              debit: 0,
              credit: shipDiff,
              referenceType: "pos_order",
              referenceId: existingConversationOrder.id,
              description: `Ongkir ${upd.shippingService || upd.shippingCourier} — ${existingConversationOrder.invoiceNumber}`,
              aiVerified: true,
              createdAt: now,
            },
            ...state.accountingEntries,
          ];
        }
      }

      const activeOrder = createdOrder ?? updatedOrder;
      const replyBody = activeOrder
        ? `${plan.replyText}\n\nNo. Invoice: ${activeOrder.invoiceNumber}\nKode Verifikasi QR: ${activeOrder.qrPayload.slice(-12)}`
        : plan.replyText;

      const replyMessage: MessageRecord = {
        id: makeUuid(),
        conversationId,
        channel: conv.channel,
        externalMessageId: null,
        direction: "outbound",
        messageType: "text",
        bodyText: replyBody,
        deliveryStatus: "delivered",
        providerTimestamp: now,
        createdAt: now,
      };
      state.messages[conversationId] = [...(state.messages[conversationId] ?? []), replyMessage];
      state.conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessageAt: now, lastMessageText: replyBody.slice(0, 140), unreadCount: 0, updatedAt: now }
          : c,
      );

      let learnedKnowledge: AiKnowledgeItemRecord | null = null;
      if (plan.learnedKnowledgeCandidate) {
        learnedKnowledge = {
          id: makeUuid(),
          sourceType: "autonomous_learning",
          sourceId: conversationId,
          title: plan.learnedKnowledgeCandidate.title,
          content: plan.learnedKnowledgeCandidate.content,
          tags: plan.learnedKnowledgeCandidate.tags,
          confidence: 0.91,
          usageCount: 1,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
        };
        state.aiKnowledge = [learnedKnowledge, ...state.aiKnowledge];
      }

      let securityIncident: AiSecurityIncidentRecord | null = null;
      if (plan.fraud.riskScore >= 45) {
        securityIncident = {
          id: makeUuid(),
          agentKey: "fraud_sentinel",
          category: "fraud_order",
          severity: plan.fraud.severity,
          riskScore: plan.fraud.riskScore,
          title: plan.fraud.blocked
            ? "Transaksi Mencurigakan Diblokir Otomatis oleh AI"
            : "Peringatan Risiko Fraud pada Chat",
          description: plan.fraud.reasons.join(" "),
          selfHealed: true,
          healingAction: plan.fraud.blocked
            ? "Order ditahan otomatis & respons proteksi dikirim ke pelanggan."
            : "Ditandai untuk pemantauan supervisor.",
          status: plan.fraud.blocked ? "mitigated" : "open",
          relatedEntityType: "conversation",
          relatedEntityId: conversationId,
          createdAt: now,
          resolvedAt: null,
        };
        state.aiIncidents = [securityIncident, ...state.aiIncidents];
      }

      state.aiAgents = state.aiAgents.map((a) =>
        a.agentKey === "cs_sales" ||
        a.agentKey === "fraud_sentinel" ||
        a.agentKey === "knowledge_learner" ||
        (createdOrder && a.agentKey === "order_pos")
          ? { ...a, actionsExecuted: a.actionsExecuted + 1, lastRunAt: now }
          : a,
      );
      pushAudit("ai.auto_reply.executed", "conversation", conversationId, {
        createdInvoice: createdOrder?.invoiceNumber ?? null,
        fraudRiskScore: plan.fraud.riskScore,
      });

      if (plan.escalationRequired) {
        state.conversations = state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                priority: "urgent",
                tags: [...new Set([...c.tags, "perlu-admin"])],
                updatedAt: now,
              }
            : c,
        );
        state.notes[conversationId] = [
          {
            id: makeUuid(),
            conversationId,
            authorUserId: null,
            authorName: "AI Escalation Guard",
            bodyText: `[ESKALASI ADMIN] ${plan.escalationReason ?? "Membutuhkan klarifikasi atau keputusan manusia."}`,
            createdAt: now,
          },
          ...(state.notes[conversationId] ?? []),
        ];
      }
      commit();

      return {
        replyMessage,
        agentTrace: plan.agentTrace,
        confidence: plan.confidence,
        fraudRiskScore: plan.fraud.riskScore,
        detectedIntent: plan.detectedIntent,
        escalationRequired: plan.escalationRequired,
        escalationReason: plan.escalationReason,
        followUpStage: plan.followUpStage,
        suggestedProducts: plan.suggestedProducts,
        createdOrder,
        updatedOrder,
        learnedKnowledge,
        securityIncident,
      };
    },

    async runAiProactiveFollowUp(conversationId, attemptNumber) {
      state = loadDemoState();
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (!conv) throw new Error("Percakapan tidak ditemukan.");
      const now = new Date().toISOString();
      const msgs = state.messages[conversationId] ?? [];
      const couriers = loadLocalMasterData("demo-workspace").couriers;

      const lastInboundTopic =
        [...msgs].reverse().find((m) => m.direction === "inbound")?.bodyText ?? null;
      const plan = buildProactiveFollowUpReply({
        customerName: conv.contactName,
        workspaceName: state.workspaceName,
        attemptNumber,
        lastTopic: lastInboundTopic,
        products: state.products,
        couriers,
      });

      const replyMessage: MessageRecord = {
        id: makeUuid(),
        conversationId,
        channel: conv.channel,
        externalMessageId: null,
        direction: "outbound",
        messageType: "text",
        bodyText: plan.replyText,
        deliveryStatus: "delivered",
        providerTimestamp: now,
        createdAt: now,
      };

      const nextTag = attemptNumber === 1 ? "ai-followup-1" : "ai-cross-sell";
      state.messages[conversationId] = [...msgs, replyMessage];
      state.conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessageAt: now,
              lastMessageText: plan.replyText.slice(0, 140),
              tags: [...new Set([...c.tags, nextTag])],
              updatedAt: now,
            }
          : c,
      );
      state.aiAgents = state.aiAgents.map((a) =>
        a.agentKey === "cs_sales"
          ? { ...a, actionsExecuted: a.actionsExecuted + 1, lastRunAt: now }
          : a,
      );
      pushAudit("ai.proactive_followup.sent", "conversation", conversationId, {
        attemptNumber,
        stage: plan.stage,
        suggestedCount: plan.suggestedProducts.length,
      });
      commit();

      return {
        replyMessage,
        agentTrace: plan.agentTrace,
        confidence: 0.94,
        fraudRiskScore: 0,
        detectedIntent: plan.stage === "abandon_cross_sell" ? "checkout_abandon_cross_sell" : "proactive_followup",
        escalationRequired: false,
        escalationReason: null,
        followUpStage: plan.stage,
        suggestedProducts: plan.suggestedProducts,
        createdOrder: null,
        updatedOrder: null,
        learnedKnowledge: null,
        securityIncident: null,
      };
    },

    async updateAiAgent(agentKey, patch) {
      state = loadDemoState();
      const idx = state.aiAgents.findIndex((a) => a.agentKey === agentKey);
      if (idx === -1) throw new Error("Agen AI tidak ditemukan.");
      const updated = { ...state.aiAgents[idx], ...patch };
      state.aiAgents[idx] = updated;
      pushAudit("ai.agent.updated", "ai_agent", agentKey, patch);
      commit();
      return updated;
    },

    async runAiKnowledgeSync() {
      state = loadDemoState();
      const now = new Date().toISOString();
      const nonProduct = state.aiKnowledge.filter((k) => k.sourceType !== "product");
      const productItems: AiKnowledgeItemRecord[] = state.products
        .filter((p) => p.isActive)
        .map((p) => ({
          id: makeUuid(),
          sourceType: "product",
          sourceId: p.id,
          title: `Produk ${p.name} (${p.sku})`,
          content: `${p.name} [${p.sku}] kategori ${p.category}. Harga ${formatIdr(p.unitPrice)}/${p.unit}. Stok gudang ERP: ${p.stockQty} ${p.unit}. ${p.description}`,
          tags: ["produk", p.sku.toLowerCase(), p.category.toLowerCase()],
          confidence: 0.97,
          usageCount: 1,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
        }));
      const totalRev = state.orders.reduce((s, o) => s + o.totalAmount, 0);
      const activeCouriers = loadLocalMasterData("demo-workspace").couriers.filter((c) => c.isActive);
      const courierKnowledgeItems: AiKnowledgeItemRecord[] =
        activeCouriers.length > 0
          ? [
              {
                id: makeUuid(),
                sourceType: "sop",
                sourceId: "master_couriers",
                title: `Kebijakan & Tarif Kurir Ekspedisi (${activeCouriers.length} Kurir Aktif)`,
                content: buildCourierKnowledgeSummary(activeCouriers),
                tags: ["kurir", "ekspedisi", "ongkir", "cod", "pengiriman", "asuransi"],
                confidence: 0.98,
                usageCount: 1,
                autoGenerated: true,
                createdAt: now,
                updatedAt: now,
              },
            ]
          : [];
      const synthesis: AiKnowledgeItemRecord = {
        id: makeUuid(),
        sourceType: "autonomous_learning",
        sourceId: null,
        title: `Sintesis Otonom Bisnis (${new Date().toLocaleTimeString("id-ID")})`,
        content: `AI berhasil mengonsolidasi ${state.products.length} produk ERP, ${activeCouriers.length} ekspedisi pengiriman aktif, ${state.conversations.length} percakapan aktif, dan ${state.orders.length} transaksi POS dengan omzet ${formatIdr(totalRev)}.`,
        tags: ["autonomous_learning", "sinkronisasi", "erp", "kurir"],
        confidence: 0.95,
        usageCount: 1,
        autoGenerated: true,
        createdAt: now,
        updatedAt: now,
      };
      const cleanedNonProduct = nonProduct.filter((k) => k.sourceId !== "master_couriers");
      state.aiKnowledge = [synthesis, ...courierKnowledgeItems, ...productItems, ...cleanedNonProduct];
      state.aiAgents = state.aiAgents.map((a) =>
        a.agentKey === "knowledge_learner" ? { ...a, actionsExecuted: a.actionsExecuted + 1, lastRunAt: now } : a,
      );
      pushAudit("ai.knowledge.synced", "ai_knowledge", null, { count: productItems.length + 1 });
      commit();
      return { syncedCount: productItems.length + 1 };
    },

    async addAiKnowledge(input) {
      state = loadDemoState();
      const now = new Date().toISOString();
      const item: AiKnowledgeItemRecord = {
        id: makeUuid(),
        sourceType: input.sourceType ?? "sop",
        sourceId: null,
        title: input.title.trim(),
        content: input.content.trim(),
        tags: input.tags ?? [],
        confidence: 0.95,
        usageCount: 0,
        autoGenerated: false,
        createdAt: now,
        updatedAt: now,
      };
      state.aiKnowledge = [item, ...state.aiKnowledge];
      commit();
      return item;
    },

    async deleteAiKnowledge(knowledgeId) {
      state = loadDemoState();
      state.aiKnowledge = state.aiKnowledge.filter((k) => k.id !== knowledgeId);
      commit();
    },

    async runAiGuardianScan() {
      state = loadDemoState();
      const now = new Date().toISOString();
      const audit = runSystemGuardianAudit({
        products: state.products,
        orders: state.orders,
        entries: state.accountingEntries,
      });
      if (audit.autoBalancedEntry) {
        state.accountingEntries = [
          { ...audit.autoBalancedEntry, id: makeUuid(), createdAt: now },
          ...state.accountingEntries,
        ];
      }
      const created: AiSecurityIncidentRecord[] = audit.incidents.map((inc) => ({
        ...inc,
        id: makeUuid(),
        createdAt: now,
      }));
      state.aiIncidents = [...created, ...state.aiIncidents].slice(0, 60);
      state.aiAgents = state.aiAgents.map((a) =>
        a.agentKey === "fraud_sentinel" || a.agentKey === "system_guardian"
          ? { ...a, actionsExecuted: a.actionsExecuted + 1, lastRunAt: now }
          : a,
      );
      pushAudit("ai.guardian.scanned", "system", null, { healthScore: audit.healthScore, count: created.length });
      commit();
      return { healthScore: audit.healthScore, incidents: created };
    },

    async resolveIncident(incidentId) {
      state = loadDemoState();
      const now = new Date().toISOString();
      state.aiIncidents = state.aiIncidents.map((i) =>
        i.id === incidentId ? { ...i, status: "resolved", resolvedAt: now } : i,
      );
      commit();
    },

    async createProduct(input) {
      state = loadDemoState();
      const now = new Date().toISOString();
      const safeImg = sanitizeImageUrl(input.imageUrl);
      const prod: ErpProductRecord = {
        id: makeUuid(),
        sku: input.sku.trim().toUpperCase(),
        name: input.name.trim(),
        category: input.category.trim() || "Umum",
        description: input.description?.trim() ?? "",
        unit: input.unit?.trim() || "pcs",
        unitPrice: input.unitPrice,
        costPrice: input.costPrice ?? 0,
        stockQty: input.stockQty,
        minStock: input.minStock ?? 5,
        isActive: true,
        imageUrl: safeImg,
        weightGrams: input.weightGrams ?? 500,
        createdAt: now,
        updatedAt: now,
      };
      if (safeImg) {
        saveProductImage("demo-workspace", prod.id, safeImg);
      }
      state.products = [prod, ...state.products];
      if (prod.stockQty > 0) {
        state.stockMovements.unshift({
          id: makeUuid(),
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          movementType: "in",
          quantity: prod.stockQty,
          referenceType: "initial_stock",
          referenceId: null,
          notes: "Stok awal produk baru",
          createdAt: now,
        });
      }
      // Auto-sync into AI Knowledge Base
      state.aiKnowledge.unshift({
        id: makeUuid(),
        sourceType: "product",
        sourceId: prod.id,
        title: `Produk ${prod.name} (${prod.sku})`,
        content: `${prod.name} [${prod.sku}] kategori ${prod.category}. Harga ${formatIdr(prod.unitPrice)}/${prod.unit}. Stok gudang ERP: ${prod.stockQty} ${prod.unit}. ${prod.description}`,
        tags: ["produk", prod.sku.toLowerCase(), prod.category.toLowerCase()],
        confidence: 0.97,
        usageCount: 0,
        autoGenerated: true,
        createdAt: now,
        updatedAt: now,
      });
      pushAudit("erp.product.created", "erp_product", prod.id, { sku: prod.sku });
      commit();
      return prod;
    },

    async updateProduct(productId, input) {
      state = loadDemoState();
      const idx = state.products.findIndex((p) => p.id === productId);
      if (idx === -1) throw new Error("Produk tidak ditemukan.");
      const curr = state.products[idx];
      const now = new Date().toISOString();
      const nextStock =
        typeof input.stockDelta === "number"
          ? Math.max(0, curr.stockQty + input.stockDelta)
          : (input.stockQty ?? curr.stockQty);
      const updated: ErpProductRecord = {
        ...curr,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
        ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
        ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: sanitizeImageUrl(input.imageUrl) } : {}),
        ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
        stockQty: nextStock,
        updatedAt: now,
      };
      if (input.imageUrl !== undefined) {
        saveProductImage("demo-workspace", updated.id, updated.imageUrl ?? null);
      }
      state.products[idx] = updated;
      const delta = nextStock - curr.stockQty;
      if (delta !== 0) {
        state.stockMovements.unshift({
          id: makeUuid(),
          productId: updated.id,
          productName: updated.name,
          sku: updated.sku,
          movementType: delta > 0 ? "in" : "adjustment",
          quantity: delta,
          referenceType: "manual_update",
          referenceId: null,
          notes: input.stockReason ?? "Pembaruan stok ERP",
          createdAt: now,
        });
      }
      // Keep AI Knowledge Base updated
      state.aiKnowledge = [
        {
          id: makeUuid(),
          sourceType: "product",
          sourceId: updated.id,
          title: `Produk ${updated.name} (${updated.sku})`,
          content: `${updated.name} [${updated.sku}] kategori ${updated.category}. Harga ${formatIdr(updated.unitPrice)}/${updated.unit}. Stok gudang ERP: ${updated.stockQty} ${updated.unit}. ${updated.description}`,
          tags: ["produk", updated.sku.toLowerCase(), updated.category.toLowerCase()],
          confidence: 0.97,
          usageCount: 0,
          autoGenerated: true,
          createdAt: now,
          updatedAt: now,
        },
        ...state.aiKnowledge.filter((k) => !(k.sourceType === "product" && k.sourceId === updated.id)),
      ];
      commit();
      return updated;
    },

    async deleteProduct(productId) {
      state = loadDemoState();
      state.products = state.products.filter((p) => p.id !== productId);
      state.aiKnowledge = state.aiKnowledge.filter((k) => !(k.sourceType === "product" && k.sourceId === productId));
      commit();
    },

    async createSupplier(input) {
      state = loadDemoState();
      const sup: ErpSupplierRecord = {
        id: makeUuid(),
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        paymentTerms: input.paymentTerms?.trim() || "NET 14",
        status: "active",
        createdAt: new Date().toISOString(),
      };
      state.suppliers = [sup, ...state.suppliers];
      commit();
      return sup;
    },

    async updateSupplier(supplierId, input) {
      state = loadDemoState();
      const idx = state.suppliers.findIndex((s) => s.id === supplierId);
      if (idx === -1) throw new Error("Supplier tidak ditemukan.");
      const updated: ErpSupplierRecord = {
        ...state.suppliers[idx],
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
        ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms.trim() || "NET 14" } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      state.suppliers[idx] = updated;
      pushAudit("erp.supplier.updated", "erp_supplier", supplierId, input);
      commit();
      return updated;
    },

    async deleteSupplier(supplierId) {
      state = loadDemoState();
      state.suppliers = state.suppliers.filter((s) => s.id !== supplierId);
      pushAudit("erp.supplier.deleted", "erp_supplier", supplierId, {});
      commit();
    },

    async createPosOrder(input) {
      state = loadDemoState();
      const now = new Date().toISOString();
      const fraud = evaluateFraudRisk({
        message: `${input.customerName} ${input.notes ?? ""}`,
        extractedOrder: null,
        discountAmount: input.discountAmount,
      });

      const order = buildOrderRecord({
        id: makeUuid(),
        workspaceName: state.workspaceName,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone ?? null,
        shippingAddress: input.shippingAddress.trim(),
        shippingCourier: input.shippingCourier ?? "JNE Express",
        shippingService: input.shippingService ?? null,
        shippingCost: input.shippingCost ?? 0,
        shippingWeightKg: input.shippingWeightKg,
        channel: input.channel ?? "whatsapp",
        paymentMethod: input.paymentMethod,
        paymentStatus: fraud.blocked ? "flagged" : input.paymentStatus,
        discountAmount: input.discountAmount ?? 0,
        taxRate: input.taxRate ?? 0.11,
        items: input.items.map((i) => ({
          id: makeUuid(),
          productId: i.productId ?? null,
          sku: i.sku,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice ?? 0,
        })),
        aiGenerated: Boolean(input.aiGenerated),
        fraudRiskScore: fraud.riskScore,
        conversationId: input.conversationId ?? null,
        contactId: input.contactId ?? null,
        notes: input.notes ?? null,
      });

      state.orders = [order, ...state.orders];
      for (const item of order.items) {
        if (item.productId) {
          state.products = state.products.map((p) =>
            p.id === item.productId
              ? { ...p, stockQty: Math.max(0, p.stockQty - item.quantity), updatedAt: now }
              : p,
          );
          state.stockMovements.unshift({
            id: makeUuid(),
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            movementType: "out",
            quantity: -item.quantity,
            referenceType: "pos_order",
            referenceId: order.id,
            notes: `Penjualan ${order.invoiceNumber}`,
            createdAt: now,
          });
        }
      }

      const journal = buildDoubleEntryForOrder(order).map((l) => ({
        ...l,
        id: makeUuid(),
        createdAt: now,
      }));
      state.accountingEntries = [...journal, ...state.accountingEntries];
      pushAudit("pos.order.created", "pos_order", order.id, {
        invoiceNumber: order.invoiceNumber,
        totalAmount: order.totalAmount,
      });
      commit();
      return order;
    },

    async updatePosOrder(orderId, input) {
      state = loadDemoState();
      const now = new Date().toISOString();
      const prev = state.orders.find((o) => o.id === orderId);
      const justPaid = prev && prev.paymentStatus !== "paid" && input.paymentStatus === "paid";

      state.orders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        const nextCustomerName = input.customerName ?? o.customerName;
        const nextShippingAddress = input.shippingAddress ?? o.shippingAddress;
        const nextShippingCost = input.shippingCost !== undefined ? Math.max(0, input.shippingCost) : (o.shippingCost ?? 0);
        const nextTotal =
          Math.max(0, o.subtotal - o.discountAmount) + o.taxAmount + nextShippingCost;
        const needsQrRefresh =
          input.customerName !== undefined ||
          input.shippingAddress !== undefined ||
          input.shippingCost !== undefined;
        const nextQr = needsQrRefresh
          ? buildInvoiceQrPayload({
              invoiceNumber: o.invoiceNumber,
              customerName: nextCustomerName,
              shippingAddress: nextShippingAddress,
              totalAmount: nextTotal,
              paymentMethod: o.paymentMethod,
              workspaceName: state.workspaceName,
            })
          : o.qrPayload;
        return {
          ...o,
          ...input,
          customerName: nextCustomerName,
          shippingAddress: nextShippingAddress,
          shippingCost: nextShippingCost,
          totalAmount: nextTotal,
          qrPayload: nextQr,
          ...(justPaid ? { paidAt: now, orderStatus: o.orderStatus === "draft" ? "confirmed" : o.orderStatus } : {}),
          updatedAt: now,
        };
      });

      // Automatically settle Accounts Receivable -> Cash/Bank in Double-Entry Accounting when customer pays!
      if (justPaid && prev) {
        const entryDate = now.slice(0, 10);
        const jeNum = `JE-PAY-${prev.invoiceNumber.replace(/^INV-/, "")}`;
        state.accountingEntries = [
          {
            id: makeUuid(),
            entryNumber: jeNum,
            entryDate,
            accountCode: "1100",
            accountName: "Kas & Bank / QRIS",
            accountType: "asset",
            debit: prev.totalAmount,
            credit: 0,
            referenceType: "pos_payment",
            referenceId: prev.id,
            description: `Pelunasan otomatis Invoice ${prev.invoiceNumber} (${prev.customerName})`,
            aiVerified: true,
            createdAt: now,
          },
          {
            id: makeUuid(),
            entryNumber: jeNum,
            entryDate,
            accountCode: "1200",
            accountName: "Piutang Usaha",
            accountType: "asset",
            debit: 0,
            credit: prev.totalAmount,
            referenceType: "pos_payment",
            referenceId: prev.id,
            description: `Pelunasan piutang Invoice ${prev.invoiceNumber}`,
            aiVerified: true,
            createdAt: now,
          },
          ...state.accountingEntries,
        ];
        pushAudit("pos.order.paid", "pos_order", prev.id, {
          invoiceNumber: prev.invoiceNumber,
          amount: prev.totalAmount,
        });
      }
      commit();
    },

    async deletePosOrder(orderId) {
      state = loadDemoState();
      state.orders = state.orders.filter((o) => o.id !== orderId);
      commit();
    },

    async createAccountingEntry(input) {
      state = loadDemoState();
      const now = new Date().toISOString();
      const entryDate = input.entryDate ?? now.slice(0, 10);
      const entryNumber = `JE-MAN-${Date.now().toString().slice(-6)}`;
      const pairs: Array<Omit<AccountingEntryRecord, "id" | "createdAt">> =
        input.kind === "expense"
          ? [
              {
                entryNumber,
                entryDate,
                accountCode: "6100",
                accountName: `Beban ${input.categoryName}`,
                accountType: "expense",
                debit: input.amount,
                credit: 0,
                referenceType: "manual",
                referenceId: null,
                description: input.description,
                aiVerified: true,
              },
              {
                entryNumber,
                entryDate,
                accountCode: "1100",
                accountName: "Kas & Bank / QRIS",
                accountType: "asset",
                debit: 0,
                credit: input.amount,
                referenceType: "manual",
                referenceId: null,
                description: input.description,
                aiVerified: true,
              },
            ]
          : input.kind === "income"
            ? [
                {
                  entryNumber,
                  entryDate,
                  accountCode: "1100",
                  accountName: "Kas & Bank / QRIS",
                  accountType: "asset",
                  debit: input.amount,
                  credit: 0,
                  referenceType: "manual",
                  referenceId: null,
                  description: input.description,
                  aiVerified: true,
                },
                {
                  entryNumber,
                  entryDate,
                  accountCode: "4200",
                  accountName: `Pendapatan ${input.categoryName}`,
                  accountType: "revenue",
                  debit: 0,
                  credit: input.amount,
                  referenceType: "manual",
                  referenceId: null,
                  description: input.description,
                  aiVerified: true,
                },
              ]
            : [
                {
                  entryNumber,
                  entryDate,
                  accountCode: "1100",
                  accountName: "Kas & Bank / QRIS",
                  accountType: "asset",
                  debit: input.amount,
                  credit: 0,
                  referenceType: "manual",
                  referenceId: null,
                  description: input.description,
                  aiVerified: true,
                },
                {
                  entryNumber,
                  entryDate,
                  accountCode: "3100",
                  accountName: `Modal ${input.categoryName}`,
                  accountType: "equity",
                  debit: 0,
                  credit: input.amount,
                  referenceType: "manual",
                  referenceId: null,
                  description: input.description,
                  aiVerified: true,
                },
              ];

      state.accountingEntries = [
        ...pairs.map((p) => ({ ...p, id: makeUuid(), createdAt: now })),
        ...state.accountingEntries,
      ];
      pushAudit("accounting.entry.created", "accounting_entry", entryNumber, { kind: input.kind, amount: input.amount });
      commit();
      return { entryNumber };
    },

    async deleteAccountingEntry(entryNumber) {
      state = loadDemoState();
      state.accountingEntries = state.accountingEntries.filter((e) => e.entryNumber !== entryNumber);
      commit();
    },
  };
}
