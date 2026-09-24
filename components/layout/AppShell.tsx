'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setCurrentRole, isLoaded } = useApp();
  const { user } = useAuth();

  // If actual login role is MASTER but currentRole got stuck as SUPPLIER
  // and we're back on admin pages → auto-reset to MASTER
  useEffect(() => {
    if (!isLoaded || !user) return;
    const loginRole = user.role;
    const isAdminPage = !pathname?.startsWith('/vendor') && !pathname?.startsWith('/mobile') && !pathname?.startsWith('/login');

    if (loginRole === 'MASTER' && currentRole === 'SUPPLIER' && isAdminPage) {
      setCurrentRole('MASTER');
      return;
    }

    // Only redirect actual SUPPLIER users (not MASTER browsing as SUPPLIER)
    if (loginRole === 'SUPPLIER' && currentRole === 'SUPPLIER' && !pathname?.startsWith('/mobile')) {
      router.replace('/mobile');
    }
  }, [isLoaded, user, currentRole, pathname, router, setCurrentRole]);

  // If visiting login page, render standalone without any chrome
  if (pathname?.startsWith('/login')) {
    return <>{children}</>;
  }

  // If visiting mobile portal, render standalone without desktop chrome
  if (pathname?.startsWith('/mobile')) {
    return <>{children}</>;
  }

  // Smooth transition spinner when redirecting actual supplier to mobile portal
  if (isLoaded && user?.role === 'SUPPLIER' && currentRole === 'SUPPLIER') {
    return (
      <div className="min-h-screen bg-[#f4f9f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#0f5238] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">กำลังนำทางไปยัง Mobile Portal สำหรับ Supplier...</p>
        <p className="text-xs text-gray-400 mt-1">ตรวจพบสิทธิ์คู่ค้า Supplier — เข้าสู่หน้าจอมือถืออัตโนมัติ</p>
      </div>
    );
  }

  const isMasterImpersonating = user?.role === 'MASTER' && currentRole !== 'MASTER';

  const handleBackToMaster = () => {
    setCurrentRole('MASTER');
    router.push('/');
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Admin',
    BRANCH: 'สาขา (Branch)',
    SUPPLIER: 'Supplier',
  };

  return (
    <div className="min-h-screen bg-[#f4f9f5] flex flex-col">
      {/* MASTER Impersonation Banner */}
      {isMasterImpersonating && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 lg:px-6 py-2"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          <div className="flex items-center gap-2 text-white/90 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Master Mode — กำลังดูเป็น <strong>{roleLabels[currentRole] || currentRole}</strong></span>
          </div>
          <button
            onClick={handleBackToMaster}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับ Master
          </button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block" style={isMasterImpersonating ? { paddingTop: '36px' } : {}}>
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col">
            <Sidebar isMobile onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header onMobileMenuToggle={() => setIsMobileMenuOpen(prev => !prev)} />

      {/* Main Content Area */}
      <main className={`lg:pl-72 flex-1 flex flex-col ${isMasterImpersonating ? 'pt-[calc(5rem+36px)]' : 'pt-20'}`}>
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
