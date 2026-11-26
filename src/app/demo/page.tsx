"use client";

import { useMemo } from "react";
import { createDemoWorkspaceAdapter } from "@/lib/demo-store";
import { WorkspaceApp } from "@/components/crm/workspace-app";

export default function DemoWorkspacePage() {
  const adapter = useMemo(() => createDemoWorkspaceAdapter(), []);
  return <WorkspaceApp adapter={adapter} />;
}
