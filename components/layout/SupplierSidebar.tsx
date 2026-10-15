'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  Users,
  Sparkles,
  Truck,
} from 'lucide-react';

export const SupplierSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const {
    jobs,
    setCurrentBranchId,
    activeSupplier,
    suppliers,
    currentSupplierId,
    setCurrentSupplierId,
    setCurrentRole,
  } = useApp();

  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  const isMaster = user?.role === 'MASTER';
  const canSwitchSupplier = isMaster || user?.role === 'ADMIN' || !user?.supplierId || suppliers.length > 1;
  const isAllSupplier = !activeSupplier || currentSupplierId === 'ALL' || !currentSupplierId;
  const supplierName = isAllSupplier
    ? 'ทุก Supplier (All Partners)'
    : (activeSupplier?.name || user?.supplierName || 'Supplier');

  // Compute live counts filtered by active supplier
  const activeJobsCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    const list = isAllSupplier ? jobs : jobs.filter(j => j.supplierId === sId);
    return list.filter(j => j.status === 'IN_PROGRESS' || j.status === 'PENDING_SUPPLIER').length;
  }, [jobs, isAllSupplier, activeSupplier, user]);

  const readyInvoiceCount = useMemo(() => {
    const sId = activeSupplier?.id || user?.supplierId;
    const list = isAllSupplier ? jobs : jobs.filter(j => j.supplierId === sId);
    return list.filter(j => j.status === 'APPROVED').length;
  }, [jobs, isAllSupplier, activeSupplier, user]);

  // Helpers to categorize suppliers into Car Wash and Vehicle Slide
  const getSupplierServices = useCallback((s: any): string[] => {
    if (Array.isArray(s.services)) return s.services;
    if (typeof s.services === 'string') return s.services.split(',').map((x: string) => x.trim());
    return [];
  }, []);

  const isCarWash = useCallback((s: any) => {
    const sv = getSupplierServices(s);
    if (sv.length > 0) return sv.includes('CAR_WASH') || sv.some((x: string) => x.includes('WASH'));
    if (jobs.some(j => j.supplierId === s.id && j.jobType === 'CAR_WASH')) return true;
    const n = (s.name || '').toLowerCase();
    return n.includes('wash') || n.includes('clean') || n.includes('carcare') || !n.includes('slide');
  }, [jobs, getSupplierServices]);

  const isSlide = useCallback((s: any) => {
    const sv = getSupplierServices(s);
    if (sv.length > 0) return sv.includes('VEHICLE_SLIDE') || sv.some((x: string) => x.includes('SLIDE'));
    if (jobs.some(j => j.supplierId === s.id && j.jobType === 'VEHICLE_SLIDE')) return true;
    const n = (s.name || '').toLowerCase();
    return n.includes('slide') || n.includes('สไลด์') || n.includes('logistics');
  }, [jobs, getSupplierServices]);

  const carWashSuppliers = useMemo(() => suppliers.filter(isCarWash), [suppliers, isCarWash]);
  const slideSuppliers = useMemo(() => suppliers.filter(isSlide), [suppliers, isSlide]);
  const otherSuppliers = useMemo(() => suppliers.filter(s => !isCarWash(s) && !isSlide(s)), [suppliers, isCarWash, isSlide]);

  const isCurrentSlide = activeSupplier ? isSlide(activeSupplier) : false;
  const isCurrentWash = activeSupplier ? isCarWash(activeSupplier) : false;

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

        {/* Supplier Switcher Card (Categorized into Car Wash & Vehicle Slide) */}
        <div className="px-5 py-3.5 border-b shrink-0 relative" style={{ borderColor: theme.borderSoft }}>
          <button
            type="button"
            onClick={() => {
              if (canSwitchSupplier) {
                setIsSupplierDropdownOpen(!isSupplierDropdownOpen);
              }
            }}
            disabled={!canSwitchSupplier}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all duration-200 group ${
              canSwitchSupplier
                ? 'hover:border-emerald-500 hover:shadow-xs active:scale-[0.99] cursor-pointer'
                : 'cursor-default'
            }`}
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSoft }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform ${
                  canSwitchSupplier ? 'group-hover:scale-105' : ''
                } ${
                  isAllSupplier
                    ? 'bg-emerald-100 text-emerald-800'
                    : isCurrentSlide && isCurrentWash
                      ? 'bg-purple-100 text-purple-700'
                      : isCurrentSlide
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                }`}
              >
                {isAllSupplier ? (
                  <Users className="w-4.5 h-4.5" />
                ) : isCurrentSlide && !isCurrentWash ? (
                  <Truck className="w-4.5 h-4.5" />
                ) : isCurrentWash && !isCurrentSlide ? (
                  <Sparkles className="w-4.5 h-4.5" />
                ) : (
                  <Store className="w-4.5 h-4.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {supplierName}
                </p>
                <p
                  className="text-[11px] font-medium transition-colors duration-300 truncate mt-0.5 flex items-center gap-1"
                  style={{ color: theme.textMuted }}
                >
                  <span
                    className={
                      isAllSupplier
                        ? 'text-gray-500'
                        : isCurrentSlide && isCurrentWash
                          ? 'text-purple-600 font-semibold'
                          : isCurrentSlide
                            ? 'text-amber-600 font-semibold'
                            : 'text-blue-600 font-semibold'
                    }
                  >
                    {isAllSupplier
                      ? 'ทุกหมวดบริการ'
                      : isCurrentSlide && isCurrentWash
                        ? 'ล้างรถ & สไลด์'
                        : isCurrentSlide
                          ? 'บริการรถสไลด์'
                          : 'บริการล้างรถ'}
                  </span>
                  {canSwitchSupplier && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">เปลี่ยนคู่ค้า</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            {canSwitchSupplier && (
              <ChevronDown
                className={`w-4 h-4 text-gray-400 group-hover:text-gray-700 shrink-0 transition-transform duration-200 ${
                  isSupplierDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                }`}
              />
            )}
          </button>

          {/* Supplier Dropdown Popover */}
          {isSupplierDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSupplierDropdownOpen(false)}
              />
              <div className="absolute left-5 right-5 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-50 text-gray-800 animate-in fade-in duration-150 max-h-80 overflow-y-auto">
                <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    ผู้ให้บริการ / คู่ค้า (Supplier)
                  </p>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {suppliers.length} รายการ
                  </span>
                </div>

                {/* Option: All Suppliers */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSupplierId('');
                    setCurrentBranchId('');
                    setIsSupplierDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left hover:bg-emerald-50/60 transition-colors cursor-pointer ${
                    isAllSupplier
                      ? 'text-emerald-800 bg-emerald-50 font-bold'
                      : 'text-gray-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="leading-tight truncate">ทุก Supplier (All Partners)</p>
                      <p className="text-[10px] text-gray-400 font-normal truncate">
                        ดูงานทุกหมวดบริการของทุกคู่ค้า
                      </p>
                    </div>
                  </div>
                  {isAllSupplier && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                </button>

                {/* Category 1: Car Wash */}
                {carWashSuppliers.length > 0 && (
                  <div>
                    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-blue-700">หมวดบริการล้างรถ (Car Wash)</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {carWashSuppliers.length} ร้าน
                      </span>
                    </div>
                    {carWashSuppliers.map((sup) => {
                      const isSelected = currentSupplierId === sup.id;
                      return (
                        <button
                          key={`wash-${sup.id}`}
                          type="button"
                          onClick={() => {
                            setCurrentSupplierId(sup.id);
                            setCurrentBranchId('');
                            setIsSupplierDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-blue-50/50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-blue-900 bg-blue-50 font-bold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="leading-tight truncate">{sup.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal truncate font-mono">
                                {sup.code || ''}{sup.phone ? ` • ${sup.phone}` : ''}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category 2: Vehicle Slide */}
                {slideSuppliers.length > 0 && (
                  <div>
                    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-amber-700">หมวดบริการรถสไลด์ (Vehicle Slide)</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {slideSuppliers.length} ร้าน
                      </span>
                    </div>
                    {slideSuppliers.map((sup) => {
                      const isSelected = currentSupplierId === sup.id;
                      return (
                        <button
                          key={`slide-${sup.id}`}
                          type="button"
                          onClick={() => {
                            setCurrentSupplierId(sup.id);
                            setCurrentBranchId('');
                            setIsSupplierDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-amber-50/50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-amber-900 bg-amber-50 font-bold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="leading-tight truncate">{sup.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal truncate font-mono">
                                {sup.code || ''}{sup.phone ? ` • ${sup.phone}` : ''}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Category 3: Other suppliers if any */}
                {otherSuppliers.length > 0 && (
                  <div>
                    <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span className="text-gray-600">บริการอื่นๆ</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {otherSuppliers.length} ร้าน
                      </span>
                    </div>
                    {otherSuppliers.map((sup) => {
                      const isSelected = currentSupplierId === sup.id;
                      return (
                        <button
                          key={`other-${sup.id}`}
                          type="button"
                          onClick={() => {
                            setCurrentSupplierId(sup.id);
                            setCurrentBranchId('');
                            setIsSupplierDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-gray-900 bg-gray-100 font-bold'
                              : 'text-gray-700 font-medium'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="leading-tight truncate">{sup.name}</p>
                            <p className="text-[10px] text-gray-400 font-normal truncate font-mono">
                              {sup.code || ''}{sup.phone ? ` • ${sup.phone}` : ''}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-gray-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {suppliers.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-gray-400">ยังไม่มีรายชื่อคู่ค้าในระบบ</p>
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
