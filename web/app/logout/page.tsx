'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Logging out...</h2>
        <p className="text-muted-foreground">Clearing your session and redirecting to home</p>
      </div>
    </div>
  );
}
