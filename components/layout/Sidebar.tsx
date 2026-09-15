'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Sparkles, 
  Truck, 
  CheckCircle2, 
  Car, 
  Building2, 
  Receipt, 
  BarChart3, 
  Settings,
  Store,
  ChevronRight,
  ShieldCheck,
  Wrench,
  X,
  Smartphone
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobile = false }) => {
  const pathname = usePathname();
  const { 
    currentRole, 
    setCurrentRole,
    currentCompany, 
    activeBranch, 
    activeSupplier, 
    filteredJobs, 
    waitingApprovalCount 
  } = useApp();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'งานทั้งหมด',
      href: '/jobs',
      icon: ClipboardList,
      badge: filteredJobs.length,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      label: 'สั่งล้างรถ (Car Wash)',
      href: '/jobs/create-car-wash',
      icon: Sparkles,
      badge: null,
      roleVisibility: ['ADMIN', 'BRANCH'],
    },
    {
      label: 'ขอรถสไลด์ (Slide)',
      href: '/jobs/create-vehicle-slide',
      icon: Truck,
      badge: null,
      roleVisibility: ['ADMIN', 'BRANCH'],
    },
    {
      label: 'รอตรวจรับงาน',
      href: '/approvals',
      icon: CheckCircle2,
      badge: waitingApprovalCount > 0 ? waitingApprovalCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 animate-pulse',
    },
    {
      label: 'รถในสต็อก / VIN',
      href: '/vehicles',
      icon: Car,
      badge: null,
    },
    {
      label: 'จัดการ Supplier',
      href: '/suppliers',
      icon: Store,
      badge: null,
    },
    {
      label: 'จัดการบิล / Invoice',
      href: '/invoices',
      icon: Receipt,
      badge: null,
    },
    {
      label: 'รายงาน (Reports)',
      href: '/reports',
      icon: BarChart3,
      badge: null,
    },
    {
      label: 'โหมดมือถือ (Mobile App)',
      href: '/mobile',
      icon: Smartphone,
      badge: 'Supplier',
      badgeColor: 'bg-emerald-100 text-[#0f5238]',
    },
    {
      label: 'ตั้งค่าระบบ',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  const handleLinkClick = (href: string) => {
    if (href === '/mobile') {
      setCurrentRole('SUPPLIER');
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  const containerClasses = isMobile
    ? "relative h-full w-full bg-white flex flex-col justify-between select-none"
    : "fixed left-0 top-0 h-full w-72 bg-white border-r border-emerald-950/10 shadow-[0_4px_24px_rgba(15,82,56,0.04)] z-50 flex flex-col justify-between select-none print:hidden";

  return (
    <aside className={containerClasses}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-emerald-950/5 shrink-0">
          <Link href="/" onClick={() => handleLinkClick('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#2d6a4f] flex items-center justify-center shadow-[0_4px_16px_rgba(15,82,56,0.25)] text-white shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[#0f5238]">VendorOps</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] text-[10px] font-bold uppercase tracking-wider">
                  {currentCompany === 'ALL' ? 'EV7 & GI' : currentCompany}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Supplier Job Management</p>
            </div>
          </Link>

          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current Context Card */}
        <div className="px-5 py-3 border-b border-emerald-950/5 shrink-0">
          <div className="p-3 rounded-2xl bg-[#f4f9f5] border border-emerald-950/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#0f5238] shrink-0">
                {currentRole === 'ADMIN' && <ShieldCheck className="w-4 h-4 text-emerald-700" />}
                {currentRole === 'BRANCH' && <Building2 className="w-4 h-4 text-emerald-700" />}
                {currentRole === 'SUPPLIER' && <Wrench className="w-4 h-4 text-emerald-700" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {currentRole === 'ADMIN' && 'โหมดส่วนกลาง (Central Admin)'}
                  {currentRole === 'BRANCH' && (activeBranch?.name || 'สาขาที่เลือก')}
                  {currentRole === 'SUPPLIER' && (activeSupplier?.name || 'คู่ค้า Supplier')}
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {currentRole === 'ADMIN' ? 'จัดการทุกสาขา & บิล' : `บทบาท: ${currentRole}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              // Check role visibility
              if (item.roleVisibility && !item.roleVisibility.includes(currentRole)) {
                return null;
              }

              // Fixed bug: exact matching for '/', and exact matching for '/jobs' so subroutes don't highlight both
              const isActive = item.href === '/'
                ? pathname === '/'
                : item.href === '/jobs'
                ? pathname === '/jobs'
                : pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/');

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleLinkClick(item.href)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#0f5238] text-white shadow-[0_4px_16px_rgba(15,82,56,0.25)] font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-[#f4f9f5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-800/70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Stock Sync Footer Widget */}
        <div className="p-4 m-3 rounded-2xl bg-[#eaf5ee] border border-emerald-950/5 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0f5238]">VIN & Stock Interface</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
          </div>
          <p className="text-[11px] text-gray-600 leading-tight">
            เชื่อมโยงระบบสต็อก EV7 & GI สำหรับตรวจสอบเลข VIN แบบเรียลไทม์
          </p>
        </div>
      </div>
    </aside>
  );
};
