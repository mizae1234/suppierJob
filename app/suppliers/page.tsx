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

      {/* Supplier Details Slide-Over Drawer */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed Backdrop */}
          <div 
            onClick={() => setSelectedSupplier(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full pointer-events-auto border-l border-gray-100 animate-slide-in-right">
              
              {/* Sticky Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238]">
                    {selectedSupplier.code}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedSupplier.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  title="ปิด (Esc)"
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-xs">
                {/* Metrics Highlights */}
                {(() => {
                  const supplierJobs = jobs.filter(j => j.supplierId === selectedSupplier.id);
                  const activeCount = supplierJobs.filter(j => ['IN_PROGRESS', 'WAITING_APPROVAL'].includes(j.status)).length;
                  const completedCount = supplierJobs.filter(j => ['APPROVED', 'INVOICED'].includes(j.status)).length;
                  const totalBilled = supplierJobs.reduce((acc, j) => acc + (j.actualCost || j.estimatedCost), 0);

                  return (
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10">
                      <div>
                        <span className="text-[11px] text-gray-500">งานที่กำลังทำ:</span>
                        <p className="text-lg font-bold text-amber-600 mt-0.5">{activeCount} งาน</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500">เสร็จสิ้นแล้ว:</span>
                        <p className="text-lg font-bold text-[#0f5238] mt-0.5">{completedCount} งาน</p>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500">ยอดงานรวม:</span>
                        <p className="text-lg font-bold text-gray-900 mt-0.5">฿{totalBilled.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Company & Contact Details */}
                <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-500" />
                    <span>ข้อมูลนิติบุคคลและการติดต่อ</span>
                  </h4>

                  <div className="space-y-2.5 text-xs text-gray-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-500">ที่อยู่จดทะเบียน:</span>
                        <p className="font-medium text-gray-900">{selectedSupplier.address || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500">เบอร์โทรศัพท์:</span>
                        <p className="font-medium text-gray-900">
                          {selectedSupplier.phone ? (
                            <a href={`tel:${selectedSupplier.phone}`} className="text-emerald-700 hover:underline">
                              {selectedSupplier.phone}
                            </a>
                          ) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500">อีเมลติดต่อ:</span>
                        <p className="font-medium text-gray-900">
                          {selectedSupplier.email ? (
                            <a href={`mailto:${selectedSupplier.email}`} className="text-emerald-700 hover:underline">
                              {selectedSupplier.email}
                            </a>
                          ) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="text-gray-500">เลขประจำตัวผู้เสียภาษี (Tax ID):</span>
                        <p className="font-mono font-medium text-gray-900">{selectedSupplier.taxId || '-'}</p>
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

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ธนาคาร:</span>
                      <span className="font-bold text-gray-900">{selectedSupplier.bankName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">เลขที่บัญชี:</span>
                      <span className="font-mono font-bold text-[#0f5238]">{selectedSupplier.bankAccount || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ชื่อบัญชี:</span>
                      <span className="font-medium text-gray-800">{selectedSupplier.name}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Jobs by this Supplier */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      รายการงานล่าสุดของ Supplier นี้
                    </h4>
                    <a 
                      href={`/jobs?supplierId=${selectedSupplier.id}`}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      ดูงานทั้งหมด &rarr;
                    </a>
                  </div>

                  {(() => {
                    const recentJobs = jobs.filter(j => j.supplierId === selectedSupplier.id).slice(0, 4);
                    if (recentJobs.length === 0) {
                      return (
                        <p className="text-gray-400 text-xs italic py-2 text-center">ยังไม่มีงานที่มอบหมาย</p>
                      );
                    }
                    return (
                      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        {recentJobs.map(job => (
                          <div key={job.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                            <div>
                              <span className="font-mono font-bold text-gray-900">{job.jobNumber}</span>
                              <p className="text-[11px] text-gray-500 mt-0.5">{job.jobType} • {job.branchName}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#0f5238]">
                                ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-0.5">{job.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center justify-between shrink-0 shadow-xs">
                <a
                  href={`/jobs?supplierId=${selectedSupplier.id}`}
                  className="text-xs font-bold text-[#0f5238] hover:underline"
                >
                  เปิดตารางงานของเจ้านี้ &rarr;
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28] transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
