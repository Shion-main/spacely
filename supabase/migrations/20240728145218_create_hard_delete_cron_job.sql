-- Enable the pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- Grant usage to the postgres user
grant usage on schema cron to postgres;

-- Grant all privileges on the cron.job table to the postgres user
grant all privileges on all tables in schema cron to postgres;

-- Function to delete old, soft-deleted posts and their associated storage objects
create or replace function handle_nightly_deletions()
returns void
language plpgsql
security definer -- Important: Allows the function to run with the permissions of the user that defined it (the superuser)
as $$
declare
  post_to_delete record;
  photo_to_delete record;
  deleted_storage_path text;
begin
  -- Loop through posts that were soft-deleted more than 30 days ago
  for post_to_delete in 
    select post_id from posts
    where is_deleted = true and deleted_at < now() - interval '30 days'
  loop
    raise notice 'Processing post_id: %', post_to_delete.post_id;

    -- Delete associated photos from storage
    for photo_to_delete in 
      select storage_path from photos where post_id = post_to_delete.post_id
    loop
      if photo_to_delete.storage_path is not null then
        begin
          -- Supabase storage delete function
          -- The function storage.delete_object(bucket_id, object_path) returns the deleted object's metadata.
          select storage.delete_object('dwelly-listings', photo_to_delete.storage_path) into deleted_storage_path;
          raise notice 'Deleted photo from storage: %', photo_to_delete.storage_path;
        exception when others then
          raise warning 'Could not delete photo from storage: %. Skipping.', photo_to_delete.storage_path;
        end;
      end if;
    end loop;
    
    -- Finally, delete the post itself. RLS is bypassed because of 'security definer'.
    -- Cascading deletes in the schema will handle related tables (photos, rooms, post_amenities, etc.).
    delete from posts where post_id = post_to_delete.post_id;
    raise notice 'Hard-deleted post_id: %', post_to_delete.post_id;

  end loop;
end;
$$;

-- Schedule the function to run daily at 1 AM UTC
select cron.schedule(
  'nightly-post-deletion', -- name of the cron job
  '0 1 * * *', -- cron syntax for 1 AM daily
  'select handle_nightly_deletions()'
); 