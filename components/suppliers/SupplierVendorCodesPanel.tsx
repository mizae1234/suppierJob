'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, Edit2, Trash2, Check, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SupplierVendorCodeInfo } from '@/types';

interface VendorCodeRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  vendorCode: string | null;
  vendorName: string | null;
  source: string | null;
  verifiedAt: string | null;
}

interface SyncSummary {
  message: string;
  conflicts: { branchCode: string; current: string; d365: string; reason: string }[];
}

export interface SupplierVendorCodesPanelProps {
  supplierId: string;
  /** รหัสที่ได้มากับข้อมูล Supplier (ใช้แสดงผลสำหรับผู้ที่ไม่มีสิทธิ์แก้ไข) */
  initialCodes?: SupplierVendorCodeInfo[];
  canEdit: boolean;
  onChanged?: () => void;
}

/**
 * รหัสคู่ค้า (Vendor Account) ใน D365 แยกตามสาขา
 * แต่ละสาขา = บริษัท (Legal Entity) ใน D365 ซึ่งมีรหัส Vendor ของตัวเอง
 */
export function SupplierVendorCodesPanel({ supplierId, initialCodes = [], canEdit, onChanged }: SupplierVendorCodesPanelProps) {
  const [rows, setRows] = useState<VendorCodeRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/vendor-codes`);
      const data = await res.json();
      if (res.ok) setRows(data.vendorCodes);
      else setError(data.error || 'โหลดรหัส Vendor ไม่สำเร็จ');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (canEdit) load();
  }, [canEdit, load]);

  // ผู้ที่ไม่มีสิทธิ์แก้ไข → แสดงเฉพาะสาขาที่มีรหัส
  const displayRows: VendorCodeRow[] =
    rows ??
    initialCodes.map((c) => ({
      branchId: c.branchId,
      branchCode: c.branchCode,
      branchName: c.branchName || '',
      vendorCode: c.vendorCode,
      vendorName: c.vendorName ?? null,
      source: c.source ?? null,
      verifiedAt: c.verifiedAt ?? null,
    }));
  const filledCount = displayRows.filter((r) => r.vendorCode).length;

  const handleSave = async (branchId: string) => {
    const vendorCode = input.trim().toUpperCase();
    if (!vendorCode) return;
    setSavingBranchId(branchId);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/vendor-codes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, vendorCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.vendorCodes);
        setEditingBranchId(null);
        if (data.warning) setWarning(data.warning);
        onChanged?.();
      } else {
        setError(data.error || 'บันทึกรหัส Vendor ไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSavingBranchId(null);
    }
  };

  const handleDelete = async (row: VendorCodeRow) => {
    if (!confirm(`ลบรหัส Vendor ${row.vendorCode} ของสาขา ${row.branchCode}?`)) return;
    setSavingBranchId(row.branchId);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/vendor-codes?branchId=${encodeURIComponent(row.branchId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.vendorCodes);
        onChanged?.();
      } else {
        setError(data.error || 'ลบรหัส Vendor ไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSavingBranchId(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setWarning(null);
    setSyncSummary(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/vendor-codes/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncSummary({ message: data.message, conflicts: data.conflicts || [] });
        await load();
        onChanged?.();
      } else {
        setError(data.details || data.error || 'ดึงรหัสจาก D365 ไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-emerald-950/10 bg-[#fbfdfc] shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold text-[#0f5238] uppercase tracking-wider flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-700" />
          <span>รหัสคู่ค้า D365 แยกตามสาขา</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-mono normal-case">
            {filledCount}/{rows ? rows.length : displayRows.length || '-'} สาขา
          </span>
        </h4>
        {canEdit && (
          <button
            type="button"
            id={`sync-vendor-codes-${supplierId}`}
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-[#0f5238] font-bold hover:underline cursor-pointer disabled:opacity-50"
            title="ดึงรหัส Vendor ของทุกสาขาจาก D365 (จับคู่ด้วย Party เดียวกัน)"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'กำลังดึง...' : 'ดึงรหัสจาก D365'}</span>
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-400 -mt-1">
        ใช้เปิดใบสั่งซื้อ (PO) ตามสาขาของใบงาน — สาขาที่ไม่มีรหัสจะเปิด PO ไม่ได้
      </p>

      {error && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
      {syncSummary && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{syncSummary.message}</span>
          </div>
          {syncSummary.conflicts.map((c) => (
            <div key={c.branchCode} className="pl-5 text-amber-800">
              ⚠ {c.branchCode}: {c.reason} (ในระบบ {c.current} / D365 {c.d365})
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-white border border-emerald-100 overflow-hidden">
        {loading && !rows ? (
          <div className="p-4 text-center text-[11px] text-gray-400">กำลังโหลด...</div>
        ) : displayRows.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-amber-700">ยังไม่มีรหัส Vendor ของสาขาใด</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">สาขา</th>
                <th className="px-3 py-2 text-left font-semibold">รหัส Vendor</th>
                {canEdit && <th className="px-2 py-2 w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayRows.map((row) => {
                const isEditing = editingBranchId === row.branchId;
                const isBusy = savingBranchId === row.branchId;
                return (
                  <tr key={row.branchId} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono font-bold text-gray-900">{row.branchCode}</span>
                      <span className="block text-[10px] text-gray-400 truncate max-w-[180px]" title={row.branchName}>
                        {row.branchName}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            id={`vendor-code-input-${row.branchCode}`}
                            value={input}
                            onChange={(e) => setInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(row.branchId);
                              if (e.key === 'Escape') setEditingBranchId(null);
                            }}
                            placeholder="เช่น V000342"
                            className="px-2 py-1 text-xs font-mono font-bold border border-gray-300 rounded-lg w-24 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 uppercase"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSave(row.branchId)}
                            disabled={isBusy}
                            title="ตรวจกับ D365 และบันทึก"
                            className="p-1 rounded-md bg-[#0f5238] text-white hover:bg-[#0a3d28] disabled:opacity-50 cursor-pointer"
                          >
                            {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBranchId(null)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : row.vendorCode ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#0f5238] border border-emerald-300 font-mono font-bold">
                            {row.vendorCode}
                            {row.verifiedAt && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          </span>
                          {row.vendorName && (
                            <span className="block text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]" title={row.vendorName}>
                              {row.vendorName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                          ไม่มีใน D365
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2 align-top text-right whitespace-nowrap">
                        {!isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setInput(row.vendorCode || '');
                                setEditingBranchId(row.branchId);
                                setError(null);
                              }}
                              title="แก้ไขรหัส"
                              className="p-1 rounded-md text-gray-400 hover:text-emerald-700 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {row.vendorCode && (
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                disabled={isBusy}
                                title="ลบรหัส"
                                className="p-1 rounded-md text-gray-400 hover:text-red-600 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SupplierVendorCodesPanel;
