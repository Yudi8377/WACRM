import { z } from "zod";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  paymentStatus: z.enum(["unpaid", "paid", "refunded", "flagged"]).optional(),
  orderStatus: z.enum(["draft", "confirmed", "packed", "shipped", "completed", "cancelled"]).optional(),
  shippingAddress: z.string().trim().min(3).max(400).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; orderId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId, orderId } = await params;
  const badTenant = validateUuidParam(tenantId, "ID workspace");
  if (badTenant) return badTenant;
  const badOrder = validateUuidParam(orderId, "ID pesanan");
  if (badOrder) return badOrder;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pembaruan pesanan tidak valid." }, { status: 400 });

  try {
    const updated = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const beforeRes = await client.query(
          `SELECT id, invoice_number, payment_status, total_amount, customer_name
             FROM pos_orders WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          [tenantId, orderId],
        );
        const before = beforeRes.rows[0];
        if (!before) return null;

        const res = await client.query(
          `UPDATE pos_orders
              SET payment_status = COALESCE($3, payment_status),
                  order_status = COALESCE($4, order_status),
                  shipping_address = COALESCE($5, shipping_address),
                  notes = COALESCE($6, notes),
                  updated_at = now()
            WHERE tenant_id = $1::uuid AND id = $2::uuid
            RETURNING id, invoice_number, payment_status, order_status`,
          [
            tenantId,
            orderId,
            parsed.data.paymentStatus ?? null,
            parsed.data.orderStatus ?? null,
            parsed.data.shippingAddress ?? null,
            parsed.data.notes ?? null,
          ],
        );

        // Auto-post Cash / Receivable settlement journal when transitioning unpaid -> paid
        if (before.payment_status !== "paid" && parsed.data.paymentStatus === "paid") {
          const entryNumber = `JE-PAY-${String(before.invoice_number).replace(/^INV-/, "")}`;
          const today = new Date().toISOString().slice(0, 10);
          const total = Number(before.total_amount);
          await client.query(
            `INSERT INTO accounting_entries
              (tenant_id, entry_number, entry_date, account_code, account_name, account_type,
               debit, credit, reference_type, reference_id, description, ai_verified)
             VALUES
              ($1::uuid, $2, $3::date, '1100', 'Kas & Bank / QRIS', 'asset', $4, 0, 'pos_settlement', $5, $6, true),
              ($1::uuid, $2, $3::date, '1200', 'Piutang Usaha', 'asset', 0, $4, 'pos_settlement', $5, $6, true)`,
            [
              tenantId,
              entryNumber,
              today,
              total,
              orderId,
              `Pelunasan otomatis Invoice ${String(before.invoice_number)} (${String(before.customer_name)})`,
            ],
          );
        }

        return res.rows[0] ?? null;
      },
    );
    if (!updated) return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return Response.json({ order: updated });
  } catch (error) {
    return handleTenantError(error, "Gagal memperbarui status pesanan.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; orderId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId, orderId } = await params;
  const badTenant = validateUuidParam(tenantId, "ID workspace");
  if (badTenant) return badTenant;
  const badOrder = validateUuidParam(orderId, "ID pesanan");
  if (badOrder) return badOrder;

  try {
    await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "admin" },
      async (client) => {
        await client.query(`DELETE FROM pos_orders WHERE tenant_id = $1::uuid AND id = $2::uuid`, [tenantId, orderId]);
      },
    );
    return Response.json({ deleted: true });
  } catch (error) {
    return handleTenantError(error, "Gagal menghapus pesanan.");
  }
}
