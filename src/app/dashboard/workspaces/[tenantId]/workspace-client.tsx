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
}: {
  tenantId: string;
  name: string;
  slug: string;
  role: MemberRole;
}) {
  const adapter = useMemo(
    () => createApiWorkspaceAdapter(tenantId, { name, slug, role }),
    [tenantId, name, slug, role],
  );
  return <WorkspaceApp adapter={adapter} />;
}
