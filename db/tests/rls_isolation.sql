-- Run only against the development branch, authenticated as wacrm_runtime.
-- All fixture writes are rolled back inside the DO block; no persistent test data remains.
DO $$
DECLARE
  tenant_a uuid := '00000000-0000-4000-8000-0000000000a1';
  tenant_b uuid := '00000000-0000-4000-8000-0000000000b2';
  visible_count integer;
BEGIN
  PERFORM set_config('app.tenant_id', tenant_a::text, true);
  INSERT INTO organizations (id, name, slug) VALUES (tenant_a, 'RLS Test A', 'rls-test-a');
  INSERT INTO contacts (tenant_id, display_name) VALUES (tenant_a, 'Contact A');

  PERFORM set_config('app.tenant_id', tenant_b::text, true);
  INSERT INTO organizations (id, name, slug) VALUES (tenant_b, 'RLS Test B', 'rls-test-b');
  INSERT INTO contacts (tenant_id, display_name) VALUES (tenant_b, 'Contact B');

  SELECT count(*) INTO visible_count FROM contacts;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Expected one visible contact for tenant B, got %', visible_count;
  END IF;

  BEGIN
    INSERT INTO contacts (tenant_id, display_name) VALUES (tenant_a, 'Cross Tenant Attack');
    RAISE EXCEPTION 'Cross-tenant insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  PERFORM set_config('app.tenant_id', '', true);
  SELECT count(*) INTO visible_count FROM contacts;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero visible contacts without tenant context, got %', visible_count;
  END IF;

  -- Trigger a controlled exception so PostgreSQL rolls back all fixture writes.
  RAISE EXCEPTION 'ROLLBACK_RLS_TEST';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_RLS_TEST' THEN
    NULL;
  ELSE
    RAISE;
  END IF;
END $$;
