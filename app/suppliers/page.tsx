'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Supplier } from '@/types';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Truck, 
  Plus, 
  X,
  FileText,
  Building
} from 'lucide-react';

export default function SupplierManagementPage() {
  const { suppliers, jobs } = useApp();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-600" />
            <span>จัดการรายชื่อซัพพลายเออร์ (Supplier Management)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            บริหารคู่ค้าผู้ให้บริการล้างรถ ขนส่งรถสไลด์ ข้อมูลสัญญา และข้อมูลบัญชีเพื่อการวางบิล
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-[#0f5238]">
            ลงทะเบียนแล้ว {suppliers.length} ราย
          </span>
        </div>
      </div>

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(supplier => {
          const supplierJobs = jobs.filter(j => j.supplierId === supplier.id);
          const activeJobs = supplierJobs.filter(j => ['PENDING_SUPPLIER', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status));
          const completedJobs = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status));

          return (
            <div
              key={supplier.id}
              className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gray-500">{supplier.code}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-[10px]">
                    Active Partner
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 mt-2">
                  {supplier.name}
                </h3>
                {supplier.taxId && (
                  <p className="text-[11px] text-gray-400 mt-0.5">เลขประจำตัวผู้เสียภาษี: {supplier.taxId}</p>
                )}

                {/* Services Provided Badges */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {supplier.services.includes('CAR_WASH') && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#0f5238] font-bold text-[11px] border border-emerald-200">
                      <Sparkles className="w-3 h-3" />
                      <span>ล้างรถ (Car Wash)</span>
                    </span>
                  )}
                  {supplier.services.includes('VEHICLE_SLIDE') && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                      <Truck className="w-3 h-3" />
                      <span>รถสไลด์ (Slide)</span>
                    </span>
                  )}
                </div>

                {/* Contact & Banking Info */}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  {supplier.bankName && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{supplier.bankName}: {supplier.bankAccount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 text-[11px]">งานที่กำลังทำ:</span>
                  <p className="font-bold text-amber-600">{activeJobs.length} งาน</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px]">เสร็จสิ้นแล้ว:</span>
                  <p className="font-bold text-[#0f5238]">{completedJobs.length} งาน</p>
                </div>
                <div>
                  <button
                    onClick={() => setSelectedSupplier(supplier)}
                    className="px-3 py-1.5 rounded-xl bg-[#f4f9f5] hover:bg-emerald-100 text-[#0f5238] font-bold transition-colors text-xs"
                  >
                    รายละเอียด
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Supplier Details Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gray-400">{selectedSupplier.code}</span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{selectedSupplier.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2.5">
              <p><strong>ที่อยู่จดทะเบียน:</strong> {selectedSupplier.address || '-'}</p>
              <p><strong>ผู้ประสานงานหลัก:</strong> {selectedSupplier.phone} ({selectedSupplier.email})</p>
              <p><strong>เลขภาษี (Tax ID):</strong> {selectedSupplier.taxId || '-'}</p>
              <p><strong>ข้อมูลโอนเงิน:</strong> {selectedSupplier.bankName} เลขบัญชี {selectedSupplier.bankAccount}</p>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedSupplier(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
