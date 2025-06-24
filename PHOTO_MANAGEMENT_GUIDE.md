# SPACELY Photo Management CRUD System

## Overview

This document provides a comprehensive guide to the photo management system for SPACELY, a student housing platform. The system handles all CRUD operations for photos stored in Supabase storage buckets with proper database synchronization.

## Architecture

### Components

1. **PhotoManager Class** (`lib/photo-manager.ts`) - Core CRUD operations
2. **Database Tables** - Photos table with proper RLS policies
3. **Storage Bucket** - Supabase storage (`dwelly-listings`)
4. **API Integration** - Used in listing creation/editing endpoints

### Data Flow

```
Frontend → API Endpoint → PhotoManager → Supabase Storage + Database
```

## Database Schema

### Photos Table

```sql
CREATE TABLE photos (
    photo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    photo_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS Policies

```sql
-- Users can insert photos for their own posts
CREATE POLICY "Users can insert photos for their own posts" ON photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Users can view photos for active posts
CREATE POLICY "Anyone can view photos for active posts" ON photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.approval_status = 'approved'
        )
        OR
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Similar policies for UPDATE and DELETE
```

## PhotoManager CRUD Operations

### 1. CREATE: Upload Photos

```typescript
import { photoManager } from '@/lib/photo-manager'

const uploadResult = await photoManager.uploadPhotos(files, {
  postId: 'listing-uuid',
  userId: 'user-uuid', 
  userFolder: 'john-doe',
  listingFolder: 'apartment-in-davao-city',
  isFirstPhotoFeatured: true,
  startingOrder: 0
})

if (uploadResult.success) {
  console.log(`Uploaded ${uploadResult.uploadedPhotos.length} photos`)
} else {
  console.error('Upload errors:', uploadResult.errors)
}
```

**Features:**
- File validation (size, type)
- Unique filename generation
- Automatic featured photo assignment
- Photo ordering
- Rollback on database failures

### 2. READ: Retrieve Photos

```typescript
// Get photos with metadata only
const photosResult = await photoManager.getPhotosForListing('listing-uuid')

// Get photos with public URLs
const photosWithUrls = await photoManager.getPhotosWithUrls('listing-uuid')

if (photosResult.success) {
  photosResult.photos.forEach(photo => {
    console.log(`Photo: ${photo.file_path}, Featured: ${photo.is_featured}`)
  })
}
```

**Features:**
- Ordered by photo_order
- Public URL generation
- Filtered by is_deleted status

### 3. UPDATE: Replace Photos

```typescript
// Replace individual photo
const replaceResult = await photoManager.replacePhoto(
  'photo-uuid',
  newFile,
  'john-doe',
  'apartment-in-davao-city'
)

// Reorder photos
const reorderResult = await photoManager.reorderPhotos('listing-uuid', [
  { photo_id: 'uuid1', photo_order: 0 },
  { photo_id: 'uuid2', photo_order: 1 }
])

// Set featured photo
const featuredResult = await photoManager.setFeaturedPhoto('listing-uuid', 'photo-uuid')
```

**Features:**
- Atomic operations with rollback
- Old file cleanup
- Order management
- Featured photo controls

### 4. DELETE: Remove Photos

```typescript
// Delete specific photos
const deleteResult = await photoManager.deletePhotos({
  postId: 'listing-uuid',
  photoPaths: [
    'users/john-doe/apartment-in-davao/photo1.jpg',
    'users/john-doe/apartment-in-davao/photo2.jpg'
  ],
  userId: 'user-uuid'
})

// Delete all photos for a listing
const deleteAllResult = await photoManager.deleteAllPhotosForListing('listing-uuid')
```

**Features:**
- Batch operations
- Storage and database sync
- Orphan detection and handling

## Orphaned File Management

### 5. CLEANUP: Sync Storage and Database

```typescript
// Sync orphaned files to database
const syncResult = await photoManager.syncOrphanedFiles(
  'listing-uuid',
  'users/john-doe/apartment-in-davao'
)

// Clean up orphaned files from storage
const cleanupResult = await photoManager.cleanupOrphanedFiles()

console.log(`Synced: ${syncResult.createdCount} records`)
console.log(`Cleaned: ${cleanupResult.deletedFiles.length} files`)
```

**Features:**
- Automatic orphan detection
- Database record creation for orphaned files
- Storage cleanup for orphaned files

## API Integration

### Listing Creation

```typescript
// In app/api/listings/route.ts
const { photoManager } = await import('../../lib/photo-manager')

const uploadResult = await photoManager.uploadPhotos(images, {
  postId: post.post_id,
  userId: user.id,
  userFolder,
  listingFolder,
  isFirstPhotoFeatured: true
})
```

### Listing Updates

```typescript
// In app/api/listings/[id]/route.ts

// Delete photos
if (photosToDelete.length > 0) {
  const deleteResult = await photoManager.deletePhotos({
    postId: id,
    photoPaths: photosToDelete,
    userId: user.id
  })
}

// Upload new photos
if (images.length > 0) {
  const uploadResult = await photoManager.uploadPhotos(images, {
    postId: id,
    userId: user.id,
    userFolder,
    listingFolder,
    startingOrder: existingPhotoCount
  })
}
```

## File Organization Structure

```
dwelly-listings/
├── users/
│   ├── john-doe/
│   │   ├── apartment-in-davao-city/
│   │   │   ├── 1640995200000-123456789.jpg
│   │   │   ├── 1640995201000-987654321.jpg
│   │   │   └── ...
│   │   └── another-listing/
│   └── jane-smith/
│       └── condo-in-manila/
└── temp/ (for failed uploads)
```

## Error Handling

### Common Error Patterns

```typescript
// File validation errors
if (!validation.valid) {
  return { success: false, error: validation.error }
}

// Storage operation errors with rollback
if (uploadError) {
  await this.regularClient.storage.from(STORAGE_BUCKET).remove([storagePath])
  return { success: false, error: uploadError.message }
}

// Database operation errors
if (dbError) {
  console.error('Database error:', dbError)
  return { success: false, error: dbError.message }
}
```

### Retry Logic

```typescript
// Automatic retry for transient failures
let retryCount = 0
const maxRetries = 3

while (retryCount < maxRetries) {
  try {
    const result = await photoManager.uploadPhotos(files, options)
    if (result.success) break
    retryCount++
  } catch (error) {
    if (retryCount === maxRetries - 1) throw error
    retryCount++
    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
  }
}
```

## Performance Optimization

### Batch Operations

- Use batch uploads for multiple files
- Batch database inserts/deletes
- Parallel storage operations where possible

### File Size Limits

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
```

### Lazy Loading

```typescript
// Load photos only when needed
const { photos } = await photoManager.getPhotosWithUrls(postId)
const optimizedPhotos = photos.map(photo => ({
  ...photo,
  thumbnail: photo.public_url + '?width=300&height=200',
  fullsize: photo.public_url
}))
```

## Security Considerations

### Row Level Security (RLS)

- Users can only manage photos for their own posts
- Service client bypasses RLS for admin operations
- All operations validate post ownership

### File Validation

```typescript
private validateFile(file: File): { valid: boolean; error?: string } {
  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large' }
  }
  
  // Type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  return { valid: true }
}
```

### Path Sanitization

```typescript
private getStoragePath(userFolder: string, listingFolder: string, fileName: string): string {
  // Sanitize folder names
  const cleanUserFolder = userFolder.replace(/[^a-z0-9-]/g, '')
  const cleanListingFolder = listingFolder.replace(/[^a-z0-9-]/g, '')
  const cleanFileName = fileName.replace(/[^a-z0-9.-]/g, '')
  
  return `users/${cleanUserFolder}/${cleanListingFolder}/${cleanFileName}`
}
```

## Monitoring and Maintenance

### Cleanup Scripts

Run periodically to maintain storage/database sync:

```bash
# Check for orphaned files
node scripts/photo-cleanup.js

# Automated cleanup (be careful!)
# photoManager.cleanupOrphanedFiles()
```

### Metrics to Monitor

- Storage usage vs database records
- Failed upload rates
- Orphaned file counts
- Average photo load times

## Best Practices

### 1. Always Use PhotoManager

Never interact with storage/database directly. Use PhotoManager for consistency.

### 2. Handle Errors Gracefully

```typescript
const result = await photoManager.uploadPhotos(files, options)
if (!result.success) {
  // Show user-friendly error message
  // Log detailed errors for debugging
  console.error('Upload failed:', result.errors)
}
```

### 3. Validate Before Operations

```typescript
// Check file constraints
if (files.length > 10) {
  return { error: 'Maximum 10 photos allowed' }
}

// Check user permissions
if (!userOwnsPost(userId, postId)) {
  return { error: 'Unauthorized' }
}
```

### 4. Use Transactions for Multi-Step Operations

The PhotoManager handles this internally, but be aware that complex operations are atomic.

### 5. Regular Maintenance

- Monitor orphaned files weekly
- Clean up old temporary files
- Review storage usage monthly

## Troubleshooting

### Common Issues

**Issue: Photos not displaying**
- Check public URL generation
- Verify storage bucket permissions
- Check RLS policies

**Issue: Upload failures**
- Validate file size/type limits
- Check network connectivity
- Verify user authentication

**Issue: Orphaned files**
- Run sync operations
- Check for interrupted uploads
- Review deletion logic

**Issue: Database/storage mismatch**
- Use PhotoManager cleanup utilities
- Check for manual database changes
- Verify API endpoint implementations

This comprehensive system ensures reliable, secure, and performant photo management for SPACELY while handling edge cases and providing excellent developer experience. 