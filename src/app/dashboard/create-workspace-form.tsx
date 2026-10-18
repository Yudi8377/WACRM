"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
      const data = await response.json() as { error?: string; id?: string };
      if (!response.ok || !data.id) {
        setError(data.error || "Workspace belum dapat dibuat.");
        return;
      }
      router.refresh();
    } catch {
      setError("Koneksi terputus. Periksa jaringan lalu coba kembali.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
    <input required minLength={2} maxLength={160} value={name} onChange={event => setName(event.target.value)}
      placeholder="Contoh: Tim Layanan Pelanggan" aria-label="Nama workspace"
      style={{ flex: "1 1 240px", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", fontSize: 15 }} />
    <button disabled={busy} type="submit"
      style={{ border: 0, borderRadius: 10, background: "#1d4ed8", color: "white", padding: "12px 18px", fontWeight: 700, cursor: "pointer" }}>
      {busy ? "Membuat..." : "Buat workspace"}
    </button>
    {error && <p role="alert" style={{ flexBasis: "100%", color: "#b91c1c", margin: 0 }}>{error}</p>}
  </form>;
}
