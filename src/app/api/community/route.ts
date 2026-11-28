import { NextResponse } from "next/server";
import { z } from "zod";
import { listCommunityEntries, recordCommunityFeedback } from "@/lib/publisher-intelligence";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const communityPostSchema = z.object({
  kind: z.enum(["feedback", "testimonial"]).default("feedback"),
  tenantEmail: z.string().trim().max(160).optional().default(""),
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  businessName: z.string().trim().max(140).optional().default(""),
  editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]).optional().default("starter"),
  region: z.string().trim().max(80).optional().default("Indonesia"),
  category: z.string().trim().max(60).optional().default("Umum"),
  rating: z.number().min(1).max(5).default(5),
  usefulness: z.enum(["very_useful", "useful", "needs_work"]).default("very_useful"),
  headline: z.string().trim().max(140).optional().default(""),
  message: z.string().trim().min(8, "Tulis pesan/testimoni minimal 8 karakter.").max(1500),
  photoDataUrl: z.string().max(350_000).nullable().optional(),
});

export async function GET() {
  const entries = await listCommunityEntries();
  const testimonials = entries.filter((e) => e.kind === "testimonial");
  const comments = entries.filter((e) => e.kind === "feedback");
  const avgRating =
    entries.length > 0
      ? Math.round((entries.reduce((s, e) => s + e.rating, 0) / entries.length) * 10) / 10
      : 5;
  const usefulPct =
    entries.length > 0
      ? Math.round(
          (entries.filter((e) => e.usefulness === "very_useful" || e.usefulness === "useful")
            .length /
            entries.length) *
            100,
        )
      : 95;

  // Strip private email from public showcase response
  const sanitizePublic = (e: (typeof entries)[number]) => ({
    id: e.id,
    kind: e.kind,
    displayName: e.displayName,
    businessName: e.businessName,
    editionId: e.editionId,
    region: e.region,
    category: e.category,
    rating: e.rating,
    usefulness: e.usefulness,
    sentiment: e.sentiment,
    headline: e.headline,
    message: e.message,
    photoDataUrl: e.photoDataUrl,
    createdAt: e.createdAt,
  });

  return NextResponse.json({
    ok: true,
    summary: {
      total: entries.length,
      testimonialsCount: testimonials.length,
      commentsCount: comments.length,
      avgRating,
      usefulPct,
    },
    testimonials: testimonials.slice(0, 24).map(sanitizePublic),
    comments: comments.slice(0, 24).map(sanitizePublic),
  });
}

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`community_post:${ip}`, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Terlalu banyak kiriman dalam waktu singkat. Coba lagi beberapa menit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = communityPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Data masukan tidak valid." },
      { status: 400 },
    );
  }

  const saved = await recordCommunityFeedback(parsed.data);
  return NextResponse.json(
    {
      ok: true,
      entry: {
        id: saved.id,
        kind: saved.kind,
        displayName: saved.displayName,
        businessName: saved.businessName,
        editionId: saved.editionId,
        region: saved.region,
        category: saved.category,
        rating: saved.rating,
        usefulness: saved.usefulness,
        sentiment: saved.sentiment,
        headline: saved.headline,
        message: saved.message,
        photoDataUrl: saved.photoDataUrl,
        createdAt: saved.createdAt,
      },
    },
    { status: 201 },
  );
}
