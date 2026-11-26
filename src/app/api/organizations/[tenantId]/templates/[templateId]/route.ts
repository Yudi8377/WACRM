import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateTemplateSchema = z.object({
  category: z.enum(["utility", "marketing", "authentication", "service"]).optional(),
  language: z.string().trim().min(2).max(16).optional(),
  bodyText: z.string().trim().min(1).max(4096).optional(),
  status: z.enum(["draft", "pending_approval", "approved", "rejected", "archived"]).optional(),
});

type RouteParams = { tenantId: string; templateId: string };

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, templateId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidTpl = validateUuidParam(templateId, "ID template");
  if (invalidTpl) return invalidTpl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Data template tidak valid." }, { status: 400 });

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const existing = await client.query<{ category: string; language: string; body_text: string; status: string }>(
        "SELECT category, language, body_text, status FROM message_templates WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, templateId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };
      const curr = existing.rows[0];

      const updated = await client.query<{
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
        `UPDATE message_templates
            SET category = $3, language = $4, body_text = $5, status = $6, updated_at = now()
          WHERE tenant_id = $1::uuid AND id = $2::uuid
          RETURNING id, channel, name, category, language, body_text, status, created_at, updated_at`,
        [
          tenantId,
          templateId,
          parsed.data.category ?? curr.category,
          parsed.data.language ?? curr.language,
          parsed.data.bodyText ?? curr.body_text,
          parsed.data.status ?? curr.status,
        ],
      );
      const r = updated.rows[0];
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

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat mengubah template." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return Response.json({ template: result.template }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Template belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, templateId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidTpl = validateUuidParam(templateId, "ID template");
  if (invalidTpl) return invalidTpl;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM message_templates WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id",
        [tenantId, templateId],
      );
      return deleted.rowCount === 1 ? { kind: "ok" as const } : { kind: "not_found" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menghapus template." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: templateId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Template belum dapat dihapus.");
  }
}
