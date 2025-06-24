-- Fix Reports Table Schema Migration
-- This updates the reports table to match the frontend implementation

-- First, update the report_type enum to include all the detailed categories used in frontend
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'inappropriate_content';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'spam';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fraud';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fake_listing';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'harassment';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'discrimination';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'safety_concern';

-- Add the description column (rename reason to description for consistency with frontend)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;

-- Copy existing reason data to description column
UPDATE reports SET description = reason WHERE description IS NULL;

-- Make description NOT NULL after copying data
ALTER TABLE reports ALTER COLUMN description SET NOT NULL;

-- Remove NOT NULL constraint from reason column temporarily to allow new inserts
ALTER TABLE reports ALTER COLUMN reason DROP NOT NULL;

-- Add status column for report workflow
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- Add admin resolution fields
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add report_type column (rename type to report_type for consistency with frontend)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type report_type;

-- Copy existing type data to report_type column
UPDATE reports SET report_type = type WHERE report_type IS NULL;

-- Make report_type NOT NULL after copying data
ALTER TABLE reports ALTER COLUMN report_type SET NOT NULL;

-- Now we can safely drop the old columns (optional - comment out if you want to keep them)
-- ALTER TABLE reports DROP COLUMN IF EXISTS reason;
-- ALTER TABLE reports DROP COLUMN IF EXISTS type;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON reports(resolved_by);

-- Update the unique constraint to use the new column names
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_post_id_key;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_post_id_unique UNIQUE(reporter_id, post_id);

-- Fix RLS policies for reports table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view reports they created" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

-- Create proper RLS policies for reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Add comment for documentation
COMMENT ON TABLE reports IS 'User reports for inappropriate listings with detailed categorization and admin workflow';
COMMENT ON COLUMN reports.description IS 'Detailed description of the issue being reported';
COMMENT ON COLUMN reports.report_type IS 'Category of the report (inappropriate_content, spam, fraud, etc.)';
COMMENT ON COLUMN reports.status IS 'Current status of the report (pending, reviewed, resolved, dismissed)';

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'reports' 
ORDER BY ordinal_position; 