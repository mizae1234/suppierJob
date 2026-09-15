'use client';

import React from 'react';
import { Job } from '@/types';
import { 
  X, 
  Sparkles, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { formatThaiDateTime } from '@/lib/date-utils';

interface JobDetailDrawerProps {
  job: Job;
  onClose: () => void;
  onOpenSubmit?: () => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  job,
  onClose,
  onOpenSubmit
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0f5b44] flex items-center justify-center">
              {job.jobType === 'CAR_WASH' ? <Sparkles className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {job.jobType === 'CAR_WASH' ? 'รายละเอียดงานล้างรถ' : 'รายละเอียดงานรถสไลด์'}
              </h3>
              <p className="text-[11px] text-gray-500 font-mono font-bold">{job.jobNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="font-semibold text-gray-500">สถานะปัจจุบัน</span>
            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
              job.status === 'WAITING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
              job.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
              job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
              job.status === 'INVOICED' ? 'bg-purple-100 text-purple-800' :
              'bg-gray-100 text-gray-700'
            }`}>
              {job.status === 'PENDING_SUPPLIER' && 'รอรับงาน'}
              {job.status === 'IN_PROGRESS' && 'กำลังปฏิบัติงาน'}
              {job.status === 'WAITING_APPROVAL' && 'รอตรวจรับงาน'}
              {job.status === 'APPROVED' && 'อนุมัติเรียบร้อย'}
              {job.status === 'REJECTED' && 'ขอให้แก้ไข'}
              {job.status === 'INVOICED' && 'วางบิลแล้ว'}
            </span>
          </div>

          {/* Vehicle Information */}
          <div className="p-3.5 rounded-2xl bg-[#f2faf5] border border-emerald-100/80 space-y-2">
            <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">ข้อมูลยานพาหนะ</p>
            {job.jobType === 'VEHICLE_SLIDE' ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{job.vehicle?.model || 'ไม่ระบุรุ่น'}</p>
                <p className="font-mono text-xs text-slate-700 font-semibold">{job.vin || '-'}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-1">
                  <span>สี: {job.vehicle?.color || '-'}</span>
                  <span>ทะเบียน: {job.vehicle?.licensePlate || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-800 font-semibold">รายการรถที่สั่งล้าง ({job.carWashItems?.length || 0} คัน):</p>
                {job.carWashItems?.map((item, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-xl border border-emerald-100 text-[11px]">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{item.vehicleModel || 'รถยนต์'} ({item.vehicleColor || '-'})</span>
                      <span className="text-[#0f5b44]">฿{item.unitPrice.toLocaleString()}</span>
                    </div>
                    <div className="font-mono text-gray-500 text-[10px] mt-0.5">{item.vin}</div>
                    <div className="text-gray-500 mt-0.5">ประเภท: {item.washType} • วันที่: {item.actualWashDate}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide Route Details (if Slide) */}
          {job.jobType === 'VEHICLE_SLIDE' && (
            <div className="p-3.5 rounded-2xl bg-white border border-gray-200 space-y-2.5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">เส้นทางขนส่ง</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 text-[10px] block">ต้นทาง</span>
                    <span className="font-semibold text-slate-800">{job.originBranchName || job.branchName}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 text-[10px] block">ปลายทาง</span>
                    <span className="font-semibold text-slate-800">{job.destBranchName || '-'}</span>
                  </div>
                </div>
              </div>

              {(job.contactPerson || job.contactPhone) && (
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {job.contactPerson || '-'}
                  </span>
                  {job.contactPhone && (
                    <a href={`tel:${job.contactPhone}`} className="text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                      <Phone className="w-3.5 h-3.5" /> {job.contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pricing & Dates */}
          <div className="p-3.5 rounded-2xl bg-white border border-gray-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">ค่าบริการสุทธิ:</span>
              <span className="text-base font-bold text-[#0f5b44]">
                ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-500 pt-2 border-t border-gray-100">
              <span>สร้างเมื่อ:</span>
              <span>{formatThaiDateTime(job.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            ปิด
          </button>
          {onOpenSubmit && (job.status === 'IN_PROGRESS' || job.status === 'PENDING_SUPPLIER' || job.status === 'REJECTED') && (
            <button
              onClick={() => {
                onClose();
                onOpenSubmit();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0f5b44] hover:bg-[#00422f] text-white text-xs font-bold shadow-md shadow-emerald-900/20"
            >
              ถ่ายรูปส่งงาน
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
