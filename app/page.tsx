'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Truck, 
  Building2, 
  ArrowRight,
  TrendingUp,
  Receipt,
  Car,
  Eye,
  Filter
} from 'lucide-react';

export default function DashboardPage() {
  const { 
    currentRole,
    currentCompany,
    setCurrentCompany,
    filteredJobs,
    jobs,
    invoices,
    vehicles,
    activeBranch,
  } = useApp();

  // Metrics calculations
  const totalJobsCount = filteredJobs.length;
  const pendingSupplierJobs = filteredJobs.filter(j => j.status === 'PENDING_SUPPLIER');
  const inProgressJobs = filteredJobs.filter(j => j.status === 'IN_PROGRESS');
  const waitingApprovalJobs = filteredJobs.filter(j => j.status === 'WAITING_APPROVAL');
  const approvedJobs = filteredJobs.filter(j => j.status === 'APPROVED');
  const rejectedJobs = filteredJobs.filter(j => j.status === 'REJECTED');
  const invoicedJobs = filteredJobs.filter(j => j.status === 'INVOICED');

  // Amount calculation
  const approvedAmount = approvedJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);
  const invoicedAmount = invoicedJobs.reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

  // EV7 vs GI breakdown
  const ev7Jobs = jobs.filter(j => j.companyCode === 'EV7');
  const giJobs = jobs.filter(j => j.companyCode === 'GI');

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Control Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
              ภาพรวมระบบจัดการงานซัพพลายเออร์
            </h1>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0f5238] text-xs font-bold">
              VendorOps Central Hub
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
            <span>ข้อมูลประจำวัน: {formatThaiDate(new Date())}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            <span>
              {currentRole === 'ADMIN' && 'โหมดภาพรวมทุกสาขา (Central Admin)'}
              {currentRole === 'BRANCH' && `สาขา: ${activeBranch?.name}`}
              {currentRole === 'SUPPLIER' && 'โหมดคู่ค้าซัพพลายเออร์'}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Multi-Company Selector Pill */}
          <div className="flex items-center bg-white p-1 rounded-full border border-emerald-950/10 shadow-xs">
            {(['ALL', 'EV7', 'GI'] as const).map(comp => (
              <button
                key={comp}
                onClick={() => setCurrentCompany(comp)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  currentCompany === comp
                    ? 'bg-[#0f5238] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {comp === 'ALL' ? 'ทุกบริษัท' : comp}
              </button>
            ))}
          </div>

          {/* Quick Create Buttons */}
          {currentRole !== 'SUPPLIER' && (
            <>
              <Link
                href="/jobs/create-car-wash"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ สั่งล้างรถ</span>
              </Link>
              <Link
                href="/jobs/create-vehicle-slide"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-all shadow-xs"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>+ ขอรถสไลด์</span>
              </Link>
            </>
          )}

          {currentRole === 'SUPPLIER' && (
            <Link
              href="/invoices"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-all shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>+ ออกใบวางบิล</span>
            </Link>
          )}
        </div>
      </div>

      {/* 6 Key Metrics KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. งานทั้งหมด */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">งานทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900">{totalJobsCount}</span>
              <span className="text-xs text-gray-500 font-medium">รายการ</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>ระบบอัปเดตเรียลไทม์</span>
            </p>
          </div>
        </div>

        {/* 2. รอ Supplier รับงาน */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">รอ Supplier ทำ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900">{pendingSupplierJobs.length}</span>
              <span className="text-xs text-gray-500 font-medium">งาน</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">
                ล้าง {pendingSupplierJobs.filter(j => j.jobType === 'CAR_WASH').length}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 font-medium">
                สไลด์ {pendingSupplierJobs.filter(j => j.jobType === 'VEHICLE_SLIDE').length}
              </span>
            </div>
          </div>
        </div>

        {/* 3. รอสาขาตรวจรับ (Urgent Highlight) */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-300 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">รอสาขาตรวจรับ</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold animate-pulse">
              ด่วน
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-amber-950">{waitingApprovalJobs.length}</span>
              <span className="text-xs text-amber-800 font-medium">งาน</span>
            </div>
            <Link
              href="/approvals"
              className="inline-flex items-center gap-1 text-[11px] text-amber-900 font-semibold mt-1 hover:underline"
            >
              <span>ส่งรูปหลักฐานแล้ว ตรวจสอบ &gt;</span>
            </Link>
          </div>
        </div>

        {/* 4. งานที่ขอแก้ไข (Reject) */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">งานขอแก้ไข</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-red-600">{rejectedJobs.length}</span>
              <span className="text-xs text-gray-500 font-medium">งาน</span>
            </div>
            <p className="text-[11px] text-red-700 mt-1 font-medium">
              รอช่างแก้ไขเก็บงานซ้ำ
            </p>
          </div>
        </div>

        {/* 5. Approved พร้อมวางบิล */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">พร้อมวางบิล</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-[#0f5238]">{approvedJobs.length}</span>
              <span className="text-xs text-gray-500 font-medium">งาน</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              ฿{approvedAmount.toLocaleString()} ประเมินแล้ว
            </p>
          </div>
        </div>

        {/* 6. วางบิลแล้ว (Pending Payment) */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">วางบิลแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900">{invoicedJobs.length}</span>
              <span className="text-xs text-gray-500 font-medium">งาน</span>
            </div>
            <p className="text-[11px] text-gray-600 font-medium mt-1">
              ฿{invoicedAmount.toLocaleString()} ในใบแจ้งหนี้
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Pipeline Progress Bar */}
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
            Flow: สั่งงาน → ปฏิบัติงาน → ตรวจรับ → วางบิล
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Step 1: สั่งงานแล้ว */}
          <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">01 • DISPATCHED</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingSupplierJobs.length}</p>
              <p className="text-xs text-gray-600 font-medium">มอบหมายแล้ว</p>
            </div>
          </div>

          {/* Step 2: กำลังทำงาน */}
          <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">02 • IN PROGRESS</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inProgressJobs.length}</p>
              <p className="text-xs text-gray-600 font-medium">กำลังดำเนินการ</p>
            </div>
          </div>

          {/* Step 3: ส่งงานรอตรวจ */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800">03 • REVIEW</span>
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-950">{waitingApprovalJobs.length}</p>
              <p className="text-xs text-amber-900 font-bold">รอสาขาตรวจรับ</p>
            </div>
          </div>

          {/* Step 4: อนุมัติผ่าน */}
          <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">04 • APPROVED</span>
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f5238]">{approvedJobs.length}</p>
              <p className="text-xs text-gray-600 font-medium">พร้อมวางบิล</p>
            </div>
          </div>

          {/* Step 5: วางบิลแล้ว */}
          <div className="p-4 rounded-xl bg-[#f4f9f5] border border-emerald-950/5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">05 • INVOICED</span>
              <span className="w-2 h-2 rounded-full bg-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{invoicedJobs.length}</p>
              <p className="text-xs text-gray-600 font-medium">ออก Invoice แล้ว</p>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Waiting for Approval Preview Section */}
      {waitingApprovalJobs.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  รายการที่รอการตรวจรับจากสาขา ({waitingApprovalJobs.length} งาน)
                </h3>
                <p className="text-xs text-gray-500">
                  Supplier แนบรูปถ่ายหลักฐานก่อน-หลังเสร็จสิ้นแล้ว กรุณาตรวจสอบความสะอาดและความเรียบร้อย
                </p>
              </div>
            </div>
            <Link
              href="/approvals"
              className="text-xs font-bold text-[#0f5238] bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200 transition-colors"
            >
              ไปหน้าตรวจรับทั้งหมด &gt;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
            {waitingApprovalJobs.slice(0, 3).map(job => (
              <div
                key={job.id}
                className="p-4 rounded-xl bg-[#fbfdfc] border border-emerald-950/10 flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0f5238] text-[10px] font-bold">
                      {job.jobType === 'CAR_WASH' ? 'Car Wash' : 'Vehicle Slide'}
                    </span>
                    <span className="text-[11px] font-bold text-gray-600">{job.jobNumber}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-2">
                    {job.branchName}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    โดย: <span className="font-semibold">{job.supplierName}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {job.jobType === 'CAR_WASH'
                      ? `จำนวน ${job.carWashItems?.length || 0} คัน`
                      : `VIN: ${job.vin} (${job.destBranchName})`}
                  </p>
                </div>

                {job.evidences.length > 0 && (
                  <div className="flex items-center gap-2 overflow-hidden py-1">
                    {job.evidences.slice(0, 2).map((evi, i) => (
                      <div key={i} className="relative w-16 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={evi.photoUrl} alt={evi.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <span className="text-[11px] text-gray-500 font-medium">
                      +{job.evidences.length} รูปหลักฐาน
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs font-bold text-[#0f5238]">
                    ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                  </span>
                  <Link
                    href={`/approvals?jobId=${job.id}`}
                    className="px-3 py-1 rounded-full bg-[#0f5238] text-white text-xs font-semibold hover:bg-[#0a3d28] transition-colors"
                  >
                    ตรวจรับงาน
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Jobs Table */}
      <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">รายการงานสั่งการล่าสุด</h3>
            <p className="text-xs text-gray-500">ติดตามสถานะความคืบหน้าระหว่างสาขาและคู่ค้า</p>
          </div>
          <Link
            href="/jobs"
            className="text-xs font-bold text-[#0f5238] hover:underline flex items-center gap-1"
          >
            <span>ดูงานทั้งหมด ({filteredJobs.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-3">Job Number</th>
                <th className="py-3 px-3">ประเภทงาน</th>
                <th className="py-3 px-3">บริษัท / สาขา</th>
                <th className="py-3 px-3">Supplier คู่ค้า</th>
                <th className="py-3 px-3">รายละเอียด / VIN</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-3 text-right">ค่าบริการ</th>
                <th className="py-3 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {filteredJobs.slice(0, 6).map(job => {
                const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
                  PENDING_SUPPLIER: { label: 'รอ Supplier', bg: 'bg-blue-100', text: 'text-blue-800' },
                  IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-100', text: 'text-amber-800' },
                  WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-amber-200', text: 'text-amber-900 font-bold' },
                  APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-100', text: 'text-emerald-900 font-bold' },
                  REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-100', text: 'text-red-800 font-bold' },
                  INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-100', text: 'text-purple-800' },
                  CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-100', text: 'text-gray-600' },
                };

                const currentStatus = statusStyles[job.status] || { label: job.status, bg: 'bg-gray-100', text: 'text-gray-700' };

                return (
                  <tr key={job.id} className="hover:bg-[#fbfdfc] transition-colors">
                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                      {job.jobNumber}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        {job.jobType === 'CAR_WASH' ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Car Wash</span>
                          </>
                        ) : (
                          <>
                            <Truck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Vehicle Slide</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 mr-1.5">
                          {job.companyCode}
                        </span>
                        <span className="text-gray-800 font-medium">{job.branchName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-700 font-medium whitespace-nowrap">
                      {job.supplierName}
                    </td>
                    <td className="py-3 px-3">
                      {job.jobType === 'CAR_WASH' ? (
                        <span className="text-gray-600">
                          {job.carWashItems?.length || 0} คัน ({job.carWashItems?.[0]?.vin.slice(-6)}...)
                        </span>
                      ) : (
                        <span className="text-gray-600 font-mono text-[11px]">
                          {job.vin} &rarr; {job.destBranchName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] ${currentStatus.bg} ${currentStatus.text}`}>
                        {currentStatus.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <Link
                        href={`/jobs?jobId=${job.id}`}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#0f5238] hover:bg-emerald-50 transition-colors inline-block"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Company Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EV7 Summary Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#eaf5ee] border border-emerald-950/10 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-bold text-xs">
                  EV7
                </span>
                <h4 className="text-base font-bold text-gray-900">บริษัท อีวี เซเว่น จำกัด</h4>
              </div>
              <span className="text-xs text-gray-500">3 สาขา</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              รถในสต็อกทั้งหมด {vehicles.filter(v => v.companyCode === 'EV7').length} คัน • งานทั้งหมด {ev7Jobs.length} งาน
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-emerald-950/10">
            <span className="text-xs text-gray-600">พร้อมวางบิล:</span>
            <span className="text-sm font-bold text-[#0f5238]">
              {ev7Jobs.filter(j => j.status === 'APPROVED').length} งาน
            </span>
          </div>
        </div>

        {/* GI Summary Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#eef7ff] border border-blue-900/10 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-700 text-white font-bold text-xs">
                  GI Fleet
                </span>
                <h4 className="text-base font-bold text-gray-900">บริษัท เจเนอรัล อินเทลลิเจนท์ จำกัด</h4>
              </div>
              <span className="text-xs text-gray-500">2 Hubs</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              รถในสต็อกทั้งหมด {vehicles.filter(v => v.companyCode === 'GI').length} คัน • งานทั้งหมด {giJobs.length} งาน
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-blue-900/10">
            <span className="text-xs text-gray-600">พร้อมวางบิล:</span>
            <span className="text-sm font-bold text-blue-900">
              {giJobs.filter(j => j.status === 'APPROVED').length} งาน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
