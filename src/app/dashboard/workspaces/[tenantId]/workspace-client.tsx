"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MemberRole } from "@/lib/crm-types";
import { createApiWorkspaceAdapter } from "@/lib/workspace-adapter";

const WorkspaceApp = dynamic(
  () => import("@/components/crm/workspace-app").then((m) => m.WorkspaceApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold text-emerald-300">
        Memuat Workspace WACRM Commercial OS...
      </div>
    ),
  },
);

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
