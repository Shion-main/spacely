-- 1. Create the new master 'amenities' table
CREATE TABLE public.amenities (
    amenity_id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying NOT NULL UNIQUE,
    type character varying DEFAULT 'general'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

-- Create policies for amenities table
CREATE POLICY "Allow public read access" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON public.amenities FOR INSERT TO authenticated WITH CHECK (true);


-- 2. Populate the 'amenities' table with existing standard amenities
INSERT INTO public.amenities (name, type) VALUES
    ('WiFi', 'standard'),
    ('CCTV', 'standard'),
    ('Air Conditioning', 'standard'),
    ('Parking', 'standard'),
    ('Own Electricity Meter', 'standard'),
    ('Own Water Meter', 'standard');


-- 3. Alter the existing 'post_amenities' table
-- Drop the old text-based column and type
ALTER TABLE public.post_amenities DROP COLUMN amenity_name;
ALTER TABLE public.post_amenities DROP COLUMN amenity_type;

-- Add a new column to reference the master amenities table
ALTER TABLE public.post_amenities ADD COLUMN amenity_id uuid NOT NULL;

-- Add the foreign key constraint
ALTER TABLE public.post_amenities 
ADD CONSTRAINT post_amenities_amenity_id_fkey 
FOREIGN KEY (amenity_id) REFERENCES public.amenities(amenity_id) ON DELETE CASCADE;

-- Make the combination of post_id and amenity_id unique to prevent duplicates
ALTER TABLE public.post_amenities ADD CONSTRAINT post_amenities_unique_pair UNIQUE (post_id, amenity_id);

-- Rename the primary key for clarity
ALTER TABLE public.post_amenities RENAME CONSTRAINT post_amenities_pkey TO post_amenities_pk;


-- 4. Remove redundant amenity columns from the 'rooms' table
ALTER TABLE public.rooms DROP COLUMN has_wifi;
ALTER TABLE public.rooms DROP COLUMN has_cctv;
ALTER TABLE public.rooms DROP COLUMN is_airconditioned;
ALTER TABLE public.rooms DROP COLUMN has_parking;
ALTER TABLE public.rooms DROP COLUMN has_own_electricity;
ALTER TABLE public.rooms DROP COLUMN has_own_water;

-- 5. Drop the old custom enum type if it exists
DROP TYPE IF EXISTS public.amenity_type;
