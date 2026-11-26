import { z } from "zod";
import { computeFinancialReport } from "@/lib/ai-agents";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import type { AccountingEntryRecord, AccountType, ErpProductRecord } from "@/lib/crm-types";
import { withTenantContext } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const manualEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: z.enum(["expense", "income", "capital"]),
  categoryName: z.string().trim().min(2).max(100),
  amount: z.number().positive(),
  description: z.string().trim().min(2).max(400),
});

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const result = await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "viewer" },
      async (client) => {
        const [entriesRes, productsRes] = await Promise.all([
          client.query(
            `SELECT * FROM accounting_entries WHERE tenant_id = $1::uuid ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
            [tenantId],
          ),
          client.query(`SELECT * FROM erp_products WHERE tenant_id = $1::uuid`, [tenantId]),
        ]);

        const entries: AccountingEntryRecord[] = entriesRes.rows.map((r) => ({
          id: String(r.id),
          entryNumber: String(r.entry_number),
          entryDate: String(r.entry_date).slice(0, 10),
          accountCode: String(r.account_code),
          accountName: String(r.account_name),
          accountType: String(r.account_type) as AccountType,
          debit: Number(r.debit),
          credit: Number(r.credit),
          referenceType: r.reference_type ? String(r.reference_type) : null,
          referenceId: r.reference_id ? String(r.reference_id) : null,
          description: String(r.description ?? ""),
          aiVerified: Boolean(r.ai_verified),
          createdAt: new Date(String(r.created_at)).toISOString(),
        }));

        const products: ErpProductRecord[] = productsRes.rows.map((r) => ({
          id: String(r.id),
          sku: String(r.sku),
          name: String(r.name),
          category: String(r.category),
          description: String(r.description ?? ""),
          unit: String(r.unit ?? "pcs"),
          unitPrice: Number(r.unit_price),
          costPrice: Number(r.cost_price),
          stockQty: Number(r.stock_qty),
          minStock: Number(r.min_stock),
          isActive: Boolean(r.is_active),
          createdAt: new Date(String(r.created_at)).toISOString(),
          updatedAt: new Date(String(r.updated_at)).toISOString(),
        }));

        const summary = computeFinancialReport(entries, products);
        return { entries, summary };
      },
    );
    return Response.json(result);
  } catch (error) {
    return handleTenantError(error, "Gagal memuat laporan akuntansi.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const parsed = manualEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data jurnal akuntansi tidak valid." }, { status: 400 });
  const input = parsed.data;
  const entryDate = input.entryDate ?? new Date().toISOString().slice(0, 10);
  const entryNumber = `JE-MAN-${Date.now().toString().slice(-6)}`;

  const pairs: Array<{
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }> =
    input.kind === "expense"
      ? [
          { code: "6100", name: `Beban ${input.categoryName}`, type: "expense", debit: input.amount, credit: 0 },
          { code: "1100", name: "Kas & Bank / QRIS", type: "asset", debit: 0, credit: input.amount },
        ]
      : input.kind === "income"
        ? [
            { code: "1100", name: "Kas & Bank / QRIS", type: "asset", debit: input.amount, credit: 0 },
            { code: "4200", name: `Pendapatan ${input.categoryName}`, type: "revenue", debit: 0, credit: input.amount },
          ]
        : [
            { code: "1100", name: "Kas & Bank / QRIS", type: "asset", debit: input.amount, credit: 0 },
            { code: "3100", name: `Modal ${input.categoryName}`, type: "equity", debit: 0, credit: input.amount },
          ];

  try {
    await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "agent" },
      async (client) => {
        for (const line of pairs) {
          await client.query(
            `INSERT INTO accounting_entries
              (tenant_id, entry_number, entry_date, account_code, account_name, account_type,
               debit, credit, reference_type, description, ai_verified)
             VALUES ($1::uuid, $2, $3::date, $4, $5, $6, $7, $8, 'manual', $9, true)`,
            [
              tenantId,
              entryNumber,
              entryDate,
              line.code,
              line.name,
              line.type,
              line.debit,
              line.credit,
              input.description,
            ],
          );
        }
      },
    );
    return Response.json({ entryNumber, ok: true }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Gagal menyimpan jurnal akuntansi.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const { tenantId } = await params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const url = new URL(request.url);
  const entryNumber = url.searchParams.get("entryNumber")?.trim();
  if (!entryNumber) return Response.json({ error: "Nomor jurnal wajib diisi." }, { status: 400 });

  try {
    await withTenantContext(
      { tenantId, userId: auth.session.user.id, minRole: "admin" },
      async (client) => {
        await client.query(
          `DELETE FROM accounting_entries WHERE tenant_id = $1::uuid AND entry_number = $2`,
          [tenantId, entryNumber],
        );
      },
    );
    return Response.json({ deleted: true });
  } catch (error) {
    return handleTenantError(error, "Gagal menghapus jurnal akuntansi.");
  }
}
