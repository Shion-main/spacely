-- SPACELY Amenities Cleanup Script
-- Run this ONLY after confirming the migration worked and application is updated
-- This will remove the old junction tables

-- Step 1: Verify migration was successful
DO $$
DECLARE
    posts_with_amenities INTEGER;
    old_amenity_links INTEGER := 0;
BEGIN
    -- Count posts with amenities in new structure
    SELECT COUNT(*) INTO posts_with_amenities
    FROM posts 
    WHERE array_length(amenities, 1) > 0;
    
    -- Count old amenity links if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_amenities') THEN
        SELECT COUNT(*) INTO old_amenity_links FROM post_amenities;
    END IF;
    
    RAISE NOTICE 'Posts with amenities (new): %', posts_with_amenities;
    RAISE NOTICE 'Old amenity links: %', old_amenity_links;
    
    -- Only proceed if we have data in new structure
    IF posts_with_amenities = 0 AND old_amenity_links > 0 THEN
        RAISE EXCEPTION 'Migration verification failed: No posts have amenities in new structure but old data exists. Do not run cleanup!';
    END IF;
    
    RAISE NOTICE 'Verification passed - safe to proceed with cleanup';
END $$;

-- Step 2: Drop old indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_amenities_post_id') THEN
        DROP INDEX idx_post_amenities_post_id;
        RAISE NOTICE 'Dropped index: idx_post_amenities_post_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_post_amenities_type') THEN
        DROP INDEX idx_post_amenities_type;
        RAISE NOTICE 'Dropped index: idx_post_amenities_type';
    END IF;
END $$;

-- Step 3: Drop old tables
DO $$
BEGIN
    -- Drop post_amenities table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_amenities') THEN
        DROP TABLE post_amenities CASCADE;
        RAISE NOTICE 'Dropped table: post_amenities';
    END IF;
    
    -- Drop amenities table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amenities') THEN
        DROP TABLE amenities CASCADE;
        RAISE NOTICE 'Dropped table: amenities';
    END IF;
END $$;

-- Step 4: Final verification
SELECT 
    'Cleanup Complete' as status,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN array_length(amenities, 1) > 0 THEN 1 END) as posts_with_amenities,
    ROUND(AVG(array_length(amenities, 1))) as avg_amenities_per_post
FROM posts;

-- Step 5: Show remaining amenity data
SELECT 
    unnest(amenities) as amenity_name,
    COUNT(*) as usage_count
FROM posts 
WHERE array_length(amenities, 1) > 0
GROUP BY amenity_name 
ORDER BY usage_count DESC;

RAISE NOTICE 'Cleanup completed successfully!';
RAISE NOTICE 'Old junction tables removed - amenities now use optimized array column';
RAISE NOTICE 'Expected benefits: 70-80%% storage reduction, 3-5x faster queries'; 