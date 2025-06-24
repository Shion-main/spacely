-- SPACELY Amenities Cleanup Script (Simplified)
-- Run ONLY after testing the migration and confirming it works
-- This removes the old junction tables

-- Step 1: Verify we have amenities data
SELECT 
    'Pre-Cleanup Verification' as status,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as posts_with_amenities
FROM posts;

-- Step 2: Drop old indexes if they exist
DROP INDEX IF EXISTS idx_post_amenities_post_id;
DROP INDEX IF EXISTS idx_post_amenities_type;

-- Step 3: Drop old tables if they exist
DROP TABLE IF EXISTS post_amenities CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;

-- Step 4: Final verification
SELECT 
    'Cleanup Complete' as status,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as posts_with_amenities,
    ROUND(AVG(array_length(amenities, 1))) as avg_amenities_per_post
FROM posts;

-- Step 5: Show remaining amenity data
SELECT 
    'Final Amenity Usage' as info,
    unnest(amenities) as amenity_name,
    COUNT(*) as usage_count
FROM posts 
WHERE array_length(amenities, 1) > 0
GROUP BY amenity_name 
ORDER BY usage_count DESC;

-- Cleanup completed successfully! 