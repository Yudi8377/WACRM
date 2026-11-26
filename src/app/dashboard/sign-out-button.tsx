"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authClient.signOut().catch(() => undefined);
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={signOut}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {busy ? "Keluar..." : "Keluar"}
    </button>
  );
}
