'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Branch } from '@/types';
import {
  Building2,
  MapPin,
  Map,
  X,
  Car,
  Trash2,
  Save,
  AlertCircle,
  Users as UsersIcon,
} from 'lucide-react';

export interface BranchDetailModalProps {
  branch: Branch;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onOpenMap: () => void;
}

export function BranchDetailModal({ branch, onClose, onUpdated, onDeleted, onOpenMap }: BranchDetailModalProps) {
  const { currentRole, currentCompany } = useApp();
  const { user } = useAuth();
  const isBranchUser =
    currentRole === 'BRANCH' ||
    user?.role === 'BRANCH' ||
    Boolean(user?.branchId) ||
    currentCompany === 'EV7' ||
    user?.companyCode === 'EV7' ||
    branch.code === 'EV7';

  const [activeTab, setActiveTab] = useState<'INFO' | 'VEHICLES' | 'USERS'>('INFO');
  const [detailData, setDetailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit form state
  const [name, setName] = useState(branch.name);
  const [code, setCode] = useState(branch.code);
  const [phone, setPhone] = useState(branch.phone || '');
  const [address, setAddress] = useState(branch.address || '');
  const [lat, setLat] = useState<string>(branch.latitude ? String(branch.latitude) : '');
  const [lng, setLng] = useState<string>(branch.longitude ? String(branch.longitude) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch full details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/branches/${branch.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetailData(data.branch);
        }
      } catch (e) {
        console.error('Fetch branch detail failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [branch.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      } else {
        onUpdated();
      }
    } catch (e) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบสาขา ${branch.name} (${branch.code}) หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    try {
      const res = await fetch(`/api/branches/${branch.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'ไม่สามารถลบสาขาได้');
      } else {
        onDeleted();
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{branch.name}</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#0f5238] font-bold text-xs font-mono">
                  {branch.code}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                บริษัท: {branch.companyName || branch.companyCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100 bg-[#fbfdfc]">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'INFO'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            ข้อมูลและการแก้ไข
          </button>
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'VEHICLES'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>รถในสาขา ({detailData?.vehicles?.length ?? '...'})</span>
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'USERS'
                ? 'text-[#0f5238] border-b-2 border-[#0f5238]'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>ผู้ใช้งานสาขา ({detailData?.users?.length ?? '...'})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'INFO' && (
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ชื่อสาขา: {isBranchUser ? <span className="text-[10px] text-gray-400 font-normal">(จัดการโดยส่วนกลาง)</span> : '*'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isBranchUser}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                      isBranchUser
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#0f5238]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    รหัสสาขา (Code): {isBranchUser ? <span className="text-[10px] text-gray-400 font-normal">(จัดการโดยส่วนกลาง)</span> : '*'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isBranchUser}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`w-full h-10 px-3 rounded-xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                      isBranchUser
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#0f5238]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 02-123-4567, 089-xxx-xxxx"
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ที่อยู่สาขา:
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ระบุที่อยู่สาขา เช่น เลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238] resize-none"
                />
              </div>

              {/* GPS Coordinates & Map Button */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>พิกัด GPS สำหรับระบบนำทางและคำนวณระยะทาง</span>
                  </span>
                  <button
                    type="button"
                    onClick={onOpenMap}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f5238] text-white text-[11px] font-bold hover:bg-[#0a3d28] transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>เปิดแผนที่ปักหมุด</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 font-semibold mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="เช่น 13.7563"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 font-semibold mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="เช่น 100.5018"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-gray-200 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-2 pt-4 border-t border-gray-100 flex items-center justify-between">
                {currentRole === 'MASTER' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบสาขานี้</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'VEHICLES' && (
            <div>
              {isLoading ? (
                <div className="p-8 text-center text-xs text-gray-400">กำลังโหลดข้อมูลรถ...</div>
              ) : !detailData?.vehicles || detailData.vehicles.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500">
                  ไม่มีรถในสต็อกประจำสาขานี้ในขณะนี้
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detailData.vehicles.map((v: any) => (
                    <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-gray-900">{v.vin}</span>
                        <p className="text-[11px] text-gray-500">
                          {v.brand} {v.model} {v.color ? `(${v.color})` : ''} • ทะเบียน: {v.licensePlate || '-'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'USERS' && (
            <div>
              {isLoading ? (
                <div className="p-8 text-center text-xs text-gray-400">กำลังโหลดรายชื่อผู้ใช้...</div>
              ) : !detailData?.users || detailData.users.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-500">
                  ยังไม่มีผู้ใช้หรือพนักงานผูกกับสาขานี้
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {detailData.users.map((u: any) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{u.name}</span>
                        <p className="text-[11px] text-gray-400">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BranchDetailModal;
