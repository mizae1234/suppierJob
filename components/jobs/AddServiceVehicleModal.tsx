'use client';

import React, { useState, useEffect } from 'react';
import { X, Wrench, Car, Hash, FileText, Check, AlertCircle, ChevronDown } from 'lucide-react';
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
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [roNumber, setRoNumber] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      setErrorMsg('กรุณาระบุเลขทะเบียนรถ');
      return;
    }

    onAddVehicle({
      licensePlate: cleanPlate,
      model: cleanModel || 'รถลูกค้า Service',
      color: color.trim() || 'ไม่ระบุสี',
      vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
      roNumber: roNumber.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-gray-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner"
              style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
            >
              🚗
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                เพิ่มรถ Service จากทะเบียน
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                กรอกเพียงเลขทะเบียนรถเพื่อส่งล้างได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
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
          {/* 1. License Plate (Only required field) */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
              <span>เลขทะเบียนรถ</span>
              <span className="text-red-500 font-bold">*</span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                กรอกแค่ทะเบียนก็พอ
              </span>
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
                className="w-full h-11 px-3.5 rounded-xl border-2 border-emerald-600/70 text-base font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-[#0f5238] bg-white transition-all placeholder:font-normal placeholder:text-gray-400 shadow-2xs"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              กด Enter เพื่อเพิ่มลงรายการสั่งล้างทันที (รุ่นจะกำหนดเป็น 'รถลูกค้า Service' ให้อัตโนมัติ)
            </p>
          </div>

          {/* Optional Details Collapsible */}
          <div className="border border-gray-200/90 rounded-2xl overflow-hidden bg-gray-50/50">
            <button
              type="button"
              onClick={() => setShowAdvanced(prev => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-gray-400" />
                <span>ระบุข้อมูลเพิ่มเติม (รุ่น, สี, เลข RO - ไม่บังคับ)</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="p-3.5 pt-2 flex flex-col gap-3 border-t border-gray-100 bg-white">
                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    รุ่นรถ (ค่าเริ่มต้น: รถลูกค้า Service)
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_MODELS.map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setModel(m)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
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
                    placeholder="พิมพ์ชื่อรุ่นอื่นๆ เช่น AION Y Plus หรือ รถลูกค้าทั่วไป"
                    className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0f5238] bg-white"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    สีรถ
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_COLORS.map(c => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setColor(c)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
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
                    placeholder="หรือพิมพ์สี..."
                    className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0f5238] bg-white"
                  />
                </div>

                {/* RO No */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    เลขที่ใบสั่งซ่อม / RO No.
                  </label>
                  <input
                    type="text"
                    value={roNumber}
                    onChange={e => setRoNumber(e.target.value)}
                    placeholder="เช่น RO-670912 (อ้างอิงศูนย์บริการ)"
                    className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0f5238] bg-white"
                  />
                </div>

                {/* VIN */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    เลขตัวถัง (VIN)
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={e => setVin(e.target.value.toUpperCase())}
                    placeholder="ถ้ามี VIN ระบุที่นี่ (หากไม่ระบุ ระบบสร้างให้อัตโนมัติ)"
                    className="w-full h-8 px-2.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 focus:outline-none focus:border-[#0f5238] bg-white placeholder:font-sans"
                  />
                </div>
              </div>
            )}
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
              className="px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0d452f] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
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
