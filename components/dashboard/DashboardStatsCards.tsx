'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/billing-utils';
import { useTheme } from '@/hooks/useTheme';
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Receipt,
  Eye
} from 'lucide-react';

interface DashboardStatsCardsProps {
  totalJobsCount: number;
  pendingSupplierCount: number;
  pendingCarWashCount: number;
  pendingSlideCount: number;
  waitingApprovalCount: number;
  rejectedCount: number;
  approvedCount: number;
  approvedAmount: number;
  invoicedCount: number;
  invoicedAmount: number;
}

const cards = [
  { key: 'total',    label: 'งานทั้งหมด',    icon: FileText,    dot: '#64748b', unit: 'รายการ' },
  { key: 'pending',  label: 'รอ Supplier',    icon: Clock,       dot: '#3b82f6', unit: 'งาน' },
  { key: 'review',   label: 'รอตรวจรับ',      icon: Eye,         dot: '#f59e0b', unit: 'งาน', href: '/approvals' },
  { key: 'rejected', label: 'ขอแก้ไข',        icon: AlertCircle, dot: '#ef4444', unit: 'งาน' },
  { key: 'approved', label: 'พร้อมวางบิล',    icon: CheckCircle2,dot: '#10b981', unit: 'งาน' },
  { key: 'invoiced', label: 'วางบิลแล้ว',     icon: Receipt,     dot: '#8b5cf6', unit: 'งาน' },
] as const;

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
  totalJobsCount,
  pendingSupplierCount,
  waitingApprovalCount,
  rejectedCount,
  approvedCount,
  approvedAmount,
  invoicedCount,
  invoicedAmount,
}) => {
  const theme = useTheme();

  const values: Record<string, number> = {
    total: totalJobsCount,
    pending: pendingSupplierCount,
    review: waitingApprovalCount,
    rejected: rejectedCount,
    approved: approvedCount,
    invoiced: invoicedCount,
  };

  const subtext: Record<string, string | null> = {
    total: null,
    pending: null,
    review: null,
    rejected: null,
    approved: approvedAmount > 0 ? formatCurrency(approvedAmount) : null,
    invoiced: invoicedAmount > 0 ? formatCurrency(invoicedAmount) : null,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const count = values[card.key];
        const sub = subtext[card.key];
        const Wrapper = card.href ? Link : 'div';
        const wrapperProps = card.href ? { href: card.href } : {};

        return (
          <Wrapper
            key={card.key}
            {...(wrapperProps as Record<string, string>)}
            className={`p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col gap-3 transition-all duration-200 ${
              card.href ? 'hover:shadow-md hover:border-gray-200 cursor-pointer' : ''
            }`}
          >
            {/* Top: icon + dot */}
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                <Icon className="w-4 h-4" />
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: card.dot }}
              />
            </div>

            {/* Number */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{count}</span>
                <span className="text-[10px] text-gray-400 font-medium">{card.unit}</span>
              </div>
              {sub && (
                <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>
              )}
            </div>

            {/* Label */}
            <p className="text-[11px] font-medium text-gray-500 leading-tight">{card.label}</p>
          </Wrapper>
        );
      })}
    </div>
  );
};
