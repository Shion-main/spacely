-- Debug script to check departments and temporarily disable RLS for testing

-- Check if departments table exists and has data
SELECT 'Checking departments table...' as status;
SELECT * FROM departments LIMIT 10;

-- Check if courses table exists and has data  
SELECT 'Checking courses table...' as status;
SELECT * FROM courses LIMIT 10;

-- Check if room_types table exists and has data
SELECT 'Checking room_types table...' as status;
SELECT * FROM room_types LIMIT 10;

-- Temporarily disable RLS for departments table to test data access
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE room_types DISABLE ROW LEVEL SECURITY;

-- Re-run the department query that the frontend uses
SELECT 
    department_id,
    name,
    is_deleted,
    created_at
FROM departments 
WHERE is_deleted = false 
ORDER BY name;

-- Test course query
SELECT 
    course_id,
    name,
    department_id,
    is_deleted,
    created_at
FROM courses 
WHERE is_deleted = false 
AND department_id = 1
ORDER BY name; 