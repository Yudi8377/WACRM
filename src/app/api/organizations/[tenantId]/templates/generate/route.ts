import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAiCustomerServiceTemplates,
  type CsScenarioId,
  type TemplateLanguage,
  type TemplateTone,
} from "@/lib/ai-template-generator";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";
import { withTenantContext } from "@/lib/tenant-context";
import { getDefaultStoreProfile } from "@/lib/store-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateSchema = z.object({
  mode: z.enum(["quick_reply", "official_template", "bundle"]).default("bundle"),
  prompt: z.string().trim().max(1000).default(""),
  scenarioId: z
    .enum([
      "greeting_catalog",
      "order_confirmation",
      "shipping_tracking",
      "payment_reminder",
      "complaint_resolution",
      "out_of_stock_alt",
      "vip_promo",
      "otp_verification",
      "operating_hours",
      "review_request",
      "custom",
    ])
    .optional(),
  tone: z.enum(["ramah", "profesional", "empatik", "persuasif", "singkat"]).default("ramah"),
  language: z.enum(["id", "en"]).default("id"),
  channel: z
    .enum(["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"])
    .default("whatsapp"),
  officialCategory: z.enum(["utility", "marketing", "authentication", "service"]).optional(),
  variationSeed: z.number().int().min(0).max(999).default(0),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  const rawBody = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter generator AI tidak valid.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const tenantContextData = await withTenantContext(
      { userId: authResult.session.user.id, tenantId },
      async (client) => {
        const [tenantRes, qrRes, tplRes, prodRes] = await Promise.all([
          client.query<{ name: string }>("SELECT name FROM tenants WHERE id = $1::uuid LIMIT 1", [
            tenantId,
          ]),
          client.query<{ shortcut: string }>(
            "SELECT shortcut FROM quick_replies WHERE tenant_id = $1::uuid",
            [tenantId],
          ),
          client.query<{ name: string }>(
            "SELECT name FROM message_templates WHERE tenant_id = $1::uuid",
            [tenantId],
          ),
          client.query<{
            id: string;
            sku: string;
            name: string;
            category: string;
            description: string;
            unit: string;
            unit_price: string | number;
            cost_price: string | number;
            stock_qty: number;
            min_stock: number;
            is_active: boolean;
            created_at: Date;
            updated_at: Date;
          }>(
            "SELECT id, sku, name, category, description, unit, unit_price, cost_price, stock_qty, min_stock, is_active, created_at, updated_at FROM erp_products WHERE tenant_id = $1::uuid AND is_active = true ORDER BY stock_qty DESC LIMIT 5",
            [tenantId],
          ),
        ]);

        return {
          workspaceName: tenantRes.rows[0]?.name ?? "Toko Anda",
          existingShortcuts: qrRes.rows.map((r) => r.shortcut),
          existingTemplateNames: tplRes.rows.map((r) => r.name),
          products: prodRes.rows.map((r) => ({
            id: r.id,
            sku: r.sku,
            name: r.name,
            category: r.category,
            description: r.description,
            unit: r.unit,
            unitPrice: Number(r.unit_price),
            costPrice: Number(r.cost_price),
            stockQty: Number(r.stock_qty),
            minStock: Number(r.min_stock),
            isActive: Boolean(r.is_active),
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          })),
        };
      },
    );

    const result = generateAiCustomerServiceTemplates({
      mode: parsed.data.mode,
      prompt: parsed.data.prompt,
      scenarioId: parsed.data.scenarioId as CsScenarioId | undefined,
      tone: parsed.data.tone as TemplateTone,
      language: parsed.data.language as TemplateLanguage,
      channel: parsed.data.channel,
      officialCategory: parsed.data.officialCategory,
      storeProfile: getDefaultStoreProfile(tenantContextData.workspaceName),
      products: tenantContextData.products,
      existingShortcuts: tenantContextData.existingShortcuts,
      existingTemplateNames: tenantContextData.existingTemplateNames,
      variationSeed: parsed.data.variationSeed,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleTenantError(err);
  }
}
