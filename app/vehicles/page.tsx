'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Vehicle, Job } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { 
  Car, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Sparkles, 
  Truck, 
  History, 
  CheckCircle2, 
  Clock, 
  X,
  Gauge,
  ArrowRight
} from 'lucide-react';

export default function VehicleStockPage() {
  const { 
    vehicles, 
    jobs, 
    branches, 
    currentRole, 
    currentBranchId, 
    currentCompany 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesVin = v.vin.toLowerCase().includes(q);
        const matchesModel = v.model.toLowerCase().includes(q);
        const matchesPlate = v.licensePlate?.toLowerCase().includes(q);
        const matchesColor = v.color.toLowerCase().includes(q);
        if (!matchesVin && !matchesModel && !matchesPlate && !matchesColor) return false;
      }

      return true;
    });
  }, [vehicles, currentCompany, selectedBranchFilter, selectedStatusFilter, searchQuery]);

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

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-[#0f5238]">
            รถในระบบทั้งหมด {displayedVehicles.length} คัน
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col lg:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามเลขตัวถัง (VIN) / รุ่น / ทะเบียน / สี..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Branch Filter */}
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#f4f9f5] border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
          >
            <option value="ALL">ทุกสาขา</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

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

      {/* Vehicles Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayedVehicles.map(vehicle => {
          const statusConfig = {
            AVAILABLE: { label: 'พร้อมใช้งาน', bg: 'bg-emerald-100 text-[#0f5238]' },
            IN_WASH: { label: 'อยู่ระหว่างล้าง', bg: 'bg-blue-100 text-blue-800' },
            IN_TRANSIT: { label: 'อยู่ระหว่างขนส่ง', bg: 'bg-amber-100 text-amber-800' },
            MAINTENANCE: { label: 'ซ่อมบำรุง', bg: 'bg-gray-100 text-gray-700' }
          }[vehicle.status] || { label: vehicle.status, bg: 'bg-gray-100 text-gray-700' };

          return (
            <div
              key={vehicle.vin}
              className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#0f5238] font-bold text-[10px]">
                    {vehicle.companyCode}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.bg}`}>
                    {statusConfig.label}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 mt-2">
                  {vehicle.model}
                </h3>
                <p className="font-mono text-xs font-bold text-[#0f5238] mt-0.5 tracking-tight">
                  {vehicle.vin}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400 text-[11px]">สีตัวถัง:</span>
                    <p className="font-medium text-gray-800">{vehicle.color}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px]">ทะเบียน:</span>
                    <p className="font-medium text-gray-800">{vehicle.licensePlate || 'ป้ายแดง'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px]">ประเภทรถ:</span>
                    <p className="font-medium text-gray-800">{vehicle.vehicleType}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px]">เลขไมล์:</span>
                    <p className="font-medium text-gray-800">{vehicle.mileage?.toLocaleString() || '-'} กม.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 bg-[#f4f9f5] p-2 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{vehicle.currentBranchName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => setSelectedVehicle(vehicle)}
                  className="flex items-center gap-1 text-xs font-bold text-[#0f5238] hover:underline"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>ดูประวัติงานของ VIN นี้</span>
                </button>

                {/* Quick actions if vehicle in current branch */}
                {vehicle.currentBranchId === currentBranchId && vehicle.status === 'AVAILABLE' && (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/jobs/create-car-wash`}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0f5238]"
                      title="สั่งล้างรถ"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/jobs/create-vehicle-slide`}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0f5238]"
                      title="ขอรถสไลด์"
                    >
                      <Truck className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

                    <div className="text-right">
                      <span className="font-bold text-[#0f5238] text-sm">
                        ฿{(job.actualCost || job.estimatedCost).toLocaleString()}
                      </span>
                    </div>
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
    </div>
  );
}
