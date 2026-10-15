'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { UserRole, CompanyCode } from '@/types';
import { 
  Settings, 
  Database, 
  Shield, 
  Building2, 
  Store, 
  RotateCcw, 
  CheckCircle2, 
  Server, 
  KeyRound,
  Info,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { CancelJobConfirmModal } from '@/components/jobs';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';

export default function SettingsPage() {
  const router = useRouter();
  const { 
    currentRole, 
    setCurrentRole, 
    currentCompany, 
    setCurrentCompany, 
    currentBranchId, 
    setCurrentBranchId, 
    currentSupplierId, 
    setCurrentSupplierId,
    branches,
    suppliers,
    companies,
    resetToDefaultData 
  } = useApp();

  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const companyOptions: DropdownOption[] = useMemo(() => [
    { value: 'ALL', label: 'ทุกบริษัท (All)', icon: Building2 },
    { value: 'EV7', label: 'EV7 (บริษัท อีวี เซเว่น จำกัด)', dot: '#2d6a4f' },
    { value: 'GI', label: 'GI (บริษัท โกลด์ อินทิเกรท จำกัด / Gold Integrate)', dot: '#3b82f6' },
  ], []);

  const branchOptions: DropdownOption[] = useMemo(() => [
    ...branches.map(b => ({
      value: b.id,
      label: b.name,
      sublabel: b.code ? `รหัสสาขา: ${b.code}` : undefined,
      dot: b.code.startsWith('EV7') || b.code === 'GI06' ? '#2d6a4f' : '#3b82f6',
      icon: Store,
    })),
  ], [branches]);

  const handleConfirmReset = () => {
    resetToDefaultData();
    setShowResetConfirmModal(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          <span>ตั้งค่าระบบ (System Settings & Environment)</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          จัดการสิทธิ์ สลับบทบาทผู้ใช้งาน และตรวจสอบการเชื่อมต่อฐานข้อมูล Microsoft SQL Server
        </p>
      </div>

      {/* SQL Server Database Setup Guide Card */}
      <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              การเชื่อมต่อฐานข้อมูล Microsoft SQL Server
            </h2>
            <p className="text-xs text-gray-500">
              ระบบพร้อมเชื่อมต่อฐานข้อมูลผ่าน Prisma ORM (`provider = &quot;sqlserver&quot;`)
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#f4f9f5] border border-emerald-950/10 text-xs flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <Info className="w-4 h-4" />
            <span>ไฟล์ .env ได้ถูกสร้างไว้เรียบร้อยแล้ว:</span>
          </div>
          <p className="text-gray-600 leading-relaxed">
            ท่านสามารถเปิดไฟล์ <code className="px-1.5 py-0.5 rounded bg-white font-mono font-bold text-[#0f5238]">.env</code> ในรูทโปรเจกต์ และระบุ Connection String จริงของ SQL Server ของท่านในตัวแปร:
          </p>
          <pre className="p-3 rounded-xl bg-gray-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
DATABASE_URL=&quot;sqlserver://localhost:1433;database=SupplierJobDB;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true;&quot;
          </pre>
          <p className="text-[11px] text-gray-500">
            * ตามกฎความปลอดภัยของ Developer Protocols ระบบจะไม่รัน database migration ต่อฐานข้อมูลภายนอกโดยอัตโนมัติ 
            เมื่อระบุค่าจริงแล้ว ท่านสามารถซิงค์ schema ผ่าน <code className="font-mono">npx prisma db push</code> หรือ migration script ได้ด้วยตนเอง
          </p>
        </div>
      </div>

      {/* Role Switcher Section */}
      <div className="p-6 rounded-3xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <span>จำลองสลับสิทธิ์ผู้ใช้งาน (Interactive Role Simulation)</span>
        </h2>
        <p className="text-xs text-gray-500">
          เลือกว่าต้องการทดสอบมุมมองระบบในฐานะ Admin, Branch หรือ Supplier
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            {
              role: 'ADMIN' as UserRole,
              title: '1. Admin ส่วนกลาง',
              desc: 'ดูและจัดการได้ทุกบริษัท ทุกสาขา ทุกงาน และ Invoice',
            },
            {
              role: 'BRANCH' as UserRole,
              title: '2. Branch (สาขา)',
              desc: 'สร้างงานเฉพาะรถในสต็อกสาขาตนเอง และตรวจรับงาน',
            },
            {
              role: 'SUPPLIER' as UserRole,
              title: '3. Supplier คู่ค้า',
              desc: 'ดูงานที่รับมอบหมาย แนบรูปหลักฐาน และออกใบวางบิล (เข้าสู่ Mobile Version)',
            },
          ]).map(item => (
            <div
              key={item.role}
              onClick={() => {
                setCurrentRole(item.role);
                if (item.role === 'SUPPLIER') {
                  router.push('/vendor');
                }
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                currentRole === item.role
                  ? 'border-[#0f5238] bg-[#f4f9f5] ring-2 ring-[#0f5238]/20'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="font-bold text-sm text-gray-900">{item.title}</span>
              <p className="text-xs text-gray-500 leading-normal">{item.desc}</p>
              {currentRole === item.role && (
                <span className="text-[10px] font-bold text-[#0f5238] flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>กำลังใช้งาน</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Sub-selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              สังกัดบริษัทที่ดำเนินงาน:
            </label>
            <CustomDropdown
              value={currentCompany}
              onChange={(val) => setCurrentCompany(val as any)}
              options={companyOptions}
              icon={Building2}
              dropdownWidth="w-full"
              placeholder="ทุกบริษัท"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              สาขาปัจจุบัน (สำหรับ Role สาขา):
            </label>
            <CustomDropdown
              value={currentBranchId}
              onChange={setCurrentBranchId}
              options={branchOptions}
              icon={Store}
              dropdownWidth="w-full"
              placeholder="เลือกสาขา"
            />
          </div>
        </div>
      </div>

      {/* Mobile Supplier Portal Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0f5238] to-[#1b4332] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Smartphone className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">หน้าจอมือถือ EV7 Supplier Portal</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Stitch Design
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              หน้าจอสำหรับคนขับรถสไลด์และช่างล้างรถ: อัปโหลดรูปภาพหลักฐาน ตรวจสอบงาน และวางบิลผ่านมือถือ
            </p>
          </div>
        </div>

        <Link
          href="/mobile"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-emerald-50 text-[#0f5238] text-xs font-bold transition-all shadow-sm shrink-0 active:scale-98"
        >
          <span>เปิดหน้าจอมือถือ (/mobile)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Reset Mock Data Card */}
      <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">รีเซ็ตข้อมูลตัวอย่าง (Reset Demo Data)</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ล้างข้อมูลในบราวเซอร์และกู้คืนงาน สต็อกรถ และบิลตั้งต้นสำหรับการทดสอบใหม่
          </p>
          {resetSuccess && (
            <p className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว!</span>
            </p>
          )}
        </div>

        <button
          onClick={() => setShowResetConfirmModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>รีเซ็ตข้อมูลเริ่มต้น</span>
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      <CancelJobConfirmModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        onConfirm={handleConfirmReset}
        title="ยืนยันการรีเซ็ตข้อมูลระบบ"
        subtitle="คุณกำลังจะรีเซ็ตข้อมูลระบบทั้งหมดกลับเป็นค่าเริ่มต้น"
        warningMessage="ข้อมูลตัวอย่างและงานทั้งหมดจะถูกคืนค่ากลับเป็นค่าเริ่มต้น การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmButtonText="ยืนยันรีเซ็ตข้อมูล"
      />
    </div>
  );
}
