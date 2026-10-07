'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  Car, 
  Loader2, 
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

interface ParsedVehicle {
  rowNum: number;
  vin: string;
  model: string;
  color: string;
  vehicleType: string;
  companyCode?: string;
  branchCodeOrName?: string;
  licensePlate?: string;
  mileage?: number;
  status?: string;
  isValid: boolean;
  errorMessage?: string;
}

interface VehicleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VehicleImportModal({ isOpen, onClose }: VehicleImportModalProps) {
  const { companies, branches, currentRole, currentBranchId, currentCompany, refreshData } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration options
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (user?.companyId) return user.companyId;
    if (currentCompany !== 'ALL') {
      const c = companies.find(item => item.code === currentCompany);
      if (c) return c.id;
    }
    return companies[0]?.id || '';
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (user?.branchId) return user.branchId;
    if (currentBranchId) return currentBranchId;
    return branches[0]?.id || '';
  });

  const [duplicateAction, setDuplicateAction] = useState<'UPDATE' | 'SKIP'>('UPDATE');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // File parsing states
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedVehicle[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter branches by selected company
  const availableBranches = branches.filter(b => b.companyId === selectedCompanyId);

  // ── Template Generator ──
  const handleDownloadTemplate = () => {
    // 1. Data Sheet (VehicleStock)
    const templateData = [
      {
        'เลขตัวถัง (VIN)': 'LC07C5EB4PA009988',
        'ยี่ห้อและรุ่น (Model)': 'BYD Dolphin Extended Range',
        'สีตัวถัง (Color)': 'Atlantis Grey',
        'ประเภทรถ (Type)': 'Hatchback',
        'เลขทะเบียน (License Plate)': 'กข-9988 กทม',
        'เลขไมล์ (Mileage)': 2500,
        'รหัสบริษัท (Company)': 'EV7',
        'สาขา (Branch)': 'EV7',
      },
      {
        'เลขตัวถัง (VIN)': 'LSJ574898PA001122',
        'ยี่ห้อและรุ่น (Model)': 'MG Cyberster EV',
        'สีตัวถัง (Color)': 'Inca Yellow',
        'ประเภทรถ (Type)': 'Convertible',
        'เลขทะเบียน (License Plate)': 'ป้ายแดง',
        'เลขไมล์ (Mileage)': 500,
        'รหัสบริษัท (Company)': 'GI',
        'สาขา (Branch)': 'GI Hub บางนา-สุวรรณภูมิ',
      },
      {
        'เลขตัวถัง (VIN)': 'NC07C5EB6PA003344',
        'ยี่ห้อและรุ่น (Model)': 'NETA V-II Smart',
        'สีตัวถัง (Color)': 'Midnight Grey',
        'ประเภทรถ (Type)': 'SUV',
        'เลขทะเบียน (License Plate)': '',
        'เลขไมล์ (Mileage)': 0,
        'รหัสบริษัท (Company)': 'GI',
        'สาขา (Branch)': 'GI-กาญจนาภิเษก',
      }
    ];

    const stockWorksheet = XLSX.utils.json_to_sheet(templateData);
    stockWorksheet['!cols'] = [
      { wch: 24 }, // VIN
      { wch: 32 }, // Model
      { wch: 18 }, // Color
      { wch: 16 }, // Type
      { wch: 26 }, // License Plate
      { wch: 16 }, // Mileage
      { wch: 22 }, // Company
      { wch: 26 }, // Branch
    ];

    // 2. Instructions Sheet
    const instructionsData = [
      {
        'ลำดับ': 1,
        'ชื่อคอลัมน์ (Column)': 'เลขตัวถัง (VIN)',
        'ความจำเป็น': 'จำเป็น (Required)',
        'ตัวอย่างข้อมูล': 'LC07C5EB4PA009988',
        'ค่าเริ่มต้นหากเว้นว่าง': '— (ไม่มีแถวนี้จะ Error)',
        'คำอธิบายและข้อกำหนด': 'เลขประจำตัวรถ/คัสซี (17 หลัก) ต้องไม่เว้นว่าง และต้องไม่ซ้ำกันภายในไฟล์เดียวกัน หากซ้ำกับในระบบจะอิงตามนโยบายที่เลือก (อัปเดตหรือข้าม)'
      },
      {
        'ลำดับ': 2,
        'ชื่อคอลัมน์ (Column)': 'ยี่ห้อและรุ่น (Model)',
        'ความจำเป็น': 'จำเป็น (Required)',
        'ตัวอย่างข้อมูล': 'BYD Dolphin Extended Range',
        'ค่าเริ่มต้นหากเว้นว่าง': '— (ไม่มีแถวนี้จะ Error)',
        'คำอธิบายและข้อกำหนด': 'ชื่อยี่ห้อและรุ่นรถ เช่น NETA V-II, MG Cyberster EV, BYD Atto 3'
      },
      {
        'ลำดับ': 3,
        'ชื่อคอลัมน์ (Column)': 'สีตัวถัง (Color)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': 'Atlantis Grey, ขาว, ดำ',
        'ค่าเริ่มต้นหากเว้นว่าง': 'มาตรฐาน',
        'คำอธิบายและข้อกำหนด': 'สีของตัวรถ หากเว้นว่างไว้ ระบบจะตั้งค่าเป็น "มาตรฐาน"'
      },
      {
        'ลำดับ': 4,
        'ชื่อคอลัมน์ (Column)': 'ประเภทรถ (Type)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': 'Sedan, SUV, Hatchback, Convertible',
        'ค่าเริ่มต้นหากเว้นว่าง': 'Sedan',
        'คำอธิบายและข้อกำหนด': 'ประเภทตัวถังรถ หากเว้นว่างไว้ ระบบจะตั้งค่าเป็น "Sedan"'
      },
      {
        'ลำดับ': 5,
        'ชื่อคอลัมน์ (Column)': 'เลขทะเบียน (License Plate)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': 'กข-9988 กทม หรือ ป้ายแดง',
        'ค่าเริ่มต้นหากเว้นว่าง': 'เว้นว่าง (ไม่มีเลขทะเบียน)',
        'คำอธิบายและข้อกำหนด': 'เลขทะเบียนรถ สำหรับรถใหม่ที่ยังไม่จดทะเบียน สามารถระบุ "ป้ายแดง" หรือเว้นว่างได้'
      },
      {
        'ลำดับ': 6,
        'ชื่อคอลัมน์ (Column)': 'เลขไมล์ (Mileage)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': '2500, 500, 0',
        'ค่าเริ่มต้นหากเว้นว่าง': '0',
        'คำอธิบายและข้อกำหนด': 'เลขไมล์สะสมของรถ ใส่เป็นตัวเลข (ไม่ต้องใส่หน่วย กม.)'
      },
      {
        'ลำดับ': 7,
        'ชื่อคอลัมน์ (Column)': 'รหัสบริษัท (Company)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': 'EV7 หรือ GI',
        'ค่าเริ่มต้นหากเว้นว่าง': 'ใช้บริษัทเริ่มต้นที่เลือกใน Modal',
        'คำอธิบายและข้อกำหนด': 'รหัสบริษัท หากไม่ระบุ ระบบจะใช้ค่าจากตัวเลือก "บริษัทเริ่มต้น" ในหน้าต่างการนำเข้า'
      },
      {
        'ลำดับ': 8,
        'ชื่อคอลัมน์ (Column)': 'สาขา (Branch)',
        'ความจำเป็น': 'ไม่บังคับ (Optional)',
        'ตัวอย่างข้อมูล': 'EV7, GI Hub บางนา-สุวรรณภูมิ',
        'ค่าเริ่มต้นหากเว้นว่าง': 'ใช้สาขาเริ่มต้นที่เลือกใน Modal',
        'คำอธิบายและข้อกำหนด': 'รหัสหรือชื่อสาขาที่รถประจำอยู่ หากไม่ระบุ ระบบจะใช้ค่าจาก "สาขาเริ่มต้น" ในหน้าต่างการนำเข้า'
      }
    ];

    const instructionWorksheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionWorksheet['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 28 }, // Column
      { wch: 22 }, // ความจำเป็น
      { wch: 30 }, // ตัวอย่าง
      { wch: 30 }, // ค่าเริ่มต้น
      { wch: 70 }, // คำอธิบาย
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, stockWorksheet, 'VehicleStock');
    XLSX.utils.book_append_sheet(workbook, instructionWorksheet, 'คำแนะนำ (Instructions)');
    XLSX.writeFile(workbook, 'vehicle_import_template.xlsx');
  };

  // ── Parse Uploaded File ──
  const processFile = (file: File) => {
    if (!file) return;
    setIsParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Auto-detect the sheet containing vehicle data (either named 'VehicleStock' or check headers for VIN)
        let targetSheetName = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
          const s = workbook.Sheets[name];
          const testRows: any[] = XLSX.utils.sheet_to_json(s, { header: 1, range: 0, defval: '' });
          if (testRows.length > 0 && Array.isArray(testRows[0])) {
            const headerStr = testRows[0].join(' ').toUpperCase();
            if (headerStr.includes('VIN') || headerStr.includes('เลขตัวถัง')) {
              targetSheetName = name;
              break;
            }
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          showToast('ไม่พบข้อมูลในไฟล์ที่เลือก กรุณาตรวจสอบเนื้อหาในไฟล์', 'warning');
          setParsedRows([]);
          setIsParsing(false);
          return;
        }

        const seenVins = new Set<string>();
        const results: ParsedVehicle[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1

          // Flexible header resolution
          const vin = String(
            row['เลขตัวถัง (VIN)'] || row['VIN'] || row['vin'] || row['เลขตัวถัง'] || row['คัสซี'] || ''
          ).trim().toUpperCase();

          const model = String(
            row['ยี่ห้อและรุ่น (Model)'] || row['Model'] || row['model'] || row['รุ่น'] || row['ยี่ห้อ'] || ''
          ).trim();

          const color = String(
            row['สีตัวถัง (Color)'] || row['Color'] || row['color'] || row['สี'] || ''
          ).trim() || 'มาตรฐาน';

          const vehicleType = String(
            row['ประเภทรถ (Type)'] || row['Type'] || row['type'] || row['ประเภท'] || ''
          ).trim() || 'Sedan';

          const licensePlate = String(
            row['เลขทะเบียน (License Plate)'] || row['License Plate'] || row['ทะเบียน'] || row['licensePlate'] || ''
          ).trim() || undefined;

          const rawMileage = row['เลขไมล์ (Mileage)'] || row['Mileage'] || row['mileage'] || row['ไมล์'];
          const mileage = rawMileage ? parseInt(String(rawMileage).replace(/[^0-9]/g, ''), 10) : undefined;

          const companyCode = String(
            row['รหัสบริษัท (Company)'] || row['Company'] || row['company'] || row['บริษัท'] || ''
          ).trim() || undefined;

          const branchCodeOrName = String(
            row['สาขา (Branch)'] || row['Branch'] || row['branch'] || row['สาขา'] || ''
          ).trim() || undefined;

          let isValid = true;
          let errorMessage = '';

          if (!vin) {
            isValid = false;
            errorMessage = 'ขาดเลขตัวถัง (VIN)';
          } else if (seenVins.has(vin)) {
            isValid = false;
            errorMessage = `เลขตัวถัง (VIN) ซ้ำกับแถวก่อนหน้าในไฟล์`;
          } else if (!model) {
            isValid = false;
            errorMessage = 'ขาดข้อมูลรุ่นรถ (Model)';
          }

          if (vin) seenVins.add(vin);

          results.push({
            rowNum,
            vin,
            model,
            color,
            vehicleType,
            licensePlate,
            mileage: Number.isNaN(mileage) ? undefined : mileage,
            companyCode,
            branchCodeOrName,
            isValid,
            errorMessage,
          });
        });

        setParsedRows(results);
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาใช้ไฟล์ .xlsx หรือ .csv ที่ถูกต้อง', 'error');
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);

  // ── Submit Import to Backend ──
  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      showToast('ไม่มีรายการรถที่ถูกต้องพร้อมนำเข้า', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vehicles: validRows.map(r => ({
          vin: r.vin,
          model: r.model,
          color: r.color,
          vehicleType: r.vehicleType,
          licensePlate: r.licensePlate,
          mileage: r.mileage,
          companyCode: r.companyCode,
          branchCodeOrName: r.branchCodeOrName,
        })),
        defaultCompanyId: selectedCompanyId,
        defaultBranchId: selectedBranchId,
        duplicateAction,
      };

      const res = await fetch('/api/vehicles/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await refreshData();
        showToast(
          `นำเข้ารถสำเร็จ ${data.count.imported} คัน (เพิ่มใหม่ ${data.count.created} คัน, อัปเดต ${data.count.updated} คัน${data.count.skipped > 0 ? `, ข้าม ${data.count.skipped} คัน` : ''})`, 
          'success'
        );
        onClose();
      } else {
        showToast(data.error || 'ไม่สามารถนำเข้าข้อมูลได้', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>นำเข้าข้อมูลรถจากไฟล์ Excel (Import Vehicles)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                อัปโหลดไฟล์สต็อกรถเพื่อเพิ่มรถใหม่หรืออัปเดตข้อมูลรถเดิมในระบบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Controls: Company, Branch, Duplicate Policy & Template */}
          <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              {/* Default Company */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  บริษัทเริ่มต้น:
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  disabled={user?.role === 'BRANCH'}
                  className="w-full h-10 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#0f5238] disabled:bg-gray-100"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Default Branch */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  สาขาเริ่มต้น (ถ้าไม่ระบุในไฟล์):
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={user?.role === 'BRANCH'}
                  className="w-full h-10 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#0f5238] disabled:bg-gray-100"
                >
                  {availableBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Duplicate Action */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  หากพบ VIN ซ้ำในระบบ:
                </label>
                <select
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value as 'UPDATE' | 'SKIP')}
                  className="w-full h-10 px-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-[#0f5238]"
                >
                  <option value="UPDATE">อัปเดตข้อมูลเดิม (Upsert)</option>
                  <option value="SKIP">ข้ามรายการเดิม (Skip Duplicate)</option>
                </select>
              </div>

              {/* Template Download Button — aligned with dropdowns */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1 invisible sm:visible">
                  &nbsp;
                </label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full h-10 flex items-center justify-center gap-2 px-3.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-[#0f5238] text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด Template (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guidelines Accordion */}
          <div className="rounded-2xl border border-emerald-100 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-50/40 hover:bg-emerald-50 text-xs font-bold text-[#0f5238] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>ข้อกำหนดและคำแนะนำการเตรียมข้อมูล Excel (คลิกเพื่อ{showGuide ? 'ซ่อนคำแนะนำ' : 'ดูคำแนะนำ'})</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                {showGuide ? 'ซ่อน' : 'แสดง'}
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>
            {showGuide && (
              <div className="p-4 bg-white border-t border-emerald-100/70 text-xs text-gray-700 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-red-50/60 border border-red-100">
                    <div className="font-bold text-red-700 flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      คอลัมน์ที่จำเป็นต้องมี (Required)
                    </div>
                    <ul className="space-y-1 text-gray-700 text-[11px] leading-relaxed">
                      <li>• <strong className="text-gray-900">เลขตัวถัง (VIN):</strong> 17 หลัก ห้ามเว้นว่าง และต้องไม่ซ้ำกันในไฟล์</li>
                      <li>• <strong className="text-gray-900">ยี่ห้อและรุ่น (Model):</strong> ชื่อยี่ห้อและรุ่นรถ เช่น NETA V-II, BYD Dolphin</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      คอลัมน์ไม่บังคับ (Optional / ค่าเริ่มต้น)
                    </div>
                    <ul className="space-y-1 text-gray-700 text-[11px] leading-relaxed">
                      <li>• <strong className="text-gray-900">สีตัวถัง (Color):</strong> หากเว้นว่างจะเป็น "มาตรฐาน"</li>
                      <li>• <strong className="text-gray-900">ประเภทรถ (Type):</strong> เช่น Sedan, SUV, Hatchback (ค่าเริ่มต้น: Sedan)</li>
                      <li>• <strong className="text-gray-900">เลขทะเบียน:</strong> ใส่เลขทะเบียนจริง หรือ "ป้ายแดง" หรือเว้นว่างได้</li>
                      <li>• <strong className="text-gray-900">เลขไมล์:</strong> ตัวเลขระยะทาง เช่น 2500 (ค่าเริ่มต้น: 0)</li>
                      <li>• <strong className="text-gray-900">รหัสบริษัท / สาขา:</strong> หากเว้นว่าง ระบบจะใช้ค่าเริ่มต้นที่เลือกด้านบน</li>
                    </ul>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100/80 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ทริค:</strong> ในไฟล์ Template (.xlsx) ที่ดาวน์โหลด จะมีชีต <strong>"คำแนะนำ (Instructions)"</strong> แนบรายละเอียดตัวอย่างและเงื่อนไขครบถ้วนทุกคอลัมน์ สามารถเปิดดูประกอบการทำงานได้เลยครับ
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0f5238] bg-emerald-50/70 scale-[0.99]'
                  : 'border-gray-200 hover:border-emerald-500 hover:bg-gray-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0f5238] flex items-center justify-center shadow-inner">
                {isParsing ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {isParsing ? 'กำลังอ่านและประมวลผลไฟล์...' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  รองรับไฟล์ Microsoft Excel (.xlsx, .xls) หรือไฟล์ .csv (ขนาดไม่เกิน 10MB)
                </p>
              </div>
            </div>
          ) : (
            /* Preview State with File Stats */
            <div className="flex flex-col gap-3">
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-gray-900 truncate max-w-xs">{fileName}</span>
                  <span className="text-gray-500">({parsedRows.length} รายการ)</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>พร้อมนำเข้า {validRows.length} คัน</span>
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ข้อผิดพลาด {invalidRows.length} คัน</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-500 hover:text-gray-800 underline font-medium cursor-pointer"
                  >
                    เปลี่ยนไฟล์
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 border-b border-gray-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">แถว</th>
                      <th className="py-2.5 px-3">สถานะ</th>
                      <th className="py-2.5 px-3">เลขตัวถัง (VIN)</th>
                      <th className="py-2.5 px-3">ยี่ห้อ/รุ่น (Model)</th>
                      <th className="py-2.5 px-3">สีตัวถัง</th>
                      <th className="py-2.5 px-3">ประเภท</th>
                      <th className="py-2.5 px-3">ทะเบียน</th>
                      <th className="py-2.5 px-3">เลขไมล์</th>
                      <th className="py-2.5 px-3">สาขา / บริษัท</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.map((r) => (
                      <tr 
                        key={r.rowNum} 
                        className={`hover:bg-gray-50/80 transition-colors ${
                          !r.isValid ? 'bg-rose-50/40 text-rose-900' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px]">{r.rowNum}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>พร้อม</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]" title={r.errorMessage}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{r.errorMessage}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">{r.vin || '-'}</td>
                        <td className="py-2 px-3 font-medium text-gray-800">{r.model || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.color || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.vehicleType || '-'}</td>
                        <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{r.licensePlate || '-'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.mileage !== undefined ? `${r.mileage.toLocaleString()} กม.` : '-'}</td>
                        <td className="py-2 px-3 text-gray-500 text-[11px] whitespace-nowrap">
                          {r.branchCodeOrName || 'สาขาเริ่มต้น'} ({r.companyCode || 'บริษัทเริ่มต้น'})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isSubmitting || validRows.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0f5238] text-white text-xs font-bold hover:bg-[#0a3d28] shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังนำเข้าข้อมูล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันนำเข้า ({validRows.length} คัน)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
