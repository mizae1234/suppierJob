'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import TagSearch from '@/components/ui/TagSearch';
import { Vehicle, Job } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { 
  Car, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  History, 
  CheckCircle2, 
  Clock, 
  X,
  Gauge,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import VehicleImportModal from '@/components/vehicles/VehicleImportModal';

export default function VehicleStockPage() {
  const { 
    vehicles, 
    jobs, 
    branches, 
    currentRole, 
    currentBranchId, 
    currentCompany 
  } = useApp();

  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Filtered vehicles
  const displayedVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Company filter
      if (currentCompany !== 'ALL' && v.companyCode !== currentCompany) return false;

      // Branch filter
      if (selectedBranchFilter !== 'ALL' && v.currentBranchId !== selectedBranchFilter) return false;

      // Status filter
      if (selectedStatusFilter !== 'ALL' && v.status !== selectedStatusFilter) return false;

      // Search term
      if (searchTags.length > 0) {
        const matches = searchTags.some(q => {
          const term = q.toLowerCase();
          const matchesVin = v.vin.toLowerCase().includes(term);
          const matchesModel = v.model.toLowerCase().includes(term);
          const matchesPlate = v.licensePlate?.toLowerCase().includes(term);
          const matchesColor = v.color.toLowerCase().includes(term);
          return matchesVin || matchesModel || matchesPlate || matchesColor;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [vehicles, currentCompany, selectedBranchFilter, selectedStatusFilter, searchTags]);

  // Find job history for selected VIN
  const vinHistory: Job[] = useMemo(() => {
    if (!selectedVehicle) return [];
    return jobs.filter(j => {
      if (j.jobType === 'VEHICLE_SLIDE') {
        return j.vin === selectedVehicle.vin;
      } else {
        return j.carWashItems?.some(it => it.vin === selectedVehicle.vin);
      }
    });
  }, [selectedVehicle, jobs]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-600" />
            <span>คลังข้อมูลรถยนต์ & ค้นหา VIN (Vehicle Stock)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ข้อมูลจำเพาะและสถานะรถที่เชื่อมต่อผ่านระบบคลังภายนอก (External Stock System Interface)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-[#0f5238]">
            รถในระบบทั้งหมด {displayedVehicles.length} คัน
          </span>
          {currentRole !== 'SUPPLIER' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0f5238] text-white hover:bg-[#0a3d28] text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>นำเข้ารถ (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col lg:flex-row items-center gap-3">
        {/* Search */}
        <div className="flex-1 w-full">
          <TagSearch
            tags={searchTags}
            onTagsChange={setSearchTags}
            placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน / สี... (กด Enter เพื่อเพิ่ม)"
            accentColor="#0f5238"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Branch Filter - Only show if not EV7 */}
          {currentCompany !== 'EV7' && (
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
            >
              <option value="ALL">ทุกสาขา {currentCompany === 'GI' ? '(GI Hubs)' : ''}</option>
              {branches
                .filter(b => currentCompany === 'ALL' || b.code.startsWith(currentCompany))
                .map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
          >
            <option value="ALL">ทุกสถานะรถ</option>
            <option value="AVAILABLE">พร้อมใช้งาน (Available)</option>
            <option value="IN_WASH">กำลังล้าง (In Wash)</option>
            <option value="IN_TRANSIT">ระหว่างขนส่ง (In Transit)</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-emerald-950/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f4f9f5] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 whitespace-nowrap">เลขตัวถัง (VIN) / สังกัด</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ยี่ห้อและรุ่นรถ (Model)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">สีตัวถัง</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ทะเบียนรถ</th>
                <th className="py-2.5 px-3 whitespace-nowrap">เลขไมล์</th>
                <th className="py-2.5 px-3 whitespace-nowrap">สาขาปัจจุบัน</th>
                <th className="py-2.5 px-3 whitespace-nowrap">สถานะ</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">ประวัติงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {displayedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                        <Car className="w-5 h-5" />
                      </div>
                      <p className="text-gray-500 font-medium">ไม่พบข้อมูลรถยนต์ที่ตรงกับเงื่อนไขการค้นหา</p>
                      <p className="text-[11px] text-gray-400">ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองสาขา/สถานะ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedVehicles.map((vehicle, idx) => {
                  const statusConfig = {
                    AVAILABLE: { label: 'พร้อมใช้งาน', bg: 'bg-emerald-50 text-[#0f5238] border border-emerald-200' },
                    IN_WASH: { label: 'อยู่ระหว่างล้าง', bg: 'bg-blue-50 text-blue-800 border border-blue-200' },
                    IN_TRANSIT: { label: 'อยู่ระหว่างขนส่ง', bg: 'bg-amber-50 text-amber-800 border border-amber-200' },
                    MAINTENANCE: { label: 'ซ่อมบำรุง', bg: 'bg-gray-100 text-gray-700 border border-gray-200' }
                  }[vehicle.status] || { label: vehicle.status, bg: 'bg-gray-100 text-gray-700 border border-gray-200' };

                  return (
                    <tr 
                      key={vehicle.vin} 
                      className="hover:bg-[#fbfdfc] transition-colors group"
                    >
                      <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#0f5238] font-bold text-[10px] border border-emerald-200/60 shrink-0">
                            {vehicle.companyCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedVehicle(vehicle)}
                            className="font-mono font-bold text-gray-900 group-hover:text-[#0f5238] hover:underline text-left cursor-pointer"
                            title="คลิกเพื่อดูประวัติงาน"
                          >
                            {vehicle.vin}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-gray-900">{vehicle.model}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({vehicle.vehicleType})</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium whitespace-nowrap">
                          {vehicle.color}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {vehicle.licensePlate ? (
                          <span className="font-semibold text-gray-800 px-2 py-0.5 rounded bg-gray-100 text-[11px] border border-gray-200/70 whitespace-nowrap">
                            {vehicle.licensePlate}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">ป้ายแดง</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-gray-700 whitespace-nowrap">
                        {vehicle.mileage !== undefined && vehicle.mileage !== null 
                          ? `${vehicle.mileage.toLocaleString()} กม.` 
                          : '-'}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-700 max-w-[220px]">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="truncate text-xs" title={vehicle.currentBranchName}>
                            {vehicle.currentBranchName || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-emerald-600 hover:bg-emerald-50 text-[#0f5238] font-semibold text-[11px] transition-all cursor-pointer shadow-2xs group-hover:border-emerald-300"
                          title="ดูประวัติงานของ VIN นี้"
                        >
                          <History className="w-3.5 h-3.5 text-emerald-700" />
                          <span>ดูประวัติ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        {displayedVehicles.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>แสดงผล <strong>{displayedVehicles.length}</strong> จากทั้งหมด <strong>{vehicles.length}</strong> คัน</span>
            <span>คลิกที่เลข VIN หรือปุ่ม &quot;ประวัติ&quot; เพื่อตรวจสอบประวัติงานย้อนหลัง</span>
          </div>
        )}
      </div>

      {/* VIN History Modal Drawer */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0f5238] font-bold text-xs">
                  {selectedVehicle.companyCode}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  ประวัติงานสำหรับ VIN: {selectedVehicle.vin}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedVehicle.model} • สี: {selectedVehicle.color} • สาขาปัจจุบัน: {selectedVehicle.currentBranchName}
                </p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History List */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                ประวัติงานคำสั่งการทั้งหมด ({vinHistory.length} รายการ)
              </h4>

              {vinHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-gray-50 border border-gray-200 text-center text-xs text-gray-400">
                  ยังไม่มีประวัติการสั่งล้างหรือย้ายสไลด์สำหรับรถคันนี้
                </div>
              ) : (
                vinHistory.map(job => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-gray-200 bg-[#fbfdfc] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{job.jobNumber}</span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold">
                          {job.jobType === 'CAR_WASH' ? 'Car Wash' : 'Vehicle Slide'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800">
                          {job.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        สาขา: {job.branchName} • ผู้รับจ้าง: {job.supplierName}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        วันที่: {formatThaiDateTime(job.createdAt)}
                      </p>
                    </div>

                    {(() => {
                      const item = job.jobType === 'CAR_WASH' ? job.carWashItems?.find(i => i.vin === selectedVehicle.vin) : null;
                      const isCancelled = item?.status === 'CANCELLED';
                      const cost = item ? (isCancelled ? 0 : item.unitPrice) : getJobTotalCost(job);

                      return (
                        <div className="text-right">
                          <span className={`font-bold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-[#0f5238]'}`}>
                            ฿{cost.toLocaleString()}
                          </span>
                          {isCancelled && (
                            <span className="block text-[10px] text-red-500 font-medium">ปฏิเสธ / ยกเลิก</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Vehicles Modal */}
      <VehicleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
