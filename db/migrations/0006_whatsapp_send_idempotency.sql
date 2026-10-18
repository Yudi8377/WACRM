BEGIN;

-- A client-supplied idempotency key prevents duplicate provider sends when HTTP clients retry.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS messages_tenant_client_request_unique
  ON messages (tenant_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

COMMIT;
