'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  Store,
  Building2,
  ArrowLeft,
  ChevronDown,
  Check,
  Globe,
} from 'lucide-react';

export const SupplierSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const {
    jobs,
    branches,
    activeBranch,
    currentBranchId,
    setCurrentBranchId,
    currentCompany,
    setCurrentCompany,
    activeSupplier,
    suppliers,
    currentSupplierId,
    setCurrentSupplierId,
    setCurrentRole,
  } = useApp();

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const isMaster = user?.role === 'MASTER';
  const isAllSupplier = !activeSupplier || currentSupplierId === 'ALL' || !currentSupplierId;
  const supplierName = isAllSupplier
    ? (isMaster ? 'ทุก Supplier (All Partners)' : (user?.supplierName || 'Supplier'))
    : (activeSupplier?.name || user?.supplierName || 'Supplier');

  // Compute live counts filtered by active branch and supplier
  const activeJobsCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    let list = isAllSupplier ? jobs : jobs.filter(j => j.supplierId === sId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list.filter(j => j.status === 'IN_PROGRESS' || j.status === 'PENDING_SUPPLIER').length;
  }, [jobs, isAllSupplier, activeSupplier, user, currentBranchId]);

  const readyInvoiceCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    let list = isAllSupplier ? jobs : jobs.filter(j => j.supplierId === sId);
    if (currentBranchId) {
      list = list.filter(j => j.branchId === currentBranchId);
    }
    return list.filter(j => j.status === 'APPROVED').length;
  }, [jobs, isAllSupplier, activeSupplier, user, currentBranchId]);

  const navItems = [
    {
      label: 'หน้าแรก (Dashboard)',
      href: '/vendor',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'รายการงาน',
      href: '/vendor/jobs',
      icon: ClipboardList,
      badge: activeJobsCount > 0 ? activeJobsCount : null,
      badgeColor: 'bg-red-500 text-white font-bold',
    },
    {
      label: 'ใบวางบิล',
      href: '/vendor/invoices',
      icon: Receipt,
      badge: readyInvoiceCount > 0 ? readyInvoiceCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 font-semibold',
    },
  ];

  const handleBackToAdmin = () => {
    setCurrentRole('MASTER');
    router.push('/');
  };

  // Group branches by company
  const ev7Branches = branches.filter(b => b.code.startsWith('EV7'));
  const giBranches = branches.filter(b => b.code.startsWith('GI'));

  const containerClasses =
    'fixed left-0 top-0 h-full w-72 bg-white border-r shadow-[0_4px_24px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none print:hidden';

  return (
    <aside className={containerClasses} style={{ borderColor: theme.borderSoft }}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div
          className="h-20 px-6 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: theme.borderSoft }}
        >
          <Link href="/vendor" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md text-white shrink-0 transition-transform duration-200 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`,
                boxShadow: theme.activeNavShadow,
              }}
            >
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="font-bold text-lg tracking-tight transition-colors duration-300"
                  style={{ color: theme.textPrimary }}
                >
                  VendorOps
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                >
                  SUPPLIER
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Supplier Portal</p>
            </div>
          </Link>
        </div>

        {/* Branch Switcher Card: Allows viewing jobs by branch (Image 2) */}
        <div className="px-5 py-3.5 border-b shrink-0 relative" style={{ borderColor: theme.borderSoft }}>
          <button
            type="button"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all duration-200 hover:border-emerald-500 hover:shadow-xs active:scale-[0.99] cursor-pointer group"
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSoft }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}
              >
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {activeBranch ? activeBranch.name : 'ทุกสาขา (All Branches)'}
                </p>
                <p
                  className="text-[11px] font-medium transition-colors duration-300 truncate mt-0.5 flex items-center gap-1"
                  style={{ color: theme.textMuted }}
                >
                  <span>สาขาที่สั่งงาน</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">เปลี่ยนสาขา</span>
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 group-hover:text-gray-700 shrink-0 transition-transform duration-200 ${
                isBranchDropdownOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>

          {/* Branch Dropdown Popover */}
          {isBranchDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsBranchDropdownOpen(false)}
              />
              <div className="absolute left-5 right-5 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-50 text-gray-800 animate-in fade-in duration-150 max-h-80 overflow-y-auto">
                <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    เลือกดูงานตามสาขา
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {branches.length} สาขา
                  </span>
                </div>

                {/* Option: All Branches */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentBranchId('');
                    setCurrentCompany('ALL');
                    setIsBranchDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                    !currentBranchId
                      ? 'text-emerald-800 bg-emerald-50 font-bold'
                      : 'text-gray-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="leading-tight">ทุกสาขา (All Branches)</p>
                      <p className="text-[10px] text-gray-400 font-normal">ดูงานจากทุกสาขาของ EV7 & GI</p>
                    </div>
                  </div>
                  {!currentBranchId && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>

                {/* EV7 Branches */}
                {ev7Branches.length > 0 && (
                  <div>
                    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f5238]" />
                      <span>สาขา EV7</span>
                    </div>
                    {ev7Branches.map((branch) => {
                      const isSelected = currentBranchId === branch.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setCurrentBranchId(branch.id);
                            setCurrentCompany('EV7');
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-emerald-800 bg-emerald-50 font-bold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="leading-tight truncate">{branch.name}</p>
                            <p className="text-[10px] text-gray-400 font-normal font-mono truncate">
                              {branch.code}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* GI Branches */}
                {giBranches.length > 0 && (
                  <div>
                    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
                      <span>สาขา GI</span>
                    </div>
                    {giBranches.map((branch) => {
                      const isSelected = currentBranchId === branch.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setCurrentBranchId(branch.id);
                            setCurrentCompany('GI');
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-emerald-800 bg-emerald-50 font-bold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="leading-tight truncate">{branch.name}</p>
                            <p className="text-[10px] text-gray-400 font-normal font-mono truncate">
                              {branch.code}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Optional: Supplier switch section for Master */}
                {isMaster && (
                  <div className="pt-1.5 mt-1.5 border-t border-gray-100">
                    <div className="px-3.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      จำลองมุมมอง Supplier
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentSupplierId('');
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                        isAllSupplier ? 'text-emerald-800 font-bold' : 'text-gray-600'
                      }`}
                    >
                      <span className="truncate">🏢 ทุก Supplier (All)</span>
                      {isAllSupplier && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                    {suppliers.map(sup => (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => {
                          setCurrentSupplierId(sup.id);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                          currentSupplierId === sup.id ? 'text-emerald-800 font-bold' : 'text-gray-600'
                        }`}
                      >
                        <span className="truncate">{sup.name}</span>
                        {currentSupplierId === sup.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Main Navigation */}
          <div>
            <p className="px-3 mb-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
              เมนูหลัก
            </p>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/vendor'
                    ? pathname === '/vendor'
                    : pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/vendor');

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: theme.activeNavBg,
                            boxShadow: theme.activeNavShadow,
                          }
                        : {}
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = theme.bgSoft;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '';
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className="w-4.5 h-4.5 transition-colors duration-200"
                        style={{ color: isActive ? '#fff' : theme.iconColor }}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-white/20 text-white' : item.badgeColor || ''
                        }`}
                        style={
                          !isActive && !item.badgeColor
                            ? { backgroundColor: theme.badgeBg, color: theme.badgeText }
                            : {}
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Master Admin Switch */}
          {isMaster && (
            <div>
              <p className="px-3 mb-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                ระบบส่วนกลาง
              </p>
              <button
                type="button"
                onClick={handleBackToAdmin}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200/60 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowLeft className="w-4 h-4 text-emerald-700 group-hover:-translate-x-0.5 transition-transform" />
                  <span>กลับสู่หน้าสาขา (Admin)</span>
                </div>
                <Building2 className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}
        </div>

        {/* Live System Status Widget at Bottom */}
        <div
          className="p-4 m-4 rounded-2xl border flex flex-col gap-1.5 shrink-0 transition-colors duration-300"
          style={{ backgroundColor: theme.bgFooter, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold transition-colors duration-300 flex items-center gap-1.5"
              style={{ color: theme.textPrimary }}
            >
              <span>ระบบรับงานอัตโนมัติ</span>
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-tight">
            เชื่อมต่อสาขา EV7 & GI พร้อมรับงานเข้าสู่ระบบเรียลไทม์
          </p>
        </div>
      </div>
    </aside>
  );
};
