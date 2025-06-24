-- Update photos table to ensure consistent paths
UPDATE photos
SET file_path = storage_path
WHERE file_path != storage_path;

-- Remove any leading 'dwelly-listings/' from paths
UPDATE photos
SET 
  file_path = REPLACE(file_path, 'dwelly-listings/', ''),
  storage_path = REPLACE(storage_path, 'dwelly-listings/', '')
WHERE file_path LIKE 'dwelly-listings/%' OR storage_path LIKE 'dwelly-listings/%'; 