BEGIN;

-- User profiles are global identities but only visible to the current user and active teammates in the selected tenant.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profile_read_same_tenant ON user_profiles;
DROP POLICY IF EXISTS user_profile_insert_self ON user_profiles;
DROP POLICY IF EXISTS user_profile_update_self ON user_profiles;
CREATE POLICY user_profile_read_same_tenant ON user_profiles
  FOR SELECT
  USING (
    id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.user_id = user_profiles.id
        AND om.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        AND om.status = 'active'
    )
  );
CREATE POLICY user_profile_insert_self ON user_profiles
  FOR INSERT
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY user_profile_update_self ON user_profiles
  FOR UPDATE
  USING (id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- Public webhook intake is insert-only for the regular runtime role.
-- A separate worker role/policy must be provisioned before enabling event processing.
ALTER TABLE webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_inbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_inbox_verified_insert ON webhook_inbox;
CREATE POLICY webhook_inbox_verified_insert ON webhook_inbox
  FOR INSERT
  WITH CHECK (signature_verified = true);

COMMIT;
