import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRegisteredTenant } from "@/lib/publisher-sync";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signInSchema = z.object({
  email: z.string().trim().email("Format email tidak valid.").max(160),
  password: z.string().min(6, "Masukkan kata sandi Anda.").max(128),
});

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const rate = checkRateLimit(`commercial_signin:${ip}`, 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Email atau kata sandi tidak valid." },
      { status: 400 },
    );
  }

  const authRes = await authenticateRegisteredTenant(parsed.data.email, parsed.data.password);
  if (!authRes.ok || !authRes.tenant) {
    return NextResponse.json(
      { ok: false, error: authRes.error || "Email atau kata sandi tidak cocok." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    tenant: authRes.tenant,
  });
}
