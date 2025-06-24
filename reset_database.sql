-- SPACELY Database Reset Script
-- WARNING: This will drop and recreate all tables!

-- First, drop all existing tables (in correct order due to dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS post_amenities CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin_auth CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS year_level CASCADE;
DROP TYPE IF EXISTS availability_status CASCADE;
DROP TYPE IF EXISTS post_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS price_range CASCADE;
DROP TYPE IF EXISTS bathroom_type CASCADE;
DROP TYPE IF EXISTS room_type CASCADE;
DROP TYPE IF EXISTS amenity_type CASCADE;
DROP TYPE IF EXISTS contact_type CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;

-- Now import the full schema
\i 'supabase/schema.sql'

-- Import admin setup
\i 'setup_admin.sql'

-- Verify the setup
SELECT 'Departments:' as check_name, COUNT(*) as count FROM departments;
SELECT 'Courses:' as check_name, COUNT(*) as count FROM courses;
SELECT 'Room Types:' as check_name, COUNT(*) as count FROM room_types;
SELECT 'Admin User:' as check_name, COUNT(*) as count FROM users WHERE email = 'admin@spacely.com';
SELECT 'Admin Record:' as check_name, COUNT(*) as count FROM admins WHERE email = 'admin@spacely.com'; 