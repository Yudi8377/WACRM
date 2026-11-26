import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createNoteSchema = z.object({
  bodyText: z.string().trim().min(1).max(4000),
});

type RouteParams = { tenantId: string; conversationId: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, conversationId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidConv = validateUuidParam(conversationId, "ID percakapan");
  if (invalidConv) return invalidConv;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Isi catatan harus 1–4000 karakter." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const inserted = await client.query<{ id: string; body_text: string; created_at: Date }>(
        `INSERT INTO conversation_notes (tenant_id, conversation_id, author_user_id, body_text)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
         RETURNING id, body_text, created_at`,
        [tenantId, conversationId, tenant.userId, parsed.data.bodyText],
      );
      return {
        kind: "ok" as const,
        note: {
          id: inserted.rows[0].id,
          conversationId,
          authorUserId: tenant.userId,
          authorName: authResult.session.user.name,
          bodyText: inserted.rows[0].body_text,
          createdAt: inserted.rows[0].created_at.toISOString(),
        },
      };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menambah catatan." }, { status: 403 });
    return Response.json({ note: result.note }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Catatan belum dapat disimpan.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, conversationId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidConv = validateUuidParam(conversationId, "ID percakapan");
  if (invalidConv) return invalidConv;

  const noteId = new URL(request.url).searchParams.get("noteId") || "";
  const invalidNote = validateUuidParam(noteId, "ID catatan");
  if (invalidNote) return invalidNote;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM conversation_notes WHERE tenant_id = $1::uuid AND conversation_id = $2::uuid AND id = $3::uuid RETURNING id",
        [tenantId, conversationId, noteId],
      );
      return deleted.rowCount === 1 ? { kind: "ok" as const } : { kind: "not_found" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak dapat menghapus catatan." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: noteId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Catatan belum dapat dihapus.");
  }
}
