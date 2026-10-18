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

## Release procedure

1. Require passing GitHub Actions checks on the exact commit.
2. Pull the image by immutable SHA tag rather than relying only on `main`.
3. Configure production environment variables in the runtime secret store.
4. Confirm the runtime role has `rolsuper = false` and `rolbypassrls = false`.
5. Apply reviewed migrations only after development validation and backup/rollback readiness.
6. Verify `GET /api/health`, authentication, tenant isolation, webhook signature validation, durable inbox writes, worker retries, and a real opt-in WhatsApp test.
7. Enable customer traffic only after the commercial release gates pass.

Publishing an image is not equivalent to deploying or going live. Until a runtime is running and end-to-end tests pass, WACRM must be reported as not yet live.
