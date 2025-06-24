-- Fix post_amenities INSERT policy
-- This allows users to add amenities to their own posts during listing creation

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can add amenities to their own posts" ON post_amenities;

-- Create the INSERT policy for post_amenities
CREATE POLICY "Users can add amenities to their own posts" ON post_amenities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.post_id = post_amenities.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Also add UPDATE and DELETE policies for completeness
DROP POLICY IF EXISTS "Users can update amenities for their own posts" ON post_amenities;
CREATE POLICY "Users can update amenities for their own posts" ON post_amenities
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.post_id = post_amenities.post_id 
    AND posts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete amenities from their own posts" ON post_amenities;
CREATE POLICY "Users can delete amenities from their own posts" ON post_amenities
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.post_id = post_amenities.post_id 
    AND posts.user_id = auth.uid()
  )
);

-- Check all policies for post_amenities table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'post_amenities'; 