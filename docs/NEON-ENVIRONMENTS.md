# Neon environments

Project: `WACRM` (`small-tree-35716017`), region AWS Singapore.

- `production` (`br-patient-mud-a1xi2iun`): reserved for live traffic. Do not apply new migrations here until development verification is complete.
- `development` (`br-dark-salad-a1w6wdg4`): isolated development branch. Migrations `0001_initial.sql`, `0002_webhook_inbox_and_tenant_fks.sql`, and `0003_security_hardening.sql` have been applied here for initial schema setup. The database currently has 12 public tables; RLS is enabled and forced on all 12.

The development branch uses a 0.25 CU read/write compute endpoint. Neon account settings currently enforce the account's configured suspend interval; the endpoint was created with the account default. Avoid unnecessary compute and never commit the database connection string.

Before production promotion:
1. Review the migration files against the development schema.
2. Add automated schema validation and integration tests.
3. Create a backup/restore checkpoint and confirm rollback procedure.
4. Configure a restricted runtime DB role (not superuser, not `BYPASSRLS`).
5. Apply migrations to production only after explicit release approval and a tested deployment plan.
