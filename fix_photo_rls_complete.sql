-- Fix RLS policies for photos table
-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view photos for approved posts" ON photos;
DROP POLICY IF EXISTS "Users can insert photos for their own posts" ON photos;
DROP POLICY IF EXISTS "Users can update photos for their own posts" ON photos;
DROP POLICY IF EXISTS "Users can delete photos from their own posts" ON photos;

-- Anyone can view photos for approved posts
CREATE POLICY "Anyone can view photos for approved posts" ON photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
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
                OR
                -- Users can see photos for their own posts regardless of approval status
                posts.user_id = auth.uid()
            )
        )
    );

-- Users can insert photos for their own posts
CREATE POLICY "Users can insert photos for their own posts" ON photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Users can update photos for their own posts
CREATE POLICY "Users can update photos for their own posts" ON photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Users can delete photos from their own posts
CREATE POLICY "Users can delete photos from their own posts" ON photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Admins can manage all photos
CREATE POLICY "Admins can manage all photos" ON photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.role = 'admin'
        )
    ); 