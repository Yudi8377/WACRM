import { z } from "zod";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { formatIdr, type ErpProductRecord } from "@/lib/crm-types";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  unitPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stockQty: z.number().int().min(0).optional(),
  stockDelta: z.number().int().optional(),
  stockReason: z.string().trim().max(200).optional(),
  minStock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

function mapProduct(row: Record<string, unknown>): ErpProductRecord {
  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description ?? ""),
    unit: String(row.unit ?? "pcs"),
    unitPrice: Number(row.unit_price),
    costPrice: Number(row.cost_price),
    stockQty: Number(row.stock_qty),
    minStock: Number(row.min_stock),
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; productId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId, productId } = await params;
  const badTenant = validateUuidParam(tenantId, "ID workspace");
  if (badTenant) return badTenant;
  const badProd = validateUuidParam(productId, "ID produk");
  if (badProd) return badProd;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data pembaruan produk tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const product = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const existing = await client.query(
          `SELECT * FROM erp_products WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          [tenantId, productId],
        );
        if (!existing.rows[0]) return null;
        const curr = mapProduct(existing.rows[0]);
        const nextStock =
          typeof input.stockDelta === "number"
            ? Math.max(0, curr.stockQty + input.stockDelta)
            : (input.stockQty ?? curr.stockQty);

        const res = await client.query(
          `UPDATE erp_products
              SET name = $3,
                  category = $4,
                  description = $5,
                  unit = $6,
                  unit_price = $7,
                  cost_price = $8,
                  stock_qty = $9,
                  min_stock = $10,
                  is_active = $11,
                  updated_at = now()
            WHERE tenant_id = $1::uuid AND id = $2::uuid
            RETURNING *`,
          [
            tenantId,
            productId,
            input.name ?? curr.name,
            input.category ?? curr.category,
            input.description ?? curr.description,
            input.unit ?? curr.unit,
            input.unitPrice ?? curr.unitPrice,
            input.costPrice ?? curr.costPrice,
            nextStock,
            input.minStock ?? curr.minStock,
            input.isActive ?? curr.isActive,
          ],
        );
        const updated = mapProduct(res.rows[0]);

        const delta = nextStock - curr.stockQty;
        if (delta !== 0) {
          await client.query(
            `INSERT INTO erp_stock_movements (tenant_id, product_id, movement_type, quantity, reference_type, notes)
             VALUES ($1::uuid, $2::uuid, $3, $4, 'manual_update', $5)`,
            [tenantId, productId, delta > 0 ? "in" : "adjustment", delta, input.stockReason ?? "Pembaruan stok ERP"],
          );
        }

        // Keep AI Knowledge Base synchronized automatically
        await client.query(
          `DELETE FROM ai_knowledge_items WHERE tenant_id = $1::uuid AND source_type = 'product' AND source_id = $2`,
          [tenantId, productId],
        );
        await client.query(
          `INSERT INTO ai_knowledge_items (tenant_id, source_type, source_id, title, content, tags, confidence, auto_generated)
           VALUES ($1::uuid, 'product', $2, $3, $4, $5::text[], 0.96, true)`,
          [
            tenantId,
            updated.id,
            `Produk ${updated.name} (${updated.sku})`,
            `${updated.name} [${updated.sku}] kategori ${updated.category}. Harga jual ${formatIdr(updated.unitPrice)}/${updated.unit}. Stok tersedia: ${updated.stockQty} ${updated.unit}. ${updated.description}`,
            ["produk", updated.sku.toLowerCase(), updated.category.toLowerCase()],
          ],
        );

        return updated;
      },
    );

    if (!product) return Response.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return Response.json({ product });
  } catch (error) {
    return handleTenantError(error, "Gagal memperbarui produk ERP.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; productId: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId, productId } = await params;
  const badTenant = validateUuidParam(tenantId, "ID workspace");
  if (badTenant) return badTenant;
  const badProd = validateUuidParam(productId, "ID produk");
  if (badProd) return badProd;

  try {
    await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "admin" },
      async (client) => {
        await client.query(`DELETE FROM erp_products WHERE tenant_id = $1::uuid AND id = $2::uuid`, [
          tenantId,
          productId,
        ]);
        await client.query(
          `DELETE FROM ai_knowledge_items WHERE tenant_id = $1::uuid AND source_type = 'product' AND source_id = $2`,
          [tenantId, productId],
        );
      },
    );
    return Response.json({ deleted: true });
  } catch (error) {
    return handleTenantError(error, "Gagal menghapus produk ERP.");
  }
}
