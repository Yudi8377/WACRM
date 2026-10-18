"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type ExistingConnection = {
  displayName: string;
  phoneNumberId: string;
  status: string;
  tokenExpiresAt: string | null;
  scopes: string[];
  displayPhoneNumber: string | null;
  verifiedName: string | null;
};

export function WhatsAppConnectionForm({
  tenantId,
  existing,
}: {
  tenantId: string;
  existing: ExistingConnection | null;
}) {
  const router = useRouter();
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(existing?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/organizations/${tenantId}/channels/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wabaId, phoneNumberId, accessToken }),
      });
      const data = await response.json() as { error?: string; displayName?: string; status?: string; tokenExpiresAt?: string | null };
      if (!response.ok) {
        setError(data.error || "Koneksi WhatsApp belum berhasil.");
        return;
      }
      setAccessToken("");
      setWabaId("");
      setSuccess(`WhatsApp terhubung: ${data.displayName || phoneNumberId}.`);
      router.refresh();
    } catch {
      setError("Koneksi jaringan gagal. Coba kembali setelah memeriksa koneksi.");
    } finally {
      setBusy(false);
    }
  }

  return <section style={panelStyle}>
    <h2 style={{ marginTop: 0 }}>Hubungkan WhatsApp Business</h2>
    {existing ? <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 22 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{existing.displayName}</p>
      <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 14 }}>{existing.displayPhoneNumber || existing.phoneNumberId}</p>
      <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 13 }}>Status: {existing.status}</p>
      {existing.tokenExpiresAt && <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Token berlaku sampai: {new Date(existing.tokenExpiresAt).toLocaleString("id-ID")}</p>}
      {existing.scopes.length > 0 && <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>Izin tervalidasi: {existing.scopes.join(", ")}</p>}
    </div> : <p style={{ color: "#64748b", lineHeight: 1.7 }}>Belum ada koneksi aktif. Gunakan token resmi dari Meta Business Manager yang memiliki akses ke WABA dan nomor ini.</p>}

    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label style={labelStyle}>WhatsApp Business Account ID (WABA ID)
        <input required inputMode="numeric" pattern="\d{5,30}" value={wabaId} onChange={e => setWabaId(e.target.value)} style={fieldStyle} />
      </label>
      <label style={labelStyle}>Phone Number ID
        <input required inputMode="numeric" pattern="\d{5,30}" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} style={fieldStyle} />
      </label>
      <label style={labelStyle}>System User Access Token
        <input required type="password" autoComplete="new-password" minLength={10} maxLength={16384} value={accessToken} onChange={e => setAccessToken(e.target.value)} style={fieldStyle} />
      </label>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Token dikirim hanya ke server, divalidasi terhadap Meta App, lalu dienkripsi sebelum disimpan. Token tidak akan ditampilkan kembali. Jangan gunakan token sementara untuk layanan produksi.</p>
      {error && <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>{error}</p>}
      {success && <p role="status" style={{ color: "#166534", margin: 0 }}>{success}</p>}
      <button type="submit" disabled={busy} style={buttonStyle}>{busy ? "Memvalidasi Meta..." : existing ? "Validasi dan perbarui koneksi" : "Validasi dan hubungkan"}</button>
    </form>
  </section>;
}

const panelStyle = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, marginTop: 24 };
const labelStyle = { display: "grid", gap: 7, fontSize: 14, fontWeight: 650 as const };
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", fontSize: 15 };
const buttonStyle = { border: 0, borderRadius: 10, background: "#1d4ed8", color: "white", padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
