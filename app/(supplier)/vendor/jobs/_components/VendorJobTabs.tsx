'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import { TabCounts, TabKey } from '../_types';

interface VendorJobTabsProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  tabCounts: TabCounts;
  primaryColor: string;
}

export function VendorJobTabs({
  activeTab,
  onSelectTab,
  tabCounts,
  primaryColor,
}: VendorJobTabsProps) {
  const tabConfig: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'verify', label: 'รอยืนยันรถ', icon: ScanLine, color: '#0284c7' },
    { key: 'progress', label: 'งานที่ต้องทำ', icon: Clock, color: '#f59e0b' },
    { key: 'waiting', label: 'รอตรวจรับ', icon: AlertCircle, color: '#ef4444' },
    { key: 'approved', label: 'ผ่านแล้ว', icon: CheckCircle2, color: primaryColor },
    { key: 'returned', label: 'ตีกลับ', icon: RotateCcw, color: '#ea580c' },
    { key: 'declined', label: 'ปฏิเสธ', icon: XCircle, color: '#dc2626' },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/60 backdrop-blur-sm rounded-2xl overflow-x-auto scrollbar-none shadow-inner">
      {tabConfig.map(tab => {
        const Icon = tab.icon;
        const count = tabCounts[tab.key];
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
              isActive
                ? 'bg-white shadow-xs text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : undefined }} />
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold text-white"
                style={{ backgroundColor: tab.color }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
