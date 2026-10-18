import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateWorkspaceForm } from "./create-workspace-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Membership = { tenant_id: string; role: string; name: string; slug: string };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const client = await db.connect();
  let workspaces: Membership[] = [];
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [session.user.id]);
    const memberships = await client.query<{ tenant_id: string; role: string }>(
      "SELECT tenant_id, role FROM organization_members WHERE user_id = $1::uuid AND status = 'active' ORDER BY created_at ASC",
      [session.user.id]
    );
    for (const membership of memberships.rows) {
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [membership.tenant_id]);
      const organization = await client.query<{ name: string; slug: string }>(
        "SELECT name, slug FROM organizations WHERE id = $1::uuid",
        [membership.tenant_id]
      );
      if (organization.rows[0]) workspaces.push({ ...membership, ...organization.rows[0] });
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Workspace tidak dapat dimuat. Periksa konfigurasi database dan kebijakan akses.");
  } finally {
    client.release();
  }

  return <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "36px 24px" }}>
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "#1d4ed8", fontWeight: 800, textDecoration: "none" }}>WACRM</Link>
        <form action="/api/auth/sign-out" method="post"><button type="submit" style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "9px 13px", background: "white", cursor: "pointer" }}>Keluar</button></form>
      </header>
      <p style={{ color: "#2563eb", fontWeight: 700, letterSpacing: 1.5, marginTop: 40 }}>RUANG KERJA</p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", margin: "8px 0" }}>Halo, {session.user.name}</h1>
      <p style={{ color: "#64748b", lineHeight: 1.7 }}>Pilih organisasi untuk mengelola layanan pelanggan atau buat workspace baru.</p>
      {workspaces.length === 0 ? <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Buat workspace pertama</h2>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>Workspace memisahkan anggota, koneksi kanal, dan data pelanggan setiap organisasi.</p>
        <CreateWorkspaceForm />
      </section> : <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginTop: 24 }}>
        {workspaces.map(workspace => <article key={workspace.tenant_id} style={panelStyle}>
          <h2 style={{ fontSize: 19, marginTop: 0 }}>{workspace.name}</h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>Peran Anda: {workspace.role}</p>
          <p style={{ color: "#64748b", fontSize: 13 }}>ID workspace: {workspace.tenant_id}</p>
          <p style={{ color: "#64748b", lineHeight: 1.6 }}>Koneksi WhatsApp akan diaktifkan setelah konfigurasi Meta, izin, dan webhook selesai.</p>
        </article>)}
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0, fontSize: 19 }}>Tambah workspace</h2>
          <CreateWorkspaceForm />
        </section>
      </section>}
      <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 32 }}>WACRM masih dalam tahap aktivasi kanal. Jangan gunakan untuk percakapan pelanggan produksi sampai pengujian integrasi selesai.</p>
    </div>
  </main>;
}

const panelStyle = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22, marginTop: 24 };
