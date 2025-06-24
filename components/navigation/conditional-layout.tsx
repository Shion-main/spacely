"use client"

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navigation/navbar';
import { Footer } from '@/components/navigation/footer';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Don't render anything on server side to avoid hydration issues
  if (!isClient) {
    return <main className="flex-grow">{children}</main>;
  }
  
  const isAuthPage = pathname === '/auth';
  const isAdminPage = pathname.startsWith('/admin');

  // Don't show main site layout on auth or admin pages
  if (isAuthPage || isAdminPage) {
    return <main className="flex-grow">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
} 