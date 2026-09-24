'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CompanyCode, Job } from '@/types';
import { formatThaiDate } from '@/lib/date-utils';
import { 
  Sparkles, 
  Car, 
  Store, 
  Calendar, 
  Check, 
  Trash2, 
  FileDown, 
  Printer, 
  CheckCircle2, 
  ArrowLeft,
  Search,
  Plus
} from 'lucide-react';

export default function CreateCarWashPage() {
  const router = useRouter();
  const { 
    currentRole, 
    currentCompany, 
    currentBranchId, 
    activeBranch, 
    branches,
    suppliers, 
    vehicles, 
    createCarWashJob 
  } = useApp();

  // Wash Suppliers
  const washSuppliers = suppliers.filter(s => s.services.includes('CAR_WASH'));

  // Selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(washSuppliers[0]?.id || '');
  const [requestedBy, setRequestedBy] = useState<string>('ผู้จัดการสาขา');

  // Branch selection — Admin can pick any branch, Branch role uses their own
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranchId || branches[0]?.id || '');
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  // Branch vehicles (only vehicles currently in stock at selected branch)
  const branchStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.currentBranchId === selectedBranchId);
  }, [vehicles, selectedBranchId]);

  // VIN search
  const [vinSearch, setVinSearch] = useState('');

  // Selected vehicle items list
  interface SelectedWashItem {
    vin: string;
    model: string;
    color: string;
    licensePlate?: string;
    actualWashDate: string;
    washType: 'STANDARD' | 'DEEP_CLEAN' | 'POLISH';
    unitPrice: number;
    remarks: string;
  }

  const [selectedItems, setSelectedItems] = useState<SelectedWashItem[]>([]);

  // Created Job for PDF Modal
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // Toggle vehicle selection
  const handleToggleVehicle = (vehicle: (typeof branchStockVehicles)[0]) => {
    const exists = selectedItems.some(it => it.vin === vehicle.vin);
    if (exists) {
      setSelectedItems(prev => prev.filter(it => it.vin !== vehicle.vin));
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          vin: vehicle.vin,
          model: vehicle.model,
          color: vehicle.color,
          licensePlate: vehicle.licensePlate,
          actualWashDate: new Date().toISOString().slice(0, 10),
          washType: 'STANDARD',
          unitPrice: 180,
          remarks: 'ล้างทำความสะอาดทั่วไป + ดูดฝุ่น',
        }
      ]);
    }
  };

  // Update item field
  const updateItemField = (vin: string, field: keyof SelectedWashItem, value: any) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.vin !== vin) return item;
      const updated = { ...item, [field]: value };
      if (field === 'washType') {
        if (value === 'STANDARD') updated.unitPrice = 180;
        if (value === 'DEEP_CLEAN') updated.unitPrice = 350;
        if (value === 'POLISH') updated.unitPrice = 650;
      }
      return updated;
    }));
  };

  // Filtered available vehicles by search
  const filteredVehicles = branchStockVehicles.filter(v => {
    if (!vinSearch) return true;
    const q = vinSearch.toLowerCase();
    return v.vin.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || (v.licensePlate && v.licensePlate.toLowerCase().includes(q));
  });

  const totalEstimatedCost = selectedItems.reduce((sum, it) => sum + it.unitPrice, 0);

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('กรุณาเลือก Supplier ผู้ให้บริการ');
      return;
    }
    if (selectedItems.length === 0) {
      alert('กรุณาเลือก VIN อย่างน้อย 1 คัน');
      return;
    }

    const companyCode: CompanyCode = selectedBranch?.companyId === 'comp-gi' ? 'GI' : 'EV7';

    const newJob = await createCarWashJob({
      companyCode,
      branchId: selectedBranchId,
      supplierId: selectedSupplierId,
      items: selectedItems.map(it => ({
        vin: it.vin,
        actualWashDate: it.actualWashDate,
        washType: it.washType,
        unitPrice: it.unitPrice,
        remarks: it.remarks,
      })),
      requestedBy,
    });

    if (newJob) setCreatedJob(newJob);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Banner */}
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
              <Sparkles className="w-6 h-6 text-emerald-600" />
              <span>สร้างคำสั่งสั่งล้างรถ (Car Wash Order)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือก Supplier และระบุรถ VIN จากสต็อกสาขาเพื่อออกใบสั่งงานหลายคันพร้อมกัน
            </p>
          </div>
        </div>

        {/* Current Branch Badge */}
        <div className="p-3 rounded-2xl bg-[#eaf5ee] border border-emerald-950/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#0f5238] shadow-xs">
            <Car className="w-4 h-4" />
          </div>
          <div>
            {currentRole === 'ADMIN' ? (
              <select
                value={selectedBranchId}
                onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedItems([]); }}
                className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer pr-4"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-bold text-gray-900">{activeBranch?.name || 'สาขา'}</p>
            )}
            <p className="text-[11px] text-emerald-700">รถในสต็อกสาขานี้: {branchStockVehicles.length} คัน</p>
          </div>
        </div>
      </div>

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier & Available Stock Selector */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Supplier */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">1</span>
              <span>เลือก Supplier คู่ค้า</span>
            </h2>

            <div className="flex flex-col gap-2 mt-1">
              {washSuppliers.map(sup => (
                <label
                  key={sup.id}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    selectedSupplierId === sup.id
                      ? 'border-[#0f5238] bg-[#f4f9f5] ring-2 ring-[#0f5238]/20'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="supplier"
                      checked={selectedSupplierId === sup.id}
                      onChange={() => setSelectedSupplierId(sup.id)}
                      className="mt-0.5 text-[#0f5238] focus:ring-[#0f5238]"
                    />
                    <div>
                      <p className="font-bold text-gray-900">{sup.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">โทร: {sup.phone}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#0f5238] font-semibold text-[10px]">
                    คาร์วอช
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                ชื่อผู้สั่งงาน / เจ้าหน้าที่สาขา:
              </label>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0f5238] outline-none"
              />
            </div>
          </div>

          {/* Step 2: Select VINs from Branch Stock */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">2</span>
                <span>เลือกรถในสต็อกสาขา</span>
              </h2>
              <span className="text-xs text-gray-500">เลือกแล้ว {selectedItems.length} คัน</span>
            </div>

            {/* VIN search */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vinSearch}
                onChange={(e) => setVinSearch(e.target.value)}
                placeholder="ค้นหาตาม VIN / รุ่น / ทะเบียน..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f5238]"
              />
            </div>

            {/* Vehicles List */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  ไม่มีรถในสต็อกสาขานี้ หรือไม่ตรงกับการค้นหา
                </div>
              ) : (
                filteredVehicles.map(v => {
                  const isSelected = selectedItems.some(it => it.vin === v.vin);
                  return (
                    <div
                      key={v.vin}
                      onClick={() => handleToggleVehicle(v)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[#0f5238] bg-[#f4f9f5] font-semibold'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-[#0f5238] border-[#0f5238] text-white' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-gray-900 truncate">{v.vin}</p>
                          <p className="text-[11px] text-gray-500 truncate">{v.model} • {v.color}</p>
                        </div>
                      </div>
                      {v.licensePlate && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] shrink-0">
                          {v.licensePlate}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Per-VIN Operation Dates & Order Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">3</span>
                  <span>รายการและกำหนดวันปฏิบัติงานจริงของแต่ละ VIN</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  ระบุวันที่ล้างจริง ประเภทบริการ และหมายเหตุเฉพาะคัน
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                รวม {selectedItems.length} คัน
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
                <Car className="w-12 h-12 text-gray-300" />
                <p className="text-xs font-medium">ยังไม่ได้เลือกรถจากสต็อกสาขา</p>
                <p className="text-[11px] text-gray-400">คลิกเลือกรถจากช่องด้านซ้ายเพื่อเพิ่มในรายการสั่งล้าง</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.vin}
                    className="p-4 rounded-xl border border-gray-200 bg-[#fbfdfc] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-900 text-sm">{item.vin}</span>
                          {item.licensePlate && (
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[10px]">
                              {item.licensePlate}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-[11px] mt-0.5">
                          {item.model} ({item.color})
                        </p>
                      </div>
                    </div>

                    {/* Form Controls for this VIN */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center w-full md:w-auto">
                      {/* Actual Wash Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          วันปฏิบัติงานจริง:
                        </label>
                        <input
                          type="date"
                          value={item.actualWashDate}
                          onChange={(e) => updateItemField(item.vin, 'actualWashDate', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#0f5238]"
                        />
                      </div>

                      {/* Wash Type */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          ประเภทการล้าง:
                        </label>
                        <select
                          value={item.washType}
                          onChange={(e) => updateItemField(item.vin, 'washType', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs font-semibold focus:ring-1 focus:ring-[#0f5238]"
                        >
                          <option value="STANDARD">Standard (฿180)</option>
                          <option value="DEEP_CLEAN">Deep Clean (฿350)</option>
                          <option value="POLISH">ขัดเคลือบเงา (฿650)</option>
                        </select>
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                          หมายเหตุ / จุดระวัง:
                        </label>
                        <input
                          type="text"
                          value={item.remarks}
                          onChange={(e) => updateItemField(item.vin, 'remarks', e.target.value)}
                          placeholder="เช่น ดูดฝุ่นเบาะหลัง"
                          className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-[#0f5238]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0">
                      <span className="font-bold text-[#0f5238] text-sm">
                        ฿{item.unitPrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleVehicle(branchStockVehicles.find(v => v.vin === item.vin)!)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Summary Bar */}
            {selectedItems.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                <div>
                  <span className="text-xs text-gray-500">ยอดรวมค่าบริการโดยประมาณ:</span>
                  <div className="text-2xl font-bold text-[#0f5238]">
                    ฿{totalEstimatedCost.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>บันทึก Order & ออกใบสั่งงาน</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* PDF Export & Order Confirmation Modal */}
      {createdJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">
                  บันทึกคำสั่งล้างรถสำเร็จ (Car Wash Order Created)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / Export PDF</span>
                </button>
                <button
                  onClick={() => router.push('/jobs')}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                >
                  ไปยังหน้ารวมงาน
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-6 border border-gray-200 rounded-2xl bg-white text-gray-900 flex flex-col gap-4 print:border-none print:p-0">
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
                  <p>ลงชื่อ ...................................................<br />({createdJob.requestedBy})<br />เจ้าหน้าที่สาขาผู้สั่งงาน</p>
                </div>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-48 border-b border-gray-400" />
                  <p>ลงชื่อ ...................................................<br />(...................................................)<br />ผู้แทน Supplier ผู้รับงาน</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
