# Spacely - Campus Community Marketplace

**Where Campus Life Begins** 🏠

A modern, full-stack web application that connects students with their perfect accommodations near Mapua Malayan Colleges Mindanao. Built with Next.js 14, TypeScript, and Supabase.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: Next.js API Routes + Supabase Edge Functions
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod + React Hook Form
- **State Management**: React Context + Hooks

## ✨ Key Features

### 🔐 Authentication & Authorization
- Secure user registration and login
- Role-based access control (Student, Staff, Admin)
- Protected routes and middleware
- Session management with Supabase Auth

### 🏠 Listing Management
- Create, edit, and manage property listings
- Image upload with validation and optimization
- Geolocation extraction from Google Maps links
- Advanced search and filtering
- Admin approval system

### 👑 Admin Features
- Complete admin dashboard
- User management (block/unblock)
- Listing approval/rejection system
- Content moderation and reporting
- Analytics and audit logging

### 🔍 Search & Discovery
- Full-text search with PostgreSQL
- Advanced filtering (price, location, type, amenities)
- Interactive maps integration
- Favorites system
- Rating and review system

### 📱 Modern UX
- Responsive design for all devices
- Real-time notifications
- Toast messaging system
- Loading states and error handling
- Accessible UI components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account

### 1. Clone and Install

```bash
git clone <repository-url>
cd dwelly-nextjs
npm install
```

### 2. Environment Setup

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://khhbknhwrgpgzluqlokk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoaGJrbmh3cmdwZ3psdXFsb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzcwNjYsImV4cCI6MjA2NTc1MzA2Nn0.7IiTiHbleMmE2g9aYUcKDxuRbqfMRuGy4bu03rOX1f8

# App Configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-jwt-token-here
NODE_ENV=development

# Upload Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=5242880  # 5MB in bytes
NEXT_PUBLIC_ALLOWED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/webp
```

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Execute the SQL to create all tables, policies, and initial data

### 4. Storage Setup (Supabase Dashboard)

1. Go to Storage section
2. Create a new bucket named `listings`
3. Set it as public
4. Add the following storage policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

-- Allow anyone to view images
CREATE POLICY "Anyone can view listing images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listings');
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📊 Database Schema

### Core Tables

- **users**: User profiles with roles and academic info
- **posts**: Property listings with approval system
- **rooms**: Room details and amenities
- **photos**: Listing images with Supabase Storage paths
- **favorites**: User favorite listings
- **ratings**: Reviews and ratings
- **reports**: Content reporting system
- **notifications**: User notifications
- **audit_logs**: Admin action tracking

### Key Features

- **Row Level Security (RLS)**: Comprehensive security policies
- **Full-text Search**: PostgreSQL GIN indexes
- **Geolocation**: PostGIS support for location queries
- **Audit Trail**: Complete action logging
- **Soft Deletes**: Data preservation with is_deleted flags

## 🔧 Development

### Project Structure

```
dwelly-nextjs/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin dashboard
│   ├── listings/          # Listing pages
│   └── globals.css        # Global styles
├── components/            # React Components
│   ├── ui/               # Base UI components
│   ├── navigation/       # Navigation components
│   ├── forms/            # Form components
│   └── providers/        # Context providers
├── lib/                  # Utilities and configurations
│   ├── supabase/         # Supabase clients
│   ├── validations.ts    # Zod schemas
│   ├── utils.ts          # Helper functions
│   └── database.types.ts # TypeScript types
├── supabase/             # Database schema
└── middleware.ts         # Route protection
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Key Commands

```bash
# Generate TypeScript types from Supabase
npm run db:generate-types

# Reset database (development only)
npm run db:reset
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub/GitLab
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
NODE_ENV=production
```

## 🔐 Security Features

### Content Moderation
- Profanity filtering with custom word lists
- HTML sanitization and XSS prevention
- File upload validation and security scanning
- Input validation with Zod schemas

### Authentication Security
- Bcrypt password hashing
- JWT token management via Supabase
- Row Level Security (RLS) policies
- CSRF protection via middleware

### Data Protection
- SQL injection prevention via Supabase
- Rate limiting on API endpoints
- Audit logging for admin actions
- Secure file upload with type validation

## 📝 Migration Guide

### From Original Express.js System

This application is a complete migration from the original DWELLY Express.js/MySQL system. Key improvements:

1. **Performance**: 
   - Static generation and ISR with Next.js
   - Edge functions for global performance
   - Optimized images and assets

2. **Security**:
   - Row Level Security with PostgreSQL
   - Modern authentication with Supabase
   - Content Security Policy headers

3. **Developer Experience**:
   - Full TypeScript support
   - Modern React patterns
   - Comprehensive testing setup

4. **User Experience**:
   - Improved responsive design
   - Better error handling
   - Real-time features

### Database Migration

The MySQL schema has been fully converted to PostgreSQL with the following key changes:

- `INT AUTO_INCREMENT` → `UUID DEFAULT uuid_generate_v4()`
- `VARCHAR(n)` → `VARCHAR(n)` (preserved)
- `DATETIME` → `TIMESTAMP WITH TIME ZONE`
- `JSON` → `JSONB` (for better performance)
- `ENUM` values → PostgreSQL ENUM types

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. Check the [Issues](../../issues) page
2. Read the documentation
3. Contact the development team

## 🔄 Migration Checklist

- [x] Database schema conversion (MySQL → PostgreSQL)
- [x] Authentication system (Express sessions → Supabase Auth)
- [x] File upload system (Local storage → Supabase Storage)
- [x] API routes (Express routes → Next.js API routes)
- [x] UI components (EJS templates → React components)
- [x] Form validation (Server-side → Client + Server with Zod)
- [x] Security middleware (Express → Next.js middleware)
- [x] Admin dashboard (Server-rendered → Client-side React)
- [ ] Email notifications (To be implemented)
- [ ] Real-time chat (To be implemented)
- [ ] Mobile app integration (Future enhancement)

---

**Built with ❤️ for students seeking better housing solutions.** 