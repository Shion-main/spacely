-- Migration: Fix post_amenities RLS policy
-- Description: Allow admins to view amenities for all posts
-- Date: 2024

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view amenities for approved posts" ON post_amenities;

-- Create updated policy
CREATE POLICY "Anyone can view amenities for approved posts" ON post_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = post_amenities.post_id 
            AND (
                -- Regular users can only see approved posts
                (posts.approval_status = 'approved' AND posts.archived = false AND posts.is_deleted = false)
                OR 
                -- Admins can see all posts
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.user_id = auth.uid() 
                    AND users.role = 'admin'
                )
            )
        )
    ); 