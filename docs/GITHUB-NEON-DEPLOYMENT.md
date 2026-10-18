# WACRM deployment with GitHub + Neon (no Vercel)

## What GitHub handles

- GitHub repository and pull-request review.
- GitHub Actions quality checks and container build.
- GitHub Container Registry (GHCR) stores versioned OCI images built from `main`.

The workflow `.github/workflows/container-release.yml` builds on pull requests without publishing. On a push to `main`, it publishes `ghcr.io/<owner>/<repository>` with a `main` tag and an immutable commit-SHA tag.

## Important runtime boundary

GitHub Actions is a build runner, not an always-on application server. GitHub Pages cannot run this Next.js server, API routes, database access, or Meta webhook endpoint. GHCR stores the container but does not run it.

Therefore a production URL and reliable inbound WhatsApp webhook still require a continuously running Node.js/container runtime with HTTPS. Do not point Meta webhooks at a GitHub Actions job or expose Neon credentials in a static frontend. This project deliberately does not configure Vercel.

## Runtime configuration

Supply these values only through the chosen runtime's secret manager:

- `DATABASE_URL`: Neon connection string for a dedicated least-privilege runtime role.
- `APP_URL` and `AUTH_URL`: the final HTTPS origin.
- `AUTH_SECRET`: a strong, unique production secret of at least 32 characters.
- `AUTH_URL`: the canonical HTTPS origin used by Better Auth.
- Better Auth tables from migration `0004_better_auth_and_membership_listing.sql` and explicit CRUD grants for the runtime role on `user`, `session`, `account`, and `verification`.
- `APP_ENCRYPTION_KEY`: 32-byte base64 key for connector-token encryption.
- Meta app ID, app secret, webhook verify token, and Graph API version.

Never use `neondb_owner` for application traffic. Production Neon migrations remain a separate controlled release gate; CI and image publication must not run migrations automatically.

## Separate webhook worker

Run a second container from the same image with command `node scripts/webhook-worker.mjs` and provide only `WEBHOOK_WORKER_DATABASE_URL`, pointing to the dedicated `wacrm_worker` Neon role. The web service uses `DATABASE_URL` with `wacrm_runtime`; do not reuse either connection string across services. The worker polls verified Meta inbox events, uses row locks to claim jobs, applies bounded retries/dead-lettering, and processes WhatsApp inbound messages and delivery statuses idempotently. Configure both services on a continuously running HTTPS-capable container runtime.

Before applying migration `0005_whatsapp_webhook_worker.sql`, create the worker role on that branch with least privilege, for example `CREATE ROLE wacrm_worker LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;` then set its password through the Neon console/approved secret workflow. Verify `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolinherit=false`, and confirm it has no membership in `neon_superuser`. Never use the Neon role-creation shortcut that automatically grants elevated Neon membership for this worker. The development role is currently `NOLOGIN` until its connection secret is provisioned.


## Self-hosted VPS quick start (no Vercel)

GitHub + Neon do not run the Next.js server by themselves. The repository now includes `compose.yaml` and `Caddyfile` for a Docker-capable VPS. Caddy obtains and renews HTTPS certificates automatically when the domain DNS points to the VPS and inbound ports 80/443 are open.

1. Provision a Linux VPS with Docker Engine and the Docker Compose plugin. Point an A/AAAA record for your chosen domain at that VPS.
2. Clone this repository on the VPS and check out the reviewed `main` commit.
3. Copy `.env.example` to `.env`. Set `APP_DOMAIN`, production `DATABASE_URL`, `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, and `WEBHOOK_WORKER_DATABASE_URL`. Use secret values only in the VPS environment / Neon credential manager; never commit `.env`.
4. Generate secrets on the VPS, for example `openssl rand -base64 48` for `AUTH_SECRET`, `openssl rand -base64 32` for `APP_ENCRYPTION_KEY`, and `openssl rand -hex 32` for the webhook verify token.
5. On the Neon production branch, create separate least-privilege roles before applying migrations. Run as the Neon database owner (only if these roles do not already exist):

   ```sql
   CREATE ROLE wacrm_runtime LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
   CREATE ROLE wacrm_worker NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
   ```

   Set the runtime password through the approved Neon role credential flow. Set the worker password the same way, then enable its login with `ALTER ROLE wacrm_worker LOGIN;`.
   - `wacrm_runtime`: LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE.
   - `wacrm_worker`: LOGIN only after its password is configured; otherwise keep NOLOGIN.
   - Confirm neither role is a member of `neon_superuser`. Do not use the Neon role-creation shortcut if it adds elevated membership.
6. Take a backup/confirm recovery first, then apply migrations `0001` through `0006` in order on production only after the development validation is accepted. Migration `0005` requires the `wacrm_worker` role to exist first. Migrations are not run automatically by the app or CI.
7. After the migrations, grant the runtime role schema/table/sequence privileges required by the application, then verify RLS is enabled/forced and the role flags are safe. Use the dedicated worker connection string only for the worker service.
8. Start the stack with `docker compose up -d --build`. Confirm `docker compose ps` shows `web`, `webhook-worker`, and `caddy` healthy/running, then test `https://<APP_DOMAIN>/api/health`.
9. In Meta developer settings, set the callback URL to `https://<APP_DOMAIN>/api/webhooks/meta`, use the exact `META_WEBHOOK_VERIFY_TOKEN`, subscribe to `messages`, and perform a test with an opted-in test number.

The worker service intentionally uses a separate `WEBHOOK_WORKER_DATABASE_URL`; do not pass that secret into the web service. The connection wizard stores provider tokens encrypted, but the first live send and webhook still need to be verified against a real Meta test number. Until that test and production role/migration checks pass, do not onboard paying customers.

## Release procedure

1. Require passing GitHub Actions checks on the exact commit.
2. Pull the image by immutable SHA tag rather than relying only on `main`.
3. Configure production environment variables in the runtime secret store.
4. Confirm the runtime role has `rolsuper = false` and `rolbypassrls = false`.
5. Apply reviewed migrations only after development validation and backup/rollback readiness.
6. Verify `GET /api/health`, authentication, tenant isolation, webhook signature validation, durable inbox writes, worker retries, and a real opt-in WhatsApp test.
7. Enable customer traffic only after the commercial release gates pass.

Publishing an image is not equivalent to deploying or going live. Until a runtime is running and end-to-end tests pass, WACRM must be reported as not yet live.
