# Spacely – Campus-Community Marketplace 🏠

> A full-stack platform that helps Mapúa Malayan Colleges Mindanao students discover budget-friendly rentals, post listings, and manage the process – with a powerful admin dashboard for moderation.

---

## ✨ Feature Highlights

• **Authentication & RLS** – Supabase Auth with role-based access (student / admin) and Row Level Security.

• **Listings Workflow**  
  ▸ Create / edit listings with Google-Maps extraction  
  ▸ Image uploads (10 max) → Supabase Storage  
  ▸ Admin review → approve / reject / recycle-bin  
  ▸ Favorites, reports.

• **Admin Dashboard**  
  ▸ Pending listings, users, reports, audit logs  
  ▸ Hard-delete cron & analytics widgets  

• **Search & Filters** – Full-text PostgreSQL search, dynamic filtering, map / grid view, pagination.

• **Modern UI** – Next.js 14 App Router, Tailwind CSS + shadcn/ui, React-Hot-Toast, fully responsive.

---

## 🏗️ Tech Stack

| Layer            | Tech                                                         |
|------------------|-------------------------------------------------------------|
| Front-end        | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Server (API)     | Next.js Route Handlers                                       |
| Database         | PostgreSQL via Supabase (RLS, functions, cron)              |
| Auth & Storage   | Supabase Auth, Supabase Storage                             |
| Validation       | Zod + React-Hook-Form                                       |
| Maps             | Google Maps JS API Loader                                   |
| Deployment       | Vercel (CI / CD)                                            |

---

## 📦 Project Structure (excerpt)

```text
spacely/
├─ app/               # Next.js routes
│  ├─ api/            # API (Listings, Auth, Admin …)
│  ├─ admin/          # Admin dashboard pages
│  ├─ listings/       # Public listing pages
│  └─ auth/           # Login / Register
├─ components/        # UI + feature components
│  ├─ listings/
│  ├─ navigation/
│  └─ providers/
├─ lib/               # Supabase clients, helpers, validation
├─ supabase/          # SQL schema + migrations
└─ README.md          # ← you are here
```

---

## 🚀 Getting Started (Local)

### 1. Prerequisites

* Node 18+
* npm 9+/pnpm/yarn
* Supabase account
* Google Maps API Key

### 2. Clone & Install

```bash
git clone https://github.com/YOUR_USER/spacely.git
cd spacely
npm install
```

### 3. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:5000  # dev URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<maps-key>
NEXT_PUBLIC_MAX_FILE_SIZE=5242880
NEXT_PUBLIC_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

### 4. Database / Storage

1.  In Supabase → SQL Editor → run the scripts in `supabase/schema.sql` and `supabase/migrations/*`  
2.  Storage → create bucket **dwelly-listings** (public) – same policies as in `README` v1.

### 5. Run Dev Server

```bash
npm run dev
```
Open <http://localhost:5000>.

---

## 🛠️ Useful Scripts

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run db:generate   # Refresh TypeScript types from Supabase
```

---

## 📚 API Endpoints (excerpt)

| Method | Path                              | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/listings`                   | Create listing (auth)          |
| PATCH  | `/api/listings/[id]`              | Update listing (owner)         |
| GET    | `/api/listings`                   | Public search + filter         |
| POST   | `/api/admin/pending-listings`     | Approve / reject (admin)       |

Full list → see `app/api/` directory.

---

## 🌐 Deployment (Vercel)

1.  Import the GitHub repo in Vercel.  
2.  Add the same env-vars as above.  
3.  **Build Command**: `npm run build`  
4.  **Output Directory**: `.next`

Every push to `main` triggers an automatic deployment.


## 📄 License

MIT © 2025 Spacely Team 
