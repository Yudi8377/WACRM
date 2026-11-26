import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("Error: DATABASE_URL atau POSTGRES_URL wajib diisi untuk menjalankan migrasi Neon.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|::1)(:|\/)/.test(connectionString);
const pool = new Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 10_000,
  ssl: isLocal ? undefined : { rejectUnauthorized: true },
  application_name: "wacrm-migrator",
});

async function run() {
  const verifyOnly = process.argv.includes("--verify");
  const sqlPath = resolve(process.cwd(), "db/neon-production-setup.sql");
  const client = await pool.connect();

  try {
    const info = await client.query(
      "SELECT current_database() AS db, current_user AS role, version() AS pg_version"
    );
    console.log("Terhubung ke Neon PostgreSQL:", info.rows[0]);

    if (!verifyOnly) {
      const sql = await readFile(sqlPath, "utf8");
      console.log("Menerapkan skema idempoten WACRM (migrasi 0001-0007)...");
      await client.query(sql);
      console.log("Skema WACRM berhasil diterapkan.");
    }

    const tables = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log("\nDaftar tabel public & status RLS:");
    for (const row of tables.rows) {
      console.log(`  - ${row.tablename}: RLS=${row.rowsecurity ? "ENABLED" : "OFF"}`);
    }

    const roleCheck = await client.query(
      "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
    );
    console.log("\nPemeriksaan role koneksi saat ini:", roleCheck.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migrasi gagal:", err?.message || err);
  process.exit(1);
});
