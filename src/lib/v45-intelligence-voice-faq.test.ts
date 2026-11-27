import { describe, expect, it } from "vitest";
import { getEditionById } from "./editions";
import { resolveStrictSessionEntitlement } from "./license-crypto";
import { answerAppFaqWithMultiAgent, PRESET_APP_FAQS } from "./community-faq";
import { processCompanionTurn } from "./ai-companion-engine";
import { prepareNaturalSpeechText, splitIntoNaturalSpeechChunks } from "./warm-voice";
import { createDemoWorkspaceAdapter } from "./demo-store";
import { getDefaultStoreProfile } from "./store-profile";
import { POST as telemetryPost } from "@/app/api/telemetry/route";
import { GET as communityGet, POST as communityPost } from "@/app/api/community/route";
import {
  GET as intelligenceGet,
  PATCH as intelligencePatch,
} from "@/app/api/publisher/intelligence/route";
import { getPublisherSyncSecret } from "./publisher-sync";
import { classifyIndonesianSentiment, resetIntelligenceMemoryForTest } from "./publisher-intelligence";

describe("v4.5 Revised Licensing & Trial Rules (Free UMKM / 14d Pro / 7d Enterprise)", () => {
  it("configures Starter UMKM as Free Forever (0 trial days), Growth Pro 14d, Enterprise 7d, Sovereign License Only", () => {
    const starter = getEditionById("starter");
    const pro = getEditionById("pro");
    const enterprise = getEditionById("enterprise");
    const sovereign = getEditionById("sovereign");

    expect(starter.monthlyPriceIdr).toBe(0);
    expect(starter.trialDays).toBe(0);
    expect(pro.trialDays).toBe(14);
    expect(enterprise.trialDays).toBe(7);
    expect(sovereign.trialDays).toBe(0);
  });

  it("grants Pro 14d and Enterprise 7d during active trial, falls back to Starter UMKM when expired, and keeps Sovereign License-Key only", () => {
    const futureTrial = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const expiredTrial = new Date(Date.now() - 86_400_000).toISOString();

    const activePro = resolveStrictSessionEntitlement({
      tenantId: "demo-tenant",
      accountEmail: "pro-tester@umkm.id",
      sessionEditionId: "pro",
      trialEndsAt: futureTrial,
    });
    expect(activePro.editionId).toBe("pro");
    expect(activePro.isTrialActive).toBe(true);

    const expiredPro = resolveStrictSessionEntitlement({
      tenantId: "demo-tenant",
      accountEmail: "pro-tester@umkm.id",
      sessionEditionId: "pro",
      trialEndsAt: expiredTrial,
    });
    expect(expiredPro.editionId).toBe("starter");
    expect(expiredPro.isTrialActive).toBe(false);

    const activeEnt = resolveStrictSessionEntitlement({
      tenantId: "demo-tenant",
      accountEmail: "ent-tester@umkm.id",
      sessionEditionId: "enterprise",
      trialEndsAt: futureTrial,
    });
    expect(activeEnt.editionId).toBe("enterprise");
    expect(activeEnt.isTrialActive).toBe(true);

    // Sovereign can NEVER be granted without an official signed License Key
    const forgedSov = resolveStrictSessionEntitlement({
      tenantId: "demo-tenant",
      accountEmail: "attacker@umkm.id",
      sessionEditionId: "sovereign",
      trialEndsAt: futureTrial,
    });
    expect(forgedSov.editionId).toBe("starter");
  });
});

describe("v4.5 Multi-Agent Contextual FAQ, Warm Voice & Natural Human Conversational AI", () => {
  it("answers contextual WACRM questions through specialized Multi-Agent FAQ roles", () => {
    expect(PRESET_APP_FAQS.length).toBeGreaterThanOrEqual(6);

    const licensing = answerAppFaqWithMultiAgent({
      question: "Apakah Starter UMKM benar gratis selamanya dan berapa lama trial Pro & Enterprise?",
      editionId: "starter",
    });
    expect(licensing.agentName).toBeTruthy();
    expect(licensing.answer.toLowerCase()).toContain("gratis selamanya");
    expect(licensing.answer).toContain("14 hari");
    expect(licensing.answer).toContain("7 hari");

    const voiceFaq = answerAppFaqWithMultiAgent({
      question: "Kenapa asisten suara AI tidak berbunyi dan bagaimana cara aktifkan suara hangat?",
      editionId: "pro",
    });
    expect(voiceFaq.answer.toLowerCase()).toContain("suara");
    expect(voiceFaq.followUpQuestions.length).toBeGreaterThan(0);
  });

  it("responds warmly and naturally to everyday Indonesian human greetings & small talk", async () => {
    const adapter = createDemoWorkspaceAdapter();
    const snapshot = await adapter.loadAll();
    const storeProfile = getDefaultStoreProfile("Kopi Nusantara");
    const morningDate = new Date("2026-11-26T08:00:00+07:00");

    const greeting = processCompanionTurn({
      userText: "Halo apa kabar?",
      activeTab: "inbox",
      editionId: "starter",
      userName: "Budi",
      snapshot,
      storeProfile,
      pendingAction: null,
      now: morningDate,
    });
    expect(greeting.replyText.toLowerCase()).toContain("budi");
    expect(greeting.replyText.toLowerCase()).toMatch(/kabar|baik|hangat|sehat/);
    expect(greeting.speechText.length).toBeGreaterThan(20);
    expect(greeting.shouldEndSession).toBe(false);

    const morningGreeting = processCompanionTurn({
      userText: "Selamat pagi!",
      activeTab: "inbox",
      editionId: "starter",
      userName: "Sari",
      snapshot,
      storeProfile,
      pendingAction: null,
      now: morningDate,
    });
    expect(morningGreeting.replyText.toLowerCase()).toContain("selamat pagi");
    expect(morningGreeting.replyText.toLowerCase()).toContain("sari");

    const thanks = processCompanionTurn({
      userText: "Terima kasih banyak ya sudah membantu!",
      activeTab: "pos",
      editionId: "starter",
      userName: "Sari",
      snapshot,
      storeProfile,
      pendingAction: null,
      now: morningDate,
    });
    expect(thanks.replyText.toLowerCase()).toMatch(/sama-sama|senang/);

    const tired = processCompanionTurn({
      userText: "Aduh hari ini capek banget jualan sepi",
      activeTab: "inbox",
      editionId: "starter",
      userName: "Rina",
      snapshot,
      storeProfile,
      pendingAction: null,
      now: morningDate,
    });
    expect(tired.replyText.toLowerCase()).toMatch(/semangat|istirahat|bantu|tenang/);
  });

  it("sanitizes markdown/emoji and splits long Indonesian speech into Chrome-safe warm chunks", () => {
    const clean = prepareNaturalSpeechText(
      "Halo **Bapak/Ibu**! 🎉 Omzet Rp 1.500.000 hari ini `bagus` sekali.",
    );
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("`");
    expect(clean).toContain("rupiah");

    const longSpeech =
      "Selamat pagi Bapak Ibu pemilik usaha. Hari ini omzet kita sangat sehat dan stok produk utama aman terkendali. " +
      "Ada 3 pelanggan yang menunggu balasan di kotak masuk WhatsApp dan 2 transaksi kasir baru saja lunas via QRIS. " +
      "Kalau berkenan, saya bisa langsung bantu siapkan draf promo sore hari supaya penjualan makin ramai.";
    const chunks = splitIntoNaturalSpeechChunks(longSpeech, 140);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("v4.5 Telemetry, Photo Testimonials & Publisher HQ Intelligence APIs", () => {
  it("classifies Indonesian sentiment accurately for Publisher HQ grouping", () => {
    expect(
      classifyIndonesianSentiment("Aplikasi sangat bagus dan membantu omzet toko!", 5, "very_useful"),
    ).toBe("positive");
    expect(
      classifyIndonesianSentiment(
        "Suara agak error dan tombol masih lambat, mohon diperbaiki",
        2,
        "needs_work",
      ),
    ).toBe("constructive");
  });

  it("records usage telemetry, market signals, photo testimonials & returns full Publisher HQ Intelligence Report", async () => {
    resetIntelligenceMemoryForTest();

    // 1. Record usage telemetry + POS market signal
    const telRes = await telemetryPost(
      new Request("http://localhost/api/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.1" },
        body: JSON.stringify({
          usage: {
            tenantEmail: "kediri@umkm.id",
            businessName: "Tahu Takwa Kediri",
            editionId: "starter",
            platform: "web",
            region: "Kediri, Jawa Timur",
            featureKey: "pos",
            durationSeconds: 420,
            localHour: 19,
            sessionId: "sess-v45-test-1",
          },
          market: {
            tenantEmail: "kediri@umkm.id",
            region: "Kediri, Jawa Timur",
            productCategory: "Kuliner & F&B",
            productName: "Paket Tahu Takwa Premium",
            avgPriceIdr: 45000,
            unitsSold: 4,
            orderValueIdr: 180000,
            paymentMethod: "qris",
            channel: "whatsapp",
            buyerHour: 19,
            repeatBuyer: true,
          },
        }),
      }),
    );
    expect(telRes.status).toBe(201);

    // 2. Submit a testimonial with a real photo data URL
    const sampleTinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const comRes = await communityPost(
      new Request("http://localhost/api/community", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.2" },
        body: JSON.stringify({
          kind: "testimonial",
          tenantEmail: "kediri@umkm.id",
          displayName: "Bu Hendra",
          businessName: "Tahu Takwa Kediri",
          editionId: "starter",
          region: "Kediri, Jawa Timur",
          category: "Kasir POS & QRIS",
          rating: 5,
          usefulness: "very_useful",
          headline: "Gratis Selamanya Tapi Fiturnya Kelas Enterprise!",
          message: "Kasir POS, struk QR, dan asisten suara hangatnya sangat membantu pegawai kami.",
          photoDataUrl: sampleTinyPng,
        }),
      }),
    );
    expect(comRes.status).toBe(201);
    const createdCom = (await comRes.json()) as {
      ok: boolean;
      entry: { id: string; photoDataUrl: string | null };
    };
    expect(createdCom.ok).toBe(true);
    expect(createdCom.entry.photoDataUrl).toBe(sampleTinyPng);

    // 3. Public GET /api/community returns testimonials with photos
    const pubList = await communityGet();
    expect(pubList.status).toBe(200);
    const pubData = (await pubList.json()) as {
      ok: boolean;
      testimonials: Array<{ id: string; photoDataUrl: string | null }>;
    };
    expect(pubData.ok).toBe(true);
    expect(pubData.testimonials.some((t) => t.id === createdCom.entry.id)).toBe(true);

    // 4. Unauthorized GET /api/publisher/intelligence is strictly rejected (401)
    const unauth = await intelligenceGet(
      new Request("http://localhost/api/publisher/intelligence", { method: "GET" }),
    );
    expect(unauth.status).toBe(401);

    // 5. Authorized Publisher HQ GET /api/publisher/intelligence returns pie charts, usage, VOC & economics
    const authRes = await intelligenceGet(
      new Request("http://localhost/api/publisher/intelligence", {
        method: "GET",
        headers: { "x-publisher-sync-secret": getPublisherSyncSecret() },
      }),
    );
    expect(authRes.status).toBe(200);
    const intel = (await authRes.json()) as {
      ok: boolean;
      report: {
        usage: {
          regionBreakdown: Array<{ label: string; percent: number }>;
          topFeatures: Array<{ featureKey: string }>;
          hourlyActivity: Array<{ hour: number }>;
        };
        voiceOfCustomer: {
          strategicDecisions: Array<{ title: string }>;
          testimonials: Array<{ id: string; photoDataUrl: string | null }>;
        };
        economics: {
          productTrends: Array<{ category: string; demandIndex: number }>;
          channelPreference: Array<{ label: string }>;
          paymentPreference: Array<{ label: string }>;
          regionalEconomyIndex: Array<{ region: string }>;
        };
      };
    };
    expect(intel.ok).toBe(true);
    expect(intel.report.usage.regionBreakdown.length).toBeGreaterThan(0);
    expect(intel.report.usage.hourlyActivity.length).toBe(24);
    expect(intel.report.usage.topFeatures.length).toBeGreaterThan(0);
    expect(intel.report.voiceOfCustomer.strategicDecisions.length).toBeGreaterThan(0);
    expect(
      intel.report.voiceOfCustomer.testimonials.some(
        (t) => t.id === createdCom.entry.id && t.photoDataUrl === sampleTinyPng,
      ),
    ).toBe(true);
    expect(intel.report.economics.productTrends.length).toBeGreaterThan(0);
    expect(intel.report.economics.channelPreference.length).toBeGreaterThan(0);
    expect(intel.report.economics.paymentPreference.length).toBeGreaterThan(0);
    expect(intel.report.economics.regionalEconomyIndex.length).toBeGreaterThan(0);

    // 6. Publisher HQ PATCH updates action status on feedback
    const patchRes = await intelligencePatch(
      new Request("http://localhost/api/publisher/intelligence", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-publisher-sync-secret": getPublisherSyncSecret(),
        },
        body: JSON.stringify({
          feedbackId: createdCom.entry.id,
          actionStatus: "planned",
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
  });
});
