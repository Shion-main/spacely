-- Check what admin-related tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE '%admin%' 
ORDER BY schemaname, tablename;

-- Drop any remaining admin tables
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS auth.admins CASCADE;
DROP TABLE IF EXISTS public.admin_audit_log CASCADE;
DROP TABLE IF EXISTS auth.admin_audit_log CASCADE;

-- Check for any admin-related functions
SELECT routine_schema, routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%admin%';

-- Clean up any admin-related policies
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE policyname LIKE '%admin%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol_record.policyname, 
                      pol_record.schemaname, 
                      pol_record.tablename);
    END LOOP;
END $$;

-- Verify cleanup - this should show no admin tables
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE '%admin%' 
ORDER BY schemaname, tablename; 