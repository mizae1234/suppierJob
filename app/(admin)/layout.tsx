'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f9f5] flex flex-col">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="lg:pl-72 pt-20 flex-1 flex flex-col">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <MobileBottomNav />
    </div>
  );
}
