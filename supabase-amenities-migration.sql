-- SPACELY Amenities Optimization Migration
-- Complete migration from junction table to array column approach
-- Run this entire script in Supabase SQL Editor

-- Step 1: Add new amenities column to posts table
DO $$ 
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'amenities'
    ) THEN
        ALTER TABLE posts ADD COLUMN amenities TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added amenities column to posts table';
    ELSE
        RAISE NOTICE 'Amenities column already exists';
    END IF;
END $$;

-- Step 2: Create GIN index for fast array operations
DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_posts_amenities_gin'
    ) THEN
        CREATE INDEX idx_posts_amenities_gin ON posts USING GIN (amenities);
        RAISE NOTICE 'Created GIN index for amenities';
    ELSE
        RAISE NOTICE 'GIN index already exists';
    END IF;
END $$;

-- Step 3: Migrate existing data from junction table to array column
DO $$
DECLARE
    migration_count INTEGER := 0;
BEGIN
    -- Only migrate if we have data in the old tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_amenities') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amenities') THEN
        
        UPDATE posts SET amenities = (
            SELECT COALESCE(ARRAY_AGG(a.name), '{}')
            FROM post_amenities pa
            JOIN amenities a ON pa.amenity_id = a.amenity_id
            WHERE pa.post_id = posts.post_id
            AND pa.amenity_id IS NOT NULL
            AND a.name IS NOT NULL
        ) WHERE EXISTS (
            SELECT 1 FROM post_amenities pa WHERE pa.post_id = posts.post_id
        );
        
        GET DIAGNOSTICS migration_count = ROW_COUNT;
        RAISE NOTICE 'Migrated amenities for % posts', migration_count;
    ELSE
        RAISE NOTICE 'Old amenities tables not found - skipping data migration';
    END IF;
END $$;

-- Step 4: Add comment to document the change
COMMENT ON COLUMN posts.amenities IS 'Array of amenity names for this post. Replaces the post_amenities junction table for better performance.';

-- Step 5: Verify the migration results
SELECT 
    'Migration Results' as status,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as posts_with_amenities,
    ROUND(
        COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as percentage_with_amenities
FROM posts;

-- Step 6: Show sample of migrated data
SELECT 
    post_id,
    title,
    amenities,
    array_length(amenities, 1) as amenity_count,
    created_at
FROM posts 
WHERE array_length(amenities, 1) > 0
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Show amenity usage statistics
SELECT 
    unnest(amenities) as amenity_name,
    COUNT(*) as usage_count
FROM posts 
WHERE array_length(amenities, 1) > 0
GROUP BY amenity_name 
ORDER BY usage_count DESC
LIMIT 10;

-- Step 8: Verify the new structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'amenities';

-- Step 9: Test array operations (examples)
-- Uncomment these to test the new functionality:

-- Find posts with WiFi
-- SELECT post_id, title FROM posts WHERE 'WiFi' = ANY(amenities) LIMIT 3;

-- Find posts with multiple specific amenities
-- SELECT post_id, title FROM posts WHERE amenities @> ARRAY['WiFi', 'Parking'] LIMIT 3;

-- Find posts with any of these amenities
-- SELECT post_id, title FROM posts WHERE amenities && ARRAY['WiFi', 'CCTV', 'Air Conditioning'] LIMIT 3;

RAISE NOTICE 'Migration completed successfully!';
RAISE NOTICE 'You can now update your application to use the new amenities array column';
RAISE NOTICE 'After testing, run the cleanup script to remove old tables'; 