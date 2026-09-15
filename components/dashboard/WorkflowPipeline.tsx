'use client';

import React from 'react';

interface WorkflowPipelineProps {
  pendingSupplierCount: number;
  inProgressCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  invoicedCount: number;
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  pendingSupplierCount,
  inProgressCount,
  waitingApprovalCount,
  approvedCount,
  invoicedCount,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            ขั้นตอนกระบวนการปฏิบัติงาน (Workflow Pipeline)
          </h2>
          <p className="text-xs text-gray-500">
            สถานะงานซัพพลายเออร์ที่อยู่ระหว่างหมุนเวียนในระบบ ณ ขณะนี้
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Flow: สั่งงาน ➔ ปฏิบัติงาน ➔ ตรวจรับ ➔ วางบิล
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Step 1: สั่งงานแล้ว */}
        <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono">01 • DISPATCHED</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-mono">{pendingSupplierCount}</p>
            <p className="text-xs text-gray-600 font-medium">มอบหมายแล้ว</p>
          </div>
        </div>

        {/* Step 2: กำลังทำงาน */}
        <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono">02 • IN PROGRESS</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-mono">{inProgressCount}</p>
            <p className="text-xs text-gray-600 font-medium">กำลังดำเนินการ</p>
          </div>
        </div>

        {/* Step 3: ส่งงานรอตรวจ */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 font-mono">03 • REVIEW</span>
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-950 font-mono">{waitingApprovalCount}</p>
            <p className="text-xs text-amber-900 font-bold">รอสาขาตรวจรับ</p>
          </div>
        </div>

        {/* Step 4: อนุมัติผ่าน */}
        <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono">04 • APPROVED</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0f5238] font-mono">{approvedCount}</p>
            <p className="text-xs text-gray-600 font-medium">พร้อมวางบิล</p>
          </div>
        </div>

        {/* Step 5: วางบิลแล้ว */}
        <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 font-mono">05 • INVOICED</span>
            <span className="w-2 h-2 rounded-full bg-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-mono">{invoicedCount}</p>
            <p className="text-xs text-gray-600 font-medium">ออก Invoice แล้ว</p>
          </div>
        </div>
      </div>
    </div>
  );
};
