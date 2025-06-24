-- SPACELY Amenities Optimization Migration
-- This migrates from junction table (post_amenities + amenities) to array column approach
-- Expected benefits: 70-80% storage reduction, 3-5x faster queries, simpler code

-- Step 1: Add new amenities column to posts table
ALTER TABLE posts ADD COLUMN amenities TEXT[] DEFAULT '{}';

-- Step 2: Create GIN index for fast array operations
CREATE INDEX idx_posts_amenities_gin ON posts USING GIN (amenities);

-- Step 3: Migrate existing data from junction table to array column
UPDATE posts SET amenities = (
    SELECT COALESCE(ARRAY_AGG(a.name), '{}')
    FROM post_amenities pa
    JOIN amenities a ON pa.amenity_id = a.amenity_id
    WHERE pa.post_id = posts.post_id
    AND pa.amenity_id IS NOT NULL
    AND a.name IS NOT NULL
);

-- Step 4: Verify migration - show posts with their amenities
SELECT 
    post_id,
    title,
    array_length(amenities, 1) as amenity_count,
    amenities
FROM posts 
WHERE array_length(amenities, 1) > 0
ORDER BY amenity_count DESC
LIMIT 10;

-- Step 5: Show migration statistics
SELECT 
    'Before Migration' as phase,
    COUNT(*) as total_amenity_records
FROM post_amenities
UNION ALL
SELECT 
    'After Migration' as phase,
    COUNT(*) as posts_with_amenities
FROM posts 
WHERE array_length(amenities, 1) > 0;

-- Step 6: Test new array queries (examples)
-- Find posts with WiFi
-- SELECT * FROM posts WHERE 'WiFi' = ANY(amenities);

-- Find posts with multiple amenities
-- SELECT * FROM posts WHERE amenities @> ARRAY['WiFi', 'Parking'];

-- Find posts with any of these amenities
-- SELECT * FROM posts WHERE amenities && ARRAY['WiFi', 'CCTV', 'Air Conditioning'];

-- Count posts by amenity
-- SELECT unnest(amenities) as amenity, COUNT(*) 
-- FROM posts 
-- WHERE array_length(amenities, 1) > 0
-- GROUP BY amenity 
-- ORDER BY count DESC;

-- IMPORTANT: Only run these DROP commands AFTER verifying the migration worked correctly
-- and updating all application code to use the new array column

-- Step 7: Drop old tables (ONLY after application is updated and tested)
-- DROP TABLE IF EXISTS post_amenities CASCADE;
-- DROP TABLE IF EXISTS amenities CASCADE;

-- Step 8: Clean up old indexes if they exist
-- DROP INDEX IF EXISTS idx_post_amenities_post_id;
-- DROP INDEX IF EXISTS idx_post_amenities_type;

COMMENT ON COLUMN posts.amenities IS 'Array of amenity names for this post. Replaces the post_amenities junction table for better performance.';

-- Verify the new structure (Supabase compatible)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'amenities'; 