'use client';

import React from 'react';
import Link from 'next/link';
import { Supplier } from '@/types';
import { Monitor, Phone, Mail, MapPin, Building, CreditCard, CheckCircle2 } from 'lucide-react';

interface ProfileTabProps {
  supplier: Supplier;
  suppliersList: Supplier[];
  currentRole?: string;
  onSwitchSupplier: (id: string) => void;
  onSwitchRole?: (role: 'ADMIN' | 'BRANCH') => void;
  onSwitchToDesktop?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  supplier,
  suppliersList,
  currentRole = 'SUPPLIER',
  onSwitchSupplier,
  onSwitchRole,
  onSwitchToDesktop,
}) => {
  const initials = supplier.name
    ? supplier.name.slice(0, 2).toUpperCase()
    : 'SP';

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-xs text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0f5b44] to-emerald-400 text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md font-mono">
          {initials}
        </div>
        <h2 className="text-base font-bold text-slate-900">{supplier.name}</h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>บทบาท: คู่ค้า Supplier (โหมดมือถือ)</span>
        </div>

        <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] text-gray-600 text-left mt-2">
          <div className="flex items-center gap-1.5 truncate">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{supplier.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{supplier.email || '-'}</span>
          </div>
          {supplier.bankName && (
            <div className="flex items-center gap-1.5 col-span-2 text-slate-700 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{supplier.bankName} {supplier.bankAccount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Switch Supplier Selection for Testing */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-2">
        <label className="text-xs font-bold text-gray-700 block">
          สลับคู่ค้า Supplier (สำหรับทดสอบระบบ):
        </label>
        <select
          value={supplier.id}
          onChange={(e) => onSwitchSupplier(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:ring-2 focus:ring-[#0f5b44]"
        >
          {suppliersList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      {/* Role Switcher & Navigation to Desktop View */}
      <div className="p-4 bg-[#f2faf5] rounded-2xl border border-emerald-200/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Monitor className="w-4 h-4 text-[#0f5b44]" />
          <span>สลับไปยังมุมมอง Desktop Portal</span>
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          หากต้องการกลับไปยังหน้าจอระบบ Desktop เต็มรูปแบบ ให้เลือกสิทธิ์ที่ต้องการสลับ:
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSwitchRole ? onSwitchRole('ADMIN') : onSwitchToDesktop?.()}
            className="py-2.5 px-3 rounded-xl bg-[#0f5b44] hover:bg-[#00422f] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors shadow-xs"
          >
            <span className="text-[11px]">สลับเป็น Admin</span>
            <span className="text-[9px] text-emerald-200 font-normal">จัดการทุกส่วนกลาง</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchRole ? onSwitchRole('BRANCH') : onSwitchToDesktop?.()}
            className="py-2.5 px-3 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-[#0f5b44] font-bold text-xs flex flex-col items-center justify-center gap-1 transition-colors shadow-xs"
          >
            <span className="text-[11px]">สลับเป็น Branch</span>
            <span className="text-[9px] text-gray-500 font-normal">เจ้าหน้าที่ประจำสาขา</span>
          </button>
        </div>
      </div>
    </div>
  );
};
