'use client';

import React, { useState, useEffect } from 'react';
import { X, Wrench, Car, Hash, FileText, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface AddServiceVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (data: {
    licensePlate: string;
    model: string;
    color: string;
    vin?: string;
    roNumber?: string;
  }) => void;
  initialSearchTerm?: string;
}

const COMMON_MODELS = [
  'AION Y Plus',
  'AION ES',
  'AION V',
  'HYPTEC HT',
  'HYPTEC SSR',
];

const COMMON_COLORS = [
  'ขาว',
  'ดำ',
  'เทา',
  'เงิน',
  'น้ำเงิน',
  'ทอง',
];

export function AddServiceVehicleModal({
  isOpen,
  onClose,
  onAddVehicle,
  initialSearchTerm = '',
}: AddServiceVehicleModalProps) {
  const theme = useTheme();

  const [licensePlate, setLicensePlate] = useState('');
  const [model, setModel] = useState('AION Y Plus');
  const [color, setColor] = useState('ขาว');
  const [vin, setVin] = useState('');
  const [roNumber, setRoNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-detect if initialSearchTerm looks like a plate or VIN
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    const term = initialSearchTerm.trim();
    if (term) {
      if (/^[0-9A-HJ-NPR-Z]{17}$/i.test(term)) {
        setVin(term.toUpperCase());
        setLicensePlate('');
      } else {
        setLicensePlate(term);
        setVin('');
      }
    } else {
      setLicensePlate('');
      setVin('');
      setRoNumber('');
    }
  }, [isOpen, initialSearchTerm]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = licensePlate.trim();
    const cleanModel = model.trim();

    if (!cleanPlate && !vin.trim()) {
      setErrorMsg('กรุณาระบุเลขทะเบียนรถ หรือเลขตัวถัง (VIN)');
      return;
    }
    if (!cleanModel) {
      setErrorMsg('กรุณาระบุรุ่นรถ');
      return;
    }

    onAddVehicle({
      licensePlate: cleanPlate,
      model: cleanModel,
      color: color.trim() || 'ไม่ระบุสี',
      vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
      roNumber: roNumber.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner"
              style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
            >
              🔧
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                เพิ่มรถ Service (รถลูกค้านอกสต็อก)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                ระบุข้อมูลรถลูกค้าเพื่อเพิ่มในรายการสั่งล้างรถ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. License Plate (Required) */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
              <span>เลขทะเบียนรถ</span>
              <span className="text-red-500 font-bold">*</span>
              <span className="text-[10px] font-normal text-gray-400">(ใช้สำหรับตรวจรับงาน)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={licensePlate}
                onChange={e => {
                  setLicensePlate(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="เช่น 3ขข 1234 กรุงเทพฯ หรือ กข 9988"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white transition-all placeholder:font-normal placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          {/* 2. Model Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-gray-500" />
              <span>รุ่นรถ</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_MODELS.map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setModel(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    model === m
                      ? 'bg-[#0f5238] text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="พิมพ์ชื่อรุ่นอื่นๆ หรือระบุรุ่น..."
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white"
            />
          </div>

          {/* 3. Color Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              สีรถ
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    color === c
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="หรือระบุสี..."
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white"
            />
          </div>

          {/* 4. VIN (Optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-500" />
                <span>เลขตัวถัง (VIN)</span>
                <span className="text-[10px] font-normal text-gray-400">(ไม่บังคับ)</span>
              </span>
            </label>
            <input
              type="text"
              value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())}
              placeholder="ระบุ VIN 17 หลัก หรือ 6 ตัวท้าย (ถ้ามี)"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white placeholder:font-sans"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              * หากไม่ทราบ ระบบจะสร้างรหัสอ้างอิงอัตโนมัติจากทะเบียน เช่น SVC-[ทะเบียน]
            </p>
          </div>

          {/* 5. Repair Order / RO No. (Optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>เลขที่ใบสั่งซ่อม / RO No.</span>
              <span className="text-[10px] font-normal text-gray-400">(ไม่บังคับ)</span>
            </label>
            <input
              type="text"
              value={roNumber}
              onChange={e => setRoNumber(e.target.value)}
              placeholder="เช่น RO-670912 (อ้างอิงใบสั่งซ่อมศูนย์บริการ)"
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#0f5238] bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0d452f] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>เพิ่มลงในรายการสั่งล้าง</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
