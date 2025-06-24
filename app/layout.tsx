import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ConditionalLayout } from '@/components/navigation/conditional-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'),
  title: 'SPACELY - Affordable Rentals',
  description: 'Students sharing budget-friendly rental spaces near Mapua Malayan Colleges Mindanao. All listings are student-posted, not officially owned. Find affordable student rentals within our campus community.',
  keywords: ['affordable student rentals', 'budget student housing', 'student-submitted listings', 'campus housing', 'student community'],
  authors: [{ name: 'Spacely Team' }],
  creator: 'Joshua Sabuero',
  publisher: 'Joshua Sabuero',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: '/',
    siteName: 'SPACELY',
    title: 'SPACELY - Affordable Campus Rentals',
    description: 'Students and staff sharing budget-friendly rental spaces near Mapua Malayan Colleges Mindanao. Find affordable rental solutions within our campus community.',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SPACELY - Affordable Campus Rentals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPACELY - Affordable Campus Rentals',
    description: 'Students and staff sharing budget-friendly rental spaces near Mapua Malayan Colleges Mindanao. Find affordable rental solutions within our campus community.',
    images: ['/images/og-image.png'],
    creator: '@spacely',
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#667eea" />
        <meta name="msapplication-TileColor" content="#667eea" />
      </head>
      <body className={`${inter.className} bg-gray-50 flex flex-col min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </AuthProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
        </ThemeProvider>
      </body>
    </html>
  )
} 