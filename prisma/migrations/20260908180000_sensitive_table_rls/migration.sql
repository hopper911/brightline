-- Sensitive-table RLS for extra database roles.
-- FORCE applies policies to the table owner; policy `app_all` is granted only
-- to the migrating role (DATABASE_URL). Extra roles with table GRANT still
-- see zero rows. A leaked application credential is the same role and is not
-- isolated by this migration.

DO $$
DECLARE
  t text;
  app_role text := current_user;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'GalleryAccessToken',
    'AccountantAccess',
    'AccountantPermission',
    'Client',
    'Lead',
    'Inquiry',
    'ContactMessage',
    'FormSubmission',
    'FormSubmissionValue',
    'GeneratedDocument',
    'DocumentSignature',
    'StudioEmailAccount',
    'DeliveryPackage',
    'platform_sso_exchange_nonces'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY app_all ON %I FOR ALL TO %I USING (true) WITH CHECK (true)',
      t,
      app_role
    );
  END LOOP;
END $$;
