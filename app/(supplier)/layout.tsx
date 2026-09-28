'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  Check,
  Building2,
  Globe
} from 'lucide-react';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { 
    activeSupplier, 
    suppliers,
    currentSupplierId,
    setCurrentSupplierId,
    setCurrentRole 
  } = useApp();
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  const isMaster = user?.role === 'MASTER';
  const isAll = !activeSupplier || currentSupplierId === 'ALL' || !currentSupplierId;
  const supplierName = isAll
    ? (isMaster ? 'ทุก Supplier (All Partners)' : (user?.supplierName || 'Supplier'))
    : (activeSupplier?.name || user?.supplierName || 'Supplier');

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
      {/* MASTER: Back to Admin Banner & Supplier Switcher */}
      {isMaster && (
        <div
          className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 px-4 py-2 shadow-xs"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-200" />
              <span>โหมดจำลอง Supplier</span>
            </div>

            {/* Supplier Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold border border-white/25 transition-all backdrop-blur-sm cursor-pointer shadow-xs"
              >
                <span className="truncate max-w-[180px] sm:max-w-[240px]">
                  {activeSupplier ? `🏢 ${activeSupplier.name}` : '🌐 ทุก Supplier (All Partners)'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSupplierDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSupplierDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSupplierDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 text-gray-800 animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 border-b border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        เลือกมุมมอง Supplier ที่ต้องการดู
                      </p>
                    </div>

                    {/* Option: All Suppliers */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSupplierId('');
                        setIsSupplierDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                        isAll
                          ? 'text-emerald-800 bg-emerald-50 font-bold'
                          : 'text-gray-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌐</span>
                        <div>
                          <p className="leading-tight">ทุก Supplier (All Partners)</p>
                          <p className="text-[10px] text-gray-400 font-normal">ดูภาพรวมงานและบิลทั้งหมด</p>
                        </div>
                      </div>
                      {isAll && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>

                    <div className="h-px bg-gray-100 my-1" />

                    {/* Individual Suppliers */}
                    <div className="max-h-60 overflow-y-auto">
                      {suppliers.map(sup => {
                        const isSelected = currentSupplierId === sup.id;
                        return (
                          <button
                            key={sup.id}
                            type="button"
                            onClick={() => {
                              setCurrentSupplierId(sup.id);
                              setIsSupplierDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-emerald-800 bg-emerald-50 font-bold'
                                : 'text-gray-700 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-sm shrink-0">🏢</span>
                              <div className="min-w-0">
                                <p className="leading-tight truncate">{sup.name}</p>
                                <p className="text-[10px] text-gray-400 font-normal font-mono truncate">
                                  {sup.code} • {sup.services.join(', ')}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all backdrop-blur-sm cursor-pointer ml-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้า Admin</span>
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
