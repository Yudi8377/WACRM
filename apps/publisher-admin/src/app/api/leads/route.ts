import { NextResponse } from "next/server";
import { z } from "zod";
import {
  qualifyWebsiteLead,
  type PublisherWebsiteLead,
} from "@/lib/publisher-ai-agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

const globalLeads = globalThis as unknown as {
  __pubWebsiteLeads?: Map<string, PublisherWebsiteLead>;
};

function getLeadCache(): Map<string, PublisherWebsiteLead> {
  if (!globalLeads.__pubWebsiteLeads) {
    globalLeads.__pubWebsiteLeads = new Map();
  }
  return globalLeads.__pubWebsiteLeads;
}

function getSyncSecret(): string {
  return process.env.PUBLISHER_SYNC_SECRET?.trim() || "wacrm-publisher-sync-v42-default-key";
}

function getClientApiBaseUrl(): string {
  return (process.env.WACRM_CLIENT_API_URL?.trim() || "https://wacrm-seven-dusky.vercel.app").replace(/\/$/, "");
}

const createLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  companyName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().min(6).max(40),
  city: z.string().trim().max(80).default("Indonesia"),
  industry: z.string().trim().max(100).default("UMKM & Retail"),
  teamSize: z.string().trim().max(40).default("1-10 orang"),
  interestedEdition: z.enum(["starter", "pro", "enterprise", "sovereign"]).default("pro"),
  source: z
    .enum(["enterprise_website", "website_ai_chat", "whatsapp_inbound", "manual_ems"])
    .default("enterprise_website"),
  notes: z.string().trim().max(2000).default(""),
});

const patchLeadSchema = z.object({
  id: z.string().min(3).max(120),
  status: z.enum(["new", "ai_engaged", "qualified", "follow_up", "converted", "archived"]).optional(),
  followUpStage: z.enum(["H+0", "H+1", "H+3", "H+7", "closed"]).optional(),
  lastFollowUpAt: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
  interestedEdition: z.enum(["starter", "pro", "enterprise", "sovereign"]).optional(),
  companyName: z.string().min(1).max(160).optional(),
  fullName: z.string().min(1).max(160).optional(),
  whatsapp: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        sender: z.enum(["prospect", "ai_agent", "publisher_admin"]),
        agentId: z.string().optional(),
        agentName: z.string().optional(),
        text: z.string(),
        timestamp: z.string(),
      }),
    )
    .optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const merged = new Map<string, PublisherWebsiteLead>();
  let remoteSynced = false;

  try {
    const res = await fetch(`${getClientApiBaseUrl()}/api/publisher/leads`, {
      method: "GET",
      headers: { "x-publisher-sync-secret": getSyncSecret() },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        leads?: Array<
          Omit<PublisherWebsiteLead, "messages"> & { chatTranscriptJson?: string }
        >;
      };
      if (Array.isArray(data.leads)) {
        remoteSynced = true;
        for (const row of data.leads) {
          let msgs: PublisherWebsiteLead["messages"] = [];
          try {
            const parsed = JSON.parse(row.chatTranscriptJson || "[]");
            if (Array.isArray(parsed)) msgs = parsed;
          } catch {
            msgs = [];
          }
          const hydrated: PublisherWebsiteLead = {
            ...row,
            messages: msgs,
          };
          merged.set(hydrated.id, hydrated);
          getLeadCache().set(hydrated.id, hydrated);
        }
      }
    }
  } catch {
    // Use local cache if remote temporarily unreachable
  }

  for (const [id, item] of getLeadCache().entries()) {
    if (!merged.has(id)) merged.set(id, item);
  }

  const leads = Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(
    { ok: true, remoteSynced, total: leads.length, leads },
    { headers: CORS_HEADERS },
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Data pendaftaran belum lengkap atau format email/WA tidak valid." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const d = parsed.data;
  const now = new Date().toISOString();
  const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const registrationCode = `WCRM-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const qualified = qualifyWebsiteLead({
    fullName: d.fullName,
    companyName: d.companyName,
    interestedEdition: d.interestedEdition,
    teamSize: d.teamSize,
    industry: d.industry,
    city: d.city,
    notes: d.notes,
  });

  const initialMessages: PublisherWebsiteLead["messages"] = [
    {
      id: `msg-${Date.now()}-1`,
      sender: "prospect",
      text:
        d.notes ||
        `Pendaftaran resmi untuk ${d.companyName} (${d.industry}, tim ${d.teamSize}) — minat edisi ${d.interestedEdition.toUpperCase()}.`,
      timestamp: now,
    },
    {
      id: `msg-${Date.now()}-2`,
      sender: "ai_agent",
      agentId: "ai_concierge",
      agentName: "Nadia AI · Sales Concierge 24/7",
      text: qualified.aiWelcomeReply,
      timestamp: now,
    },
  ];

  const lead: PublisherWebsiteLead = {
    id,
    registrationCode,
    fullName: d.fullName,
    companyName: d.companyName,
    email: d.email,
    whatsapp: d.whatsapp,
    city: d.city,
    industry: d.industry,
    teamSize: d.teamSize,
    interestedEdition: d.interestedEdition,
    source: d.source,
    notes: d.notes,
    status: "ai_engaged",
    aiScore: qualified.aiScore,
    aiRecommendedEdition: qualified.aiRecommendedEdition,
    aiWelcomeReply: qualified.aiWelcomeReply,
    followUpStage: "H+0",
    lastFollowUpAt: now,
    messages: initialMessages,
    createdAt: now,
    updatedAt: now,
  };

  getLeadCache().set(lead.id, lead);

  // Persist durably in Neon PostgreSQL via main backend sync channel
  try {
    await fetch(`${getClientApiBaseUrl()}/api/publisher/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publisher-sync-secret": getSyncSecret(),
      },
      body: JSON.stringify({
        ...lead,
        chatTranscriptJson: JSON.stringify(lead.messages),
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    // Non-fatal — cached locally
  }

  const clientAppBase = getClientApiBaseUrl();
  const privateAccessUrl = `${clientAppBase}/sign-up?email=${encodeURIComponent(d.email)}&name=${encodeURIComponent(d.fullName)}&business=${encodeURIComponent(d.companyName)}&edition=${encodeURIComponent(qualified.aiRecommendedEdition)}&ref=${encodeURIComponent(registrationCode)}`;

  return NextResponse.json(
    {
      ok: true,
      lead,
      registrationCode,
      aiScore: qualified.aiScore,
      aiRecommendedEdition: qualified.aiRecommendedEdition,
      aiWelcomeReply: qualified.aiWelcomeReply,
      publisherPortalUrl: "https://wacrm-publisher-hq.vercel.app",
      privateAccessUrl,
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = patchLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Payload pembaruan lead tidak valid." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const { id, messages, ...rest } = parsed.data;
  const cached = getLeadCache().get(id);
  if (cached) {
    getLeadCache().set(id, {
      ...cached,
      ...rest,
      ...(messages ? { messages: messages as PublisherWebsiteLead["messages"] } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    await fetch(`${getClientApiBaseUrl()}/api/publisher/leads`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-publisher-sync-secret": getSyncSecret(),
      },
      body: JSON.stringify({
        id,
        ...rest,
        ...(messages ? { chatTranscriptJson: JSON.stringify(messages) } : {}),
      }),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ ok: true, id }, { headers: CORS_HEADERS });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400, headers: CORS_HEADERS });
  }
  getLeadCache().delete(id);
  try {
    await fetch(`${getClientApiBaseUrl()}/api/publisher/leads?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-publisher-sync-secret": getSyncSecret() },
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    // Non-fatal
  }
  return NextResponse.json({ ok: true, deletedId: id }, { headers: CORS_HEADERS });
}
