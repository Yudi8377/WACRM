import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeSession, isAuthConfigured } from "@/lib/auth";
import { withTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { isUuid } from "@/lib/connectors/whatsapp-policy";
import { WhatsAppConnectionForm } from "./connection-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WhatsAppChannelPage({ params }: { params: Promise<{ tenantId: string }> }) {
  if (!isAuthConfigured()) redirect("/setup");
  const session = await getSafeSession(await headers());
  if (!session) redirect("/sign-in");
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect("/dashboard");

  let workspace: { name: string; role: string; connection: {
    displayName: string;
    phoneNumberId: string;
    status: string;
    tokenExpiresAt: string | null;
    scopes: string[];
    displayPhoneNumber: string | null;
    verifiedName: string | null;
  } | null };
  try {
    workspace = await withTenantContext({ userId: session.user.id, tenantId }, async (client, membership) => {
      const organization = await client.query<{ name: string }>(
        "SELECT name FROM organizations WHERE id = $1::uuid",
        [tenantId],
      );
      if (!organization.rows[0]) throw new TenantAccessError();
      const result = await client.query<{
        display_name: string;
        external_account_id: string;
        status: string;
        token_expires_at: Date | null;
        scopes: string[];
        metadata: { display_phone_number?: string; verified_name?: string } | null;
      }>(
        "SELECT display_name, external_account_id, status, token_expires_at, scopes, metadata FROM channel_connections WHERE tenant_id = $1::uuid AND channel = 'whatsapp' ORDER BY updated_at DESC LIMIT 1",
        [tenantId],
      );
      const connection = result.rows[0];
      return {
        name: organization.rows[0].name,
        role: membership.role,
        connection: connection ? {
          displayName: connection.display_name,
          phoneNumberId: connection.external_account_id,
          status: connection.status,
          tokenExpiresAt: connection.token_expires_at?.toISOString() ?? null,
          scopes: connection.scopes ?? [],
          displayPhoneNumber: connection.metadata?.display_phone_number ?? null,
          verifiedName: connection.metadata?.verified_name ?? null,
        } : null,
      };
    });
  } catch (error) {
    if (error instanceof TenantAccessError) redirect("/dashboard");
    throw error;
  }

  return <main style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Link href={`/dashboard/workspaces/${tenantId}`} style={{ color: "#059669", textDecoration: "none", fontWeight: 700 }}>← Buka Ruang Kerja CRM</Link>
      <Link href="/dashboard" style={{ color: "#64748b", textDecoration: "none", fontWeight: 600 }}>Semua Workspace</Link>
    </div>
    <p style={{ color: "#2563eb", fontWeight: 700, letterSpacing: 1.5, marginTop: 36 }}>KONEKSI KANAL</p>
    <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", margin: "8px 0" }}>WhatsApp Business</h1>
    <p style={{ color: "#64748b", lineHeight: 1.7 }}>Workspace: <strong>{workspace.name}</strong> · Peran: {workspace.role}</p>
    {workspace.role === "owner" || workspace.role === "admin"
      ? <WhatsAppConnectionForm tenantId={tenantId} existing={workspace.connection} />
      : <p style={{ marginTop: 24, padding: 18, border: "1px solid #e2e8f0", borderRadius: 12 }}>Hanya pemilik atau admin workspace yang dapat mengubah koneksi kanal.</p>}
    <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6, marginTop: 28 }}>Koneksi ini menggunakan API resmi Meta. Pastikan nomor dan akun bisnis memiliki izin yang sesuai serta webhook telah dikonfigurasi sebelum menerima pesan pelanggan.</p>
  </main>;
}
