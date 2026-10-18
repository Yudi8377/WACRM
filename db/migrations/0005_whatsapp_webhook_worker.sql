BEGIN;

ALTER TABLE webhook_inbox
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE INDEX IF NOT EXISTS webhook_inbox_worker_queue_idx
  ON webhook_inbox (processing_status, next_attempt_at, received_at)
  WHERE signature_verified = true;

-- The dedicated worker can only claim verified Meta inbox events and only
-- look up active WhatsApp connections by their provider account identifier.
DROP POLICY IF EXISTS webhook_inbox_worker_select ON webhook_inbox;
CREATE POLICY webhook_inbox_worker_select ON webhook_inbox
  FOR SELECT
  USING (current_user = 'wacrm_worker' AND signature_verified = true);

DROP POLICY IF EXISTS webhook_inbox_worker_update ON webhook_inbox;
CREATE POLICY webhook_inbox_worker_update ON webhook_inbox
  FOR UPDATE
  USING (current_user = 'wacrm_worker' AND signature_verified = true)
  WITH CHECK (current_user = 'wacrm_worker' AND signature_verified = true);

DROP POLICY IF EXISTS channel_connections_worker_lookup ON channel_connections;
CREATE POLICY channel_connections_worker_lookup ON channel_connections
  FOR SELECT
  USING (current_user = 'wacrm_worker' AND channel = 'whatsapp' AND status = 'connected');

-- Restrict worker access to lookup columns; connector tokens are not readable by it.
GRANT SELECT (id, provider, event_key, provider_account_id, payload, signature_verified,
              processing_status, attempt_count, received_at, processed_at, last_error_code,
              next_attempt_at, processing_started_at)
  ON webhook_inbox TO wacrm_worker;
GRANT UPDATE (processing_status, attempt_count, processed_at, last_error_code,
              next_attempt_at, processing_started_at)
  ON webhook_inbox TO wacrm_worker;
GRANT SELECT (id, tenant_id, external_account_id, channel, status)
  ON channel_connections TO wacrm_worker;
GRANT SELECT, INSERT, UPDATE
  ON contacts, contact_channel_identities, conversations, messages
  TO wacrm_worker;

COMMIT;
