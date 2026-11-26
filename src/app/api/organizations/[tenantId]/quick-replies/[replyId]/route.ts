import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateQuickReplySchema = z.object({
  shortcut: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  bodyText: z.string().trim().min(1).max(4096).optional(),
  category: z.string().trim().min(1).max(60).optional(),
});

type RouteParams = { tenantId: string; replyId: string };

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, replyId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidReply = validateUuidParam(replyId, "ID balasan cepat");
  if (invalidReply) return invalidReply;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = updateQuickReplySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Data balasan cepat tidak valid." }, { status: 400 });

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const existing = await client.query<{ shortcut: string; title: string; body_text: string; category: string }>(
        "SELECT shortcut, title, body_text, category FROM quick_replies WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, replyId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };
      const curr = existing.rows[0];
      const updated = await client.query<{
        id: string;
        shortcut: string;
        title: string;
        body_text: string;
        category: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `UPDATE quick_replies
            SET shortcut = $3, title = $4, body_text = $5, category = $6, updated_at = now()
          WHERE tenant_id = $1::uuid AND id = $2::uuid
          RETURNING id, shortcut, title, body_text, category, created_at, updated_at`,
        [
          tenantId,
          replyId,
          parsed.data.shortcut ?? curr.shortcut,
          parsed.data.title ?? curr.title,
          parsed.data.bodyText ?? curr.body_text,
          parsed.data.category ?? curr.category,
        ],
      );
      const r = updated.rows[0];
      return {
        kind: "ok" as const,
        quickReply: {
          id: r.id,
          shortcut: r.shortcut,
          title: r.title,
          bodyText: r.body_text,
          category: r.category,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        },
      };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat mengubah balasan cepat." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Balasan cepat tidak ditemukan." }, { status: 404 });
    return Response.json({ quickReply: result.quickReply }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Balasan cepat belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, replyId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidReply = validateUuidParam(replyId, "ID balasan cepat");
  if (invalidReply) return invalidReply;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM quick_replies WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id",
        [tenantId, replyId],
      );
      return deleted.rowCount === 1 ? { kind: "ok" as const } : { kind: "not_found" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menghapus balasan cepat." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Balasan cepat tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: replyId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Balasan cepat belum dapat dihapus.");
  }
}
