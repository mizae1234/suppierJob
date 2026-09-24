'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
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
  const theme = useTheme();
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
    },
    {
      label: 'สั่งล้างรถ (Car Wash)',
      href: '/jobs/create-car-wash',
      icon: Sparkles,
      badge: null,
      roleVisibility: ['MASTER', 'ADMIN', 'BRANCH'],
    },
    {
      label: 'ขอรถสไลด์ (Slide)',
      href: '/jobs/create-vehicle-slide',
      icon: Truck,
      badge: null,
      roleVisibility: ['MASTER', 'ADMIN', 'BRANCH'],
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
      roleVisibility: ['MASTER'],
    },
    {
      label: 'ใบวางบิล / Invoice',
      href: '/invoices',
      icon: Receipt,
      badge: null,
    },
    {
      label: 'รายงาน',
      href: '/reports',
      icon: BarChart3,
      badge: null,
    },
    {
      label: 'โหมดมือถือ (Mobile App)',
      href: '/vendor',
      icon: Smartphone,
      badge: 'Supplier',
      roleVisibility: ['MASTER'],
    },
    {
      label: 'ตั้งค่าระบบ',
      href: '/settings',
      icon: Settings,
      badge: null,
      roleVisibility: ['MASTER'],
    },
  ];

  const handleLinkClick = (href: string) => {
    if (href === '/vendor') {
      setCurrentRole('SUPPLIER');
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  const containerClasses = isMobile
    ? "relative h-full w-full bg-white flex flex-col justify-between select-none"
    : "fixed left-0 top-0 h-full w-72 bg-white border-r shadow-[0_4px_24px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none print:hidden";

  return (
    <aside className={containerClasses} style={{ borderColor: theme.borderSoft }}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b shrink-0" style={{ borderColor: theme.borderSoft }}>
          <Link href="/" onClick={() => handleLinkClick('/')} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white shrink-0 transition-colors duration-300"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`, boxShadow: theme.activeNavShadow }}
            >
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight transition-colors duration-300" style={{ color: theme.textPrimary }}>VendorOps</span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                >
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
        <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: theme.borderSoft }}>
          <div
            className="p-3 rounded-2xl border flex items-center justify-between transition-colors duration-300"
            style={{ backgroundColor: theme.bgCard, borderColor: theme.borderSoft }}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0">
                {currentRole === 'MASTER' && <ShieldCheck className="w-4 h-4 transition-colors duration-300" style={{ color: theme.iconColor }} />}
                {currentRole === 'ADMIN' && <ShieldCheck className="w-4 h-4 transition-colors duration-300" style={{ color: theme.iconColor }} />}
                {currentRole === 'BRANCH' && <Building2 className="w-4 h-4 transition-colors duration-300" style={{ color: theme.iconColor }} />}
                {currentRole === 'SUPPLIER' && <Wrench className="w-4 h-4 transition-colors duration-300" style={{ color: theme.iconColor }} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {currentRole === 'MASTER' && 'โหมดควบคุมสูงสุด (Master)'}
                  {currentRole === 'ADMIN' && `ผู้ดูแล ${currentCompany}`}
                  {currentRole === 'BRANCH' && (activeBranch?.name || 'สาขาที่เลือก')}
                  {currentRole === 'SUPPLIER' && (activeSupplier?.name || 'คู่ค้า Supplier')}
                </p>
                <p className="text-[11px] font-medium transition-colors duration-300" style={{ color: theme.textMuted }}>
                  {currentRole === 'MASTER' ? 'จัดการทุกสาขา & บิล & Supplier' : currentRole === 'ADMIN' ? `จัดการเฉพาะ ${currentCompany}` : `บทบาท: ${currentRole}`}
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
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={isActive
                    ? { backgroundColor: theme.activeNavBg, boxShadow: theme.activeNavShadow }
                    : { }}
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
                      className="w-4 h-4 transition-colors duration-200"
                      style={{ color: isActive ? '#fff' : theme.iconColor }}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor || ''
                      }`}
                      style={!isActive && !item.badgeColor ? { backgroundColor: theme.badgeBg, color: theme.badgeText } : {}}
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
        <div
          className="p-4 m-3 rounded-2xl border flex flex-col gap-1.5 shrink-0 transition-colors duration-300"
          style={{ backgroundColor: theme.bgFooter, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold transition-colors duration-300" style={{ color: theme.textPrimary }}>VIN & Stock Interface</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: theme.primaryLight }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: theme.primary }}></span>
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
