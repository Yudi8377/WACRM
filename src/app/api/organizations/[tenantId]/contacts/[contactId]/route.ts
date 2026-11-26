import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { handleTenantError, normalizeTags, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateContactSchema = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,15}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  company: z.string().trim().max(160).optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().nullable().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "vip", "inactive"]).optional(),
});

type RouteParams = { tenantId: string; contactId: string };

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, contactId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidContact = validateUuidParam(contactId, "ID kontak");
  if (invalidContact) return invalidContact;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data pembaruan kontak tidak valid." }, { status: 400 });
  }

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer") return { kind: "forbidden" as const };

      const existing = await client.query<{
        id: string;
        display_name: string | null;
        phone_e164: string | null;
        email: string | null;
        company: string | null;
        notes: string | null;
        tags: string[] | null;
        lifecycle_stage: string;
      }>(
        "SELECT id, display_name, phone_e164, email, company, notes, tags, lifecycle_stage FROM contacts WHERE tenant_id = $1::uuid AND id = $2::uuid LIMIT 1",
        [tenantId, contactId],
      );
      if (!existing.rows[0]) return { kind: "not_found" as const };
      const curr = existing.rows[0];

      const nextPhone =
        parsed.data.phoneE164 === undefined
          ? curr.phone_e164
          : parsed.data.phoneE164
            ? parsed.data.phoneE164.startsWith("+")
              ? parsed.data.phoneE164
              : `+${parsed.data.phoneE164}`
            : null;
      const nextEmail = parsed.data.email === undefined ? curr.email : parsed.data.email || null;
      const nextCompany = parsed.data.company === undefined ? curr.company : parsed.data.company || null;
      const nextNotes = parsed.data.notes === undefined ? curr.notes : parsed.data.notes || null;
      const nextTags = parsed.data.tags === undefined ? curr.tags ?? [] : normalizeTags(parsed.data.tags);
      const nextName = parsed.data.displayName ?? curr.display_name ?? "Tanpa Nama";
      const nextStage = parsed.data.lifecycleStage ?? curr.lifecycle_stage;

      const updated = await client.query<{
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
        `UPDATE contacts
            SET display_name = $3,
                phone_e164 = $4,
                email = $5,
                company = $6,
                notes = $7,
                tags = $8::text[],
                lifecycle_stage = $9,
                updated_at = now()
          WHERE tenant_id = $1::uuid AND id = $2::uuid
          RETURNING id, display_name, phone_e164, email, company, notes, tags, lifecycle_stage, created_at, updated_at`,
        [tenantId, contactId, nextName, nextPhone, nextEmail, nextCompany, nextNotes, nextTags, nextStage],
      );

      if (nextPhone) {
        await client.query(
          `INSERT INTO contact_channel_identities (tenant_id, contact_id, channel, external_contact_id)
           VALUES ($1::uuid, $2::uuid, 'whatsapp', $3)
           ON CONFLICT (tenant_id, channel, external_contact_id) DO NOTHING`,
          [tenantId, contactId, nextPhone.replace(/^\+/, "")],
        );
      }

      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'contact.updated', 'contact', $3, $4::jsonb)",
        [tenantId, tenant.userId, contactId, JSON.stringify({ lifecycleStage: nextStage })],
      );

      const row = updated.rows[0];
      return {
        kind: "ok" as const,
        contact: {
          id: row.id,
          displayName: row.display_name,
          phoneE164: row.phone_e164,
          email: row.email,
          company: row.company,
          notes: row.notes,
          tags: row.tags ?? [],
          lifecycleStage: row.lifecycle_stage,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        },
      };
    });

    if (result.kind === "forbidden") return Response.json({ error: "Peran viewer tidak diizinkan mengubah kontak." }, { status: 403 });
    if (result.kind === "not_found") return Response.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    return Response.json({ contact: result.contact }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Kontak belum dapat diperbarui.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<RouteParams> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId, contactId } = await context.params;
  const invalidTenant = validateUuidParam(tenantId, "ID workspace");
  if (invalidTenant) return invalidTenant;
  const invalidContact = validateUuidParam(contactId, "ID kontak");
  if (invalidContact) return invalidContact;

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role === "viewer" || tenant.role === "agent") return { kind: "forbidden" as const };
      const deleted = await client.query(
        "DELETE FROM contacts WHERE tenant_id = $1::uuid AND id = $2::uuid RETURNING id",
        [tenantId, contactId],
      );
      if (deleted.rowCount !== 1) return { kind: "not_found" as const };
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'contact.deleted', 'contact', $3, '{}'::jsonb)",
        [tenantId, tenant.userId, contactId],
      );
      return { kind: "ok" as const };
    });

    if (result.kind === "forbidden") {
      return Response.json({ error: "Hanya owner, admin, atau supervisor yang dapat menghapus kontak." }, { status: 403 });
    }
    if (result.kind === "not_found") return Response.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: contactId }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Kontak belum dapat dihapus.");
  }
}
