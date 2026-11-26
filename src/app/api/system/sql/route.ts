import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sqlPath = resolve(process.cwd(), "db/neon-production-setup.sql");
    const sql = await readFile(sqlPath, "utf8");
    return new Response(sql, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'inline; filename="neon-production-setup.sql"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("-- File db/neon-production-setup.sql tidak ditemukan.", { status: 404 });
  }
}
