'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Building,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Truck,
  Car,
} from 'lucide-react';
import { Supplier, Job } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useApp } from '@/context/AppContext';
import { getJobTotalCost } from '@/lib/job-utils';

export interface SupplierDetailDrawerProps {
  supplier: Supplier | null;
  jobs: Job[];
  onClose: () => void;
}

export function SupplierDetailDrawer({
  supplier,
  jobs,
  onClose,
}: SupplierDetailDrawerProps) {
  const router = useRouter();
  const theme = useTheme();
  const { currentRole, setCurrentSupplierId, setCurrentRole } = useApp();
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  if (!supplier) return null;

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const getMonogram = (name: string, code: string) => {
    if (code) {
      const parts = code.split('-');
      if (parts.length > 1) return parts[1].slice(0, 2).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const supplierJobs = jobs.filter(j => j.supplierId === supplier.id);
  const activeCount = supplierJobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)).length;
  const completedCount = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)).length;
  const totalBilled = supplierJobs.reduce((acc, j) => acc + getJobTotalCost(j), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full pointer-events-auto border-l border-gray-100 animate-slide-in-right">
          
          {/* Sticky Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm tracking-wider shadow-xs shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
              >
                {getMonogram(supplier.name, supplier.code)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    {supplier.name}
                  </h3>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238]">
                    {supplier.code}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  พาร์ทเนอร์ผู้ให้บริการ (Active Verified Partner)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="ปิด (Esc)"
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-xs">
            {/* Metrics Highlights */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10">
              <div>
                <span className="text-[11px] text-gray-500 font-medium">งานกำลังทำ:</span>
                <p className="text-xl font-black text-amber-600 mt-1">{activeCount} งาน</p>
              </div>
              <div className="border-x border-gray-200/80 px-3">
                <span className="text-[11px] text-gray-500 font-medium">ตรวจรับแล้ว:</span>
                <p className="text-xl font-black text-[#0f5238] mt-1">{completedCount} งาน</p>
              </div>
              <div className="pl-1">
                <span className="text-[11px] text-gray-500 font-medium">ยอดงานรวม:</span>
                <p className="text-xl font-black text-gray-900 mt-1">฿{totalBilled.toLocaleString()}</p>
              </div>
            </div>

            {/* Services Tags */}
            <div>
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                บริการที่ได้รับมอบหมาย
              </h4>
              <div className="flex items-center gap-2">
                {supplier.services.includes('CAR_WASH') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#0f5238] font-bold text-xs border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>บริการล้างรถ (Car Wash Service)</span>
                  </span>
                )}
                {supplier.services.includes('VEHICLE_SLIDE') && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>บริการรถสไลด์ขนส่ง (Vehicle Slide Service)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Corporate & Contact Details */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-gray-500" />
                <span>ข้อมูลนิติบุคคลและการติดต่อ</span>
              </h4>

              <div className="space-y-3 text-xs text-gray-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-500 block">ที่อยู่จดทะเบียน:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{supplier.address || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <span className="text-gray-500 block">เบอร์โทรศัพท์:</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} className="text-emerald-700 hover:underline">
                          {supplier.phone}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <span className="text-gray-500 block">อีเมลติดต่อ:</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {supplier.email ? (
                        <a href={`mailto:${supplier.email}`} className="text-emerald-700 hover:underline">
                          {supplier.email}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <span className="text-gray-500 block">เลขประจำตัวผู้เสียภาษี (Tax ID):</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{supplier.taxId || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank / Payout Information */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                <span>ข้อมูลการเงินและการโอนเงิน (Bank Account)</span>
              </h4>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">ธนาคาร:</span>
                  <span className="font-bold text-gray-900">{supplier.bankName || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">เลขที่บัญชี:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#0f5238]">{supplier.bankAccount || '-'}</span>
                    {supplier.bankAccount && (
                      <button
                        type="button"
                        onClick={() => handleCopy(supplier.bankAccount || '', 'drawer')}
                        className="p-1 rounded text-gray-400 hover:text-emerald-700"
                        title="คัดลอกเลขบัญชี"
                      >
                        {copiedAccount === 'drawer' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">ชื่อบัญชี:</span>
                  <span className="font-bold text-gray-900">{supplier.name}</span>
                </div>
              </div>
            </div>

            {/* Standard Pricing Table */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-gray-500" />
                <span>อัตราค่าบริการมาตรฐาน (Standard Rates)</span>
              </h4>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600">ล้างทำความสะอาดทั่วไป (Standard Wash)</span>
                  <span className="font-mono font-bold text-gray-900">฿350 / คัน</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600">ล้างดูดฝุ่นเชิงลึก (Deep Clean Wash)</span>
                  <span className="font-mono font-bold text-gray-900">฿550 / คัน</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600">ค่าบริการสไลด์เริ่มต้น (0-15 กม.)</span>
                  <span className="font-mono font-bold text-gray-900">฿1,500</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600">ค่าสไลด์ส่วนเพิ่มเกิน 15 กม.</span>
                  <span className="font-mono font-bold text-gray-900">+฿40 / กม.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
            {currentRole === 'MASTER' ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentSupplierId(supplier.id);
                  setCurrentRole('SUPPLIER');
                  router.push('/vendor');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0f5238] hover:underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                <span>เข้าสู่หน้า Vendor Portal &rarr;</span>
              </button>
            ) : (
              <a
                href={`/jobs?supplierId=${supplier.id}`}
                className="text-xs font-bold text-[#0f5238] hover:underline"
              >
                เปิดตารางงานของเจ้านี้ &rarr;
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28] transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierDetailDrawer;
