import { z } from "zod";
import { withTenantContext } from "@/lib/tenant-context";
import { encryptConnectorToken } from "@/lib/connectors/token-crypto";
import { handleTenantError, requireSession, validateUuidParam } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createChannelSchema = z.object({
  channel: z.enum(["whatsapp", "facebook_messenger", "instagram", "tiktok", "youtube"]),
  displayName: z.string().trim().min(2).max(160),
  externalAccountId: z.string().trim().min(2).max(128),
  externalBusinessId: z.string().trim().max(128).optional().or(z.literal("")),
  accessToken: z.string().min(10).max(16_384).optional().or(z.literal("")),
  provider: z.enum(["meta_cloud", "evolution_api", "tiktok_api", "youtube_api", "manual"]).optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  instanceName: z.string().trim().max(128).optional().or(z.literal("")),
  status: z.enum(["pending", "connected", "disabled"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  try {
    const channels = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client) => {
      // NEVER select token_ciphertext or token_nonce in list API responses!
      const res = await client.query<{
        id: string;
        channel: string;
        display_name: string;
        external_account_id: string;
        external_business_id: string | null;
        status: string;
        scopes: string[] | null;
        token_expires_at: Date | null;
        metadata: Record<string, unknown> | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, channel, display_name, external_account_id, external_business_id, status, scopes, token_expires_at, metadata, created_at, updated_at
           FROM channel_connections
          WHERE tenant_id = $1::uuid
          ORDER BY updated_at DESC`,
        [tenantId],
      );

      return res.rows.map((row) => ({
        id: row.id,
        channel: row.channel,
        displayName: row.display_name,
        externalAccountId: row.external_account_id,
        externalBusinessId: row.external_business_id,
        status: row.status,
        scopes: row.scopes ?? [],
        tokenExpiresAt: row.token_expires_at?.toISOString() ?? null,
        metadata: row.metadata ?? {},
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
    });

    return Response.json({ channels }, { status: 200 });
  } catch (error) {
    return handleTenantError(error, "Daftar kanal belum dapat dimuat.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const authResult = await requireSession();
  if (!authResult.ok) return authResult.response;

  const { tenantId } = await context.params;
  const invalid = validateUuidParam(tenantId, "ID workspace");
  if (invalid) return invalid;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Data konfigurasi kanal tidak valid." }, { status: 400 });
  }

  let encrypted: { ciphertext: string; nonce: string; keyVersion: number } | null = null;
  if (parsed.data.accessToken) {
    try {
      encrypted = encryptConnectorToken(parsed.data.accessToken);
    } catch {
      return Response.json({ error: "Kunci enkripsi APP_ENCRYPTION_KEY belum dikonfigurasi di server." }, { status: 503 });
    }
  }

  const metadata: Record<string, unknown> = {
    provider: parsed.data.provider ?? (parsed.data.channel === "whatsapp" ? "meta_cloud" : "manual"),
  };
  if (parsed.data.baseUrl) metadata.base_url = parsed.data.baseUrl;
  if (parsed.data.instanceName) metadata.instance_name = parsed.data.instanceName;

  const nextStatus = parsed.data.status ?? (encrypted ? "connected" : "pending");

  try {
    const result = await withTenantContext({ userId: authResult.session.user.id, tenantId }, async (client, tenant) => {
      if (tenant.role !== "owner" && tenant.role !== "admin") return { kind: "forbidden" as const };

      const saved = await client.query<{
        id: string;
        channel: string;
        display_name: string;
        external_account_id: string;
        external_business_id: string | null;
        status: string;
        scopes: string[];
        token_expires_at: Date | null;
        metadata: Record<string, unknown>;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO channel_connections
           (tenant_id, channel, display_name, external_account_id, external_business_id,
            token_ciphertext, token_nonce, token_key_version, status, metadata)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         ON CONFLICT (tenant_id, channel, external_account_id)
         DO UPDATE SET
           display_name = EXCLUDED.display_name,
           external_business_id = EXCLUDED.external_business_id,
           token_ciphertext = COALESCE(EXCLUDED.token_ciphertext, channel_connections.token_ciphertext),
           token_nonce = COALESCE(EXCLUDED.token_nonce, channel_connections.token_nonce),
           token_key_version = COALESCE(EXCLUDED.token_key_version, channel_connections.token_key_version),
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = now()
         RETURNING id, channel, display_name, external_account_id, external_business_id, status, scopes, token_expires_at, metadata, created_at, updated_at`,
        [
          tenantId,
          parsed.data.channel,
          parsed.data.displayName,
          parsed.data.externalAccountId,
          parsed.data.externalBusinessId || null,
          encrypted?.ciphertext ?? null,
          encrypted?.nonce ?? null,
          encrypted?.keyVersion ?? null,
          nextStatus,
          JSON.stringify(metadata),
        ],
      );

      const row = saved.rows[0];
      await client.query(
        "INSERT INTO audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details) VALUES ($1::uuid, $2::uuid, 'channel.saved', 'channel_connection', $3, $4::jsonb)",
        [tenantId, tenant.userId, row.id, JSON.stringify({ channel: row.channel, status: row.status })],
      );

      return {
        kind: "ok" as const,
        channel: {
          id: row.id,
          channel: row.channel,
          displayName: row.display_name,
          externalAccountId: row.external_account_id,
          externalBusinessId: row.external_business_id,
          status: row.status,
          scopes: row.scopes ?? [],
          tokenExpiresAt: row.token_expires_at?.toISOString() ?? null,
          metadata: row.metadata ?? {},
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        },
      };
    });

    if (result.kind === "forbidden") {
      return Response.json({ error: "Hanya pemilik atau admin yang dapat mengelola kanal." }, { status: 403 });
    }
    return Response.json({ channel: result.channel }, { status: 201 });
  } catch (error) {
    return handleTenantError(error, "Kanal belum dapat disimpan.");
  }
}
