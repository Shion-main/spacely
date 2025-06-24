-- Simple Reports Fix - Work with existing schema
-- This adds the missing enum values and RLS policies without changing column structure

-- First, update the report_type enum to include all the detailed categories used in frontend
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'inappropriate_content';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'spam';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fraud';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'fake_listing';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'harassment';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'discrimination';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'safety_concern';

-- Add status column for report workflow (if it doesn't exist)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- Add admin resolution fields (if they don't exist)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Fix RLS policies for reports table
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON reports(resolved_by);

-- Verify the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'reports' 
ORDER BY ordinal_position; 