"use client";

import { useMemo } from "react";
import type { MemberRole } from "@/lib/crm-types";
import { createApiWorkspaceAdapter } from "@/lib/workspace-adapter";
import { WorkspaceApp } from "@/components/crm/workspace-app";

export function WorkspaceClient({
  tenantId,
  name,
  slug,
  role,
  accountEmail,
}: {
  tenantId: string;
  name: string;
  slug: string;
  role: MemberRole;
  accountEmail?: string | null;
}) {
  const adapter = useMemo(
    () => createApiWorkspaceAdapter(tenantId, { name, slug, role }),
    [tenantId, name, slug, role],
  );
  return <WorkspaceApp key={`${tenantId}-${accountEmail ?? "anon"}`} adapter={adapter} accountEmail={accountEmail} />;
}
