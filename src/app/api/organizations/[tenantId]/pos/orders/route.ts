import { z } from "zod";
import { buildDoubleEntryForOrder, evaluateFraudRisk } from "@/lib/ai-agents";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import type { ChannelType, OrderStatus, PaymentMethod, PaymentStatus, PosOrderItemRecord, PosOrderRecord } from "@/lib/crm-types";
import { buildInvoiceQrPayload, generateInvoiceNumber } from "@/lib/qr-generator";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(160),
  customerPhone: z.string().trim().max(40).optional().nullable(),
  shippingAddress: z.string().trim().max(500).default(""),
  channel: z.enum(["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"]).default("whatsapp"),
  paymentMethod: z.enum(["qris", "bank_transfer", "cash", "cod", "credit"]).default("qris"),
  paymentStatus: z.enum(["unpaid", "paid", "refunded", "flagged"]).optional(),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(0.3).default(0.11),
  aiGenerated: z.boolean().default(false),
  conversationId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        sku: z.string().trim().min(1).max(64),
        productName: z.string().trim().min(1).max(180),
        quantity: z.number().int().min(1).max(9999),
        unitPrice: z.number().min(0),
        costPrice: z.number().min(0).default(0),
      }),
    )
    .min(1),
});

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const orders = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "viewer" },
      async (client) => {
        const [ordersRes, itemsRes] = await Promise.all([
          client.query(`SELECT * FROM pos_orders WHERE tenant_id = $1::uuid ORDER BY created_at DESC LIMIT 100`, [
            tenantId,
          ]),
          client.query(`SELECT * FROM pos_order_items WHERE tenant_id = $1::uuid ORDER BY created_at ASC`, [tenantId]),
        ]);

        const byOrder = new Map<string, PosOrderItemRecord[]>();
        for (const r of itemsRes.rows) {
          const orderId = String(r.order_id);
          const list = byOrder.get(orderId) ?? [];
          list.push({
            id: String(r.id),
            productId: r.product_id ? String(r.product_id) : null,
            sku: String(r.sku),
            productName: String(r.product_name),
            quantity: Number(r.quantity),
            unitPrice: Number(r.unit_price),
            costPrice: Number(r.cost_price),
            lineTotal: Number(r.line_total),
          });
          byOrder.set(orderId, list);
        }

        return ordersRes.rows.map(
          (r): PosOrderRecord => ({
            id: String(r.id),
            invoiceNumber: String(r.invoice_number),
            conversationId: r.conversation_id ? String(r.conversation_id) : null,
            contactId: r.contact_id ? String(r.contact_id) : null,
            customerName: String(r.customer_name),
            customerPhone: r.customer_phone ? String(r.customer_phone) : null,
            shippingAddress: String(r.shipping_address ?? ""),
            channel: String(r.channel) as ChannelType,
            subtotal: Number(r.subtotal),
            discountAmount: Number(r.discount_amount),
            taxAmount: Number(r.tax_amount),
            totalAmount: Number(r.total_amount),
            paymentMethod: String(r.payment_method) as PaymentMethod,
            paymentStatus: String(r.payment_status) as PaymentStatus,
            orderStatus: String(r.order_status) as OrderStatus,
            qrPayload: String(r.qr_payload),
            aiGenerated: Boolean(r.ai_generated),
            fraudRiskScore: Number(r.fraud_risk_score ?? 0),
            notes: r.notes ? String(r.notes) : null,
            items: byOrder.get(String(r.id)) ?? [],
            createdAt: new Date(String(r.created_at)).toISOString(),
            updatedAt: new Date(String(r.updated_at)).toISOString(),
          }),
        );
      },
    );
    return Response.json({ orders });
  } catch (error) {
    return handleTenantError(error, "Gagal memuat pesanan POS.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data pesanan POS tidak valid." }, { status: 400 });
  const input = parsed.data;

  try {
    const order = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        const wsRes = await client.query<{ name: string }>(`SELECT name FROM organizations WHERE id = $1::uuid`, [
          tenantId,
        ]);
        const workspaceName = wsRes.rows[0]?.name ?? "WACRM";
        const invoiceNumber = generateInvoiceNumber("INV");

        const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const discountAmount = Math.min(subtotal, Math.max(0, input.discountAmount));
        const taxable = Math.max(0, subtotal - discountAmount);
        const taxAmount = Math.round(taxable * input.taxRate);
        const totalAmount = taxable + taxAmount;

        const fraud = evaluateFraudRisk({
          message: `${input.customerName} ${input.notes ?? ""}`,
          extractedOrder: null,
          discountAmount,
        });
        const paymentStatus: PaymentStatus = fraud.blocked
          ? "flagged"
          : (input.paymentStatus ?? (input.paymentMethod === "cash" ? "paid" : "unpaid"));

        const qrPayload = buildInvoiceQrPayload({
          invoiceNumber,
          customerName: input.customerName,
          shippingAddress: input.shippingAddress,
          totalAmount,
          paymentMethod: input.paymentMethod,
          workspaceName,
        });

        const orderRes = await client.query(
          `INSERT INTO pos_orders
            (tenant_id, invoice_number, conversation_id, contact_id, customer_name, customer_phone,
             shipping_address, channel, subtotal, discount_amount, tax_amount, total_amount,
             payment_method, payment_status, order_status, qr_payload, ai_generated, fraud_risk_score, notes)
           VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'confirmed', $15, $16, $17, $18)
           RETURNING *`,
          [
            tenantId,
            invoiceNumber,
            input.conversationId ?? null,
            input.contactId ?? null,
            input.customerName,
            input.customerPhone ?? null,
            input.shippingAddress,
            input.channel,
            subtotal,
            discountAmount,
            taxAmount,
            totalAmount,
            input.paymentMethod,
            paymentStatus,
            qrPayload,
            input.aiGenerated,
            fraud.riskScore,
            input.notes ?? null,
          ],
        );
        const row = orderRes.rows[0];
        const orderId = String(row.id);

        const insertedItems: PosOrderItemRecord[] = [];
        for (const item of input.items) {
          const lineTotal = item.unitPrice * item.quantity;
          const itemRes = await client.query(
            `INSERT INTO pos_order_items
              (tenant_id, order_id, product_id, sku, product_name, quantity, unit_price, cost_price, line_total)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              tenantId,
              orderId,
              item.productId ?? null,
              item.sku,
              item.productName,
              item.quantity,
              item.unitPrice,
              item.costPrice,
              lineTotal,
            ],
          );
          insertedItems.push({
            id: String(itemRes.rows[0].id),
            productId: item.productId ?? null,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            lineTotal,
          });

          // Deduct ERP product stock & record movement
          if (item.productId) {
            await client.query(
              `UPDATE erp_products SET stock_qty = GREATEST(0, stock_qty - $3), updated_at = now()
                WHERE tenant_id = $1::uuid AND id = $2::uuid`,
              [tenantId, item.productId, item.quantity],
            );
            await client.query(
              `INSERT INTO erp_stock_movements (tenant_id, product_id, movement_type, quantity, reference_type, reference_id, notes)
               VALUES ($1::uuid, $2::uuid, 'out', $3, 'pos_order', $4, $5)`,
              [tenantId, item.productId, -item.quantity, orderId, `Penjualan ${invoiceNumber}`],
            );
          }
        }

        const fullOrder: PosOrderRecord = {
          id: orderId,
          invoiceNumber,
          conversationId: input.conversationId ?? null,
          contactId: input.contactId ?? null,
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? null,
          shippingAddress: input.shippingAddress,
          channel: input.channel,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus,
          orderStatus: "confirmed",
          qrPayload,
          aiGenerated: input.aiGenerated,
          fraudRiskScore: fraud.riskScore,
          notes: input.notes ?? null,
          items: insertedItems,
          createdAt: new Date(String(row.created_at)).toISOString(),
          updatedAt: new Date(String(row.updated_at)).toISOString(),
        };

        // Post balanced double-entry accounting journal entries automatically
        const journalLines = buildDoubleEntryForOrder(fullOrder);
        for (const line of journalLines) {
          await client.query(
            `INSERT INTO accounting_entries
              (tenant_id, entry_number, entry_date, account_code, account_name, account_type,
               debit, credit, reference_type, reference_id, description, ai_verified)
             VALUES ($1::uuid, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              tenantId,
              line.entryNumber,
              line.entryDate,
              line.accountCode,
              line.accountName,
              line.accountType,
              line.debit,
              line.credit,
              line.referenceType,
              line.referenceId,
              line.description,
              line.aiVerified,
            ],
          );
        }

        await client.query(
          `INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
           VALUES ($1::uuid, $2::uuid, 'pos.order.created', 'pos_order', $3, $4::jsonb)`,
          [
            tenantId,
            auth.session.user.id,
            orderId,
            JSON.stringify({ invoiceNumber, totalAmount, aiGenerated: input.aiGenerated }),
          ],
        );

        return fullOrder;
      },
    );

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Gagal membuat pesanan POS.");
  }
}
