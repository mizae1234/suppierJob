'use client';

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Phone,
  Truck,
  XCircle,
} from 'lucide-react';
import { Job, Vehicle } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { formatThaiDateTime } from '@/lib/date-utils';
import { isFailedAttemptJob, SLIDE_FAILED_ATTEMPT_FEE } from '@/lib/slide-failed-attempt';
import { getD365WarehouseForBranch, getD365WarehouseName } from '@/lib/d365/warehouses';
import { ManualPricingNotice } from '../ManualPricingNotice';

interface SlideRouteCardProps {
  job: Job;
  vehicles: Vehicle[];
  theme: ThemeColors;
  copiedText: string | null;
  onCopyText: (text: string) => void;
}

export function SlideRouteCard({
  job,
  vehicles,
  theme,
  copiedText,
  onCopyText,
}: SlideRouteCardProps) {
  if (job.jobType !== 'VEHICLE_SLIDE') return null;

  const slideVehicle = vehicles.find((v) => v.vin === job.vin) || job.vehicle;
  const vModel = slideVehicle?.model || job.vehicle?.model || 'ไม่ระบุรุ่น';
  const vColor = slideVehicle?.color || job.vehicle?.color || '';
  const vPlate = slideVehicle?.licensePlate || job.vehicle?.licensePlate || '';
  const vType = slideVehicle?.vehicleType || job.vehicle?.vehicleType || '';
  const isCancelled = job.status === 'CANCELLED';
  const isRejected = job.status === 'REJECTED';
  const isApproved = ['APPROVED', 'INVOICED'].includes(job.status);
  const isWaiting = job.status === 'WAITING_APPROVAL';
  const isInProgress = job.status === 'IN_PROGRESS';
  const isPending = job.status === 'PENDING_SUPPLIER';

  // ค้นหารหัสคลังต้นทาง (Origin Warehouse) และคลังปลายทาง (Destination Warehouse)
  const resolvedDestWarehouseId =
    (job.destBranchId || job.destBranchCode) && !job.customDestAddress
      ? job.destWarehouseId || getD365WarehouseForBranch(job.destBranchCode) || null
      : null;
  const resolvedDestWarehouseName = getD365WarehouseName(resolvedDestWarehouseId);

  const resolvedOriginWarehouseId = (() => {
    // 1) ดึงจากประวัติการโอนคลัง D365 ใน Timeline (กรณีอนุมัติแล้ว)
    for (const act of job.activities || []) {
      if (
        (act.action === 'D365_TRANSFER_SUCCESS' || act.action === 'D365_TRANSFER_FAILED') &&
        act.metadata
      ) {
        try {
          const parsed = JSON.parse(act.metadata) as {
            fromWarehouses?: string[];
            details?: Array<{ fromWarehouse?: string }>;
          };
          const fromWh = parsed.fromWarehouses?.[0] || parsed.details?.[0]?.fromWarehouse;
          if (fromWh?.trim()) return fromWh.trim();
        } catch {
          // ignore malformed metadata
        }
      }
      if (act.action === 'JOB_CREATED' && act.metadata) {
        try {
          const parsed = JSON.parse(act.metadata) as { originWarehouseId?: string };
          if (parsed.originWarehouseId?.trim()) return parsed.originWarehouseId.trim();
        } catch {
          // ignore
        }
      }
    }
    // 2) กรณีใบงานยังไม่อนุมัติ ใช้คลังปัจจุบันของรถในใบงาน
    if (!isApproved) {
      const currentVehWh =
        slideVehicle?.d365WarehouseId ||
        job.vehicle?.d365WarehouseId ||
        job.carWashItems?.[0]?.vehicleWarehouseId;
      if (currentVehWh?.trim()) return currentVehWh.trim();
    }
    // 3) Fallback ใช้คลังหลักของสาขาจุดรับรถต้นทาง
    return getD365WarehouseForBranch(job.pickupBranchCode || job.branchCode) || null;
  })();
  const resolvedOriginWarehouseName = getD365WarehouseName(resolvedOriginWarehouseId);

  return (
    <div className="space-y-4">
      {/* ── เที่ยวเปล่า (สไลด์ไม่สำเร็จ) ── */}
      {isFailedAttemptJob(job) && (
        <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50 text-xs text-orange-950 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 font-bold text-orange-900">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
              <span>เที่ยวเปล่า — Supplier มาถึงหน้างานแต่สไลด์รถไม่สำเร็จ</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white border border-orange-300 font-mono font-black text-orange-700">
              ฿{SLIDE_FAILED_ATTEMPT_FEE.toLocaleString()} / ใบงาน
            </span>
          </div>
          <p className="whitespace-pre-line">
            <span className="text-orange-700/80 mr-1">หมายเหตุจาก Supplier:</span>
            <b>{job.failNote || '-'}</b>
          </p>
          <p className="text-[11px] text-orange-800/80">
            {isApproved
              ? `อนุมัติแล้ว — เปิด PO ${SLIDE_FAILED_ATTEMPT_FEE} บาท โดยรถยังอยู่ที่เดิม (ไม่ย้ายสาขา)`
              : `เมื่ออนุมัติ: เปิด PO ${SLIDE_FAILED_ATTEMPT_FEE} บาท • รถยังอยู่ที่เดิม (ไม่ย้ายสาขา / ไม่โอนคลังใน D365)`}
          </p>
        </div>
      )}

      {/* ── ค่าบริการกรอกเอง ── */}
      <ManualPricingNotice job={job} />

      {/* Vehicle Main Card with Status (Only for single vehicle slide without items) */}
      {(!job.carWashItems || job.carWashItems.length === 0) && (
        <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Car className="w-4 h-4" style={{ color: theme.iconColor }} />
              <span>ข้อมูลรถยนต์และสถานะงาน (1 คัน)</span>
            </h4>

            {/* Dynamic Status Badge */}
            {isApproved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>ตรวจรับเรียบร้อย</span>
              </span>
            )}
            {isWaiting && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>ส่งงานแล้ว • รอตรวจรับ</span>
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                <XCircle className="w-3 h-3 text-red-600" />
                <span>ปฏิเสธงาน (ยกเลิก)</span>
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span>ตีกลับขอแก้ไข</span>
              </span>
            )}
            {isInProgress && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                <Truck className="w-3 h-3 text-blue-600" />
                <span>กำลังขนส่ง</span>
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                <Clock className="w-3 h-3 text-gray-500" />
                <span>รอ Supplier รับงาน</span>
              </span>
            )}
          </div>

          {/* Vehicle Info Box */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isCancelled ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/80 border-gray-100'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCancelled ? 'bg-red-100 text-red-500' : 'bg-white shadow-2xs'
                }`}
                style={!isCancelled ? { color: theme.iconColor } : undefined}
              >
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-mono font-bold text-sm ${
                      isCancelled ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {job.vin || '-'}
                  </span>
                  {job.vin && (
                    <button
                      type="button"
                      onClick={() => onCopyText(job.vin!)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      title="คัดลอก VIN"
                    >
                      {copiedText === job.vin ? (
                        <CheckCheck className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {vPlate ? (
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        isCancelled
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-white text-gray-800 border border-gray-200 shadow-2xs'
                      }`}
                    >
                      {vPlate}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] text-gray-400 bg-gray-100">
                      ไม่มีป้ายทะเบียน
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-800">{vModel}</span>
                  {vColor && <span>• {vColor}</span>}
                  {vType && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-200/70 text-[10px] text-gray-600 font-medium">
                      {vType}
                    </span>
                  )}
                  {slideVehicle?.status && (
                    <span className="text-[10px] text-gray-400">
                      (สถานะรถ:{' '}
                      {slideVehicle.status === 'AVAILABLE'
                        ? 'พร้อมใช้งาน'
                        : slideVehicle.status === 'IN_TRANSIT'
                          ? 'กำลังขนส่ง'
                          : slideVehicle.status}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Cost on card */}
            <div className="text-right sm:shrink-0 self-end sm:self-center">
              <span className="text-[10px] text-gray-500 block">ค่าบริการ</span>
              <div className="flex items-baseline gap-1.5">
                {isCancelled ? (
                  <>
                    <span className="text-gray-400 text-xs font-mono">
                      ฿{(job.estimatedCost || 0).toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-red-600 font-mono">฿0</span>
                  </>
                ) : (
                  <span className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
                    ฿{(job.actualCost ?? job.estimatedCost ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
              {isCancelled && (
                <span className="text-[10px] text-red-500 font-medium block">ปฏิเสธงาน</span>
              )}
            </div>
          </div>

          {/* Detailed Status Result / Rejection / Completion Box */}
          {isCancelled && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>ข้อมูลการปฏิเสธงาน:</span>
              </div>
              <div className="pl-5 text-red-700 space-y-1">
                <p>
                  <span className="font-semibold">เหตุผล:</span>{' '}
                  {job.rejectReason || 'ไม่มีการระบุเหตุผล'}
                </p>
                <p className="text-[11px] text-red-500">
                  • สถานะถูกปรับเป็น &quot;ยกเลิก/ปฏิเสธงาน&quot; และไม่มีการคิดค่าบริการรถสไลด์
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ข้อมูลขอแก้ไขจากสาขา (ตีกลับ):</span>
              </div>
              <div className="pl-5 text-amber-700 space-y-1">
                <p>
                  <span className="font-semibold">ข้อความจากสาขา:</span>{' '}
                  {job.rejectReason || 'โปรดตรวจสอบและแก้ไขงาน'}
                </p>
                <p className="text-[11px] text-amber-600">
                  • Supplier สามารถแก้ไขและกดส่งงานใหม่ได้
                </p>
              </div>
            </div>
          )}

          {isApproved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ผ่านการตรวจรับมอบรถแล้ว</span>
                </div>
                {job.approvedAt && (
                  <span className="text-[10px] text-emerald-600">
                    อนุมัติเมื่อ: {formatThaiDateTime(job.approvedAt)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-700 text-[11px] mt-1">
                <div>
                  <span className="text-emerald-800 font-semibold">ผู้ตรวจรับอนุมัติ: </span>
                  <span>{job.approvedBy || job.branchName || '-'}</span>
                </div>
                {job.completedAt && (
                  <div>
                    <span className="text-emerald-800 font-semibold">เวลาส่งงานเสร็จ: </span>
                    <span>{formatThaiDateTime(job.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isWaiting && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Supplier ดำเนินการส่งมอบรถแล้ว (รอการตรวจรับ)</span>
                </div>
                {job.completedAt && (
                  <span className="text-[10px] text-amber-600">
                    ส่งงานเมื่อ: {formatThaiDateTime(job.completedAt)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-700">
                หลักฐานการขนส่งพร้อมให้สาขาตรวจสอบ ({job.evidenceCount ?? job.evidences.length} รูป)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Route & Transport Logistics Details */}
      <div className="p-4 rounded-2xl border border-gray-100 bg-white shadow-2xs space-y-4">
        <h4 className="font-bold text-gray-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
          <Truck className="w-4 h-4" style={{ color: theme.iconColor }} />
          <span>ข้อมูลเส้นทางและการขนส่งรถสไลด์</span>
        </h4>

        {/* Route Visualizer */}
        <div
          className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: theme.iconColor }} />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500">ต้นทาง (Origin):</span>
              <p className="font-bold text-gray-900">
                {job.pickupBranchName || job.customOriginAddress || '-'}
              </p>
              {resolvedOriginWarehouseId && (
                <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                  คลัง {resolvedOriginWarehouseId}
                  {resolvedOriginWarehouseName ? ` · ${resolvedOriginWarehouseName}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 px-2 shrink-0">
            {job.distance ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
                {job.distance} กม.
              </span>
            ) : null}
            <div className="flex items-center gap-1" style={{ color: theme.iconColor }}>
              <span
                className="border-b border-dashed w-8"
                style={{ borderColor: `${theme.primary}88` }}
              />
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-right min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500">ปลายทาง (Destination):</span>
              <p className="font-bold text-gray-900">
                {job.destBranchName || job.customDestAddress || '-'}
              </p>
              {resolvedDestWarehouseId && (
                <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                  คลัง {resolvedDestWarehouseId}
                  {resolvedDestWarehouseName ? ` · ${resolvedDestWarehouseName}` : ''}
                </p>
              )}
            </div>
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">Warehouse ต้นทาง (คลัง D365):</span>
            {resolvedOriginWarehouseId ? (
              <>
                <p className="font-mono font-bold text-gray-900 mt-0.5">
                  {resolvedOriginWarehouseId}
                </p>
                {resolvedOriginWarehouseName && (
                  <p
                    className="text-[11px] text-gray-500 mt-0.5 truncate"
                    title={resolvedOriginWarehouseName}
                  >
                    {resolvedOriginWarehouseName}
                  </p>
                )}
              </>
            ) : (
              <p className="font-bold text-gray-400 mt-0.5">-</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">Warehouse ปลายทาง (คลัง D365):</span>
            {resolvedDestWarehouseId ? (
              <>
                <p className="font-mono font-bold text-gray-900 mt-0.5">
                  {resolvedDestWarehouseId}
                </p>
                {resolvedDestWarehouseName && (
                  <p
                    className="text-[11px] text-gray-500 mt-0.5 truncate"
                    title={resolvedDestWarehouseName}
                  >
                    {resolvedDestWarehouseName}
                  </p>
                )}
              </>
            ) : (
              <p className="font-bold text-gray-400 mt-0.5">
                {job.customDestAddress ? 'จุดปักหมุดภายนอก (ไม่โอนคลัง)' : '-'}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">ผู้รับมอบปลายทาง:</span>
            <p className="font-bold text-gray-900 mt-0.5">{job.contactPerson || '-'}</p>
            {job.contactPhone && (
              <a
                href={`tel:${job.contactPhone}`}
                className="text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                style={{ color: theme.textMuted }}
              >
                <Phone className="w-3 h-3" />
                <span>{job.contactPhone}</span>
              </a>
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">ผู้สั่งงาน (Requester):</span>
            <p className="font-bold text-gray-900 mt-0.5">{job.requestedBy || '-'}</p>
            {job.requesterPhone && (
              <a
                href={`tel:${job.requesterPhone}`}
                className="text-[11px] hover:underline flex items-center gap-1 mt-0.5"
                style={{ color: theme.textMuted }}
              >
                <Phone className="w-3 h-3" />
                <span>{job.requesterPhone}</span>
              </a>
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">เวลานัดรับรถ:</span>
            <p className="font-bold text-gray-900 mt-0.5">{formatThaiDateTime(job.pickupDateTime)}</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">เวลาส่งมอบโดยประมาณ:</span>
            <p className="font-bold text-gray-900 mt-0.5">
              {formatThaiDateTime(job.deliveryDateTime)}
            </p>
          </div>
        </div>

        {job.transferReason && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-gray-500">เหตุผลในการขนย้าย / หมายเหตุ:</span>
            <p className="font-medium text-gray-800 mt-0.5">{job.transferReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
