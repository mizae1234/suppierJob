'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Printer } from 'lucide-react';
import { Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { useTheme } from '@/hooks/useTheme';

export interface WashOrderPrintModalProps {
  createdJob: Job | null;
  onClose?: () => void;
}

export function WashOrderPrintModal({
  createdJob,
  onClose,
}: WashOrderPrintModalProps) {
  const router = useRouter();
  const theme = useTheme();

  if (!createdJob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: theme.primary }} />
            <h3 className="text-base font-bold text-gray-900">
              บันทึกคำสั่งล้างรถสำเร็จ (Car Wash Order Created)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-colors"
              style={{ backgroundColor: theme.primary }}
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / Export PDF</span>
            </button>
            <button
              onClick={() => {
                if (onClose) onClose();
                router.push('/jobs');
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
            >
              ไปยังหน้ารวมงาน
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="print-work-order p-6 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-4 print:border-none print:p-0">
          {/* Document Top */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0f5238]">ใบสั่งงานล้างรถ (CAR WASH ORDER SLIP)</h2>
              <p className="text-xs text-gray-600">บริษัท {createdJob.companyCode} • สังกัด: {createdJob.branchName}</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-mono font-bold text-sm text-gray-900">{createdJob.jobNumber}</p>
              <p className="text-gray-500">วันที่สั่งงาน: {formatThaiDate(createdJob.createdAt)}</p>
            </div>
          </div>

          {/* Parties Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl text-xs">
            <div>
              <p className="text-gray-500">สาขาผู้สั่งงาน:</p>
              <p className="font-bold text-gray-900">{createdJob.branchName}</p>
              <p className="text-gray-600 mt-0.5">ผู้สั่งงาน: {createdJob.requestedBy}</p>
              {createdJob.requesterPosition && <p className="text-gray-600">ตำแหน่ง: {createdJob.requesterPosition}</p>}
              {createdJob.requesterPhone && <p className="text-gray-600">โทร: {createdJob.requesterPhone}</p>}
            </div>
            <div>
              <p className="text-gray-500">Supplier ผู้รับจ้าง:</p>
              <p className="font-bold text-gray-900">{createdJob.supplierName}</p>
              <p className="text-gray-600 mt-0.5">สถานะ: รอ Supplier ปฏิบัติงาน</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-300 font-bold text-gray-700">
                  <th className="py-2 px-2">ลำดับ</th>
                  <th className="py-2 px-2">เลขตัวถัง (VIN)</th>
                  <th className="py-2 px-2">รุ่น / สี</th>
                  <th className="py-2 px-2">ทะเบียน</th>
                  <th className="py-2 px-2">วันที่ล้างจริง</th>
                  <th className="py-2 px-2">ประเภท</th>
                  <th className="py-2 px-2 text-right">ราคา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {createdJob.carWashItems?.map((item, i) => (
                  <tr key={item.id}>
                    <td className="py-2 px-2">{i + 1}</td>
                    <td className="py-2 px-2 font-mono font-bold">{item.vin}</td>
                    <td className="py-2 px-2">{item.vehicleModel} ({item.vehicleColor})</td>
                    <td className="py-2 px-2">{item.licensePlate || '-'}</td>
                    <td className="py-2 px-2">{formatThaiDate(item.actualWashDate)}</td>
                    <td className="py-2 px-2">{item.washType}</td>
                    <td className="py-2 px-2 text-right font-bold">฿{item.unitPrice}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={6} className="py-2 px-2 text-right">ยอดรวมทั้งสิ้น (Estimated Total):</td>
                  <td className="py-2 px-2 text-right text-sm text-[#0f5238]">
                    ฿{createdJob.estimatedCost.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures Area */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-gray-200 text-xs text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 border-b border-gray-400" />
              <p>ลงชื่อ {createdJob.requestedBy || '...................................................'}<br />({createdJob.requesterPosition || '...................................................'})</p>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-48 border-b border-gray-400" />
              <p>ลงชื่อ ...................................................<br />(...................................................)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WashOrderPrintModal;
