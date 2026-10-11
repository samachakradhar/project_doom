'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only make redirect decisions AFTER auth initialization finishes
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      const target = pathname || '/chat';
      const redirectUrl = `/signin?redirect=${encodeURIComponent(target)}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname, hasRedirected]);

  // While checking session or redirecting, show a smooth DOOM loading screen
  if (isLoading || (!isAuthenticated && hasRedirected)) {
    return (
      <div className="min-h-screen w-full bg-[#F5F8FA] text-[#172B3A] flex flex-col items-center justify-center p-6 selection:bg-[#E8F6F2]">
        <div className="flex flex-col items-center max-w-sm text-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-md">
              <Activity className="w-7 h-7 text-[#087F72] animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#087F72] rounded-full animate-ping" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#172B3A] tracking-tight">DR. DOOM MEDICAL AI</h2>
            <p className="text-xs text-[#64748B] mt-1 font-medium">Verifying clinical session credentials...</p>
          </div>
          <div className="w-44 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#087F72] rounded-full animate-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, render children smoothly
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  return null;
}
