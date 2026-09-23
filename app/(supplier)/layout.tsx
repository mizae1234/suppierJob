'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  LogOut,
  Wrench,
  Bell,
} from 'lucide-react';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeSupplier, filteredJobs, waitingApprovalCount } = useApp();
  const theme = useTheme();
  const pathname = usePathname();

  const supplierName = activeSupplier?.name || user?.supplierName || 'Supplier';

  const navItems = [
    { label: 'หน้าแรก', href: '/vendor', icon: LayoutDashboard },
    { label: 'รายการงาน', href: '/vendor/jobs', icon: ClipboardList },
    { label: 'ใบวางบิล', href: '/vendor/invoices', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Supplier Top Header */}
      <header
        className="sticky top-0 z-40 bg-white border-b shadow-sm"
        style={{ borderColor: theme.borderSoft }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Brand + Supplier Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Wrench className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{supplierName}</p>
              <p className="text-[11px] text-gray-500">Supplier Portal</p>
            </div>
          </div>

          {/* Center: Nav Links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(item => {
              const isActive = item.href === '/vendor'
                ? pathname === '/vendor'
                : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: theme.primary } : {}}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-gray-900">{user?.displayName}</p>
              <p className="text-[10px] text-gray-500">{user?.username}</p>
            </div>
            <button
              onClick={logout}
              className="ml-2 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="sm:hidden flex items-center justify-around border-t border-gray-100 py-1">
          {navItems.map(item => {
            const isActive = item.href === '/vendor'
              ? pathname === '/vendor'
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'font-bold' : 'text-gray-500'
                }`}
                style={isActive ? { color: theme.primary } : {}}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
