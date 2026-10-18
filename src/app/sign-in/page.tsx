"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError("Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi.");
      return;
    }
    const callback = searchParams.get("callbackURL");
    router.replace(callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/dashboard");
    router.refresh();
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" }}>
    <section style={{ width: "100%", maxWidth: 440, background: "white", border: "1px solid #e2e8f0", borderRadius: 20, padding: 32 }}>
      <Link href="/" style={{ color: "#2563eb", fontWeight: 800, textDecoration: "none" }}>WACRM</Link>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Masuk ke ruang kerja</h1>
      <p style={{ color: "#64748b", lineHeight: 1.6 }}>Kelola percakapan pelanggan dari satu tempat.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>Email
          <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 600 }}>Kata sandi
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={fieldStyle} />
        </label>
        {error && <p role="alert" style={{ color: "#b91c1c", fontSize: 14, margin: 0 }}>{error}</p>}
        <button disabled={busy} type="submit" style={buttonStyle}>{busy ? "Memeriksa..." : "Masuk"}</button>
      </form>
      <p style={{ marginTop: 20, color: "#64748b", fontSize: 14 }}>Belum memiliki akun? <Link href="/sign-up" style={{ color: "#2563eb" }}>Daftar</Link></p>
    </section>
  </main>;
}

const fieldStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", fontSize: 16 };
const buttonStyle = { border: 0, borderRadius: 10, background: "#1d4ed8", color: "white", padding: "13px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer" };
