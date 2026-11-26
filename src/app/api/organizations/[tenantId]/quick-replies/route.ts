import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createQuickReplySchema = z.object({
  shortcut: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/),
  title: z.string().trim().min(1).max(120),
  bodyText: z.string().trim().min(1).max(4096),
  category: z.string().trim().min(1).max(60).default("umum"),
});

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const quickReplies = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const res = await client.query<{
        id: string;
        shortcut: string;
        title: string;
        body_text: string;
        category: string;
        created_at: Date;
        updated_at: Date;
      }>(
        "SELECT id, shortcut, title, body_text, category, created_at, updated_at FROM quick_replies WHERE tenant_id = $1::uuid ORDER BY category ASC, shortcut ASC",
        [tenantId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        shortcut: r.shortcut,
        title: r.title,
        bodyText: r.body_text,
        category: r.category,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      }));
    });
    return Response.json({ quickReplies }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Balasan cepat belum dapat dimuat.");
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
  const parsed = createQuickReplySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Pintasan hanya boleh huruf kecil, angka, tanda hubung/garis bawah (2–40 karakter)." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const inserted = await client.query<{
        id: string;
        shortcut: string;
        title: string;
        body_text: string;
        category: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO quick_replies (tenant_id, shortcut, title, body_text, category, created_by)
         VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
         ON CONFLICT (tenant_id, shortcut)
         DO UPDATE SET title = EXCLUDED.title, body_text = EXCLUDED.body_text, category = EXCLUDED.category, updated_at = now()
         RETURNING id, shortcut, title, body_text, category, created_at, updated_at`,
        [tenantId, parsed.data.shortcut, parsed.data.title, parsed.data.bodyText, parsed.data.category, tenant.userId],
      );
      const r = inserted.rows[0];
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

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menambah balasan cepat." }, { status: 403 });
    return Response.json({ quickReply: result.quickReply }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Balasan cepat belum dapat disimpan.");
  }
}
