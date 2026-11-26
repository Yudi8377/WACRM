import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeSession, isAuthConfigured } from "@/lib/auth";
import { withTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { isUuid } from "@/lib/connectors/whatsapp-policy";
import type { MemberRole } from "@/lib/crm-types";
import { WorkspaceClient } from "./workspace-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ tenantId: string }> }) {
  if (!isAuthConfigured()) redirect("/setup");
  const session = await getSafeSession(await headers());
  if (!session) redirect("/sign-in");

  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect("/dashboard");

  let workspace: { name: string; slug: string; role: MemberRole };
  try {
    workspace = await withTenantContext({ userId: session.user.id, tenantId }, async (client, membership) => {
      const org = await client.query<{ name: string; slug: string }>(
        "SELECT name, slug FROM organizations WHERE id = $1::uuid",
        [tenantId],
      );
      if (!org.rows[0]) throw new TenantAccessError();
      return {
        name: org.rows[0].name,
        slug: org.rows[0].slug,
        role: membership.role,
      };
    });
  } catch (error) {
    if (error instanceof TenantAccessError) redirect("/dashboard");
    throw error;
  }

  return <WorkspaceClient tenantId={tenantId} name={workspace.name} slug={workspace.slug} role={workspace.role} />;
}
