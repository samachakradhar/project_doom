'use client';

import React from 'react';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProfileAvatarProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export function ProfileAvatar({ className = '', size = 'md', showBadge = true }: ProfileAvatarProps) {
  const { user } = useAuth();

  // Helper to extract initials
  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      // Clean prefix like Dr. or Nurse
      const clean = name.replace(/^(Dr\.|Dr|Nurse|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();
      const parts = clean.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length >= 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'DO';
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9.5 h-9.5 sm:w-10 sm:h-10 text-xs sm:text-sm',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 text-lg sm:text-xl'
  }[size];

  const initials = getInitials(user?.name, user?.email);

  if (!user) {
    return (
      <Link
        href="/signin"
        aria-label="Sign in to your account"
        title="Sign in"
        className={`relative inline-flex items-center justify-center rounded-full border border-[#E2E8F0] hover:border-[#087F72] bg-[#F5F8FA] hover:bg-[#E8F6F2] text-[#64748B] hover:text-[#087F72] transition-all focus:outline-none focus:ring-2 focus:ring-[#087F72] focus:ring-offset-2 ${sizeClasses} ${className}`}
      >
        <UserIcon className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      aria-label="Open profile"
      title={user.name ? `Open profile (${user.name})` : "Open profile"}
      className={`relative inline-flex items-center justify-center rounded-full border border-[#E2E8F0] hover:border-[#087F72] bg-white shadow-2xs hover:shadow-md hover:ring-2 hover:ring-[#087F72]/20 focus:outline-none focus:ring-2 focus:ring-[#087F72] focus:ring-offset-2 transition-all cursor-pointer select-none group shrink-0 ${sizeClasses} ${className}`}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.name || "User avatar"}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#E8F6F2] to-[#D1FAE5] text-[#087F72] font-extrabold flex items-center justify-center tracking-tight group-hover:scale-105 transition-transform">
          {initials}
        </div>
      )}

      {/* Online / Verified Active Badge */}
      {showBadge && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full shadow-2xs"
          title="Verified & Active"
        />
      )}
    </Link>
  );
}

export default ProfileAvatar;
