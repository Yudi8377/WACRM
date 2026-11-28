import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Database, Link2, MessageSquare, Smartphone, Users } from "lucide-react";
import { getSafeSession, isAuthConfigured } from "@/lib/auth";
import { db, NEON_BRANCH_ID, NEON_PROJECT_ID } from "@/lib/db";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { SignOutButton } from "./sign-out-button";
import { BrandLogoMark } from "@/components/brand-chrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Membership = {
  tenant_id: string;
  role: string;
  name: string;
  slug: string;
  open_conversations: number;
  total_contacts: number;
  connected_channels: number;
};

export default async function DashboardPage() {
  if (!isAuthConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl">
          <BrandLogoMark subtitle="Dashboard Commercial OS" />
          <h1 className="font-heading mt-5 text-2xl font-extrabold text-[#222222]">Hubungkan Database Neon</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#666666]">
            Dashboard produksi terhubung langsung ke Neon project <code className="font-mono font-semibold">{NEON_PROJECT_ID}</code>{" "}
            (branch <code className="font-mono font-semibold">{NEON_BRANCH_ID}</code>). Lengkapi <code className="font-mono">DATABASE_URL</code>{" "}
            pada Environment Variables untuk mengaktifkan autentikasi &amp; penyimpanan persisten, atau langsung coba ruang kerja interaktif.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/setup" className="inline-flex items-center gap-2 rounded bg-[#00A885] px-5 py-3 font-heading text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#008C6F]">
              <Database className="h-4 w-4" />
              Buka Panduan Setup Neon
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 rounded border border-zinc-300 bg-white px-5 py-3 font-heading text-xs font-bold uppercase tracking-wider text-[#222222] hover:border-[#00A885] hover:text-[#00A885]">
              Coba Workspace Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const session = await getSafeSession(await headers());
  if (!session) redirect("/sign-in");

  const client = await db.connect();
  const workspaces: Membership[] = [];
  let loadError = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [session.user.id]);
    const memberships = await client.query<{ tenant_id: string; role: string }>(
      "SELECT tenant_id, role FROM organization_members WHERE user_id = $1::uuid AND status = 'active' ORDER BY created_at ASC",
      [session.user.id],
    );
    for (const membership of memberships.rows) {
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [membership.tenant_id]);
      const organization = await client.query<{ name: string; slug: string }>(
        "SELECT name, slug FROM organizations WHERE id = $1::uuid",
        [membership.tenant_id],
      );
      if (organization.rows[0]) {
        const stats = await client.query<{ open_convs: string; contacts: string; channels: string }>(
          `SELECT
            (SELECT count(*)::text FROM conversations WHERE tenant_id = $1::uuid AND status IN ('open','pending')) AS open_convs,
            (SELECT count(*)::text FROM contacts WHERE tenant_id = $1::uuid) AS contacts,
            (SELECT count(*)::text FROM channel_connections WHERE tenant_id = $1::uuid AND status = 'connected') AS channels`,
          [membership.tenant_id],
        );
        workspaces.push({
          ...membership,
          ...organization.rows[0],
          open_conversations: Number(stats.rows[0]?.open_convs ?? 0),
          total_contacts: Number(stats.rows[0]?.contacts ?? 0),
          connected_channels: Number(stats.rows[0]?.channels ?? 0),
        });
      }
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    loadError = true;
  } finally {
    client.release();
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <Link href="/" className="flex items-center">
            <BrandLogoMark />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/android" className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-[#444444] hover:border-[#00A885] hover:text-[#00A885]">
              <Smartphone className="h-3.5 w-3.5 text-[#00A885]" />
              Android
            </Link>
            <Link href="/setup" className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-[#444444] hover:border-[#00A885] hover:text-[#00A885]">
              <Database className="h-3.5 w-3.5 text-[#00A885]" />
              Status Neon
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Ruang Kerja Neon Live</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Halo, {session.user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Pilih organisasi untuk membuka Kotak Masuk Omnichannel atau buat workspace baru.</p>
        </section>

        {loadError && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Workspace belum dapat dimuat dari Neon. Pastikan migrasi <code className="font-mono">db/neon-production-setup.sql</code> sudah dijalankan pada branch{" "}
            <code className="font-mono">{NEON_BRANCH_ID}</code>.{" "}
            <Link href="/setup" className="font-bold underline">Buka halaman Setup →</Link>
          </div>
        )}

        {workspaces.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">Buat workspace pertama Anda</h2>
            <p className="mt-1 text-sm text-slate-500">
              Setiap workspace memisahkan anggota tim, koneksi WhatsApp/Omnichannel, kontak, dan percakapan pelanggan dengan PostgreSQL RLS.
            </p>
            <CreateWorkspaceForm />
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {workspaces.map((ws) => (
              <article key={ws.tenant_id} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-emerald-300">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{ws.name}</h2>
                      <p className="font-mono text-xs text-slate-400">{ws.slug}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase text-emerald-700">
                      {ws.role}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                        <MessageSquare className="h-3 w-3" /> Aktif
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-slate-900">{ws.open_conversations}</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                        <Users className="h-3 w-3" /> Kontak
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-slate-900">{ws.total_contacts}</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                        <Link2 className="h-3 w-3" /> Kanal
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-slate-900">{ws.connected_channels}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/dashboard/workspaces/${ws.tenant_id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Buka Ruang Kerja CRM
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/dashboard/workspaces/${ws.tenant_id}/channels/whatsapp`}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Meta WA
                  </Link>
                </div>
              </article>
            ))}

            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">Tambah Workspace Baru</h2>
              <p className="mt-1 text-xs text-slate-500">Buat organisasi terpisah untuk cabang atau merek bisnis lain.</p>
              <CreateWorkspaceForm />
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
