-- Add RLS policies for photos table
CREATE POLICY "Users can insert photos for their own posts" ON photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos for their own posts" ON photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos from their own posts" ON photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    ); 