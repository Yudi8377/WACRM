"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  cleanMetaAccessToken,
  diagnoseMetaWhatsAppDraft,
  META_QUICK_LINKS,
  parseMetaWhatsAppPaste,
} from "@/lib/meta-whatsapp-helper";

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
  const [smartPaste, setSmartPaste] = useState("");
  const [smartNote, setSmartNote] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(existing?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const diagnosis = useMemo(
    () => diagnoseMetaWhatsAppDraft({ wabaId, phoneNumberId, accessToken }),
    [accessToken, phoneNumberId, wabaId],
  );

  function handleSmartPaste(raw: string) {
    setSmartPaste(raw);
    if (!raw.trim()) {
      setSmartNote("");
      return;
    }
    const parsed = parseMetaWhatsAppPaste(raw);
    if (parsed.wabaId) setWabaId(parsed.wabaId);
    if (parsed.phoneNumberId) setPhoneNumberId(parsed.phoneNumberId);
    if (parsed.accessToken) setAccessToken(parsed.accessToken);
    setSmartNote(parsed.summary);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/organizations/${tenantId}/channels/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: wabaId.replace(/\D/g, ""),
          phoneNumberId: phoneNumberId.replace(/\D/g, ""),
          accessToken: cleanMetaAccessToken(accessToken),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        displayName?: string;
        status?: string;
        tokenExpiresAt?: string | null;
      };
      if (!response.ok) {
        setError(data.error || "Koneksi WhatsApp belum berhasil.");
        return;
      }
      setAccessToken("");
      setWabaId("");
      setSmartPaste("");
      setSmartNote("");
      setSuccess(`WhatsApp terhubung: ${data.displayName || phoneNumberId}.`);
      router.refresh();
    } catch {
      setError("Koneksi jaringan gagal. Coba kembali setelah memeriksa koneksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>Hubungkan Meta WhatsApp (3 Langkah Mudah)</h2>
      {existing ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{existing.displayName}</p>
          <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 14 }}>{existing.displayPhoneNumber || existing.phoneNumberId}</p>
          <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 13 }}>Status: {existing.status}</p>
          {existing.tokenExpiresAt && (
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Token berlaku sampai: {new Date(existing.tokenExpiresAt).toLocaleString("id-ID")}
            </p>
          )}
          {existing.scopes.length > 0 && (
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
              Izin tervalidasi: {existing.scopes.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: "#475569", lineHeight: 1.65, fontSize: 14 }}>
          Ikuti 3 langkah ringkas: (1) Buka Meta Developers → WhatsApp → API Setup, (2) Copy-Paste kode cURL Meta ke kotak Auto-Isi, lalu (3) Klik Validasi &amp; Hubungkan.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <a
          href={META_QUICK_LINKS.developersApps}
          target="_blank"
          rel="noopener noreferrer"
          style={linkButtonStyle}
        >
          1. Buka Meta Developers (API Setup) ↗
        </a>
        <a
          href={META_QUICK_LINKS.systemUsers}
          target="_blank"
          rel="noopener noreferrer"
          style={secondaryLinkStyle}
        >
          Buat Token Permanen (System User) ↗
        </a>
      </div>

      <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#155e75" }}>
          ✨ 2. Tempel Otomatis Kode cURL / Catatan dari Meta (Opsional — Auto-Isi!)
          <textarea
            rows={2}
            value={smartPaste}
            onChange={(e) => handleSmartPaste(e.target.value)}
            placeholder="Tempel kode curl dari Meta API Setup di sini → Phone Number ID & Token langsung terisi otomatis!"
            style={{ ...fieldStyle, fontFamily: "monospace", fontSize: 12, background: "white" }}
          />
        </label>
        {smartNote && <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: "#0f766e" }}>✓ {smartNote}</p>}
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <label style={labelStyle}>
          Phone Number ID (15 digit dari Meta API Setup)
          <input
            required
            inputMode="numeric"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value.replace(/\s+/g, ""))}
            placeholder="Contoh: 112233445566778"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          WhatsApp Business Account ID (WABA ID)
          <input
            required
            inputMode="numeric"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value.replace(/\s+/g, ""))}
            placeholder="Contoh: 109876543210987"
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          System User / Access Token Meta
          <div style={{ display: "flex", gap: 8 }}>
            <input
              required
              type={showToken ? "text" : "password"}
              autoComplete="new-password"
              minLength={10}
              maxLength={16384}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAA..."
              style={{ ...fieldStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, background: "#f8fafc", padding: "0 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {showToken ? "Sembunyi" : "Lihat"}
            </button>
          </div>
        </label>

        {diagnosis.warnings.length > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: 12, color: "#92400e", fontSize: 13 }}>
            {diagnosis.warnings.map((w) => (
              <p key={w} style={{ margin: "0 0 4px" }}>⚠️ {w}</p>
            ))}
          </div>
        )}

        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Token dikirim hanya ke server, divalidasi langsung ke Meta Graph API, lalu dienkripsi AES-256-GCM sebelum disimpan.
        </p>
        {error && <p role="alert" style={{ color: "#b91c1c", margin: 0, fontWeight: 600 }}>{error}</p>}
        {success && <p role="status" style={{ color: "#166534", margin: 0, fontWeight: 600 }}>{success}</p>}
        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "Memvalidasi Meta..." : existing ? "Validasi & Perbarui Koneksi" : "3. Validasi & Hubungkan Sekarang"}
        </button>
      </form>
    </section>
  );
}

const panelStyle = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, marginTop: 24 };
const labelStyle = { display: "grid", gap: 7, fontSize: 14, fontWeight: 650 as const };
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", fontSize: 15 };
const buttonStyle = { border: 0, borderRadius: 10, background: "#059669", color: "white", padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
const linkButtonStyle = { display: "inline-block", borderRadius: 10, background: "#059669", color: "white", padding: "9px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" };
const secondaryLinkStyle = { display: "inline-block", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#0f172a", padding: "9px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" };
