'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { CompanyCode, Job } from '@/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/date-utils';
import { 
  Truck, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  Search,
  Printer
} from 'lucide-react';

export default function CreateVehicleSlidePage() {
  const router = useRouter();
  const { 
    currentRole,
    currentBranchId, 
    activeBranch, 
    branches, 
    suppliers, 
    vehicles, 
    createVehicleSlideJob 
  } = useApp();

  // Slide suppliers
  const slideSuppliers = suppliers.filter(s => s.services.includes('VEHICLE_SLIDE'));

  // Branch selection — Admin can pick any branch as origin
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>(currentBranchId || branches[0]?.id || '');
  const originBranchObj = branches.find(b => b.id === selectedOriginBranchId);

  // Vehicles at selected origin branch
  const branchStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.currentBranchId === selectedOriginBranchId && v.status === 'AVAILABLE');
  }, [vehicles, selectedOriginBranchId]);

  // Form State
  const [selectedVin, setSelectedVin] = useState<string>(branchStockVehicles[0]?.vin || '');
  const [destBranchId, setDestBranchId] = useState<string>(
    branches.find(b => b.id !== selectedOriginBranchId)?.id || ''
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(slideSuppliers[0]?.id || '');
  const [pickupDateTime, setPickupDateTime] = useState<string>(
    new Date(Date.now() + 3600 * 1000 * 2).toISOString().slice(0, 16)
  );
  const [deliveryDateTime, setDeliveryDateTime] = useState<string>(
    new Date(Date.now() + 3600 * 1000 * 6).toISOString().slice(0, 16)
  );
  const [contactPerson, setContactPerson] = useState<string>('ผู้จัดการสาขาปลายทาง');
  const [contactPhone, setContactPhone] = useState<string>('081-234-5678');
  const [transferReason, setTransferReason] = useState<string>('ย้ายสต็อกรถรองรับการส่งมอบลูกค้า');
  const [requestedBy, setRequestedBy] = useState<string>('เจ้าหน้าที่สาขาต้นทาง');
  const [estimatedCost, setEstimatedCost] = useState<number>(2500);

  // Search in branch vehicles
  const [vinSearch, setVinSearch] = useState('');

  // Created job modal
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  const selectedVehicle = vehicles.find(v => v.vin === selectedVin);
  const destBranch = branches.find(b => b.id === destBranchId);

  const filteredVehicles = branchStockVehicles.filter(v => {
    if (!vinSearch) return true;
    const q = vinSearch.toLowerCase();
    return v.vin.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || (v.licensePlate && v.licensePlate.toLowerCase().includes(q));
  });

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVin) {
      showToast('กรุณาเลือกรถ (VIN) ที่ต้องการสไลด์', 'warning');
      return;
    }
    if (!destBranchId) {
      showToast('กรุณาเลือกสาขาปลายทาง', 'warning');
      return;
    }
    if (destBranchId === selectedOriginBranchId) {
      showToast('สาขาปลายทางต้องไม่ซ้ำกับสาขาต้นทาง', 'error');
      return;
    }
    if (!selectedSupplierId) {
      showToast('กรุณาเลือก Supplier รถสไลด์', 'warning');
      return;
    }

    const companyCode: CompanyCode = originBranchObj?.companyId === 'comp-gi' ? 'GI' : 'EV7';

    const newJob = await createVehicleSlideJob({
      companyCode,
      originBranchId: selectedOriginBranchId,
      destBranchId,
      supplierId: selectedSupplierId,
      vin: selectedVin,
      pickupDateTime,
      deliveryDateTime,
      contactPerson,
      contactPhone,
      transferReason,
      requestedBy,
      estimatedCost,
    });

    if (newJob) setCreatedJob(newJob);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              <span>ขอรถสไลด์ขนส่งรถยนต์ (Vehicle Slide Request)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือกรถจากสต็อกสาขา กำหนดเส้นทาง เวลา และมอบหมายงานให้ Supplier รถสไลด์
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#eaf5ee] border border-emerald-950/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0f5238] shadow-xs">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">ต้นทาง: {activeBranch?.name}</p>
            <p className="text-[11px] text-emerald-700">มีรถพร้อมสไลด์: {branchStockVehicles.length} คัน</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Select VIN from current branch */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">1</span>
                <span>เลือกรถที่ต้องการสไลด์ (VIN)</span>
              </h2>
            </div>

            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vinSearch}
                onChange={(e) => setVinSearch(e.target.value)}
                placeholder="ค้นหาตาม VIN / รุ่น..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#0f5238]"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  ไม่มีรถสถานะพร้อมย้ายในสต็อกสาขานี้
                </div>
              ) : (
                filteredVehicles.map(v => {
                  const isSelected = selectedVin === v.vin;
                  return (
                    <div
                      key={v.vin}
                      onClick={() => setSelectedVin(v.vin)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'border-[#0f5238] bg-[#f4f9f5] ring-2 ring-[#0f5238]/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">{v.vin}</span>
                        {v.licensePlate && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                            {v.licensePlate}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 font-medium">{v.model}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
                        <span>สี: {v.color}</span>
                        <span>•</span>
                        <span>ไมล์: {v.mileage?.toLocaleString() || '-'} กม.</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Vehicle Card Preview */}
          {selectedVehicle && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f5238] to-[#1b4332] text-white shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">คันที่เลือกจะขนย้าย</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {selectedVehicle.vehicleType}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedVehicle.model}</h3>
                <p className="font-mono text-xs text-emerald-200 mt-0.5">{selectedVehicle.vin}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-emerald-300">สีตัวถัง:</span>
                  <p className="font-semibold">{selectedVehicle.color}</p>
                </div>
                <div>
                  <span className="text-emerald-300">ทะเบียน:</span>
                  <p className="font-semibold">{selectedVehicle.licensePlate || 'ป้ายแดง/ไม่มีทะเบียน'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 2 & 3: Route, Contact, Schedule & Supplier */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Step 2: Route & Schedule */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">2</span>
              <span>ระบุเส้นทางและกำหนดการเดินทาง</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origin Branch */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  สาขาต้นทาง (Origin Branch):
                </label>
                {currentRole === 'ADMIN' ? (
                  <select
                    value={selectedOriginBranchId}
                    onChange={(e) => { setSelectedOriginBranchId(e.target.value); setSelectedVin(''); }}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#0f5238] outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={originBranchObj?.name || ''}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600 font-medium"
                  />
                )}
              </div>

              {/* Destination Branch */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  สาขาปลายทาง (Destination Branch): *
                </label>
                <select
                  value={destBranchId}
                  onChange={(e) => setDestBranchId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#0f5238] outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id} disabled={b.id === selectedOriginBranchId}>
                      {b.name} {b.id === selectedOriginBranchId ? '(สาขาต้นทาง)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pickup Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  วันและเวลารับรถ (Pickup Date/Time): *
                </label>
                <input
                  type="datetime-local"
                  value={pickupDateTime}
                  onChange={(e) => setPickupDateTime(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  กำหนดเวลาส่งมอบ (Estimated Delivery): *
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDateTime}
                  onChange={(e) => setDeliveryDateTime(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อผู้ติดต่อปลายทาง: *
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เบอร์โทรผู้ติดต่อ: *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>

              {/* Reason */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เหตุผลการย้ายรถ: *
                </label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  required
                  placeholder="เช่น ย้ายสต็อกตามใบจองลูกค้า, รถทดลองขับสาขา, ส่งซ่อมด่วน..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Assign Supplier & Cost Estimate */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">3</span>
              <span>มอบหมาย Supplier รถสไลด์ & ประมาณการค่าบริการ</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  เลือก Supplier รถสไลด์:
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#0f5238] outline-none"
                >
                  {slideSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (โทร: {s.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ประมาณการค่าบริการสไลด์ (บาท):
                </label>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  required
                  min={100}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold text-[#0f5238] focus:ring-2 focus:ring-[#0f5238] outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
              <div>
                <span className="text-xs text-gray-500">เส้นทาง:</span>
                <p className="text-xs font-bold text-gray-800">
                  {originBranchObj?.name} &rarr; {destBranch?.name}
                </p>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกและส่งมอบหมายงานรถสไลด์</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {createdJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  สร้างคำขอรถสไลด์เรียบร้อยแล้ว
                </h3>
                <p className="text-xs text-gray-500">ระบบได้แจ้งเตือนไปยัง Supplier ผู้รับงานแล้ว</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2">
              <p><strong>Job No.:</strong> <span className="font-mono font-bold text-gray-900">{createdJob.jobNumber}</span></p>
              <p><strong>เลขตัวถัง (VIN):</strong> <span className="font-mono">{createdJob.vin}</span></p>
              <p><strong>เส้นทาง:</strong> {createdJob.originBranchName} &rarr; {createdJob.destBranchName}</p>
              <p><strong>Supplier:</strong> {createdJob.supplierName}</p>
              <p><strong>เวลารับรถ:</strong> {formatThaiDateTime(createdJob.pickupDateTime)}</p>
              <p><strong>ประมาณการค่าบริการ:</strong> ฿{createdJob.estimatedCost.toLocaleString()}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => router.push('/jobs')}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0f5238] text-white hover:bg-[#0a3d28]"
              >
                กลับไปหน้ารวมงาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
