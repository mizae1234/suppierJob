'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
