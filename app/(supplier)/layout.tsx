'use client';

import React, { useState, useMemo } from 'react';
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
    jobs,
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

  // Compute live counts for bottom bar badges
  const pendingNewCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    const list = isAll ? jobs : jobs.filter(j => j.supplierId === sId);
    return list.filter(j => j.status === 'PENDING_SUPPLIER').length;
  }, [jobs, isAll, activeSupplier, user]);

  const readyInvoiceCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    const list = isAll ? jobs : jobs.filter(j => j.supplierId === sId);
    return list.filter(j => j.status === 'APPROVED').length;
  }, [jobs, isAll, activeSupplier, user]);

  const navItems = [
    { label: 'หน้าแรก', href: '/vendor', icon: LayoutDashboard },
    { label: 'รายการงาน', href: '/vendor/jobs', icon: ClipboardList, badge: pendingNewCount, badgeColor: 'bg-red-500' },
    { label: 'ใบวางบิล', href: '/vendor/invoices', icon: Receipt, badge: readyInvoiceCount, badgeColor: 'bg-emerald-600' },
  ];

  const handleBackToAdmin = () => {
    setCurrentRole('MASTER');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f0f9ff 70%, #eff6ff 100%)' }}>
      {/* MASTER: Compact Top Banner & Supplier Switcher */}
      {isMaster && (
        <div
          className="sticky top-0 z-50 px-3 sm:px-4 py-1.5 sm:py-2 text-white shadow-xs"
          style={{
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`,
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            {/* Left: Shield badge + Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <div className="flex items-center gap-1 text-white/90 text-[11px] sm:text-xs font-semibold shrink-0">
                <Shield className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">โหมดจำลอง Supplier</span>
                <span className="sm:hidden">จำลอง</span>
              </div>

              {/* Supplier Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] sm:text-xs font-bold border border-white/25 transition-all backdrop-blur-sm cursor-pointer shadow-xs"
                >
                  <span className="truncate max-w-[130px] sm:max-w-[220px]">
                    {activeSupplier ? `🏢 ${activeSupplier.name}` : '🌐 ทุก Supplier'}
                  </span>
                  <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform duration-200 ${isSupplierDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSupplierDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSupplierDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-1.5 w-72 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 text-gray-800 animate-in fade-in duration-150">
                      <div className="px-3 py-1.5 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          เลือกมุมมอง Supplier
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

            {/* Right: Exit simulation button */}
            <button
              onClick={handleBackToAdmin}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] sm:text-xs font-semibold transition-all backdrop-blur-sm cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับ Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* Supplier Top App Bar (Native App Style Header) */}
      <header
        className="sticky z-40 bg-white/85 backdrop-blur-xl border-b shadow-xs transition-all"
        style={{ borderColor: `${theme.primary}15`, top: isMaster ? '32px' : '0' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: Brand + Supplier Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Wrench className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-tight">{supplierName}</p>
              <p className="text-[10px] sm:text-[11px] font-semibold mt-0.5" style={{ color: theme.textPrimary }}>
                Supplier Portal
              </p>
            </div>
          </div>

          {/* Center: Desktop Nav Links (Hidden on Mobile) */}
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
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                  }`}
                  style={isActive ? { backgroundColor: theme.primary } : {}}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-gray-900' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0"
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
              className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (With safe bottom spacing for mobile navigation bar) */}
      <main className="flex-1 pb-28 sm:pb-8">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 py-4 sm:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Native App Style) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {navItems.map(item => {
            const isActive = item.href === '/vendor'
              ? pathname === '/vendor'
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            const badgeCount = item.badge || 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 cursor-pointer"
              >
                {/* Active pill background */}
                <div
                  className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 ${
                    isActive ? 'shadow-xs' : 'text-gray-400'
                  }`}
                  style={isActive ? { backgroundColor: `${theme.primary}18`, color: theme.primary } : {}}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                  
                  {/* Dynamic badge */}
                  {badgeCount > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200 ${item.badgeColor || 'bg-red-500'}`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                
                <span
                  className={`text-[10.5px] font-semibold mt-0.5 tracking-tight transition-colors ${
                    isActive ? 'font-bold' : 'text-gray-400'
                  }`}
                  style={isActive ? { color: theme.primary } : {}}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-0.5 transition-all"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Footer (Hidden on Mobile for App Feeling) */}
      <footer className="hidden sm:block border-t bg-white/40 backdrop-blur-sm" style={{ borderColor: `${theme.primary}10` }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">VendorOps — Supplier Portal</p>
          <p className="text-[11px] text-gray-400">© 2569 EV7 & GI</p>
        </div>
      </footer>
    </div>
  );
}
