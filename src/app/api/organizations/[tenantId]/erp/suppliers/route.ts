import { z } from "zod";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactPerson: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  paymentTerms: z.string().trim().max(40).default("NET 14"),
});

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const suppliers = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "viewer" },
      async (client) => {
        const res = await client.query(
          `SELECT * FROM erp_suppliers WHERE tenant_id = $1::uuid ORDER BY created_at DESC`,
          [tenantId],
        );
        return res.rows.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          contactPerson: r.contact_person ? String(r.contact_person) : null,
          phone: r.phone ? String(r.phone) : null,
          email: r.email ? String(r.email) : null,
          address: r.address ? String(r.address) : null,
          paymentTerms: String(r.payment_terms ?? "NET 14"),
          status: String(r.status ?? "active"),
          createdAt: new Date(String(r.created_at)).toISOString(),
        }));
      },
    );
    return Response.json({ suppliers });
  } catch (error) {
    return handleTenantError(error, "Gagal memuat daftar supplier ERP.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const parsed = supplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data supplier tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const supplier = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const res = await client.query(
          `INSERT INTO erp_suppliers (tenant_id, name, contact_person, phone, email, address, payment_terms)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            tenantId,
            input.name,
            input.contactPerson ?? null,
            input.phone ?? null,
            input.email ?? null,
            input.address ?? null,
            input.paymentTerms,
          ],
        );
        const r = res.rows[0];
        return {
          id: String(r.id),
          name: String(r.name),
          contactPerson: r.contact_person ? String(r.contact_person) : null,
          phone: r.phone ? String(r.phone) : null,
          email: r.email ? String(r.email) : null,
          address: r.address ? String(r.address) : null,
          paymentTerms: String(r.payment_terms),
          status: String(r.status),
          createdAt: new Date(String(r.created_at)).toISOString(),
        };
      },
    );
    return Response.json({ supplier }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Gagal menambahkan supplier ERP.");
  }
}
