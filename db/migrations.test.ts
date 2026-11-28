import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

describe("Neon PostgreSQL migrations and RLS integrity", () => {
  it("applies migrations 0001 through 0007 sequentially and enforces CRUD + strict RLS tenant isolation", async () => {
    const pg = new PGlite({ extensions: { pgcrypto } });
    await pg.exec(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_worker') THEN
          CREATE ROLE wacrm_worker NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wacrm_runtime') THEN
          CREATE ROLE wacrm_runtime NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
        END IF;
      END $$;
    `);

    const files = [
      "db/migrations/0001_initial.sql",
      "db/migrations/0002_webhook_inbox_and_tenant_fks.sql",
      "db/migrations/0003_security_hardening.sql",
      "db/migrations/0004_better_auth_and_membership_listing.sql",
      "db/migrations/0005_whatsapp_webhook_worker.sql",
      "db/migrations/0006_whatsapp_send_idempotency.sql",
      "db/migrations/0007_crm_workspace_features.sql",
      "db/migrations/0008_ai_pos_erp_accounting.sql",
      "db/migrations/0009_editions_seo_superadmin.sql",
      "db/migrations/0010_telemetry_feedback_economics.sql",
    ];

    for (const file of files) {
      const sql = await readFile(resolve(process.cwd(), file), "utf8");
      await pg.exec(sql);
    }

    await pg.exec(`
      GRANT USAGE ON SCHEMA public TO wacrm_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wacrm_runtime;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wacrm_runtime;
    `);

    const tables = await pg.query<{ tablename: string; rowsecurity: boolean }>(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    const tableNames = tables.rows.map((r) => r.tablename);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "organizations",
        "user_profiles",
        "organization_members",
        "channel_connections",
        "contacts",
        "contact_channel_identities",
        "conversations",
        "messages",
        "conversation_notes",
        "quick_replies",
        "message_templates",
        "ai_agents",
        "ai_knowledge_items",
        "ai_security_incidents",
        "erp_products",
        "erp_suppliers",
        "erp_stock_movements",
        "pos_orders",
        "pos_order_items",
        "accounting_entries",
        "tenant_subscriptions",
        "seo_campaigns",
        "publisher_usage_events",
        "publisher_user_feedback",
        "publisher_market_signals",
        "webhook_events",
        "webhook_inbox",
        "audit_logs",
        "api_keys",
        "user",
        "session",
        "account",
        "verification",
      ])
    );

    const rlsRequired = [
      "organizations",
      "user_profiles",
      "organization_members",
      "channel_connections",
      "contacts",
      "contact_channel_identities",
      "conversations",
      "messages",
      "conversation_notes",
      "quick_replies",
      "message_templates",
      "ai_agents",
      "ai_knowledge_items",
      "ai_security_incidents",
      "erp_products",
      "erp_suppliers",
      "erp_stock_movements",
      "pos_orders",
      "pos_order_items",
      "accounting_entries",
      "tenant_subscriptions",
      "seo_campaigns",
      "webhook_events",
      "webhook_inbox",
      "audit_logs",
      "api_keys",
    ];
    for (const name of rlsRequired) {
      const row = tables.rows.find((r) => r.tablename === name);
      expect(row?.rowsecurity, `RLS must be enabled on ${name}`).toBe(true);
    }

    const userA = "11111111-1111-4111-8111-111111111111";
    const tenantA = "22222222-2222-4222-8222-222222222222";
    const userB = "33333333-3333-4333-8333-333333333333";
    const tenantB = "44444444-4444-4444-8444-444444444444";

    // Run as non-superuser NOBYPASSRLS role wacrm_runtime to prove real RLS enforcement!
    await pg.exec(`
      BEGIN;
      SET LOCAL ROLE wacrm_runtime;
      SELECT set_config('app.user_id', '${userA}', true), set_config('app.tenant_id', '${tenantA}', true);
      INSERT INTO user_profiles (id, display_name) VALUES ('${userA}'::uuid, 'Admin Tenant A');
      INSERT INTO organizations (id, name, slug) VALUES ('${tenantA}'::uuid, 'PT Tenant A', 'pt-tenant-a');
      INSERT INTO organization_members (tenant_id, user_id, role, status) VALUES ('${tenantA}'::uuid, '${userA}'::uuid, 'owner', 'active');
      INSERT INTO contacts (tenant_id, display_name, phone_e164, company, lifecycle_stage, tags)
        VALUES ('${tenantA}'::uuid, 'Budi Santoso', '+6281234567890', 'Toko Makmur', 'customer', ARRAY['vip','jakarta']);
      INSERT INTO quick_replies (tenant_id, shortcut, title, body_text, category, created_by)
        VALUES ('${tenantA}'::uuid, 'salam', 'Salam Pembuka', 'Halo Kak, ada yang bisa kami bantu?', 'pembuka', '${userA}'::uuid);
      INSERT INTO message_templates (tenant_id, channel, name, category, language, body_text, status)
        VALUES ('${tenantA}'::uuid, 'whatsapp', 'konfirmasi_pesanan', 'utility', 'id', 'Pesanan Anda sedang diproses.', 'approved');
      INSERT INTO ai_agents (tenant_id, agent_key, name, role_description)
        VALUES ('${tenantA}'::uuid, 'cs_sales', 'CS & Sales Autonomous Agent', 'Balas otomatis dan konversi pesanan');
      INSERT INTO ai_agents (tenant_id, agent_key, name, role_description)
        VALUES ('${tenantA}'::uuid, 'seo_growth', 'Agen SEO & Omnichannel Growth AI', 'Optimasi produk Google, WA, IG, TikTok, YouTube & FB');
      INSERT INTO tenant_subscriptions (tenant_id, edition_id, status, monthly_price_idr)
        VALUES ('${tenantA}'::uuid, 'enterprise', 'active', 699000);
      INSERT INTO seo_campaigns (tenant_id, product_sku, product_name, seo_score, slug, meta_title, meta_description, keywords)
        VALUES ('${tenantA}'::uuid, 'KOPI-01', 'Kopi Arabika Gayo 1Kg', 92, 'kopi-arabika-gayo-1kg', 'Jual Kopi Arabika Gayo 1Kg', 'Kopi specialty asli Gayo.', ARRAY['kopi','gayo']);
      INSERT INTO erp_products (tenant_id, sku, name, category, unit_price, cost_price, stock_qty)
        VALUES ('${tenantA}'::uuid, 'KOPI-01', 'Kopi Arabika Gayo 1Kg', 'Minuman', 185000, 110000, 50);
      INSERT INTO pos_orders (tenant_id, invoice_number, customer_name, shipping_address, subtotal, total_amount, qr_payload, ai_generated)
        VALUES ('${tenantA}'::uuid, 'INV-20261126-0001', 'Budi Santoso', 'Jl. Sudirman 45 Kediri', 185000, 185000, 'WACRM-PAY|INV-20261126-0001|185000', true);
      INSERT INTO accounting_entries (tenant_id, entry_number, account_code, account_name, account_type, debit, credit, description)
        VALUES ('${tenantA}'::uuid, 'JE-0001', '1100', 'Kas & Bank', 'asset', 185000, 0, 'Penjualan INV-20261126-0001');
      COMMIT;
    `);

    // Tenant B must see ZERO rows from Tenant A across ALL tables!
    await pg.exec("BEGIN; SET LOCAL ROLE wacrm_runtime;");
    await pg.query("SELECT set_config('app.user_id', $1, true), set_config('app.tenant_id', $2, true)", [userB, tenantB]);
    const crossContacts = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM contacts");
    const crossReplies = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM quick_replies");
    const crossTemplates = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM message_templates");
    const crossProducts = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM erp_products");
    const crossOrders = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM pos_orders");
    const crossLedger = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM accounting_entries");
    const crossAgents = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM ai_agents");
    await pg.exec("COMMIT;");

    expect(crossContacts.rows[0].count).toBe("0");
    expect(crossReplies.rows[0].count).toBe("0");
    expect(crossTemplates.rows[0].count).toBe("0");
    expect(crossProducts.rows[0].count).toBe("0");
    expect(crossOrders.rows[0].count).toBe("0");
    expect(crossLedger.rows[0].count).toBe("0");
    expect(crossAgents.rows[0].count).toBe("0");

    // Tenant A can UPDATE and DELETE its own contact
    await pg.exec("BEGIN; SET LOCAL ROLE wacrm_runtime;");
    await pg.query("SELECT set_config('app.user_id', $1, true), set_config('app.tenant_id', $2, true)", [userA, tenantA]);
    await pg.query("UPDATE contacts SET lifecycle_stage = 'vip' WHERE display_name = 'Budi Santoso'");
    const updated = await pg.query<{ lifecycle_stage: string }>("SELECT lifecycle_stage FROM contacts WHERE display_name = 'Budi Santoso'");
    expect(updated.rows[0].lifecycle_stage).toBe("vip");
    await pg.query("DELETE FROM contacts WHERE display_name = 'Budi Santoso'");
    const afterDelete = await pg.query<{ count: string }>("SELECT count(*)::text AS count FROM contacts");
    expect(afterDelete.rows[0].count).toBe("0");
    await pg.exec("COMMIT;");

    await pg.close();
  });

  it("applies db/neon-production-setup.sql idempotently twice without error", async () => {
    const pg = new PGlite({ extensions: { pgcrypto } });
    const sql = await readFile(resolve(process.cwd(), "db/neon-production-setup.sql"), "utf8");
    await pg.exec(sql);
    await pg.exec(sql); // Second run verifies full idempotency!

    const tables = await pg.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM pg_tables WHERE schemaname = 'public'"
    );
    expect(Number(tables.rows[0].count)).toBeGreaterThanOrEqual(19);
    await pg.close();
  });
});
