import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, normalizeTags, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createContactSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,15}$/)
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "vip", "inactive"]).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const stage = url.searchParams.get("stage")?.trim() || "";

  try {
    const contacts = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      const params: unknown[] = [tenantId];
      const conditions = ["c.tenant_id = $1::uuid"];

      if (q) {
        params.push(`%${q}%`);
        conditions.push(
          `(c.display_name ILIKE $${params.length} OR c.phone_e164 ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.company ILIKE $${params.length})`,
        );
      }
      if (stage && ["lead", "prospect", "customer", "vip", "inactive"].includes(stage)) {
        params.push(stage);
        conditions.push(`c.lifecycle_stage = $${params.length}`);
      }

      const result = await client.query<{
        id: string;
        display_name: string | null;
        phone_e164: string | null;
        email: string | null;
        company: string | null;
        notes: string | null;
        tags: string[] | null;
        lifecycle_stage: string;
        created_at: Date;
        updated_at: Date;
        channels: string[] | null;
      }>(
        `SELECT c.id, c.display_name, c.phone_e164, c.email, c.company, c.notes, c.tags, c.lifecycle_stage,
                c.created_at, c.updated_at,
                COALESCE(array_agg(DISTINCT ci.channel) FILTER (WHERE ci.channel IS NOT NULL), '{}') AS channels
           FROM contacts c
           LEFT JOIN contact_channel_identities ci ON ci.tenant_id = c.tenant_id AND ci.contact_id = c.id
          WHERE ${conditions.join(" AND ")}
          GROUP BY c.id
          ORDER BY c.updated_at DESC
          LIMIT 200`,
        params,
      );

      return result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name || row.phone_e164 || "Tanpa Nama",
        phoneE164: row.phone_e164,
        email: row.email,
        company: row.company,
        notes: row.notes,
        tags: row.tags ?? [],
        lifecycleStage: row.lifecycle_stage,
        channels: row.channels ?? [],
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
    });

    return Response.json({ contacts }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Daftar kontak belum dapat dimuat.");
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
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data kontak tidak valid. Periksa nama, nomor telepon E.164, atau email." }, { status: 400 });
  }

  const phoneE164 = parsed.data.phoneE164
    ? parsed.data.phoneE164.startsWith("+")
      ? parsed.data.phoneE164
      : `+${parsed.data.phoneE164}`
    : null;
  const email = parsed.data.email || null;
  const company = parsed.data.company || null;
  const notes = parsed.data.notes || null;
  const tags = normalizeTags(parsed.data.tags);
  const lifecycleStage = parsed.data.lifecycleStage ?? "lead";

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { forbidden: true as const };

      const inserted = await client.query<{
        id: string;
        display_name: string;
        phone_e164: string | null;
        email: string | null;
        company: string | null;
        notes: string | null;
        tags: string[];
        lifecycle_stage: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO contacts (tenant_id, display_name, phone_e164, email, company, notes, tags, lifecycle_stage)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::text[], $8)
         RETURNING id, display_name, phone_e164, email, company, notes, tags, lifecycle_stage, created_at, updated_at`,
        [tenantId, parsed.data.displayName, phoneE164, email, company, notes, tags, lifecycleStage],
      );
      const contact = inserted.rows[0];

      if (phoneE164) {
        await client.query(
          `INSERT INTO contact_channel_identities (tenant_id, contact_id, channel, external_contact_id)
           VALUES ($1::uuid, $2::uuid, 'whatsapp', $3)
           ON CONFLICT (tenant_id, channel, external_contact_id) DO NOTHING`,
          [tenantId, contact.id, phoneE164.replace(/^\+/, "")],
        );
      }

      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'contact.created', 'contact', $3, $4::jsonb)",
        [tenantId, tenant.userId, contact.id, JSON.stringify({ lifecycleStage })],
      );

      return {
        forbidden: false as const,
        contact: {
          id: contact.id,
          displayName: contact.display_name,
          phoneE164: contact.phone_e164,
          email: contact.email,
          company: contact.company,
          notes: contact.notes,
          tags: contact.tags ?? [],
          lifecycleStage: contact.lifecycle_stage,
          channels: phoneE164 ? ["whatsapp"] : [],
          createdAt: contact.created_at.toISOString(),
          updatedAt: contact.updated_at.toISOString(),
        },
      };
    });

    if (result.forbidden) {
      return Response.json({ error: "Peran viewer tidak diizinkan menambahkan kontak." }, { status: 403 });
    }
    return Response.json({ contact: result.contact }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Kontak belum dapat ditambahkan.");
  }
}
