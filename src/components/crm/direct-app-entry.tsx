"use client";

import { CommercialAuthGate } from "@/components/auth/commercial-auth-gate";

export function DirectAppEntry() {
  return <CommercialAuthGate initialMode="signin" />;
}
