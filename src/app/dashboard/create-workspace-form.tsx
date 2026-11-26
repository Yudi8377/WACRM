"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error || "Workspace belum dapat dibuat.");
        return;
      }
      setName("");
      router.push(`/dashboard/workspaces/${data.id}`);
      router.refresh();
    } catch {
      setError("Koneksi terputus. Periksa jaringan lalu coba kembali.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
      <input
        required
        minLength={2}
        maxLength={160}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Contoh: Tim Layanan Pelanggan"
        aria-label="Nama workspace"
        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
      />
      <button
        disabled={busy}
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {busy ? "Membuat..." : "Buat Workspace"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
