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

const patchSupplierSchema = supplierSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const parsed = patchSupplierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pembaruan supplier tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const supplier = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const res = await client.query(
          `UPDATE erp_suppliers
              SET name = COALESCE($3, name),
                  contact_person = COALESCE($4, contact_person),
                  phone = COALESCE($5, phone),
                  email = COALESCE($6, email),
                  address = COALESCE($7, address),
                  payment_terms = COALESCE($8, payment_terms),
                  status = COALESCE($9, status)
            WHERE tenant_id = $1::uuid AND id = $2::uuid
            RETURNING *`,
          [
            tenantId,
            input.id,
            input.name ?? null,
            input.contactPerson ?? null,
            input.phone ?? null,
            input.email ?? null,
            input.address ?? null,
            input.paymentTerms ?? null,
            input.status ?? null,
          ],
        );
        const r = res.rows[0];
        if (!r) return null;
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
    if (!supplier) return Response.json({ error: "Supplier tidak ditemukan." }, { status: 404 });
    return Response.json({ supplier });
  } catch (error) {
    return handleTenantError(error, "Gagal memperbarui supplier ERP.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const supplierId = new URL(request.url).searchParams.get("supplierId") ?? "";
  const badSupplier = validateUuidParam(supplierId, "ID supplier");
  if (badSupplier) return badSupplier;

  try {
    await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "admin" },
      async (client) => {
        await client.query(`DELETE FROM erp_suppliers WHERE tenant_id = $1::uuid AND id = $2::uuid`, [
          tenantId,
          supplierId,
        ]);
      },
    );
    return Response.json({ deleted: true });
  } catch (error) {
    return handleTenantError(error, "Gagal menghapus supplier ERP.");
  }
}
