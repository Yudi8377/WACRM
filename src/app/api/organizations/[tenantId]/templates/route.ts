import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createTemplateSchema = z.object({
  channel: z.enum(["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"]).default("whatsapp"),
  name: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,80}$/),
  category: z.enum(["utility", "marketing", "authentication", "service"]).default("utility"),
  language: z.string().trim().min(2).max(16).default("id"),
  bodyText: z.string().trim().min(1).max(4096),
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "archived"]).default("draft"),
});

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const templates = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const res = await client.query<{
        id: string;
        channel: string;
        name: string;
        category: string;
        language: string;
        body_text: string;
        status: string;
        created_at: Date;
        updated_at: Date;
      }>(
        "SELECT id, channel, name, category, language, body_text, status, created_at, updated_at FROM message_templates WHERE tenant_id = $1::uuid ORDER BY updated_at DESC",
        [tenantId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        channel: r.channel,
        name: r.name,
        category: r.category,
        language: r.language,
        bodyText: r.body_text,
        status: r.status,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      }));
    });
    return Response.json({ templates }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Template pesan belum dapat dimuat.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Nama template harus huruf kecil/angka/underscore (contoh: konfirmasi_pesanan)." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const inserted = await client.query<{
        id: string;
        channel: string;
        name: string;
        category: string;
        language: string;
        body_text: string;
        status: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO message_templates (tenant_id, channel, name, category, language, body_text, status)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, channel, name)
         DO UPDATE SET category = EXCLUDED.category, language = EXCLUDED.language, body_text = EXCLUDED.body_text, status = EXCLUDED.status, updated_at = now()
         RETURNING id, channel, name, category, language, body_text, status, created_at, updated_at`,
        [
          tenantId,
          parsed.data.channel,
          parsed.data.name,
          parsed.data.category,
          parsed.data.language,
          parsed.data.bodyText,
          parsed.data.status,
        ],
      );
      const r = inserted.rows[0];
      return {
        kind: "ok" as const,
        template: {
          id: r.id,
          channel: r.channel,
          name: r.name,
          category: r.category,
          language: r.language,
          bodyText: r.body_text,
          status: r.status,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        },
      };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menambah template." }, { status: 403 });
    return Response.json({ template: result.template }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Template belum dapat disimpan.");
  }
}
