-- Definitive Reports Schema Fix
-- This script cleans up and aligns the reports table with the application's needs.
-- It is safe to run even if previous scripts were partially run.

-- Step 1: Add all required enum values to the report_type type.
DO $$
BEGIN
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'inappropriate_content';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'spam';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fraud';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fake_listing';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'harassment';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'discrimination';
  ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'safety_concern';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'report_type enum values already exist, skipping.';
END;
$$;


-- Step 2: Clean up conflicting columns from previous migration attempts.
-- We will standardize on using the original 'reason' and 'type' columns.
ALTER TABLE reports DROP COLUMN IF EXISTS description;
ALTER TABLE reports DROP COLUMN IF EXISTS report_type;

-- Step 3: Ensure the original columns are correctly configured.
ALTER TABLE reports ALTER COLUMN reason SET NOT NULL;
ALTER TABLE reports ALTER COLUMN type SET NOT NULL;

-- Step 4: Add status and admin workflow columns if they don't exist.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Step 5: Re-create all RLS policies to ensure they are correct.
-- This drops all old policies and creates the correct new ones.
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Step 6: Ensure necessary indexes exist.
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON reports(resolved_by);

-- Final verification
SELECT 'Schema fix complete. The reports table should now be correctly configured.' as status; 