'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface MobileHeaderProps {
  supplierName: string;
  pendingNotificationCount: number;
  onNotificationClick: () => void;
  onProfileClick: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  supplierName,
  pendingNotificationCount,
  onNotificationClick,
  onProfileClick,
}) => {
  // Extract 2 initials for the avatar (e.g. ABC Transport -> AB)
  const initials = supplierName
    ? supplierName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SP';

  return (
    <header className="pt-2 px-5 bg-white border-b border-gray-100 shrink-0 select-none z-30">
      {/* iOS Status Bar Simulation */}
      <div className="flex justify-between items-center text-xs font-semibold text-slate-800 px-1 pt-1 mb-2">
        <span className="tracking-tight font-medium text-sm font-mono">9:41</span>
        <div className="flex items-center space-x-1.5">
          {/* Signal */}
          <svg className="w-4 h-3.5 fill-current" viewBox="0 0 16 12">
            <rect height="4" rx="0.5" width="2.5" x="0" y="8"></rect>
            <rect height="6.5" rx="0.5" width="2.5" x="4" y="5.5"></rect>
            <rect height="9" rx="0.5" width="2.5" x="8" y="3"></rect>
            <rect height="11.5" rx="0.5" width="2.5" x="12" y="0.5"></rect>
          </svg>
          {/* Wifi */}
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 12">
            <path d="M8 3.5C5.2 3.5 2.7 4.7 0.9 6.6L0 5.6C2.1 3.5 5 2.1 8 2.1s5.9 1.4 8 3.5l-0.9 1C13.3 4.7 10.8 3.5 8 3.5zm0 3.8C6.3 7.3 4.8 8.1 3.6 9.3l-0.9-1c1.4-1.4 3.3-2.3 5.3-2.3s3.9 0.9 5.3 2.3l-0.9 1C11.2 8.1 9.7 7.3 8 7.3zm0 3.7c-0.8 0-1.5 0.7-1.5 1.5S7.2 14 8 14s1.5-0.7 1.5-1.5S8.8 11 8 11z"></path>
          </svg>
          {/* Battery */}
          <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
            <div className="h-full bg-slate-800 rounded-3xs w-full"></div>
          </div>
        </div>
      </div>

      {/* Brand Identity & Header Controls */}
      <div className="flex items-center justify-between py-2.5">
        <div className="flex items-center gap-2.5">
          {/* EV7 Logo Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#0f5b44] flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-xs font-mono">
            E7
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-slate-900 uppercase">
                EV7 OPERATIONS
              </span>
              <span className="text-[9px] font-bold text-[#0f5b44] bg-[#e8f5ed] px-1.5 py-0.5 rounded">
                PORTAL
              </span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium leading-none mt-0.5">
              SUPPLIER &amp; BRANCH
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell with Badge */}
          <button
            onClick={onNotificationClick}
            aria-label="การแจ้งเตือน"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-slate-600 hover:bg-gray-50 relative transition-colors shadow-xs"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {pendingNotificationCount > 0 && (
              <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full absolute -top-1 -right-1 flex items-center justify-center animate-pulse">
                {pendingNotificationCount}
              </span>
            )}
          </button>

          {/* Supplier Initials Profile Avatar */}
          <button
            onClick={onProfileClick}
            className="w-9 h-9 rounded-xl bg-emerald-100/70 border border-emerald-200/80 text-[#0f5b44] font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-emerald-500 transition-all"
            title="โปรไฟล์ / สลับสิทธิ์"
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  );
};
