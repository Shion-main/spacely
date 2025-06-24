-- SPACELY Amenities Optimization Migration
-- Simplified version for Supabase SQL Editor
-- Copy and paste this entire script

-- Step 1: Add amenities column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'amenities'
    ) THEN
        ALTER TABLE posts ADD COLUMN amenities TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Step 2: Create GIN index (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_posts_amenities_gin'
    ) THEN
        CREATE INDEX idx_posts_amenities_gin ON posts USING GIN (amenities);
    END IF;
END $$;

-- Step 3: Migrate data from old tables (if they exist)
DO $$
BEGIN
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
    END IF;
END $$;

-- Step 4: Add documentation
COMMENT ON COLUMN posts.amenities IS 'Array of amenity names for this post. Replaces post_amenities junction table for better performance.';

-- Step 5: Verify migration results
SELECT 
    'Migration Status' as info,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as posts_with_amenities
FROM posts;

-- Step 6: Show sample migrated data
SELECT 
    'Sample Data' as info,
    post_id,
    title,
    amenities,
    array_length(amenities, 1) as amenity_count
FROM posts 
WHERE array_length(amenities, 1) > 0
ORDER BY created_at DESC
LIMIT 3;

-- Step 7: Show amenity usage
SELECT 
    'Amenity Usage' as info,
    unnest(amenities) as amenity_name,
    COUNT(*) as count
FROM posts 
WHERE array_length(amenities, 1) > 0
GROUP BY amenity_name 
ORDER BY count DESC;

-- Step 8: Verify column exists
SELECT 
    'Column Verification' as info,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'amenities';

-- Migration complete! 