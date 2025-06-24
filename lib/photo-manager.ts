// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from './supabase/server'

// Types for photo operations
export interface PhotoRecord {
  photo_id: string
  post_id: string
  file_path: string
  storage_path: string
  is_featured: boolean
  photo_order: number
  created_at: string
}

export interface PhotoUploadOptions {
  postId: string
  userId: string
  userFolder: string
  listingFolder: string
  isFirstPhotoFeatured?: boolean
  startingOrder?: number
}

export interface PhotoDeleteOptions {
  postId: string
  photoPaths: string[]
  userId?: string
}

export interface OrphanedFile {
  name: string
  path: string
  size?: number
  created_at?: string
}

// Configuration constants
const STORAGE_BUCKET = 'dwelly-listings'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export class PhotoManager {
  private serviceClient: any
  private regularClient: any

  constructor() {
    this.serviceClient = createServiceClient()
    
    // Regular client for storage operations (doesn't need RLS bypass for storage)
    this.regularClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Validate a file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}` }
    }

    return { valid: true }
  }

  /**
   * Generate a unique filename with timestamp and random ID
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const randomId = Math.floor(Math.random() * 1000000000)
    const extension = originalName.split('.').pop()
    return `${timestamp}-${randomId}.${extension}`
  }

  /**
   * Get the full storage path for a photo
   */
  private getStoragePath(userFolder: string, listingFolder: string, fileName: string): string {
    return `users/${userFolder}/${listingFolder}/${fileName}`
  }

  /**
   * Get public URL for a storage path
   */
  public getPublicUrl(storagePath: string): string {
    const { data } = this.serviceClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)
    
    return data.publicUrl
  }

  /**
   * CREATE: Upload multiple photos for a listing
   */
  async uploadPhotos(files: File[], options: PhotoUploadOptions): Promise<{
    success: boolean
    uploadedPhotos: PhotoRecord[]
    errors: string[]
  }> {
    const { postId, userId, userFolder, listingFolder, isFirstPhotoFeatured = true, startingOrder = 0 } = options
    
    const uploadedPhotos: PhotoRecord[] = []
    const errors: string[] = []

    // Check if there are existing featured photos
    let hasFeaturedPhoto = false
    if (!isFirstPhotoFeatured) {
      const { data: existingPhotos } = await this.serviceClient
        .from('photos')
        .select('is_featured')
        .eq('post_id', postId)
        .eq('is_featured', true)
        .limit(1)
      
      hasFeaturedPhoto = existingPhotos && existingPhotos.length > 0
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        errors.push(`File ${file.name}: ${validation.error}`)
        continue
      }

      try {
        // Generate unique filename and storage path
        const fileName = this.generateFileName(file.name)
        const storagePath = this.getStoragePath(userFolder, listingFolder, fileName)

        // Upload to Supabase Storage using service client
        const { data: uploadData, error: uploadError } = await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file)

        if (uploadError) {
          errors.push(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        // Create database record using service client to bypass RLS
        const photoRecord = {
          post_id: postId,
          file_path: storagePath,
          storage_path: storagePath,
          is_featured: !hasFeaturedPhoto && isFirstPhotoFeatured && i === 0,
          photo_order: startingOrder + i
        }

        const { data: dbRecord, error: dbError } = await this.serviceClient
          .from('photos')
          .insert(photoRecord)
          .select()
          .single()

        if (dbError) {
          // If database insert fails, clean up storage
          await this.serviceClient.storage
            .from(STORAGE_BUCKET)
            .remove([storagePath])
          
          errors.push(`Failed to save ${file.name} record: ${dbError.message}`)
          continue
        }

        uploadedPhotos.push(dbRecord)

        // Mark that we now have a featured photo
        if (photoRecord.is_featured) {
          hasFeaturedPhoto = true
        }

      } catch (error: any) {
        errors.push(`Unexpected error uploading ${file.name}: ${error.message}`)
      }
    }

    return {
      success: uploadedPhotos.length > 0,
      uploadedPhotos,
      errors
    }
  }

  /**
   * READ: Get all photos for a specific listing
   */
  async getPhotosForListing(postId: string): Promise<{
    success: boolean
    photos: PhotoRecord[]
    error?: string
  }> {
    try {
      const { data: photos, error } = await this.serviceClient
        .from('photos')
        .select('*')
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('photo_order', { ascending: true })

      if (error) {
        return { success: false, photos: [], error: error.message }
      }

      return { success: true, photos: photos || [] }
    } catch (error: any) {
      return { success: false, photos: [], error: error.message }
    }
  }

  /**
   * READ: Get photos with public URLs
   */
  async getPhotosWithUrls(postId: string): Promise<{
    success: boolean
    photos: (PhotoRecord & { public_url: string })[]
    error?: string
  }> {
    const result = await this.getPhotosForListing(postId)
    
    if (!result.success) {
      return { ...result, photos: [] }
    }

    const photosWithUrls = result.photos.map(photo => ({
      ...photo,
      public_url: this.getPublicUrl(photo.storage_path)
    }))

    return { success: true, photos: photosWithUrls }
  }

  /**
   * UPDATE: Replace an existing photo
   */
  async replacePhoto(photoId: string, newFile: File, userFolder: string, listingFolder: string): Promise<{
    success: boolean
    newPhoto?: PhotoRecord
    error?: string
  }> {
    try {
      // Validate new file
      const validation = this.validateFile(newFile)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Get existing photo record
      const { data: existingPhoto, error: fetchError } = await this.serviceClient
        .from('photos')
        .select('*')
        .eq('photo_id', photoId)
        .single()

      if (fetchError || !existingPhoto) {
        return { success: false, error: 'Photo not found' }
      }

      // Generate new filename and path
      const fileName = this.generateFileName(newFile.name)
      const newStoragePath = this.getStoragePath(userFolder, listingFolder, fileName)

      // Upload new file
      const { data: uploadData, error: uploadError } = await this.serviceClient.storage
        .from(STORAGE_BUCKET)
        .upload(newStoragePath, newFile)

      if (uploadError) {
        return { success: false, error: `Failed to upload new file: ${uploadError.message}` }
      }

      // Update database record
      const { data: updatedPhoto, error: updateError } = await this.serviceClient
        .from('photos')
        .update({
          file_path: newStoragePath,
          storage_path: newStoragePath
        })
        .eq('photo_id', photoId)
        .select()
        .single()

      if (updateError) {
        // Clean up new file if database update fails
        await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .remove([newStoragePath])
        
        return { success: false, error: `Failed to update photo record: ${updateError.message}` }
      }

      // Delete old file from storage
      if (existingPhoto.storage_path) {
        await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .remove([existingPhoto.storage_path])
      }

      return { success: true, newPhoto: updatedPhoto }

    } catch (error: any) {
      return { success: false, error: `Unexpected error: ${error.message}` }
    }
  }

  /**
   * DELETE: Remove photos from both storage and database
   */
  async deletePhotos(options: PhotoDeleteOptions): Promise<{
    success: boolean
    deletedCount: number
    errors: string[]
  }> {
    const { postId, photoPaths } = options
    let deletedCount = 0
    const errors: string[] = []

    try {
      // Get all photo records for the post using service client
      const { data: allPostPhotos, error: fetchError } = await this.serviceClient
        .from('photos')
        .select('photo_id, file_path, storage_path')
        .eq('post_id', postId)
        .eq('is_deleted', false)

      if (fetchError) {
        return { success: false, deletedCount: 0, errors: [`Failed to fetch photos: ${fetchError.message}`] }
      }

      if (!allPostPhotos || allPostPhotos.length === 0) {
        // Try to sync orphaned storage files
        const syncResult = await this.syncOrphanedFiles(postId)
        if (syncResult.success && syncResult.createdCount > 0) {
          // Retry after syncing
          return this.deletePhotos(options)
        }
        
        return { success: false, deletedCount: 0, errors: ['No photos found for this listing'] }
      }

      // Find matching photos to delete
      const photosToDelete = allPostPhotos.filter(photo => 
        photoPaths.some(pathToDelete => 
          photo.file_path === pathToDelete || 
          photo.storage_path === pathToDelete ||
          photo.file_path === pathToDelete.replace(/^dwelly-listings\//, '') ||
          photo.storage_path === pathToDelete.replace(/^dwelly-listings\//, '')
        )
      )

      if (photosToDelete.length === 0) {
        return { success: false, deletedCount: 0, errors: ['No matching photos found to delete'] }
      }

      // Delete from storage (batch operation)
      const storagePathsToDelete = photosToDelete
        .map(photo => photo.storage_path)
        .filter(path => path) // Remove null/undefined paths

      console.log('🗑️ PhotoManager: Attempting to delete from storage:', storagePathsToDelete)

      if (storagePathsToDelete.length > 0) {
        const { data: storageDeleteData, error: storageError } = await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .remove(storagePathsToDelete)

        console.log('📁 Storage deletion result:', { data: storageDeleteData, error: storageError })

        if (storageError) {
          console.error('❌ Storage deletion failed:', storageError)
          errors.push(`Storage deletion error: ${storageError.message}`)
        } else {
          console.log('✅ Storage deletion succeeded for paths:', storagePathsToDelete)
        }
      }

      // Delete from database (batch operation)
      const photoIdsToDelete = photosToDelete.map(photo => photo.photo_id)
      
      const { error: dbError } = await this.serviceClient
        .from('photos')
        .delete()
        .in('photo_id', photoIdsToDelete)

      if (dbError) {
        errors.push(`Database deletion error: ${dbError.message}`)
      } else {
        deletedCount = photosToDelete.length
      }

      return {
        success: deletedCount > 0,
        deletedCount,
        errors
      }

    } catch (error: any) {
      return {
        success: false,
        deletedCount: 0,
        errors: [`Unexpected error: ${error.message}`]
      }
    }
  }

  /**
   * DELETE: Remove all photos for a listing (when listing is deleted)
   */
  async deleteAllPhotosForListing(postId: string): Promise<{
    success: boolean
    deletedCount: number
    error?: string
  }> {
    try {
      // Get all photos for the listing
      const { data: photos, error: fetchError } = await this.serviceClient
        .from('photos')
        .select('storage_path')
        .eq('post_id', postId)

      if (fetchError) {
        return { success: false, deletedCount: 0, error: fetchError.message }
      }

      if (!photos || photos.length === 0) {
        return { success: true, deletedCount: 0 }
      }

      // Delete from storage
      const storagePathsToDelete = photos
        .map(photo => photo.storage_path)
        .filter(path => path)

      if (storagePathsToDelete.length > 0) {
        const { error: storageError } = await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .remove(storagePathsToDelete)

        if (storageError) {
          console.warn(`Storage deletion warning: ${storageError.message}`)
        }
      }

      // Delete from database
      const { error: dbError } = await this.serviceClient
        .from('photos')
        .delete()
        .eq('post_id', postId)

      if (dbError) {
        return { success: false, deletedCount: 0, error: dbError.message }
      }

      return { success: true, deletedCount: photos.length }

    } catch (error: any) {
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  /**
   * CLEANUP: Sync orphaned files from storage to database
   */
  async syncOrphanedFiles(postId: string, userFolder?: string): Promise<{
    success: boolean
    createdCount: number
    error?: string
  }> {
    try {
      // If no userFolder provided, try to extract from existing photos or construct from postId
      let folderPath = userFolder
      
      if (!folderPath) {
        // Try to determine folder path from existing photos
        const { data: existingPhoto } = await this.serviceClient
          .from('photos')
          .select('storage_path')
          .eq('post_id', postId)
          .limit(1)
          .single()

        if (existingPhoto?.storage_path) {
          const pathParts = existingPhoto.storage_path.split('/')
          if (pathParts.length >= 3) {
            folderPath = `${pathParts[0]}/${pathParts[1]}/${pathParts[2]}`
          }
        }
      }

      if (!folderPath) {
        return { success: false, createdCount: 0, error: 'Unable to determine folder path for orphan sync' }
      }

      // List files in storage
      const { data: storageFiles, error: storageError } = await this.serviceClient.storage
        .from(STORAGE_BUCKET)
        .list(folderPath)

      if (storageError || !storageFiles || storageFiles.length === 0) {
        return { success: true, createdCount: 0 }
      }

      // Check which files already have database records
      const storageFilePaths = storageFiles.map(file => `${folderPath}/${file.name}`)
      
      const { data: existingRecords } = await this.serviceClient
        .from('photos')
        .select('file_path')
        .in('file_path', storageFilePaths)

      const existingPaths = new Set(existingRecords?.map(r => r.file_path) || [])

      // Create records for orphaned files
      const orphanedFiles = storageFiles.filter(file => 
        !existingPaths.has(`${folderPath}/${file.name}`)
      )

      if (orphanedFiles.length === 0) {
        return { success: true, createdCount: 0 }
      }

      const recordsToCreate = orphanedFiles.map((file, index) => ({
        post_id: postId,
        file_path: `${folderPath}/${file.name}`,
        storage_path: `${folderPath}/${file.name}`,
        is_featured: index === 0 && existingRecords?.length === 0, // Only first is featured if no existing photos
        photo_order: (existingRecords?.length || 0) + index
      }))

      const { data: createdRecords, error: createError } = await this.serviceClient
        .from('photos')
        .insert(recordsToCreate)
        .select()

      if (createError) {
        return { success: false, createdCount: 0, error: createError.message }
      }

      return { success: true, createdCount: createdRecords?.length || 0 }

    } catch (error: any) {
      return { success: false, createdCount: 0, error: error.message }
    }
  }

  /**
   * CLEANUP: Find and remove truly orphaned files (files in storage without any database reference)
   */
  async cleanupOrphanedFiles(): Promise<{
    success: boolean
    deletedFiles: string[]
    errors: string[]
  }> {
    const deletedFiles: string[] = []
    const errors: string[] = []

    try {
      // Get all storage files
      const { data: allFolders, error: listError } = await this.serviceClient.storage
        .from(STORAGE_BUCKET)
        .list('users')

      if (listError) {
        return { success: false, deletedFiles: [], errors: [listError.message] }
      }

      // Get all database photo paths
      const { data: allDbPhotos, error: dbError } = await this.serviceClient
        .from('photos')
        .select('storage_path')

      if (dbError) {
        return { success: false, deletedFiles: [], errors: [dbError.message] }
      }

      const dbPaths = new Set(allDbPhotos?.map(p => p.storage_path) || [])

      // Check each user folder
      for (const userFolder of allFolders || []) {
        if (!userFolder.name) continue

        const { data: listingFolders } = await this.serviceClient.storage
          .from(STORAGE_BUCKET)
          .list(`users/${userFolder.name}`)

        for (const listingFolder of listingFolders || []) {
          if (!listingFolder.name) continue

          const { data: files } = await this.serviceClient.storage
            .from(STORAGE_BUCKET)
            .list(`users/${userFolder.name}/${listingFolder.name}`)

          for (const file of files || []) {
            if (!file.name) continue

            const fullPath = `users/${userFolder.name}/${listingFolder.name}/${file.name}`
            
                         if (!dbPaths.has(fullPath)) {
               // This file is orphaned, delete it
               const { error: deleteError } = await this.serviceClient.storage
                 .from(STORAGE_BUCKET)
                 .remove([fullPath])

              if (deleteError) {
                errors.push(`Failed to delete ${fullPath}: ${deleteError.message}`)
              } else {
                deletedFiles.push(fullPath)
              }
            }
          }
        }
      }

      return { success: true, deletedFiles, errors }

    } catch (error: any) {
      return { success: false, deletedFiles: [], errors: [error.message] }
    }
  }

  /**
   * UPDATE: Reorder photos
   */
  async reorderPhotos(postId: string, photoOrders: { photo_id: string; photo_order: number }[]): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Update photo orders in batch
      for (const { photo_id, photo_order } of photoOrders) {
        const { error: updateError } = await this.serviceClient
          .from('photos')
          .update({ photo_order })
          .eq('photo_id', photo_id)
          .eq('post_id', postId) // Additional security check

        if (updateError) {
          return { success: false, error: `Failed to update photo order: ${updateError.message}` }
        }
      }

      return { success: true }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * UPDATE: Set featured photo
   */
  async setFeaturedPhoto(postId: string, photoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // First, remove featured status from all photos for this post
      const { error: unfeaturedError } = await this.serviceClient
        .from('photos')
        .update({ is_featured: false })
        .eq('post_id', postId)

      if (unfeaturedError) {
        return { success: false, error: `Failed to unfeature photos: ${unfeaturedError.message}` }
      }

      // Then set the new featured photo
      const { error: featuredError } = await this.serviceClient
        .from('photos')
        .update({ is_featured: true })
        .eq('photo_id', photoId)
        .eq('post_id', postId) // Additional security check

      if (featuredError) {
        return { success: false, error: `Failed to set featured photo: ${featuredError.message}` }
      }

      return { success: true }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const photoManager = new PhotoManager() 