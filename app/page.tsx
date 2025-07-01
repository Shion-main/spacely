import { HomeClient } from '@/components/home/home-client'

// Server component for metadata
export const metadata = {
  title: 'SPACELY - Affordable Nearby Rentals',
  description: 'Share and discover budget-friendly rental spaces near Mapua Malayan Colleges Mindanao. Students and staff helping each other find affordable rental solutions.',
}

// Main page component (server-side)
export default function HomePage() {
  return <HomeClient />
} 