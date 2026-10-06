'use client';

import React, { useState } from 'react';
import { Branch, Company } from '@/types';
import {
  Building2,
  MapPin,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react';

export interface CreateBranchModalProps {
  companies: Company[];
  onClose: () => void;
  onCreated: (branch: Branch) => void;
}

export function CreateBranchModal({ companies, onClose, onCreated }: CreateBranchModalProps) {
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !code.trim() || !name.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลบริษัท รหัสสาขา และชื่อสาขา');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          code: code.trim(),
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'ไม่สามารถสร้างสาขาได้');
      } else {
        const data = await res.json();
        onCreated(data.branch);
      }
    } catch (e) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">เพิ่มสาขาใหม่</h2>
              <p className="text-xs text-gray-400">สร้างสาขาและกำหนดข้อมูลพิกัดและที่อยู่</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              สังกัดบริษัท: *
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                รหัสสาขา: *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น GI-NEW หรือ BKK-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อสาขา: *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น สาขาบางนา"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              เบอร์โทรศัพท์:
            </label>
            <input
              type="text"
              placeholder="เช่น 02-xxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ที่อยู่สาขา:
            </label>
            <textarea
              rows={2}
              placeholder="ที่อยู่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Latitude (ถ้ามี)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 13.7563"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Longitude (ถ้ามี)</label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 100.5018"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f5238]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#0a3d28] text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'กำลังสร้าง...' : 'สร้างสาขา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateBranchModal;
