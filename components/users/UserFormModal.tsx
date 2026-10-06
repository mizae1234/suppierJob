'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { UserItem, CompanyData, SupplierData } from './types';
import {
  UserPlus,
  Edit2,
  X,
  RefreshCw,
  MapPin,
  Building2,
  Truck,
  Shield,
  RotateCw,
} from 'lucide-react';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export interface UserFormModalProps {
  isOpen: boolean;
  editingUser: UserItem | null;
  companies: CompanyData[];
  suppliers: SupplierData[];
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function UserFormModal({
  isOpen,
  editingUser,
  companies,
  suppliers,
  onClose,
  onSuccess,
  showToast,
}: UserFormModalProps) {
  const theme = useTheme();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    role: 'BRANCH' as 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER',
    companyId: '',
    branchId: '',
    supplierId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        password: '',
        displayName: editingUser.displayName,
        firstName: editingUser.firstName || '',
        lastName: editingUser.lastName || '',
        position: editingUser.position || '',
        phone: editingUser.phone || '',
        role: editingUser.role,
        companyId: editingUser.companyId || (companies[0]?.id || ''),
        branchId: editingUser.branchId || '',
        supplierId: editingUser.supplierId || (suppliers[0]?.id || ''),
      });
    } else if (isOpen) {
      const defaultCompany = companies[0]?.id || '';
      const defaultBranch = companies[0]?.branches[0]?.id || '';
      const defaultSupplier = suppliers[0]?.id || '';

      setFormData({
        username: '',
        password: generatePassword(),
        displayName: '',
        firstName: '',
        lastName: '',
        position: '',
        phone: '',
        role: 'BRANCH',
        companyId: defaultCompany,
        branchId: defaultBranch,
        supplierId: defaultSupplier,
      });
    }
  }, [editingUser, isOpen, companies, suppliers]);

  const modalBranches = useMemo(() => {
    if (!formData.companyId) return [];
    const comp = companies.find(c => c.id === formData.companyId);
    return comp?.branches || [];
  }, [formData.companyId, companies]);

  if (!isOpen && !editingUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim()) {
      showToast('กรุณากรอกชื่อที่แสดง (Display Name)', 'warning');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.displayName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            position: formData.position,
            phone: formData.phone,
            role: formData.role,
            companyId: formData.role === 'MASTER' ? null : formData.companyId,
            branchId: formData.role === 'BRANCH' ? formData.branchId : null,
            supplierId: formData.role === 'SUPPLIER' ? formData.supplierId : null,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
          onSuccess();
          onClose();
        } else {
          showToast(data.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
      } else {
        if (!formData.username.trim() || formData.username.length < 3) {
          showToast('Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร', 'warning');
          setFormSubmitting(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
          setFormSubmitting(false);
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            displayName: formData.displayName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            position: formData.position,
            phone: formData.phone,
            role: formData.role,
            companyId: formData.role === 'MASTER' ? null : formData.companyId,
            branchId: formData.role === 'BRANCH' ? formData.branchId : null,
            supplierId: formData.role === 'SUPPLIER' ? formData.supplierId : null,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast(`สร้างผู้ใช้ "${data.user.displayName}" สำเร็จ`, 'success');
          onSuccess();
          onClose();
        } else {
          showToast(data.error || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้', 'error');
        }
      }
    } catch (err) {
      console.error('Submit user error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-scale-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: theme.primary }}
            >
              {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                {editingUser ? `แก้ไขผู้ใช้งาน: ${editingUser.displayName}` : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {editingUser ? 'แก้ไขข้อมูล สิทธิ์ และสังกัดของผู้ใช้' : 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่ในระบบ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Username & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                value={formData.username}
                onChange={e => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
                placeholder="เช่น user.ev7"
                className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              />
              {editingUser && (
                <span className="text-[10px] text-gray-400 mt-0.5 block">Username ไม่สามารถเปลี่ยนได้</span>
              )}
            </div>

            {!editingUser && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    รหัสผ่านเริ่มต้น <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> สุ่มรหัส
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ชื่อที่แสดง (Display Name) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.displayName}
              onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="เช่น สมชาย ใจดี (พระราม 9)"
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600"
            />
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อจริง</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="ชื่อจริง"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="นามสกุล"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          {/* Position & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ตำแหน่งงาน</label>
              <input
                type="text"
                value={formData.position}
                onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="เช่น ผู้จัดการสาขา, จนท.ขาย"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="08X-XXX-XXXX"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              บทบาทและสิทธิ์การใช้งาน (Role) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'BRANCH', label: 'BRANCH', desc: 'เจ้าหน้าที่สาขา', icon: MapPin },
                { key: 'ADMIN', label: 'ADMIN', desc: 'ผู้ดูแลระดับบริษัท', icon: Building2 },
                { key: 'SUPPLIER', label: 'SUPPLIER', desc: 'คู่ค้าบริการ', icon: Truck },
                { key: 'MASTER', label: 'MASTER', desc: 'ผู้ดูแลระบบสูงสุด', icon: Shield },
              ].map(r => {
                const isSelected = formData.role === r.key;
                const Icon = r.icon;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: r.key as any }))}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950'
                        : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-bold text-xs">{r.label}</p>
                      <p className="text-[10px] text-gray-400">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional: Company & Branch if ADMIN or BRANCH */}
          {(formData.role === 'ADMIN' || formData.role === 'BRANCH') && (
            <div className="space-y-3 p-3.5 rounded-xl bg-gray-50/70 border border-gray-200/70">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  สังกัดบริษัท <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.companyId}
                  onChange={e => {
                    const newCompId = e.target.value;
                    const comp = companies.find(c => c.id === newCompId);
                    setFormData(prev => ({
                      ...prev,
                      companyId: newCompId,
                      branchId: comp?.branches[0]?.id || '',
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden cursor-pointer"
                >
                  <option value="">เลือกบริษัท</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.role === 'BRANCH' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    สังกัดสาขา <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={e => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="">เลือกสาขา</option>
                    {modalBranches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                  {modalBranches.length === 0 && (
                    <span className="text-[10px] text-amber-600 mt-1 block">
                      บริษัทนี้ยังไม่มีข้อมูลสาขา
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conditional: Supplier if SUPPLIER */}
          {formData.role === 'SUPPLIER' && (
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                สังกัดคู่ค้า Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={e => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:outline-hidden cursor-pointer"
              >
                <option value="">เลือก Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: theme.primary }}
            >
              {formSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้งาน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
