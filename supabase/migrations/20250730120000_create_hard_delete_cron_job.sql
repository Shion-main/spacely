-- This script creates a cron job to permanently delete posts and their associated storage objects (photos)
-- that have been soft-deleted for more than 30 days.
-- It is designed to be idempotent, meaning it can be run multiple times without causing errors.

-- Clean up old objects first to ensure a clean slate.
SELECT cron.unschedule('nightly-post-cleanup');
DROP TRIGGER IF EXISTS before_post_delete ON posts;
DROP FUNCTION IF EXISTS delete_post_photos();
DROP FUNCTION IF EXISTS delete_storage_object(text, text);
DROP FUNCTION IF EXISTS hard_delete_old_posts();


-- Step 1: Create a function to delete a storage object.
-- This function runs with the security of the definer (service_role) to ensure it has permissions
-- to delete objects from storage.
create or replace function delete_storage_object(bucket text, object text, out status int, out content text)
returns record
language 'plpgsql'
security definer
set search_path = extensions
as $$
declare
  project_url text := 'https://isjecbgnuhqcfhdwqfev.supabase.co';
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzamVjYmduuhxY2ZoZHdxZmV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMDI5ODU2NywiZXhwIjoyMDM1ODc0NTY3fQ.Zodp2D5PD5r-DRisq6qfFzIu_xGLv0A2b2c1o_iWkL0'; --  Replace with your actual service role key
begin
  select
      into status, content
           result.status::int, result.content::text
      from
        net.http_delete(
          url := project_url || '/storage/v1/object/' || bucket || '/' || object,
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || service_role_key
          )
        ) as result;
end;
$$;

-- Step 2: Create a trigger function that deletes associated photos before a post is deleted.
CREATE OR REPLACE FUNCTION delete_post_photos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  photo_record RECORD;
BEGIN
  -- Loop through all photos associated with the post being deleted
  FOR photo_record IN SELECT storage_path FROM photos WHERE post_id = OLD.post_id
  LOOP
    -- Call the function to delete the file from storage
    PERFORM delete_storage_object('dwelly-listings', photo_record.storage_path);
  END LOOP;
  
  -- After deleting photos, attempt to remove the parent directory.
  -- This requires knowing the user and post slug, which we don't have here directly.
  -- A simpler approach is to rely on periodic cleanup of empty folders if needed,
  -- as Supabase doesn't charge for empty folders.
  
  RETURN OLD;
END;
$$;

-- Step 3: Create a trigger that executes the function before a post is deleted.
CREATE TRIGGER before_post_delete
BEFORE DELETE ON posts
FOR EACH ROW
EXECUTE FUNCTION delete_post_photos();

-- Step 4: Create the function that will be called by the cron job.
CREATE OR REPLACE FUNCTION hard_delete_old_posts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete posts where deleted_at is older than 30 days.
  -- The trigger `before_post_delete` will automatically handle deleting the photos.
  DELETE FROM posts WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Step 5: Schedule the cron job to run once a day at midnight UTC.
-- Make sure the pg_cron extension is enabled in your Supabase project.
SELECT cron.schedule(
  'nightly-post-cleanup',
  '0 0 * * *', -- Every day at midnight
  'SELECT hard_delete_old_posts()'
); 