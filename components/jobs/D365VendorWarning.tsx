'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { Supplier } from '@/types';
import { getSupplierVendorCode } from '@/lib/job-utils';

export interface D365VendorWarningProps {
  supplier: Supplier | null | undefined;
  branch: { id?: string | null; code?: string | null; name?: string | null } | null | undefined;
}

/**
 * แถบแจ้งเตือนและบล็อกการสั่งงานเมื่อ Supplier ที่เลือกยังไม่มีรหัส Vendor D365 ของสาขานี้
 */
export function D365VendorWarning({ supplier, branch }: D365VendorWarningProps) {
  if (!supplier || !branch) return null;
  if (getSupplierVendorCode(supplier, branch)) return null;

  return (
    <div
      id="d365-vendor-warning"
      role="alert"
      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 -mt-2"
    >
      <Lock className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
      <div className="leading-relaxed">
        <p className="font-bold text-red-900">
          ไม่สามารถสั่งงานได้ — ยังไม่มีรหัส Vendor D365 สำหรับสาขา {branch.code || branch.name || '-'}
        </p>
        <p className="text-red-700">
          ต้องใช้ Supplier ที่มีรหัส Vendor D365 แล้วเท่านั้น กรุณาเลือก Supplier รายอื่น หรือแจ้ง Admin เพื่อผูกรหัส Vendor
        </p>
      </div>
    </div>
  );
}

export default D365VendorWarning;
