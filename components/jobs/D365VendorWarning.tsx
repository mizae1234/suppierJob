'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Supplier } from '@/types';
import { getSupplierVendorCode } from '@/lib/job-utils';

export interface D365VendorWarningProps {
  supplier: Supplier | null | undefined;
  branch: { id?: string | null; code?: string | null; name?: string | null } | null | undefined;
}

/**
 * แถบเตือนเมื่อ Supplier ที่เลือกยังไม่มีรหัส Vendor D365 ของสาขานี้
 * (เตือนเฉย ๆ ไม่บล็อกการสร้างใบงาน — แต่ PO จะเปิดไม่ได้จนกว่าจะเพิ่มรหัส)
 */
export function D365VendorWarning({ supplier, branch }: D365VendorWarningProps) {
  if (!supplier || !branch) return null;
  if (getSupplierVendorCode(supplier, branch)) return null;

  return (
    <div
      id="d365-vendor-warning"
      role="alert"
      className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 -mt-2"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <div className="leading-relaxed">
        <p className="font-bold text-amber-900">
          ยังไม่มีรหัส Vendor D365 สำหรับสาขา {branch.code || branch.name || '-'}
        </p>
        <p className="text-amber-700">
          สามารถสร้างใบงานได้ปกติ (กรุณาแจ้ง Admin เพื่อเปิด PO)
        </p>
      </div>
    </div>
  );
}

export default D365VendorWarning;
