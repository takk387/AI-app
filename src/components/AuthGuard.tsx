'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip auth check for public pages
    if (
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.startsWith('/api/auth/callback')
    ) {
      setIsChecking(false);
      return;
    }

    // Wait for auth context to finish loading
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
      setIsChecking(false);
    }
  }, [pathname, router, user, loading]);

  // Show loading state while checking auth
  if (isChecking || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔒</div>
          <div className="text-white dark:text-white text-xl">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Allow access to login/signup pages without auth
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/api/auth/callback')
  ) {
    return <>{children}</>;
  }

  // Require authentication for all other pages
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
