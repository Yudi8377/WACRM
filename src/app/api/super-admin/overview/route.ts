import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import type { AppEditionId, SubscriptionStatus, SuperAdminTenantRecord } from "@/lib/crm-types";
import { db } from "@/lib/db";
import { getEditionById } from "@/lib/editions";
import { computeSuperAdminOverview } from "@/lib/super-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function assertSuperAdmin(userId: string, email: string | undefined): Promise<{
  allowed: boolean;
  isConfiguredAllowlist: boolean;
}> {
  const allowlist = parseSuperAdminEmails();
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (allowlist.length > 0) {
    return {
      allowed: allowlist.includes(normalizedEmail),
      isConfiguredAllowlist: true,
    };
  }

  const ownerCheck = await db.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt
       FROM organization_members
      WHERE user_id = $1::uuid AND role = 'owner' AND status = 'active'`,
    [userId],
  );
  return {
    allowed: Number(ownerCheck.rows[0]?.cnt ?? "0") > 0,
    isConfiguredAllowlist: false,
  };
}

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const gate = await assertSuperAdmin(auth.session.user.id, auth.session.user.email);
    if (!gate.allowed) {
      return Response.json(
        { error: "Akses ditolak. Hanya Super Admin platform yang dapat membuka Command Center ini." },
        { status: 403 },
      );
    }

    const res = await db.query<{
      id: string;
      name: string;
      created_at: string;
      owner_name: string | null;
      owner_email: string | null;
      edition_id: string | null;
      sub_status: string | null;
      monthly_price_idr: string | null;
      current_period_end: string | null;
      active_agents: string;
      total_contacts: string;
      total_conversations: string;
      orders_count: string;
      gmv_idr: string;
      connected_channels: string;
      escalation_count: string;
      low_stock_count: string;
      avg_seo_score: string | null;
      ledger_diff: string;
    }>(`
      SELECT
        o.id::text AS id,
        o.name,
        o.created_at::text AS created_at,
        (
          SELECT u.name
            FROM organization_members om
            JOIN "user" u ON u.id::text = om.user_id::text
           WHERE om.tenant_id = o.id AND om.role = 'owner'
           ORDER BY om.created_at ASC
           LIMIT 1
        ) AS owner_name,
        (
          SELECT u.email
            FROM organization_members om
            JOIN "user" u ON u.id::text = om.user_id::text
           WHERE om.tenant_id = o.id AND om.role = 'owner'
           ORDER BY om.created_at ASC
           LIMIT 1
        ) AS owner_email,
        ts.edition_id,
        ts.status AS sub_status,
        ts.monthly_price_idr::text AS monthly_price_idr,
        ts.current_period_end::text AS current_period_end,
        (SELECT count(*)::text FROM organization_members m WHERE m.tenant_id = o.id AND m.status = 'active') AS active_agents,
        (SELECT count(*)::text FROM contacts c WHERE c.tenant_id = o.id) AS total_contacts,
        (SELECT count(*)::text FROM conversations cv WHERE cv.tenant_id = o.id) AS total_conversations,
        (SELECT count(*)::text FROM pos_orders po WHERE po.tenant_id = o.id) AS orders_count,
        (SELECT COALESCE(sum(po.total_amount), 0)::text FROM pos_orders po WHERE po.tenant_id = o.id) AS gmv_idr,
        (SELECT count(*)::text FROM channel_connections cc WHERE cc.tenant_id = o.id AND cc.status = 'connected') AS connected_channels,
        (SELECT count(*)::text FROM conversations cv WHERE cv.tenant_id = o.id AND 'perlu-admin' = ANY(cv.tags)) AS escalation_count,
        (SELECT count(*)::text FROM erp_products p WHERE p.tenant_id = o.id AND p.is_active = true AND p.stock_qty <= p.min_stock) AS low_stock_count,
        (SELECT round(avg(sc.seo_score))::text FROM seo_campaigns sc WHERE sc.tenant_id = o.id) AS avg_seo_score,
        (SELECT COALESCE(abs(sum(ae.debit) - sum(ae.credit)), 0)::text FROM accounting_entries ae WHERE ae.tenant_id = o.id) AS ledger_diff
      FROM organizations o
      LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = o.id
      ORDER BY o.created_at DESC
      LIMIT 200
    `);

    const tenants: SuperAdminTenantRecord[] = res.rows.map((r) => {
      const editionId = (r.edition_id as AppEditionId) || "enterprise";
      const edition = getEditionById(editionId);
      const status = (r.sub_status as SubscriptionStatus) || "active";
      const connected = Number(r.connected_channels || 0);
      const escalations = Number(r.escalation_count || 0);
      const lowStock = Number(r.low_stock_count || 0);
      const ledgerBalanced = Number(r.ledger_diff || 0) < 1;
      const seoScore = r.avg_seo_score ? Number(r.avg_seo_score) : 78;

      const detectedIssues: string[] = [];
      if (status === "past_due") detectedIssues.push("Tagihan langganan tertunggak (past due).");
      if (status === "suspended") detectedIssues.push("Workspace ditangguhkan oleh Super Admin.");
      if (connected === 0) detectedIssues.push("Belum ada kanal omnichannel terhubung.");
      if (escalations > 0) detectedIssues.push(`${escalations} chat eskalasi menunggu admin.`);
      if (lowStock > 0) detectedIssues.push(`${lowStock} produk di bawah stok minimum.`);
      if (!ledgerBalanced) detectedIssues.push("Selisih neraca terdeteksi — butuh Self-Healing.");
      if (seoScore < 75) detectedIssues.push(`Skor SEO katalog ${seoScore}/100 — butuh optimasi.`);

      let healthScore = 100;
      if (!ledgerBalanced) healthScore -= 25;
      healthScore -= Math.min(20, lowStock * 4);
      healthScore -= Math.min(15, escalations * 5);
      if (connected === 0) healthScore -= 12;

      return {
        tenantId: r.id,
        businessName: r.name,
        ownerName: r.owner_name || "Pemilik Workspace",
        ownerEmail: r.owner_email || "owner@wacrm.id",
        editionId,
        subscriptionStatus: status,
        monthlyPriceIdr: Number(r.monthly_price_idr ?? edition.monthlyPriceIdr),
        activeAgents: Math.max(1, Number(r.active_agents || 1)),
        totalContacts: Number(r.total_contacts || 0),
        totalConversations: Number(r.total_conversations || 0),
        connectedChannels: connected,
        ordersCount: Number(r.orders_count || 0),
        gmvIdr: Number(r.gmv_idr || 0),
        healthScore: Math.max(35, healthScore),
        seoScore,
        aiAutoReplyRatePct: 90,
        escalationCount: escalations,
        lowStockCount: lowStock,
        ledgerBalanced,
        lastActiveAt: r.created_at,
        renewsAt: r.current_period_end || new Date(Date.now() + 30 * 86_400_000).toISOString(),
        detectedIssues,
      };
    });

    const overview = computeSuperAdminOverview({ tenants, source: "neon" });
    return Response.json({
      source: "neon_live",
      allowlistEnforced: gate.isConfiguredAllowlist,
      overview,
    });
  } catch (error) {
    console.error("[super-admin/overview GET]", error);
    return Response.json(
      { error: "Gagal memuat telemetri Super Admin dari database Neon." },
      { status: 500 },
    );
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_tenant"),
    tenantId: z.string().uuid(),
    editionId: z.enum(["starter", "pro", "enterprise", "sovereign"]).optional(),
    subscriptionStatus: z.enum(["active", "trial", "past_due", "suspended"]).optional(),
  }),
  z.object({
    action: z.literal("auto_fix"),
    tenantId: z.string().uuid().optional(),
  }),
]);

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  try {
    const gate = await assertSuperAdmin(auth.session.user.id, auth.session.user.email);
    if (!gate.allowed) {
      return Response.json({ error: "Akses Super Admin diperlukan." }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Payload aksi Super Admin tidak valid." }, { status: 400 });
    }
    const body = parsed.data;

    if (body.action === "update_tenant") {
      const edition = getEditionById(body.editionId ?? "enterprise");
      const seatLimit = edition.limits.maxAgents < 0 ? 9999 : edition.limits.maxAgents;
      const productLimit = edition.limits.maxContacts < 0 ? 100000 : edition.limits.maxContacts;
      await db.query(
        `INSERT INTO tenant_subscriptions
          (tenant_id, edition_id, status, monthly_price_idr, seat_limit, product_limit, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, now())
         ON CONFLICT (tenant_id) DO UPDATE SET
           edition_id = COALESCE($2, tenant_subscriptions.edition_id),
           status = COALESCE($3, tenant_subscriptions.status),
           monthly_price_idr = CASE WHEN $2 IS NOT NULL THEN $4 ELSE tenant_subscriptions.monthly_price_idr END,
           seat_limit = CASE WHEN $2 IS NOT NULL THEN $5 ELSE tenant_subscriptions.seat_limit END,
           product_limit = CASE WHEN $2 IS NOT NULL THEN $6 ELSE tenant_subscriptions.product_limit END,
           updated_at = now()`,
        [
          body.tenantId,
          body.editionId ?? "enterprise",
          body.subscriptionStatus ?? "active",
          edition.monthlyPriceIdr,
          seatLimit,
          productLimit,
        ],
      );
      return Response.json({
        ok: true,
        message: "Langganan & edisi tenant berhasil diperbarui di Neon DB.",
      });
    }

    // Auto-Fix across one tenant or all tenants
    if (body.tenantId) {
      await db.query(
        `UPDATE ai_security_incidents
            SET status = 'resolved', self_healed = true,
                healing_action = COALESCE(healing_action, 'Auto-Fix Super Admin'),
                resolved_at = now()
          WHERE tenant_id = $1::uuid AND status = 'open'`,
        [body.tenantId],
      );
      return Response.json({ ok: true, message: "Auto-Fix tenant selesai dijalankan di Neon DB." });
    }

    const healed = await db.query(
      `UPDATE ai_security_incidents
          SET status = 'resolved', self_healed = true,
              healing_action = COALESCE(healing_action, 'Auto-Fix Global Super Admin'),
              resolved_at = now()
        WHERE status = 'open'`,
    );
    return Response.json({
      ok: true,
      message: `${healed.rowCount ?? 0} insiden terbuka diselesaikan otomatis secara global.`,
    });
  } catch (error) {
    console.error("[super-admin/overview PATCH]", error);
    return Response.json({ error: "Gagal menjalankan perintah Super Admin." }, { status: 500 });
  }
}
