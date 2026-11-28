import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPublisherIntelligenceReport,
  updateFeedbackActionStatus,
} from "@/lib/publisher-intelligence";
import { verifyPublisherSyncSecret } from "@/lib/publisher-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchStatusSchema = z.object({
  feedbackId: z.string().min(3).max(120),
  actionStatus: z.enum(["new", "reviewed", "planned", "resolved"]),
});

export async function GET(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized — X-Publisher-Sync-Secret tidak valid." },
      { status: 401 },
    );
  }

  const report = await buildPublisherIntelligenceReport();
  return NextResponse.json({
    ok: true,
    report,
  });
}

export async function PATCH(request: Request) {
  if (!verifyPublisherSyncSecret(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized — X-Publisher-Sync-Secret tidak valid." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = patchStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Payload update status tidak valid." }, { status: 400 });
  }

  const updated = await updateFeedbackActionStatus(
    parsed.data.feedbackId,
    parsed.data.actionStatus,
  );
  return NextResponse.json({ ok: updated });
}
