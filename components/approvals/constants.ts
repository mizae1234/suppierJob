import React from 'react';
import { CheckCircle2, Eye, RotateCcw, Ban, Clock } from 'lucide-react';
import type { CarWashItemStatus } from '@/types';

export const ITEM_STATUS_UI: Record<CarWashItemStatus, { label: string; pill: string; card: string; icon: React.ElementType }> = {
  APPROVED:  { label: 'อนุมัติแล้ว',        pill: 'bg-emerald-600 text-white',     card: 'border-emerald-300 ring-2 ring-emerald-100', icon: CheckCircle2 },
  COMPLETED: { label: 'รอตรวจรับ',         pill: 'bg-amber-400 text-amber-950',   card: 'border-amber-200',                           icon: Eye },
  REJECTED:  { label: 'ตีกลับแก้ไข',       pill: 'bg-red-600 text-white',         card: 'border-red-200',                             icon: RotateCcw },
  CANCELLED: { label: 'Supplier ปฏิเสธ',  pill: 'bg-gray-600 text-white',        card: 'border-gray-200 opacity-75',                 icon: Ban },
  PENDING:   { label: 'รอ Supplier ส่งงาน', pill: 'bg-white/90 text-gray-600',     card: 'border-dashed border-gray-300',              icon: Clock },
};

export const WASH_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'ล้างปกติ',
  DEEP_CLEAN: 'ล้างเชิงลึก',
  POLISH: 'ขัดเคลือบ',
};
