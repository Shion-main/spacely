# DWELLY Migration Steps

## 🚀 Complete Database Migration

You're right! The migration isn't complete yet. Here's what needs to be done to get your DWELLY app working with real data:

### 1. Set Up Database Schema in Supabase

1. **Go to your Supabase Dashboard**
   - Visit https://app.supabase.com/project/your-project-id/sql
   - This is where you'll run SQL commands

2. **Run the Schema File**
   - Copy the entire content from `supabase/schema.sql`
   - Paste it into the SQL editor in Supabase
   - Click **RUN** to execute the schema
   - This will create all tables, sample data, and triggers

### 2. Verify Database Setup

After running the schema, you should have:
- ✅ All tables created (posts, users, rooms, amenities, etc.)
- ✅ Sample test data with 4 approved listings
- ✅ Proper relationships and indexes
- ✅ Row Level Security policies

### 3. Check Your Environment

Make sure your `.env.local` file has the correct Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Debug Information

I've added console logs to help debug the data fetching:
- Check your browser console (F12) or terminal where Next.js is running
- Look for messages like "📊 Database query results" and "📋 All posts check"

### 5. What Should Happen

After completing the migration:
- Home page should show 4 sample listings
- Each listing should have:
  - Title and description
  - Location (Manila, Makati, Quezon City)
  - Price (₱4,500 - ₱8,500)
  - Room type badges
  - Amenities tags

### 6. Old Data Migration (If Needed)

If you want to migrate data from the old MySQL database:

1. **Export from old database:**
   ```sql
   -- Run these in your old MySQL database
   SELECT * FROM posts WHERE approval_status = 'approved';
   SELECT * FROM users;
   SELECT * FROM photos;
   -- etc.
   ```

2. **Convert and import:**
   - The schema is already compatible
   - Just adjust the data format (UUID vs INT IDs)
   - Use Supabase dashboard to import CSV files

### 7. Next Steps After Migration

Once the database is working:
- [ ] Add photo upload functionality
- [ ] Create listing detail pages
- [ ] Add user authentication
- [ ] Build admin dashboard
- [ ] Add search and filtering

## 🐛 Debugging

If listings still don't show:

1. **Check Supabase Dashboard:**
   - Go to Table Editor
   - Verify `posts` table exists and has data
   - Check if `approval_status = 'approved'`

2. **Check Console Logs:**
   - Browser DevTools Console (F12)
   - Terminal where `npm run dev` is running

3. **Common Issues:**
   - RLS (Row Level Security) blocking data
   - Missing approval_status
   - Incorrect environment variables

## 📝 Schema Summary

The new schema includes:
- **Users**: Students, staff, and admin roles
- **Posts**: Rental listings with approval system
- **Rooms**: Room details and amenities
- **Photos**: Image storage paths
- **Amenities**: Custom amenities per listing
- **Ratings**: User reviews and ratings

All tables use UUIDs and PostgreSQL-specific features for better performance and security. 