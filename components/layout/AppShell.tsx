'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, isLoaded } = useApp();

  // If current role is SUPPLIER and user is outside /mobile, automatically redirect to /mobile
  useEffect(() => {
    if (isLoaded && currentRole === 'SUPPLIER' && !pathname?.startsWith('/mobile')) {
      router.replace('/mobile');
    }
  }, [isLoaded, currentRole, pathname, router]);

  // If visiting mobile portal, render standalone without desktop chrome
  if (pathname?.startsWith('/mobile')) {
    return <>{children}</>;
  }

  // Smooth transition spinner when redirecting supplier to mobile portal
  if (isLoaded && currentRole === 'SUPPLIER') {
    return (
      <div className="min-h-screen bg-[#f4f9f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#0f5238] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">กำลังนำทางไปยัง Mobile Portal สำหรับ Supplier...</p>
        <p className="text-xs text-gray-400 mt-1">ตรวจพบสิทธิ์คู่ค้า Supplier — เข้าสู่หน้าจอมือถืออัตโนมัติ</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f9f5] flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
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
      <main className="lg:pl-72 pt-20 flex-1 flex flex-col">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
