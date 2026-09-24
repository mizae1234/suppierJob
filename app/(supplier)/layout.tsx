'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  LogOut,
  Wrench,
  ArrowLeft,
  Shield,
} from 'lucide-react';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeSupplier, filteredJobs, waitingApprovalCount, setCurrentRole } = useApp();
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const supplierName = activeSupplier?.name || user?.supplierName || 'Supplier';
  const isMaster = user?.role === 'MASTER';

  const navItems = [
    { label: 'หน้าแรก', href: '/vendor', icon: LayoutDashboard },
    { label: 'รายการงาน', href: '/vendor/jobs', icon: ClipboardList },
    { label: 'ใบวางบิล', href: '/vendor/invoices', icon: Receipt },
  ];

  const handleBackToAdmin = () => {
    setCurrentRole('MASTER');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f0f9ff 70%, #eff6ff 100%)' }}>
      {/* MASTER: Back to Admin Banner */}
      {isMaster && (
        <div
          className="sticky top-0 z-50 flex items-center justify-between px-4 py-2"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`,
          }}
        >
          <div className="flex items-center gap-2 text-white/90 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>คุณกำลังดูในมุมมอง Supplier (Master Mode)</span>
          </div>
          <button
            onClick={handleBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all backdrop-blur-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับหน้า Admin
          </button>
        </div>
      )}

      {/* Supplier Top Header */}
      <header
        className="sticky z-40 bg-white/80 backdrop-blur-xl border-b shadow-sm"
        style={{ borderColor: `${theme.primary}15`, top: isMaster ? '36px' : '0' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Brand + Supplier Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{supplierName}</p>
              <p className="text-[11px] font-medium" style={{ color: theme.textPrimary }}>
                Supplier Portal
              </p>
            </div>
          </div>

          {/* Center: Nav Links */}
          <nav className="hidden sm:flex items-center gap-1 bg-gray-100/80 rounded-2xl p-1">
            {navItems.map(item => {
              const isActive = item.href === '/vendor'
                ? pathname === '/vendor'
                : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
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
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-gray-900 leading-tight">{user?.displayName}</p>
              <p className="text-[10px] text-gray-500">{user?.username}</p>
            </div>
            <button
              onClick={logout}
              className="ml-1 p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="sm:hidden flex items-center justify-around border-t py-1.5 bg-white/60 backdrop-blur-sm" style={{ borderColor: `${theme.primary}10` }}>
          {navItems.map(item => {
            const isActive = item.href === '/vendor'
              ? pathname === '/vendor'
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                  isActive ? 'font-bold' : 'text-gray-400'
                }`}
                style={isActive ? { color: theme.primary } : {}}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/40 backdrop-blur-sm" style={{ borderColor: `${theme.primary}10` }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">VendorOps — Supplier Portal</p>
          <p className="text-[11px] text-gray-400">© 2569 EV7 & GI</p>
        </div>
      </footer>
    </div>
  );
}
