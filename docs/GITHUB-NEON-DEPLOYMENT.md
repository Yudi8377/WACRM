# WACRM deployment with GitHub + Neon (no Vercel)

## What GitHub handles

- GitHub repository and pull-request review.
- GitHub Actions quality checks and container build.
- GitHub Container Registry (GHCR) stores versioned OCI images built from `main`.

The workflow `.github/workflows/container-release.yml` builds on pull requests without publishing. On a push to `main`, it publishes `ghcr.io/<owner>/<repository>` with a `main` tag and an immutable commit-SHA tag.

## Runtime boundary

GitHub Actions is a build runner, not an always-on application server. GitHub Pages cannot run this Next.js server, API routes, database access, or Meta webhook endpoint. GHCR stores the container but does not run it. This project deliberately does not configure Vercel.

The repository now includes `compose.yaml` and `Caddyfile` for a self-hosted Docker host. The host still must be provisioned and operated; creating these files does not deploy the app or create a public URL.

## Self-hosted launch steps

1. Provision a maintained Linux VPS with Docker Engine and the Docker Compose plugin. Configure DNS `A/AAAA` records for `APP_DOMAIN` to point to that host and allow inbound TCP 80/443 (UDP 443 is optional for HTTP/3).
2. Copy `.env.example` to `.env`; set `APP_DOMAIN`, `APP_URL`, and `AUTH_URL` to the same canonical HTTPS origin. Set `WACRM_IMAGE` to the published GHCR image tag; use an immutable `sha-<commit>` tag for production releases. Replace every example/empty value with generated secrets or actual provider configuration. Never commit `.env`.
3. Before starting production, provision separate Neon roles `wacrm_runtime` and `wacrm_worker` with least privilege. Confirm both have `rolsuper=false`, `rolbypassrls=false`, `rolcreatedb=false`, and `rolcreaterole=false`, and neither has elevated Neon role membership. The runtime URL is `DATABASE_URL`; the worker URL is `WEBHOOK_WORKER_DATABASE_URL`. Never use `neondb_owner` for request handling.
4. Validate migrations on the development branch, including the Better Auth grants and worker policies. Back up production and approve a rollback plan before applying any production migration. Do not run migrations automatically at container startup.
5. Start with `docker compose -f compose.yaml config` to validate the Compose file, then `docker compose -f compose.yaml pull` and `docker compose -f compose.yaml up -d`. The web and worker services use the same published image but receive different environment variables. Caddy obtains and renews HTTPS certificates after DNS and ports are correctly configured. Keep `.env` readable only by the deployment operator.
6. Check `docker compose -f compose.yaml ps`, `docker compose -f compose.yaml logs --tail=100 web webhook-worker caddy`, and `https://<APP_DOMAIN>/api/health`. The health endpoint must return 200 only when Neon is reachable.
7. Configure the exact public webhook URL `https://<APP_DOMAIN>/api/webhooks/meta` in the Meta developer console with the configured verify token and app subscription. Validate signature handling, durable inbox writes, worker retries, inbound messages, and delivery statuses using a permitted Meta test number.
8. Pull and pin the immutable GHCR image SHA for repeatable releases once the workflow has published it. For a tested release, set `WACRM_IMAGE=ghcr.io/yudi8377/wacrm:sha-<full-commit-sha>` in `.env`, then run `docker compose -f compose.yaml pull && docker compose -f compose.yaml up -d`. Keep a rollback image tag.
9. Only enable real customer traffic after authentication, tenant isolation, rate limits, token encryption, backup/restore, logs/alerts, privacy/retention policies, and the commercial release gates have passed.

## Runtime configuration

Supply values only through a protected deployment secret store or a locked-down host `.env` file:

- `DATABASE_URL`: Neon connection string for a dedicated least-privilege runtime role.
- `WEBHOOK_WORKER_DATABASE_URL`: a separate connection string for the worker role, with no access to connector token columns.
- `APP_URL` and `AUTH_URL`: the final HTTPS origin.
- `AUTH_SECRET`: a strong, unique production secret of at least 32 characters.
- `APP_ENCRYPTION_KEY`: 32-byte base64 key for connector-token encryption.
- Meta app ID, app secret, webhook verify token, and Graph API version.

Better Auth tables from migration `0004_better_auth_and_membership_listing.sql` need explicit CRUD grants for the runtime role on `user`, `session`, `account`, and `verification`. Production migrations remain a separate controlled release gate.

## Separate webhook worker

The Compose service runs `node scripts/webhook-worker.mjs` in a separate container without published ports. It polls verified Meta inbox events, uses row locks to claim jobs, retries failures, and dead-letters events after bounded attempts. Its database role must be separate from the web runtime and must not be able to read connector token columns.

Before applying migration `0005_whatsapp_webhook_worker.sql`, create and verify the worker role on that branch. Example role attributes are `LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`; set the password through Neon Console/approved secret workflow. Verify it has no membership in `neon_superuser`. Never use a Neon role-creation shortcut that automatically grants elevated membership.

## Release procedure

- Require passing GitHub Actions checks on the exact commit.
- Pull/pin the immutable image SHA, not only `main`.
- Configure production secrets and verify least-privilege roles.
- Apply reviewed migrations only after development validation and backup/rollback readiness.
- Verify health, authentication, tenant isolation, webhook signature validation, durable inbox writes, worker retries, and a real opt-in WhatsApp test.
- Enable customer traffic only after the commercial release gates pass.

Publishing an image is not equivalent to deploying or going live. Until a runtime is running and end-to-end tests pass, WACRM must be reported as not yet live.
