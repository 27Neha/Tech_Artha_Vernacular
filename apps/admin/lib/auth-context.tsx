'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminApi, AdminUserSession } from './api';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: AdminUserSession | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionSlug: string) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = pathname === '/login' || pathname.startsWith('/invite');

  useEffect(() => {
    async function initAuth() {
      const savedToken = adminApi.getToken();
      if (!savedToken) {
        setIsLoading(false);
        if (!isPublicRoute) {
          router.push('/login');
        }
        return;
      }

      setToken(savedToken);
      try {
        const res = await adminApi.getMe();
        setUser(res.admin);
      } catch {
        adminApi.setToken(null);
        setToken(null);
        setUser(null);
        if (!isPublicRoute) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, [pathname, router, isPublicRoute]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await adminApi.login(email, password);
      setToken(res.token);
      setUser(res.user);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    adminApi.setToken(null);
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const hasPermission = (permissionSlug: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permissionSlug) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasPermission,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AuthProvider');
  }
  return context;
}
