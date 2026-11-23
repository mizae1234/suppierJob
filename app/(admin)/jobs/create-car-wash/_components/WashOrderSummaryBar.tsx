'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { VatType } from '@/lib/car-wash-rates';
import { WashOrderFinancials } from '../_types';

interface WashOrderSummaryBarProps {
  financials: WashOrderFinancials;
  vatType: VatType;
  themePrimary: string;
}

export function WashOrderSummaryBar({
  financials,
  vatType,
  themePrimary,
}: WashOrderSummaryBarProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <span className="text-xs text-gray-500 font-medium">ยอดรวมค่าบริการ (Subtotal):</span>
          <div className="text-lg font-bold text-gray-800">
            ฿{financials.subtotal.toLocaleString()}
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        <div>
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <span>ภาษีมูลค่าเพิ่ม:</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                vatType === 'VAT_7'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {vatType === 'VAT_7' ? 'VAT 7%' : 'No VAT'}
            </span>
          </span>
          <div className="text-sm font-semibold text-gray-700 mt-0.5">
            {vatType === 'VAT_7'
              ? `+฿${financials.vatAmount.toLocaleString()}`
              : 'ไม่มี VAT (บุคคลธรรมดา)'}
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        <div>
          <span className="text-xs text-gray-500 font-medium">ยอดสุทธิรวมทั้งสิ้น:</span>
          <div className="text-2xl font-black" style={{ color: themePrimary }}>
            ฿{financials.grandTotal.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-xs font-bold shadow-md transition-all hover:opacity-90 active:scale-98 cursor-pointer w-full md:w-auto"
          style={{ backgroundColor: themePrimary }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>บันทึก Order & ออกใบสั่งงาน</span>
        </button>
      </div>
    </div>
  );
}
