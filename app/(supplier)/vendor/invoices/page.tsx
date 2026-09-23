'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getJobTotalCost } from '@/lib/job-utils';
import { formatCurrency } from '@/lib/billing-utils';
import {
  Receipt,
  CheckCircle2,
  FileText,
  Plus,
  Sparkles,
  Truck,
} from 'lucide-react';

export default function SupplierInvoicesPage() {
  const { jobs, invoices, createInvoice, activeSupplier } = useApp();
  const { user } = useAuth();
  const theme = useTheme();

  const supplierId = activeSupplier?.id || user?.supplierId;

  const [isCreating, setIsCreating] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Jobs that are APPROVED and belong to this supplier
  const approvedJobs = useMemo(() => {
    return jobs.filter(j => j.supplierId === supplierId && j.status === 'APPROVED');
  }, [jobs, supplierId]);

  // Invoices for this supplier
  const myInvoices = useMemo(() => {
    return invoices.filter(i => i.supplierId === supplierId);
  }, [invoices, supplierId]);

  const selectedTotal = useMemo(() => {
    return approvedJobs
      .filter(j => selectedJobIds.includes(j.id))
      .reduce((sum, j) => sum + getJobTotalCost(j), 0);
  }, [approvedJobs, selectedJobIds]);

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleCreateInvoice = async () => {
    if (selectedJobIds.length === 0) return;
    setIsCreating(true);
    try {
      const result = await createInvoice({
        supplierId: supplierId!,
        jobIds: selectedJobIds,
      });
      if (result.success) {
        setSelectedJobIds([]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(result.error || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ใบวางบิล</h1>
        <p className="text-sm text-gray-500">จัดการใบวางบิลและออกบิลจากงานที่ผ่านการตรวจรับ</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-semibold text-green-800">ออกใบวางบิลสำเร็จ! 🎉</p>
        </div>
      )}

      {/* Create Invoice Section */}
      {approvedJobs.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="text-sm font-bold text-gray-900">
                ออกใบวางบิลใหม่
              </h3>
            </div>
            <span className="text-xs text-gray-500">{approvedJobs.length} งานพร้อมออกบิล</span>
          </div>

          <p className="text-xs text-gray-500 mb-3">เลือกงานที่ต้องการรวมในใบวางบิล:</p>

          <div className="flex flex-col gap-2 mb-4">
            {approvedJobs.map(job => {
              const isSelected = selectedJobIds.includes(job.id);
              const cost = getJobTotalCost(job);
              return (
                <button
                  key={job.id}
                  onClick={() => toggleJob(job.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-current bg-current/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                  style={isSelected ? { borderColor: theme.primary, backgroundColor: theme.bgSoft } : {}}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'text-white' : 'border-gray-300'
                    }`}
                    style={isSelected ? { backgroundColor: theme.primary, borderColor: theme.primary } : {}}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {job.jobType === 'CAR_WASH'
                        ? <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        : <Truck className="w-3.5 h-3.5 text-purple-500" />
                      }
                      <span className="text-xs font-bold font-mono text-gray-900">{job.jobNumber}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {job.companyCode} • {job.branchName}
                    </p>
                  </div>

                  <span className="text-xs font-bold font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(cost)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Submit Invoice */}
          {selectedJobIds.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">เลือก {selectedJobIds.length} งาน</p>
                <p className="text-lg font-bold font-mono" style={{ color: theme.primary }}>
                  {formatCurrency(selectedTotal)}
                </p>
              </div>
              <button
                onClick={handleCreateInvoice}
                disabled={isCreating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                {isCreating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                ออกใบวางบิล
              </button>
            </div>
          )}
        </div>
      )}

      {approvedJobs.length === 0 && myInvoices.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">ยังไม่มีงานที่พร้อมออกบิล</p>
          <p className="text-xs mt-1">งานที่ผ่านการตรวจรับจากสาขาจะแสดงที่นี่</p>
        </div>
      )}

      {/* Existing Invoices */}
      {myInvoices.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            ใบวางบิลที่ออกแล้ว ({myInvoices.length})
          </h3>
          <div className="flex flex-col divide-y divide-gray-50">
            {myInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 font-mono">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {inv.companyCode} • {inv.jobIds?.length || 0} งาน
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono" style={{ color: theme.primary }}>
                    {formatCurrency(inv.totalAmount)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {inv.status === 'PENDING' ? '⏳ รอชำระ' : '✅ ชำระแล้ว'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
