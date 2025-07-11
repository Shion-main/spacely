-- DWELLY PostgreSQL Schema - Complete Migration
-- This schema incorporates all MySQL migrations and converts them to PostgreSQL
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types (enums) - matching all MySQL ENUMs
-- Use DO blocks to create types only if they don't exist
DO $$ 
BEGIN
    -- Create user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');
    END IF;
    
    -- Create year_level enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'year_level') THEN
        CREATE TYPE year_level AS ENUM ('1st', '2nd', '3rd', '4th', '5th', '6th');
    END IF;
    
    -- Create availability_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status') THEN
        CREATE TYPE availability_status AS ENUM ('available', 'rented', 'reserved');
    END IF;
    
    -- Create post_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status') THEN
        CREATE TYPE post_status AS ENUM ('available', 'occupied', 'archived');
    END IF;
    
    -- Create approval_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    
    -- Create price_range enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_range') THEN
        CREATE TYPE price_range AS ENUM ('below_3000', '3000_to_5000', '5000_to_8000', '8000_to_12000', 'above_12000');
    END IF;
    
    -- Create bathroom_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bathroom_type') THEN
        CREATE TYPE bathroom_type AS ENUM ('common', 'own');
    END IF;
    
    -- Create room_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
        CREATE TYPE room_type AS ENUM ('bare', 'semi_furnished', 'furnished');
    END IF;
    
    -- Create amenity_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'amenity_type') THEN
        CREATE TYPE amenity_type AS ENUM ('default', 'custom');
    END IF;
    
    -- Create contact_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_type') THEN
        CREATE TYPE contact_type AS ENUM ('phone', 'social', 'email');
    END IF;
    
    -- Create notification_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('approval', 'rejection', 'report', 'rating', 'favorite', 'system');
    END IF;
    
    -- Create report_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
        CREATE TYPE report_type AS ENUM ('occupied', 'scam', 'other');
    END IF;
    
    -- Create audit_action enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'block', 'unblock');
    END IF;
END $$;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table  
CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(department_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, department_id)
);

-- Room types table
CREATE TABLE IF NOT EXISTS room_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(10) NOT NULL UNIQUE,
    role user_role NOT NULL,
    year_level year_level,
    department_id INTEGER REFERENCES departments(department_id),
    course_id INTEGER REFERENCES courses(course_id),
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table (fully migrated with all fields from MySQL)
CREATE TABLE IF NOT EXISTS posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES room_types(type_id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    -- Search-related columns (from MySQL migration 002)
    search_keywords TEXT,
    -- Detailed address fields
    city VARCHAR(100) NOT NULL,
    barangay VARCHAR(100) NOT NULL,
    street VARCHAR(100) NOT NULL,
    building_name VARCHAR(100),
    unit_number VARCHAR(50),
    -- Contact information
    landlord_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    social_link VARCHAR(255) NOT NULL, -- Made required in MySQL migration 003
    page_link VARCHAR(255), -- Added in MySQL migration 002
    maps_link VARCHAR(255),
    -- Location coordinates (from MySQL migration 002)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    price DECIMAL(10,2),
    -- Price range for filtering (from MySQL migration 002)
    price_range price_range,
    availability_status availability_status DEFAULT 'available',
    -- Status for advanced reporting/archiving (from MySQL migration 004)
    status post_status NOT NULL DEFAULT 'available',
    -- Admin approval system (from MySQL migration 001)
    approval_status approval_status NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    rejection_reason TEXT,
    -- Archive system (from MySQL migration 002 archive)
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    archived_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    deletion_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    room_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    number_of_rooms INTEGER NOT NULL,
    bathroom_type bathroom_type NOT NULL,
    room_type room_type NOT NULL,
    has_wifi BOOLEAN DEFAULT FALSE,
    has_cctv BOOLEAN DEFAULT FALSE,
    is_airconditioned BOOLEAN DEFAULT FALSE,
    has_parking BOOLEAN DEFAULT FALSE,
    has_own_electricity BOOLEAN DEFAULT FALSE,
    has_own_water BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post amenities table
CREATE TABLE IF NOT EXISTS post_amenities (
    amenity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    amenity_type amenity_type DEFAULT 'custom',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    contact_type contact_type NOT NULL,
    contact_value VARCHAR(255) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    photo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL, -- Supabase storage path
    is_featured BOOLEAN DEFAULT FALSE,
    photo_order INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
    rating_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    type report_type NOT NULL DEFAULT 'other',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reporter_id, post_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type audit_action NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table (enhanced from MySQL migrations)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    post_id UUID REFERENCES posts(post_id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_id_number ON users(id_number);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_type_id ON posts(type_id);
CREATE INDEX idx_posts_location_city ON posts(city);
CREATE INDEX idx_posts_location_barangay ON posts(barangay);
CREATE INDEX idx_posts_coordinates ON posts(latitude, longitude);
CREATE INDEX idx_posts_approval_status ON posts(approval_status);
CREATE INDEX idx_posts_approved_by ON posts(approved_by);
CREATE INDEX idx_posts_rejected_by ON posts(rejected_by);
CREATE INDEX idx_posts_archived ON posts(archived);
CREATE INDEX idx_posts_approval_archived ON posts(approval_status, archived);
CREATE INDEX idx_posts_price ON posts(price);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Other indexes
CREATE INDEX idx_rooms_post_id ON rooms(post_id);
CREATE INDEX idx_post_amenities_post_id ON post_amenities(post_id);
CREATE INDEX idx_post_amenities_type ON post_amenities(amenity_type);
CREATE INDEX idx_contacts_post_id ON contacts(post_id);
CREATE INDEX idx_photos_post_id ON photos(post_id);
CREATE INDEX idx_ratings_post_id ON ratings(post_id);
CREATE INDEX idx_reports_post_id ON reports(post_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_post_id ON notifications(post_id);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Full-text search indexes
CREATE INDEX idx_posts_fulltext ON posts USING gin(to_tsvector('english', description || ' ' || search_keywords || ' ' || city || ' ' || barangay || ' ' || street));

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for posts table
CREATE POLICY "Anyone can view approved posts" ON posts
    FOR SELECT USING (approval_status = 'approved' AND archived = false AND is_deleted = false);

CREATE POLICY "Users can create their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for rooms table
CREATE POLICY "Anyone can view rooms for approved posts" ON rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = rooms.post_id 
            AND posts.approval_status = 'approved' 
            AND posts.archived = false 
            AND posts.is_deleted = false
        )
    );

CREATE POLICY "Users can manage rooms for their own posts" ON rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = rooms.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- RLS Policies for other tables (similar pattern)
DROP POLICY IF EXISTS "Anyone can view amenities for approved posts" ON post_amenities;

CREATE POLICY "Anyone can view amenities for approved posts" ON post_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = post_amenities.post_id 
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
            )
        )
    );

CREATE POLICY "Anyone can view photos for approved posts" ON photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.post_id = photos.post_id 
            AND posts.approval_status = 'approved' 
            AND posts.archived = false 
            AND posts.is_deleted = false
        )
    );

-- Trigger functions
CREATE OR REPLACE FUNCTION update_price_range()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.price IS NOT NULL THEN
        IF NEW.price < 3000 THEN
            NEW.price_range = 'below_3000';
        ELSIF NEW.price >= 3000 AND NEW.price < 5000 THEN
            NEW.price_range = '3000_to_5000';
        ELSIF NEW.price >= 5000 AND NEW.price < 8000 THEN
            NEW.price_range = '5000_to_8000';
        ELSIF NEW.price >= 8000 AND NEW.price < 12000 THEN
            NEW.price_range = '8000_to_12000';
        ELSE
            NEW.price_range = 'above_12000';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_range
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_price_range();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert reference data matching MySQL schema (only if not exists)
INSERT INTO departments (name) 
SELECT unnest(ARRAY['ATYCB', 'CAS', 'CCIS', 'CEA', 'CHS'])
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ATYCB');

-- Insert courses only if departments table is populated
INSERT INTO courses (name, department_id) 
SELECT * FROM (VALUES
    -- ATYCB Courses
    ('BS Entrepreneurship', 1),
    ('BS Management Accounting', 1),
    ('BS Real Estate Management', 1),
    ('BS Tourism Management', 1),
    ('BS Accountancy', 1),
    -- CAS Courses
    ('BS Communication', 2),
    ('BS Multimedia Arts', 2),
    -- CCIS Courses
    ('BS Computer Science', 3),
    ('BS Entertainment Multimedia Computing', 3),
    ('BS Information Systems', 3),
    -- CEA Courses
    ('BS Architecture', 4),
    ('BS Chemical Engineering', 4),
    ('BS Civil Engineering', 4),
    ('BS Computer Engineering', 4),
    ('BS Electrical Engineering', 4),
    ('BS Electronics Engineering', 4),
    ('BS Industrial Engineering', 4),
    ('BS Mechanical Engineering', 4),
    -- CHS Courses
    ('BS Biology', 5),
    ('BS Psychology', 5),
    ('BS Pharmacy', 5),
    ('BS Physical Therapy', 5)
) AS course_data(name, department_id)
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'BS Computer Science');

INSERT INTO room_types (type_name, display_name) 
SELECT * FROM (VALUES
    ('condo', 'Condo'),
    ('apartment', 'Apartment'),
    ('dorm', 'Dormitory'),
    ('house', 'House'),
    ('studio', 'Studio'),
    ('bedspace', 'Bedspace')
) AS room_data(type_name, display_name)
WHERE NOT EXISTS (SELECT 1 FROM room_types WHERE type_name = 'condo'); 