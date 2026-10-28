'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  role: 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER';
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  companyId: string | null;
  companyCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedCompany: 'EV7' | 'GI' | null;
  setSelectedCompany: (company: 'EV7' | 'GI' | null) => void;
  login: (username: string, password: string, company?: 'EV7' | 'GI') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<'EV7' | 'GI' | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/login';
    const isChangePasswordPage = pathname === '/change-password';
    const isSupplierRoute = pathname?.startsWith('/vendor');

    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user?.mustChangePassword && user.role !== 'SUPPLIER') {
      // บังคับเปลี่ยนรหัสผ่านก่อนใช้งานหน้าอื่น (ยกเว้น SUPPLIER)
      if (!isChangePasswordPage) router.replace('/change-password');
    } else if (user && (isLoginPage || isChangePasswordPage)) {
      // Redirect based on role after login
      if (user.role === 'SUPPLIER') {
        router.replace('/vendor');
      } else {
        router.replace('/');
      }
    } else if (user && !isLoginPage) {
      // Prevent supplier from accessing admin routes
      if (user.role === 'SUPPLIER' && !isSupplierRoute) {
        router.replace('/vendor');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(async (username: string, password: string, company?: 'EV7' | 'GI') => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, companyCode: company }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        if (company) setSelectedCompany(company);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
      }
    } catch {
      return { success: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore errors
    }
    setUser(null);
    router.replace('/login');
  }, [router]);

  // Memoize so consumers only re-render when auth state actually changes
  const value = useMemo<AuthContextType>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    selectedCompany,
    setSelectedCompany,
    login,
    logout,
    setUser,
  }), [user, isLoading, selectedCompany, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
