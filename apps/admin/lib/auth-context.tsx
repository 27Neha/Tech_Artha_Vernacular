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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      const savedToken = adminApi.getToken();
      if (!savedToken) {
        setIsLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      setToken(savedToken);
      try {
        const res = await adminApi.getMe();
        setUser(res.admin);
      } catch (err) {
        adminApi.setToken(null);
        setToken(null);
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, [pathname, router]);

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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
