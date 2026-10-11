'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  email: string;
  name: string;
  role: string;
  provider: string;
  facility?: string;
  phone?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
  preferredLanguage?: string;
  healthPreferences?: string;
  abhaId?: string;
  emergencyContact?: string;
  whatsAppEnabled?: boolean;
  whatsAppPhone?: string;
}

export interface AuthSession {
  user: User;
  expiresAt: number; // Unix timestamp in ms
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isSessionExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'drdoom_auth_session';
const LEGACY_STORAGE_KEY = 'drdoom_auth_user';
const COOKIE_NAME = 'drdoom_session';
const DEFAULT_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to set cookie
function setSessionCookie(session: AuthSession | null) {
  if (typeof document === 'undefined') return;
  if (!session) {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  const maxAgeSec = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(session.user))}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

// Helper to read cookie
function getSessionCookie(): User | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|; )' + COOKIE_NAME + '=([^;]*)'));
  if (!match || !match[2]) return null;
  try {
    return JSON.parse(decodeURIComponent(match[2]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    try {
      // 1. Try structured session with expiration
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const parsed: AuthSession = JSON.parse(storedSession);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setUser(parsed.user);
          setSessionCookie(parsed);
          setIsLoading(false);
          return;
        } else {
          // Session expired
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          setSessionCookie(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to legacy storage key
      const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyStored) {
        const legacyUser: User = JSON.parse(legacyStored);
        const newSession: AuthSession = {
          user: legacyUser,
          expiresAt: Date.now() + DEFAULT_SESSION_DURATION_MS,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        setSessionCookie(newSession);
        setUser(legacyUser);
        setIsLoading(false);
        return;
      }

      // 3. Fallback to cookie
      const cookieUser = getSessionCookie();
      if (cookieUser) {
        const newSession: AuthSession = {
          user: cookieUser,
          expiresAt: Date.now() + DEFAULT_SESSION_DURATION_MS,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cookieUser));
        setUser(cookieUser);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Auth initialization error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData: User, rememberMe: boolean = true) => {
    const duration = rememberMe ? DEFAULT_SESSION_DURATION_MS : 24 * 60 * 60 * 1000;
    const session: AuthSession = {
      user: userData,
      expiresAt: Date.now() + duration,
    };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(userData));
      setSessionCookie(session);
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      setSessionCookie(null);
    } catch (e) {
      console.warn('Failed to remove session:', e);
    }
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser: User = { ...prev, ...updates };
      try {
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        let expiresAt = Date.now() + DEFAULT_SESSION_DURATION_MS;
        if (storedSession) {
          const parsed: AuthSession = JSON.parse(storedSession);
          if (parsed.expiresAt) expiresAt = parsed.expiresAt;
        }
        const session: AuthSession = { user: updatedUser, expiresAt };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updatedUser));
        setSessionCookie(session);
      } catch (e) {
        console.warn('Failed to update session:', e);
      }
      return updatedUser;
    });
  }, []);

  const isSessionExpired = useCallback(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!storedSession) return true;
      const parsed: AuthSession = JSON.parse(storedSession);
      return Date.now() >= parsed.expiresAt;
    } catch {
      return true;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
        isSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
