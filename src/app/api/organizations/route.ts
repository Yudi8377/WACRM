import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(160),
});

function makeSlug(name: string, id: string) {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base.length >= 2 ? base : "workspace"}-${id.slice(0, 8)}`;
}

export async function GET() {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [session.user.id]);
    const memberships = await client.query<{ tenant_id: string; role: string }>(
      "SELECT tenant_id, role FROM organization_members WHERE user_id = $1::uuid AND status = 'active' ORDER BY created_at ASC",
      [session.user.id],
    );

    const workspaces = [];
    for (const membership of memberships.rows) {
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [membership.tenant_id]);
      const org = await client.query<{ id: string; name: string; slug: string; status: string; created_at: Date }>(
        "SELECT id, name, slug, status, created_at FROM organizations WHERE id = $1::uuid",
        [membership.tenant_id],
      );
      if (!org.rows[0]) continue;
      const stats = await client.query<{
        open_conversations: string;
        total_contacts: string;
        connected_channels: string;
        members_count: string;
      }>(
        `SELECT
          (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid AND status IN ('open', 'pending')) AS open_conversations,
          (SELECT count(*)::text FROM contacts WHERE tenant_id = $1::uuid) AS total_contacts,
          (SELECT count(*)::text FROM channel_connections WHERE tenant_id = $1::uuid AND status = 'connected') AS connected_channels,
          (SELECT count(*)::text FROM organization_members WHERE tenant_id = $1::uuid AND status = 'active') AS members_count`,
        [membership.tenant_id],
      );
      workspaces.push({
        id: org.rows[0].id,
        name: org.rows[0].name,
        slug: org.rows[0].slug,
        status: org.rows[0].status,
        role: membership.role,
        createdAt: org.rows[0].created_at.toISOString(),
        stats: {
          openConversations: Number(stats.rows[0]?.open_conversations ?? 0),
          totalContacts: Number(stats.rows[0]?.total_contacts ?? 0),
          connectedChannels: Number(stats.rows[0]?.connected_channels ?? 0),
          membersCount: Number(stats.rows[0]?.members_count ?? 1),
        },
      });
    }
    await client.query("COMMIT");
    return Response.json({ workspaces }, { status: 200 });
  } catch {
    await client.query("ROLLBACK");
    return Response.json({ error: "Daftar workspace belum dapat dimuat." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;
  const { session } = authResult;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.user.id)) {
    return Response.json({ error: "Identitas akun tidak valid untuk workspace." }, { status: 500 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = createWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: "Nama workspace harus 2–160 karakter." }, { status: 400 });
  }

  const tenantId = randomUUID();
  const slug = makeSlug(parsed.data.name, tenantId);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.user_id', $1, true), set_config('app.tenant_id', $2, true)",
      [session.user.id, tenantId],
    );
    await client.query(
      "INSERT INTO user_profiles (id, display_name) VALUES ($1::uuid, $2) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()",
      [session.user.id, session.user.name],
    );
    await client.query(
      "INSERT INTO organizations (id, name, slug) VALUES ($1::uuid, $2, $3)",
      [tenantId, parsed.data.name, slug],
    );
    await client.query(
      "INSERT INTO organization_members (tenant_id, user_id, role, status) VALUES ($1::uuid, $2::uuid, 'owner', 'active')",
      [tenantId, session.user.id],
    );
    await client.query(
      "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'workspace.created', 'organization', $1, $3::jsonb)",
      [tenantId, session.user.id, JSON.stringify({ slug })],
    );
    await client.query("COMMIT");
    return Response.json({ id: tenantId, name: parsed.data.name, slug }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return Response.json({ error: "Workspace belum dapat dibuat. Silakan coba lagi." }, { status: 500 });
  } finally {
    client.release();
  }
}
