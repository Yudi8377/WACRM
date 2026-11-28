"use client";

import { CommercialAuthGate } from "@/components/auth/commercial-auth-gate";

export default function DemoWorkspacePage() {
  return <CommercialAuthGate initialMode="signup" />;
}
