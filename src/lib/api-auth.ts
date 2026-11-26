import { headers } from "next/headers";
import { getSafeSession, isAuthConfigured } from "@/lib/auth";
import { isUuid } from "@/lib/connectors/whatsapp-policy";
import { TenantAccessError } from "@/lib/tenant-context";

export async function requireSession() {
  if (!isAuthConfigured()) {
    return {
      ok: false as const,
      response: Response.json(
        { error: "Database Neon belum aktif. Lengkapi DATABASE_URL pada server terlebih dahulu." },
        { status: 503 },
      ),
    };
  }
  const session = await getSafeSession(await headers());
  if (!session) {
    return {
      ok: false as const,
      response: Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}

export function validateUuidParam(value: string, label = "ID"): Response | null {
  if (!isUuid(value)) {
    return Response.json({ error: `${label} tidak valid.` }, { status: 400 });
  }
  return null;
}

export function handleTenantError(error: unknown, fallbackMessage = "Permintaan belum dapat diproses.") {
  if (error instanceof TenantAccessError) {
    return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
  }
  return Response.json({ error: fallbackMessage }, { status: 500 });
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .map((t) => t.trim().toLowerCase().slice(0, 32))
    .filter((t) => t.length > 0);
  return [...new Set(cleaned)].slice(0, 15);
}
