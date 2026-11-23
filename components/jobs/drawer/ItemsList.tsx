'use client';

import React from 'react';
import { Car, CheckCheck, Copy, Loader2, Lock, Plus, Sparkles, X } from 'lucide-react';
import { CarWashItem, Job, UserRole } from '@/types';
import { ThemeColors } from '@/hooks/useTheme';
import { AddVehiclesPanel } from './AddVehiclesPanel';
import { UseAddVehiclesReturn } from './useAddVehicles';

export interface DrawerPermissions {
  canUserCancelOrModifyJob: boolean;
  hasSupplierStarted: boolean;
  canModifyBeforeSupplierStarts: boolean;
}

interface ItemsListProps {
  job: Job;
  theme: ThemeColors;
  currentRole: UserRole;
  permissions: DrawerPermissions;
  copiedText: string | null;
  onCopyText: (text: string) => void;
  cancellingItemId: string | null;
  onCancelItem: (item: CarWashItem) => void;
  addVehicles: UseAddVehiclesReturn;
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: '#d97706', bg: '#fffbeb' },
  COMPLETED: { label: 'ส่งแล้ว', color: '#059669', bg: '#ecfdf5' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#059669', bg: '#ecfdf5' },
  REJECTED: { label: 'ตีกลับ', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'ปฏิเสธ', color: '#ef4444', bg: '#fef2f2' },
};

export function ItemsList({
  job,
  theme,
  currentRole,
  permissions,
  copiedText,
  onCopyText,
  cancellingItemId,
  onCancelItem,
  addVehicles,
}: ItemsListProps) {
  if (!job.carWashItems || job.carWashItems.length === 0) return null;

  const items = job.carWashItems;
  const completedCount = items.filter(
    (i) => i.status === 'COMPLETED' || i.status === 'APPROVED'
  ).length;
  const cancelledCount = items.filter(
    (i) => i.status === 'CANCELLED' || i.status === 'REJECTED'
  ).length;
  const totalCount = items.length;

  const validItems = items.filter((i) => i.status !== 'CANCELLED');
  const totalActive = validItems.reduce((a, c) => a + c.unitPrice, 0);
  const totalOriginal = items.reduce((a, c) => a + c.unitPrice, 0);
  const hasCancelled = items.some((i) => i.status === 'CANCELLED');

  const { canUserCancelOrModifyJob, hasSupplierStarted, canModifyBeforeSupplierStarts } =
    permissions;

  return (
    <div>
      {/* Header + Progress + Add Vehicle Button */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          {job.jobType === 'CAR_WASH' ? (
            <Sparkles className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
          ) : (
            <Car className="w-3.5 h-3.5" style={{ color: theme.iconColor }} />
          )}
          <span>
            {job.jobType === 'CAR_WASH' ? 'รายการรถในคำสั่งล้าง' : 'รายการรถในคำสั่งรถสไลด์'}
          </span>
        </h4>
        <div className="flex items-center gap-2 text-[10px]">
          {completedCount > 0 && (
            <span className="text-emerald-600 font-bold">เสร็จ {completedCount}</span>
          )}
          {cancelledCount > 0 && (
            <span className="text-red-500 font-bold">ปฏิเสธ {cancelledCount}</span>
          )}
          <span className="text-gray-400 font-mono">
            {completedCount + cancelledCount}/{totalCount}
          </span>

          {canModifyBeforeSupplierStarts && (
            <button
              type="button"
              onClick={addVehicles.handleOpenAddVehicles}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border shadow-2xs ${
                addVehicles.isAddingVehicles
                  ? 'bg-gray-100 text-gray-700 border-gray-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title="เพิ่มรถเข้าใบงานนี้ (ทำได้ก่อนที่ Supplier จะกดยืนยันตัวรถคันแรก)"
            >
              {addVehicles.isAddingVehicles ? (
                <>
                  <X className="w-3 h-3" />
                  <span>ปิดช่องเพิ่มรถ</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>เพิ่มรถ</span>
                </>
              )}
            </button>
          )}

          {currentRole !== 'SUPPLIER' &&
            ['IN_PROGRESS', 'PENDING_SUPPLIER'].includes(job.status) &&
            hasSupplierStarted && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/70"
                title="Supplier ได้ยืนยันตัวรถและเริ่มงานแล้ว จึงล็อกการเพิ่มรถและการยกเลิกทั้งใบงาน"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Supplier เริ่มงานแล้ว (ล็อกเพิ่มรถ)</span>
              </span>
            )}
        </div>
      </div>

      {/* ─── Expandable Add Vehicles Panel (แนวทางที่ 1) ─── */}
      {addVehicles.isAddingVehicles && canModifyBeforeSupplierStarts && (
        <AddVehiclesPanel job={job} theme={theme} addVehicles={addVehicles} />
      )}

      {/* Progress Bar */}
      {(completedCount > 0 || cancelledCount > 0) && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex mb-2">
          {completedCount > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          )}
          {cancelledCount > 0 && (
            <div
              className="h-full bg-red-400 transition-all duration-500"
              style={{ width: `${(cancelledCount / totalCount) * 100}%` }}
            />
          )}
        </div>
      )}

      {/* Item Rows */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-gray-50">
        {items.map((item) => {
          const s = ITEM_STATUS_CONFIG[item.status] || ITEM_STATUS_CONFIG.PENDING;
          const isCancelled = item.status === 'CANCELLED';
          const isVerified = Boolean(item.verifiedAt || job.verifiedAt);
          const canCancelItem =
            canUserCancelOrModifyJob &&
            job.status !== 'CANCELLED' &&
            !['CANCELLED', 'APPROVED'].includes(item.status);

          return (
            <div
              key={item.id}
              className={`px-3 py-2.5 flex items-center gap-3 text-xs transition-colors ${
                isCancelled ? 'bg-red-50/25' : 'hover:bg-gray-50/50'
              }`}
            >
              {/* VIN + Copy */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`font-mono font-bold text-[11px] ${
                      isCancelled ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {item.vin}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopyText(item.vin)}
                    className="p-0.5 rounded text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    {copiedText === item.vin ? (
                      <CheckCheck className="w-3 h-3" style={{ color: theme.iconColor }} />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {item.licensePlate && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isCancelled ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.licensePlate}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  {item.vehicleModel} {item.vehicleColor && `• ${item.vehicleColor}`} •{' '}
                  {item.washType === 'VEHICLE_SLIDE' ? 'รถสไลด์ขนส่ง' : item.washType}
                </p>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                  style={{ color: s.color, backgroundColor: s.bg }}
                >
                  {s.label}
                </span>

                {isVerified && !isCancelled && (
                  <span
                    className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded font-medium whitespace-nowrap"
                    title="Supplier ถ่ายรูปยืนยันตัวรถแล้ว ไม่สามารถยกเลิกได้"
                  >
                    ✓ ยืนยันแล้ว
                  </span>
                )}

                {canCancelItem &&
                  (!isVerified ? (
                    <button
                      type="button"
                      onClick={() => onCancelItem(item)}
                      disabled={cancellingItemId === item.id}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-700 transition-colors flex items-center gap-1 border border-red-200 cursor-pointer disabled:opacity-50"
                      title="ยกเลิกคำสั่งสำหรับรถคันนี้ (เนื่องจาก Supplier ยังไม่ยืนยันตัวรถ)"
                    >
                      {cancellingItemId === item.id ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <X className="w-2.5 h-2.5" />
                      )}
                      <span>ยกเลิก</span>
                    </button>
                  ) : (
                    <span
                      className="text-[9px] text-gray-400 italic"
                      title="Supplier ถ่ายรูปยืนยันตัวรถแล้ว"
                    >
                      เริ่มงานแล้ว
                    </span>
                  ))}
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <span
                  className={`font-mono ${
                    isCancelled ? 'text-gray-400 text-[11px]' : 'font-bold text-[12px]'
                  }`}
                  style={!isCancelled ? { color: theme.textPrimary } : undefined}
                >
                  ฿{item.unitPrice.toLocaleString()}
                </span>
                {isCancelled && (
                  <span className="block text-[9px] text-red-500 font-medium">ไม่คิดเงิน</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total row */}
      <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-xl bg-gray-50/80 border border-gray-100 text-[11px]">
        <span className="text-gray-600 font-medium">
          {hasCancelled ? (
            <>
              ยอดรวมสุทธิ{' '}
              <span className="text-gray-400 font-normal">
                ({validItems.length} จาก {totalCount} คัน)
              </span>
            </>
          ) : (
            `ยอดรวม (${totalCount} คัน)`
          )}
        </span>
        <div className="flex items-baseline gap-2">
          {hasCancelled && (
            <span className="text-gray-400 text-[10px] font-mono">
              ฿{totalOriginal.toLocaleString()}
            </span>
          )}
          <strong className="text-sm font-bold font-mono" style={{ color: theme.textPrimary }}>
            ฿{totalActive.toLocaleString()}
          </strong>
        </div>
      </div>
    </div>
  );
}
