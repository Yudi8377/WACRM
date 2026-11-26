import { describe, expect, it } from "vitest";
import { createDemoWorkspaceAdapter } from "./demo-store";

describe("Demo workspace adapter full CRUD lifecycle", () => {
  it("supports create, read, update, and delete across contacts, conversations, messages, notes, channels, quick replies, templates, and workspace", async () => {
    const adapter = createDemoWorkspaceAdapter();
    expect(adapter.mode).toBe("demo");

    const initial = await adapter.loadAll();
    expect(initial.contacts.length).toBeGreaterThanOrEqual(4);
    expect(initial.conversations.length).toBeGreaterThanOrEqual(3);
    expect(initial.channels.length).toBeGreaterThanOrEqual(2);

    // 1. Contact CRUD
    const createdContact = await adapter.createContact({
      displayName: "Dina Kusuma",
      phoneE164: "+6281234567890",
      company: "PT Nusantara Jaya",
      lifecycleStage: "prospect",
      tags: ["enterprise"],
    });
    expect(createdContact.displayName).toBe("Dina Kusuma");

    const updatedContact = await adapter.updateContact(createdContact.id, {
      lifecycleStage: "vip",
      tags: ["enterprise", "priority"],
    });
    expect(updatedContact.lifecycleStage).toBe("vip");
    expect(updatedContact.tags).toContain("priority");

    // 2. Conversation, Message, and Internal Note CRUD
    const conv = await adapter.createConversation({
      contactId: createdContact.id,
      channel: "whatsapp",
      priority: "high",
      subject: "Penawaran Paket Tahunan",
      initialMessage: "Halo Bu Dina, berikut penawaran resmi kami.",
    });
    expect(conv.id).toBeTruthy();

    const msg = await adapter.sendMessage(conv.id, "Apakah jadwal demo hari Jumat cocok?");
    expect(msg.messageId).toBeTruthy();
    expect(msg.status).toBe("delivered");

    const note = await adapter.addNote(conv.id, "Siapkan kontrak PDF untuk tanda tangan.");
    expect(note.bodyText).toContain("kontrak PDF");

    const detail = await adapter.loadConversationDetail(conv.id);
    expect(detail.messages.length).toBe(2);
    expect(detail.notes.length).toBe(1);

    await adapter.updateConversation(conv.id, { status: "resolved", priority: "normal" });
    const afterUpdate = await adapter.loadConversationDetail(conv.id);
    expect(afterUpdate.conversation.status).toBe("resolved");

    // 3. Channel CRUD
    const channel = await adapter.createChannel({
      channel: "instagram",
      displayName: "IG Resmi Nusantara",
      externalAccountId: "ig_biz_9991",
      status: "connected",
    });
    expect(channel.channel).toBe("instagram");
    await adapter.updateChannel(channel.id, { status: "disabled" });
    await adapter.deleteChannel(channel.id);

    // 4. Quick Reply CRUD
    const qr = await adapter.createQuickReply({
      shortcut: "/promo",
      title: "Promo Akhir Bulan",
      bodyText: "Dapatkan diskon 15% untuk pemesanan minggu ini.",
      category: "sales",
    });
    expect(qr.shortcut).toBe("/promo");
    await adapter.updateQuickReply(qr.id, { title: "Promo Spesial" });
    await adapter.deleteQuickReply(qr.id);

    // 5. WhatsApp Template CRUD
    const tpl = await adapter.createTemplate({
      channel: "whatsapp",
      name: "konfirmasi_pengiriman",
      category: "utility",
      language: "id",
      bodyText: "Pesanan #{{1}} telah dikirim melalui {{2}}.",
      status: "approved",
    });
    expect(tpl.name).toBe("konfirmasi_pengiriman");
    await adapter.deleteTemplate(tpl.id);

    // 6. Workspace Settings Update + Cleanup
    await adapter.updateWorkspace("WACRM Nusantara Live");
    const afterWs = await adapter.loadAll();
    expect(afterWs.workspaceName).toBe("WACRM Nusantara Live");

    await adapter.deleteConversation(conv.id);
    await adapter.deleteContact(createdContact.id);

    const finalSnap = await adapter.loadAll();
    expect(finalSnap.contacts.some((c) => c.id === createdContact.id)).toBe(false);
    expect(finalSnap.conversations.some((c) => c.id === conv.id)).toBe(false);
  });
});
