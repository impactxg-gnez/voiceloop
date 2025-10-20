'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if admin session exists and is recent (within 24 hours)
    const adminSession = localStorage.getItem('admin_session');
    const adminUser = localStorage.getItem('admin_user');
    const loginTime = localStorage.getItem('admin_login_time');

    if (adminSession === 'true' && adminUser && loginTime) {
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
      
      // Session expires after 24 hours
      if (hoursSinceLogin < 24) {
        setIsAuthenticated(true);
      } else {
        // Session expired, clear it
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_login_time');
        router.push('/admin-login');
      }
    } else {
      // No valid session, redirect to login
      router.push('/admin-login');
    }
    
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_login_time');
    router.push('/admin-login');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div>
      {/* Admin Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Logged in as: {localStorage.getItem('admin_user')}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Admin Content */}
      {children}
    </div>
  );
}
