'use client';

import React from 'react';
import { classifySupplierItem } from '@/lib/job-utils';
import { SupplierItemCard } from '../_types';

interface JobStatusBreakdownChipsProps {
  card: SupplierItemCard;
  variant: 'wash' | 'slide';
}

export function JobStatusBreakdownChips({ card, variant }: JobStatusBreakdownChipsProps) {
  if (card.totalItemsInJob <= 1) return null;

  const counts: Record<string, number> = {};
  (card.job.carWashItems || []).forEach(it => {
    const verifiedAt = variant === 'slide' ? (it.verifiedAt || card.job.verifiedAt) : it.verifiedAt;
    const tab = classifySupplierItem(it.status, card.jobStatus, verifiedAt);
    if (tab) counts[tab] = (counts[tab] || 0) + 1;
  });

  const chips = [
    { key: 'verify', label: 'รอยืนยัน', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'progress', label: 'รอทำ', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'waiting', label: 'รอตรวจ', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'approved', label: 'ตรวจแล้ว', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'returned', label: 'ตีกลับ', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'declined', label: variant === 'slide' ? 'ยกเลิก/ปฏิเสธ' : 'ปฏิเสธ', cls: 'bg-red-50 text-red-700 border-red-200' },
  ].filter(c => counts[c.key]);

  const title = variant === 'slide'
    ? `ใบงานนี้สั่งทั้งหมด ${card.totalItemsInJob} คัน`
    : `ใบงานนี้มีทั้งหมด ${card.totalItemsInJob} คัน`;

  return (
    <div className="flex items-center gap-1 shrink-0" title={title}>
      {chips.map(c => (
        <span key={c.key} className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap ${c.cls}`}>
          {c.label} {counts[c.key]}
        </span>
      ))}
    </div>
  );
}
