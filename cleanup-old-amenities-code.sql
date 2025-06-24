-- Cleanup script to run AFTER the migration is complete and tested
-- This removes the old junction tables and any remaining references

-- Only run these DROP commands after confirming:
-- 1. The migration worked correctly
-- 2. All application code has been updated
-- 3. You've tested the new array-based amenities functionality

-- Drop old tables (commented out for safety)
-- DROP TABLE IF EXISTS post_amenities CASCADE;
-- DROP TABLE IF EXISTS amenities CASCADE;

-- Drop old indexes if they exist
-- DROP INDEX IF EXISTS idx_post_amenities_post_id;
-- DROP INDEX IF EXISTS idx_post_amenities_type;

-- Verify the new structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name = 'amenities';

-- Test queries to verify the new amenities work
-- Show posts with their amenities
SELECT 
    post_id,
    title,
    amenities,
    array_length(amenities, 1) as amenity_count
FROM posts 
WHERE array_length(amenities, 1) > 0
LIMIT 5;

-- Count amenity usage
SELECT 
    unnest(amenities) as amenity,
    COUNT(*) as usage_count
FROM posts 
WHERE array_length(amenities, 1) > 0
GROUP BY amenity 
ORDER BY usage_count DESC;

-- Show posts with specific amenities
-- SELECT * FROM posts WHERE 'WiFi' = ANY(amenities);
-- SELECT * FROM posts WHERE amenities @> ARRAY['WiFi', 'Parking'];

COMMENT ON COLUMN posts.amenities IS 'Array of amenity names for this post. Optimized replacement for post_amenities junction table.'; 