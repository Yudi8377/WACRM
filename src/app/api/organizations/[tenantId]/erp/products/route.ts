import { z } from "zod";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { formatIdr, type ErpProductRecord } from "@/lib/crm-types";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80).default("Umum"),
  description: z.string().trim().max(2000).default(""),
  unit: z.string().trim().min(1).max(24).default("pcs"),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  stockQty: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
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

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const data = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "viewer" },
      async (client) => {
        const [productsRes, movementsRes] = await Promise.all([
          client.query(
            `SELECT * FROM erp_products WHERE tenant_id = $1::uuid ORDER BY category, name`,
            [tenantId],
          ),
          client.query(
            `SELECT m.*, p.name AS product_name, p.sku
               FROM erp_stock_movements m
               JOIN erp_products p ON p.id = m.product_id
              WHERE m.tenant_id = $1::uuid
              ORDER BY m.created_at DESC
              LIMIT 40`,
            [tenantId],
          ),
        ]);
        return {
          products: productsRes.rows.map(mapProduct),
          movements: movementsRes.rows.map((r) => ({
            id: String(r.id),
            productId: String(r.product_id),
            productName: String(r.product_name),
            sku: String(r.sku),
            movementType: String(r.movement_type),
            quantity: Number(r.quantity),
            referenceType: r.reference_type ? String(r.reference_type) : null,
            referenceId: r.reference_id ? String(r.reference_id) : null,
            notes: r.notes ? String(r.notes) : null,
            createdAt: new Date(String(r.created_at)).toISOString(),
          })),
        };
      },
    );
    return Response.json(data);
  } catch (error) {
    return handleTenantError(error, "Gagal memuat katalog produk ERP.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Data produk ERP tidak valid." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const product = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const res = await client.query(
          `INSERT INTO erp_products
            (tenant_id, sku, name, category, description, unit, unit_price, cost_price, stock_qty, min_stock, is_active)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            tenantId,
            input.sku.toUpperCase(),
            input.name,
            input.category,
            input.description,
            input.unit,
            input.unitPrice,
            input.costPrice,
            input.stockQty,
            input.minStock,
            input.isActive,
          ],
        );
        const created = mapProduct(res.rows[0]);

        if (input.stockQty > 0) {
          await client.query(
            `INSERT INTO erp_stock_movements (tenant_id, product_id, movement_type, quantity, reference_type, notes)
             VALUES ($1::uuid, $2::uuid, 'in', $3, 'initial_stock', 'Stok awal produk baru')`,
            [tenantId, created.id, input.stockQty],
          );
        }

        // Autonomous Knowledge Base Sync for AI Agents
        await client.query(
          `INSERT INTO ai_knowledge_items (tenant_id, source_type, source_id, title, content, tags, confidence, auto_generated)
           VALUES ($1::uuid, 'product', $2, $3, $4, $5::text[], 0.96, true)`,
          [
            tenantId,
            created.id,
            `Produk ${created.name} (${created.sku})`,
            `${created.name} [${created.sku}] kategori ${created.category}. Harga jual ${formatIdr(created.unitPrice)}/${created.unit}. Stok tersedia: ${created.stockQty} ${created.unit}. ${created.description}`,
            ["produk", created.sku.toLowerCase(), created.category.toLowerCase()],
          ],
        );

        await client.query(
          `INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
           VALUES ($1::uuid, $2::uuid, 'erp.product.created', 'erp_product', $3, $4::jsonb)`,
          [tenantId, auth.session.user.id, created.id, JSON.stringify({ sku: created.sku, name: created.name })],
        );
        return created;
      },
    );
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Gagal menambahkan produk ERP (pastikan SKU unik).");
  }
}
