'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  CheckCircle2,
  MoreHorizontal,
  Car,
  Receipt,
  BarChart3,
  Settings,
  Truck,
  Sparkles,
  X,
  Store,
  ChevronRight,
  Users,
} from 'lucide-react';

const mainTabs = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { key: 'jobs', label: 'งาน', icon: ClipboardList, href: '/jobs' },
  { key: 'create', label: 'สร้างงาน', icon: Plus, href: '__action__' },
  { key: 'approvals', label: 'ตรวจรับ', icon: CheckCircle2, href: '/approvals' },
  { key: 'more', label: 'อื่นๆ', icon: MoreHorizontal, href: '__more__' },
];

const moreMenuItems = [
  { label: 'สั่งล้างรถ', icon: Sparkles, href: '/jobs/create-car-wash', color: '#3b82f6' },
  { label: 'ขอรถสไลด์', icon: Truck, href: '/jobs/create-vehicle-slide', color: '#059669' },
  { divider: true },
  { label: 'รถในสต็อก / VIN', icon: Car, href: '/vehicles', color: '#6b7280' },
  { label: 'จัดการ Supplier', icon: Store, href: '/suppliers', color: '#6b7280', roleVisibility: ['MASTER'] },
  { label: 'จัดการผู้ใช้งาน', icon: Users, href: '/users', color: '#6b7280', roleVisibility: ['MASTER'] },
  { label: 'ใบวางบิล / Invoice', icon: Receipt, href: '/invoices', color: '#6b7280' },
  { label: 'รายงาน', icon: BarChart3, href: '/reports', color: '#6b7280' },
  { label: 'ใบรายคัน', icon: Car, href: '/vehicle-reports', color: '#059669' },
  { label: 'ตั้งค่าระบบ', icon: Settings, href: '/settings', color: '#6b7280' },
];

const createOptions = [
  { label: 'สั่งล้างรถ (Car Wash)', icon: Sparkles, href: '/jobs/create-car-wash', color: '#3b82f6', desc: 'เลือกรถแล้วส่งงานให้ Supplier' },
  { label: 'ขอรถสไลด์ (Slide)', icon: Truck, href: '/jobs/create-vehicle-slide', color: '#059669', desc: 'สร้างงานขนย้ายรถระหว่างสาขา' },
];

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { jobs, currentRole } = useApp();
  const [showMore, setShowMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const waitingCount = (jobs || []).filter(j => j.status === 'WAITING_APPROVAL').length;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Bottom Sheet: "อื่นๆ" */}
      {showMore && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[101] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">เมนูเพิ่มเติม</h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-3 py-2 pb-safe max-h-[60vh] overflow-y-auto">
              {moreMenuItems.map((item, idx) => {
                if ('roleVisibility' in item && (item as any).roleVisibility && !(item as any).roleVisibility.includes(currentRole)) {
                  return null;
                }
                if ('divider' in item && item.divider) {
                  return <div key={idx} className="h-px bg-gray-100 my-1.5 mx-2" />;
                }
                const Icon = item.icon!;
                return (
                  <Link
                    key={idx}
                    href={item.href!}
                    onClick={() => setShowMore(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}12`, color: item.color }}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {item.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet: "สร้างงาน" */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowCreate(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[101] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">สร้างงานใหม่</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create Options */}
            <div className="px-4 py-3 pb-safe space-y-2">
              {createOptions.map((opt, idx) => {
                const Icon = opt.icon;
                return (
                  <Link
                    key={idx}
                    href={opt.href}
                    onClick={() => setShowCreate(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${opt.color}14`, color: opt.color }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[90] lg:hidden bg-white border-t border-gray-200 pb-safe">
        <div className="flex items-end justify-around h-16 px-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isCreateBtn = tab.key === 'create';
            const isMoreBtn = tab.key === 'more';
            const active = !isCreateBtn && !isMoreBtn && isActive(tab.href);

            // สร้างงาน — ปุ่มกลมเด่น FAB
            if (isCreateBtn) {
              return (
                <button
                  key={tab.key}
                  onClick={() => { setShowCreate(true); setShowMore(false); }}
                  className="flex flex-col items-center -mt-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#0f5238] text-white flex items-center justify-center shadow-lg shadow-[#0f5238]/30 active:scale-95 transition-transform">
                    <Plus className="w-7 h-7" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium text-[#0f5238] mt-1">{tab.label}</span>
                </button>
              );
            }

            // อื่นๆ — เปิด bottom sheet
            if (isMoreBtn) {
              return (
                <button
                  key={tab.key}
                  onClick={() => { setShowMore(true); setShowCreate(false); }}
                  className="flex flex-col items-center justify-end pb-2 flex-1 min-w-0"
                >
                  <Icon className={`w-5 h-5 ${showMore ? 'text-[#0f5238]' : 'text-gray-400'}`} />
                  <span className={`text-[10px] mt-1 font-medium ${showMore ? 'text-[#0f5238]' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            // Tab ปกติ
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="flex flex-col items-center justify-end pb-2 flex-1 min-w-0 relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-[#0f5238]' : 'text-gray-400'}`} />
                  {/* Badge สำหรับ ตรวจรับ */}
                  {tab.key === 'approvals' && waitingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {waitingCount > 9 ? '9+' : waitingCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${active ? 'text-[#0f5238]' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {/* Active indicator */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[#0f5238]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
