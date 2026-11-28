import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMultiAgentChatReply } from "@/lib/publisher-ai-agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  prospectName: z.string().trim().max(120).optional(),
  companyName: z.string().trim().max(160).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Pesan tidak boleh kosong." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const response = generateMultiAgentChatReply(parsed.data.message, {
    prospectName: parsed.data.prospectName,
    companyName: parsed.data.companyName,
  });

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      ...response,
    },
    { headers: CORS_HEADERS },
  );
}
