import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPublisherSyncSecret } from "@/lib/publisher-sync";
import {
  deletePublisherWebsiteLead,
  listPublisherWebsiteLeads,
  updatePublisherWebsiteLead,
  upsertPublisherWebsiteLead,
} from "@/lib/publisher-leads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadCreateSchema = z.object({
  id: z.string().max(120).optional(),
  registrationCode: z.string().min(3).max(60),
  fullName: z.string().min(1).max(160),
  companyName: z.string().min(1).max(160),
  email: z.string().email().max(160),
  whatsapp: z.string().max(40).default(""),
  city: z.string().max(80).default("Indonesia"),
  industry: z.string().max(100).default("UMKM & Retail"),
  teamSize: z.string().max(40).default("1-5 orang"),
  interestedEdition: z.enum(["starter", "pro", "enterprise", "sovereign"]).default("pro"),
  source: z
    .enum(["enterprise_website", "website_ai_chat", "whatsapp_inbound", "manual_ems"])
    .default("enterprise_website"),
  notes: z.string().max(2000).default(""),
  status: z
    .enum(["new", "ai_engaged", "qualified", "follow_up", "converted", "archived"])
    .default("ai_engaged"),
  aiScore: z.number().int().min(0).max(100).default(75),
  aiRecommendedEdition: z.enum(["starter", "pro", "enterprise", "sovereign"]).default("pro"),
  aiWelcomeReply: z.string().max(4000).default(""),
  followUpStage: z.enum(["H+0", "H+1", "H+3", "H+7", "closed"]).default("H+0"),
  lastFollowUpAt: z.string().nullable().default(null),
  chatTranscriptJson: z.string().max(20000).default("[]"),
});

const leadPatchSchema = z.object({
  id: z.string().min(3).max(120),
  status: z.enum(["new", "ai_engaged", "qualified", "follow_up", "converted", "archived"]).optional(),
  followUpStage: z.enum(["H+0", "H+1", "H+3", "H+7", "closed"]).optional(),
  lastFollowUpAt: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
  interestedEdition: z.enum(["starter", "pro", "enterprise", "sovereign"]).optional(),
  aiScore: z.number().int().min(0).max(100).optional(),
  aiWelcomeReply: z.string().max(4000).optional(),
  chatTranscriptJson: z.string().max(20000).optional(),
  companyName: z.string().min(1).max(160).optional(),
  fullName: z.string().min(1).max(160).optional(),
  whatsapp: z.string().max(40).optional(),
  city: z.string().max(80).optional(),
});

export async function GET(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const leads = await listPublisherWebsiteLeads(250);
  return NextResponse.json({ ok: true, leads });
}

export async function POST(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid lead payload" }, { status: 400 });
  }
  const saved = await upsertPublisherWebsiteLead(parsed.data);
  return NextResponse.json({ ok: true, lead: saved }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = leadPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid lead update payload" }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;
  const updated = await updatePublisherWebsiteLead(id, patch);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lead: updated });
}

export async function DELETE(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing lead id" }, { status: 400 });
  }
  await deletePublisherWebsiteLead(id);
  return NextResponse.json({ ok: true, deletedId: id });
}
