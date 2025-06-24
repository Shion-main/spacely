-- Migration script to link posts to amenities
-- Since the old boolean amenity fields were already dropped from the rooms table,
-- we'll need to manually add some common amenities to existing posts or add them through the admin interface

-- Example: Add WiFi to all existing posts (you can modify this as needed)
-- Uncomment and modify these queries based on your requirements:

/*
-- Add WiFi to all posts
INSERT INTO post_amenities (post_id, amenity_id)
SELECT DISTINCT p.post_id, a.amenity_id
FROM posts p
CROSS JOIN amenities a
WHERE a.name = 'WiFi'
AND NOT EXISTS (
    SELECT 1 FROM post_amenities pa 
    WHERE pa.post_id = p.post_id AND pa.amenity_id = a.amenity_id
);

-- Add a specific amenity to a specific post
INSERT INTO post_amenities (post_id, amenity_id)
SELECT 'c55a4488-2576-468f-8262-a8cf365dd4c5'::uuid, amenity_id
FROM amenities 
WHERE name IN ('WiFi', 'Air Conditioning', 'Parking')
AND NOT EXISTS (
    SELECT 1 FROM post_amenities pa 
    WHERE pa.post_id = 'c55a4488-2576-468f-8262-a8cf365dd4c5'::uuid 
    AND pa.amenity_id = amenities.amenity_id
);
*/

-- Check current state
SELECT 
    COUNT(*) as total_amenity_links,
    COUNT(DISTINCT post_id) as listings_with_amenities
FROM post_amenities;

-- Show available amenities
SELECT amenity_id, name, type FROM amenities ORDER BY name; 