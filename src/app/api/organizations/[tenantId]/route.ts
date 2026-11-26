import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const workspace = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      const org = await client.query<{ id: string; name: string; slug: string; status: string; created_at: Date }>(
        "SELECT id, name, slug, status, created_at FROM organizations WHERE id = $1::uuid",
        [tenantId],
      );
      if (!org.rows[0]) return null;
      return {
        id: org.rows[0].id,
        name: org.rows[0].name,
        slug: org.rows[0].slug,
        status: org.rows[0].status,
        role: tenant.role,
        createdAt: org.rows[0].created_at.toISOString(),
      };
    });
    if (!workspace) return Response.json({ error: "Workspace tidak ditemukan." }, { status: 404 });
    return Response.json({ workspace }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Workspace belum dapat dimuat.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ tenantId: string }> }) {
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
  const parsed = updateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Nama workspace harus 2–160 karakter." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") {
        return { forbidden: true as const };
      }
      const updated = await client.query<{ id: string; name: string; slug: string; status: string }>(
        "UPDATE organizations SET name = $2, updated_at = now() WHERE id = $1::uuid RETURNING id, name, slug, status",
        [tenantId, parsed.data.name],
      );
      if (!updated.rows[0]) return { forbidden: false as const, workspace: null };
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'workspace.updated', 'organization', $1, $3::jsonb)",
        [tenantId, tenant.userId, JSON.stringify({ name: parsed.data.name })],
      );
      return { forbidden: false as const, workspace: updated.rows[0] };
    });

    if (result.forbidden) {
      return Response.json({ error: "Hanya pemilik atau admin yang dapat mengubah workspace." }, { status: 403 });
    }
    if (!result.workspace) {
      return Response.json({ error: "Workspace tidak ditemukan." }, { status: 404 });
    }
    return Response.json({ workspace: result.workspace }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Workspace belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner") {
        return { forbidden: true as const };
      }
      const deleted = await client.query("DELETE FROM organizations WHERE id = $1::uuid RETURNING id", [tenantId]);
      return { forbidden: false as const, deleted: deleted.rowCount === 1 };
    });

    if (result.forbidden) {
      return Response.json({ error: "Hanya pemilik workspace yang dapat menghapus workspace." }, { status: 403 });
    }
    if (!result.deleted) {
      return Response.json({ error: "Workspace tidak ditemukan." }, { status: 404 });
    }
    return Response.json({ deleted: true, id: tenantId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Workspace belum dapat dihapus.");
  }
}
