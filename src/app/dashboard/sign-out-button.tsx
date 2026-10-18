"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }
  return <button type="button" disabled={busy} onClick={signOut}
    style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "9px 13px", background: "white", cursor: "pointer" }}>
    {busy ? "Keluar..." : "Keluar"}
  </button>;
}
