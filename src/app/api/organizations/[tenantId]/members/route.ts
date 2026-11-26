import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["owner", "admin", "supervisor", "agent", "viewer"]).optional(),
  status: z.enum(["invited", "active", "suspended"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const members = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const res = await client.query<{
        id: string;
        user_id: string;
        display_name: string | null;
        role: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT om.id, om.user_id, up.display_name, om.role, om.status, om.created_at
           FROM organization_members om
           LEFT JOIN user_profiles up ON up.id = om.user_id
          WHERE om.tenant_id = $1::uuid
          ORDER BY om.created_at ASC`,
        [tenantId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        displayName: r.display_name || "Anggota Tim",
        role: r.role,
        status: r.status,
        createdAt: r.created_at.toISOString(),
      }));
    });
    return Response.json({ members }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Daftar anggota tim belum dapat dimuat.");
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
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Data anggota tidak valid." }, { status: 400 });

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" as const };
      const existing = await client.query<{ id: string; role: string; status: string }>(
        "SELECT id, role, status FROM organization_members WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, parsed.data.memberId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };
      if (existing.rows[0].role === "owner" && tenant.role !== "owner") {
        return { kind: "forbidden" as const };
      }
      const nextRole = parsed.data.role ?? existing.rows[0].role;
      const nextStatus = parsed.data.status ?? existing.rows[0].status;
      await client.query(
        "UPDATE organization_members SET role = $3, status = $4 WHERE tenant_id = $1::uuid AND id = $2::uuid",
        [tenantId, parsed.data.memberId, nextRole, nextStatus],
      );
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'member.updated', 'organization_member', $3, $4::jsonb)",
        [tenantId, tenant.userId, parsed.data.memberId, JSON.stringify({ role: nextRole, status: nextStatus })],
      );
      return { kind: "ok" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Tidak memiliki izin untuk mengubah peran anggota ini." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
    return Response.json({ updated: true }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Anggota belum dapat diperbarui.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const memberId = new URL(request.url).searchParams.get("memberId") || "";
  const invalidMember = validateUuidParam(memberId, "ID anggota");
  if (invalidMember) return invalidMember;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" as const };
      const target = await client.query<{ role: string }>(
        "SELECT role FROM organization_members WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, memberId],
      );
      if (!target.rows[0]) return { kind: "not_found" as const };
      if (target.rows[0].role === "owner") {
        const ownersCount = await client.query<{ c: string }>(
          "SELECT count(*)::text AS c FROM organization_members WHERE tenant_id = $1::uuid AND role = 'owner' AND status = 'active'",
          [tenantId],
        );
        if (Number(ownersCount.rows[0]?.c ?? 0) <= 1) return { kind: "last_owner" as const };
      }
      await client.query("DELETE FROM organization_members WHERE tenant_id = $1::uuid AND id = $2::uuid", [tenantId, memberId]);
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'member.removed', 'organization_member', $3, '{}'::jsonb)",
        [tenantId, tenant.userId, memberId],
      );
      return { kind: "ok" as const };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Hanya pemilik atau admin yang dapat menghapus anggota." }, { status: 403 });
    if (result.kind === "last_owner") return Response.json({ error: "Workspace harus memiliki minimal satu pemilik aktif." }, { status: 409 });
    if (result.kind === "not_found") return Response.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: memberId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Anggota belum dapat dihapus.");
  }
}
