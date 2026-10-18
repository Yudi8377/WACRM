import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { withTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { encryptConnectorToken } from "@/lib/connectors/token-crypto";
import { MetaWhatsAppValidationError, validateMetaWhatsAppConnection } from "@/lib/connectors/meta-whatsapp-validation";
import { isUuid } from "@/lib/connectors/whatsapp-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  wabaId: z.string().trim().regex(/^\d{5,30}$/),
  phoneNumberId: z.string().trim().regex(/^\d{5,30}$/),
  accessToken: z.string().min(10).max(16_384),
});

export async function POST(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const { tenantId } = await context.params;
  if (!isUuid(tenantId)) return Response.json({ error: "ID workspace tidak valid." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "WABA ID, Phone Number ID, atau access token tidak valid." }, { status: 400 });
  }

  try {
    const authorization = await withTenantContext(
      { userId: session.user.id, tenantId },
      async (_client, membership) => ({
        allowed: membership.role === "owner" || membership.role === "admin",
      }),
    );
    if (!authorization.allowed) {
      return Response.json({ error: "Hanya pemilik atau admin workspace yang dapat menghubungkan kanal." }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
    return Response.json({ error: "Workspace belum dapat diverifikasi." }, { status: 500 });
  }

  let validated;
  try {
    validated = await validateMetaWhatsAppConnection({
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      graphApiVersion: process.env.META_GRAPH_API_VERSION,
      ...parsed.data,
    });
  } catch (error) {
    if (error instanceof MetaWhatsAppValidationError) {
      const status = error.code === "not_configured" ? 503
        : error.code === "provider_unavailable" ? 502
          : 422;
      const message = error.code === "not_configured"
        ? "Konfigurasi Meta App belum lengkap di server."
        : error.code === "invalid_token"
          ? "Access token tidak valid, kedaluwarsa, atau berasal dari Meta App yang berbeda."
          : error.code === "missing_permissions"
            ? "Token belum memiliki izin WhatsApp Business Management dan Messaging yang diperlukan."
            : error.code === "account_mismatch"
              ? "Phone Number ID tidak ditemukan di WhatsApp Business Account yang dipilih."
              : "Meta sedang tidak dapat memvalidasi koneksi. Coba lagi nanti.";
      return Response.json({ error: message }, { status });
    }
    return Response.json({ error: "Koneksi belum dapat divalidasi." }, { status: 502 });
  }

  let encrypted;
  try {
    encrypted = encryptConnectorToken(parsed.data.accessToken);
  } catch {
    return Response.json({ error: "Kunci enkripsi token belum dikonfigurasi dengan benar." }, { status: 503 });
  }

  const displayName = validated.verifiedName || validated.displayPhoneNumber || `WhatsApp ${validated.phoneNumberId}`;
  try {
    const saved = await withTenantContext(
      { userId: session.user.id, tenantId },
      async (client, membership) => {
        if (membership.role !== "owner" && membership.role !== "admin") {
          return { forbidden: true as const };
        }
        const result = await client.query<{
          id: string;
          display_name: string;
          external_account_id: string;
          status: string;
          token_expires_at: Date | null;
          scopes: string[];
        }>(
          `INSERT INTO channel_connections
             (tenant_id, channel, display_name, external_account_id, external_business_id,
              token_ciphertext, token_nonce, token_key_version, token_expires_at, scopes, status, metadata)
           VALUES ($1::uuid, 'whatsapp', $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::text[], 'connected', $10::jsonb)
           ON CONFLICT (tenant_id, channel, external_account_id)
           DO UPDATE SET
             display_name = EXCLUDED.display_name,
             external_business_id = EXCLUDED.external_business_id,
             token_ciphertext = EXCLUDED.token_ciphertext,
             token_nonce = EXCLUDED.token_nonce,
             token_key_version = EXCLUDED.token_key_version,
             token_expires_at = EXCLUDED.token_expires_at,
             scopes = EXCLUDED.scopes,
             status = 'connected',
             metadata = EXCLUDED.metadata,
             updated_at = now()
           RETURNING id, display_name, external_account_id, status, token_expires_at, scopes`,
          [
            tenantId,
            displayName,
            validated.phoneNumberId,
            validated.wabaId,
            encrypted.ciphertext,
            encrypted.nonce,
            encrypted.keyVersion,
            validated.tokenExpiresAt,
            validated.scopes,
            JSON.stringify({
              waba_id: validated.wabaId,
              display_phone_number: validated.displayPhoneNumber,
              verified_name: validated.verifiedName,
            }),
          ],
        );
        const connection = result.rows[0];
        await client.query(
          "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'channel.whatsapp.connected', 'channel_connection', $3, $4::jsonb)",
          [tenantId, session.user.id, connection.id, JSON.stringify({ wabaId: validated.wabaId, phoneNumberId: validated.phoneNumberId, scopes: validated.scopes })],
        );
        return { forbidden: false as const, connection };
      },
    );

    if (saved.forbidden) return Response.json({ error: "Hanya pemilik atau admin workspace yang dapat menghubungkan kanal." }, { status: 403 });
    return Response.json({
      id: saved.connection.id,
      displayName: saved.connection.display_name,
      phoneNumberId: saved.connection.external_account_id,
      displayPhoneNumber: validated.displayPhoneNumber,
      verifiedName: validated.verifiedName,
      status: saved.connection.status,
      tokenExpiresAt: saved.connection.token_expires_at,
      scopes: saved.connection.scopes,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantAccessError) return Response.json({ error: "Anda tidak memiliki akses ke workspace ini." }, { status: 403 });
    return Response.json({ error: "Koneksi tervalidasi tetapi belum dapat disimpan. Periksa izin database." }, { status: 500 });
  }
}
