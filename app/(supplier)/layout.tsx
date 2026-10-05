'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import TagSearch from '@/components/ui/TagSearch';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  LogOut,
  Store,
  Search,
  Bell,
} from 'lucide-react';
import { SupplierSidebar } from '@/components/layout/SupplierSidebar';

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const {
    jobs,
    activeSupplier,
    currentSupplierId,
    activeBranch,
    currentBranchId,
  } = useApp();
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [searchTags, setSearchTags] = useState<string[]>([]);

  const isMaster = user?.role === 'MASTER';
  const isAll = !activeSupplier || currentSupplierId === 'ALL' || !currentSupplierId;
  const supplierName = isAll
    ? (isMaster ? 'ทุก Supplier (All Partners)' : (user?.supplierName || 'Supplier'))
    : (activeSupplier?.name || user?.supplierName || 'Supplier');

  // Compute live counts
  const activeJobsCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === sId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list.filter(j => j.status === 'IN_PROGRESS' || j.status === 'PENDING_SUPPLIER').length;
  }, [jobs, isAll, activeSupplier, user, currentBranchId]);

  const readyInvoiceCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    let list = isAll ? jobs : jobs.filter(j => j.supplierId === sId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list.filter(j => j.status === 'APPROVED').length;
  }, [jobs, isAll, activeSupplier, user, currentBranchId]);

  const navItems = [
    { label: 'หน้าแรก', href: '/vendor', icon: LayoutDashboard },
    { label: 'รายการงาน', href: '/vendor/jobs', icon: ClipboardList, badge: activeJobsCount },
    { label: 'ใบวางบิล', href: '/vendor/invoices', icon: Receipt, badge: readyInvoiceCount },
  ];

  const handleSearchTagsChange = useCallback((tags: string[]) => {
    setSearchTags(tags);
    if (tags.length > 0) {
      router.push(`/vendor/jobs?q=${encodeURIComponent(tags.join(','))}`);
    }
  }, [router]);



  return (
    <div className="min-h-screen bg-[#f4f9f5] flex flex-col">
      {/* Desktop Sidebar — matches Branch/Admin Sidebar on the left */}
      <div className="hidden lg:block">
        <SupplierSidebar />
      </div>

      {/* Top Header — matches Header standard */}
      <header
        className="fixed top-0 left-0 lg:left-72 right-0 h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b z-40 px-2.5 sm:px-4 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4 select-none print:hidden transition-colors duration-300"
        style={{ borderColor: theme.borderSoft }}
      >
        {/* Left Side: Search Bar on Desktop OR Brand Logo on Mobile */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-md">
          {/* Mobile Only: Brand + Supplier Name */}
          <div className="flex lg:hidden items-center gap-2 sm:gap-2.5 min-w-0 flex-1 w-full">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              <Store className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div 
              className="min-w-0 flex-1"
              style={{ maxWidth: 'calc(100vw - 180px)' }}
            >
              <p 
                className="text-xs font-bold text-gray-900 leading-tight block w-full"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={supplierName}
              >
                {supplierName}
              </p>
              <p 
                className="text-[10px] font-semibold block w-full" 
                style={{ color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                Supplier Portal
              </p>
            </div>
          </div>

          {/* Desktop Only: Search Bar */}
          <div className="hidden lg:block w-full">
            <TagSearch
              variant="header"
              tags={searchTags}
              onTagsChange={handleSearchTagsChange}
              placeholder="ค้นหาเลขที่งาน / ทะเบียนรถ / เลข VIN... (กด Enter เพื่อเพิ่ม)"
              accentColor={theme.primary}
            />
          </div>
        </div>

        {/* Right Side: Master Switcher + Notifications + User Profile */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">


          {/* Pending Jobs Bell Icon */}
          <Link
            href="/vendor/jobs?tab=progress"
            className="relative p-1.5 sm:p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            title="งานที่ต้องทำ"
          >
            <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            {activeJobsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </Link>

          {/* User Profile Avatar + Logout (Matches Admin layout header exactly) */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-gray-200 shrink-0">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white shadow-xs font-semibold text-xs transition-colors duration-300 shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-tight">
                {user?.displayName || 'Supplier'}
              </p>
              <p className="text-[11px] text-gray-500">
                {user?.username || (isMaster ? 'Master' : 'คู่ค้า Supplier')}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area — matches Admin layout: lg:pl-72 pt-20 */}
      <main className="lg:pl-72 pt-16 sm:pt-20 flex-1 flex flex-col pb-24 lg:pb-8">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (lg:hidden) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-gray-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around max-w-md mx-auto">
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
                className="relative flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <div
                  className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-200 ${
                    isActive ? 'font-bold' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  style={isActive ? { backgroundColor: `${theme.primary}12`, color: theme.primary } : {}}
                >
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white bg-red-500 flex items-center justify-center shadow-xs">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium mt-1 tracking-tight transition-colors ${
                    isActive ? 'font-bold' : 'text-gray-400'
                  }`}
                  style={isActive ? { color: theme.primary } : {}}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
