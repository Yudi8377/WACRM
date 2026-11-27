"use client";

import { useMemo } from "react";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { WorkspaceApp } from "@/components/crm/workspace-app";

export function DirectAppEntry() {
  const adapter = useMemo(() => createDemoWorkspaceAdapter(), []);
  return <WorkspaceApp adapter={adapter} />;
}
