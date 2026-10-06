'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, X, RefreshCw, Check, Copy, RotateCw } from 'lucide-react';
import { UserItem } from './types';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export interface ResetPasswordModalProps {
  user: UserItem | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ResetPasswordModal({ user, onClose, onSuccess, showToast }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setNewPassword(generatePassword());
      setCopiedPassword(false);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`รีเซ็ตรหัสผ่านสำหรับ ${user.displayName} เรียบร้อยแล้ว`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-scale-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">รีเซ็ตรหัสผ่าน</h3>
              <p className="text-[11px] text-gray-500">
                สำหรับ: {user.displayName} (@{user.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">
                รหัสผ่านใหม่
              </label>
              <button
                type="button"
                onClick={() => {
                  setNewPassword(generatePassword());
                  setCopiedPassword(false);
                }}
                className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> สุ่มรหัสใหม่
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-3 pr-20 py-2.5 text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-amber-500 font-bold"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newPassword);
                  setCopiedPassword(true);
                  setTimeout(() => setCopiedPassword(false), 2000);
                }}
                className="absolute right-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                {copiedPassword ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 text-[10px]">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px]">คัดลอก</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              💡 แนะนำให้กดคัดลอกรหัสผ่านนี้เพื่อส่งให้ผู้ใช้งานก่อนกดบันทึก
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={resetSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all disabled:opacity-50"
            >
              {resetSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>ยืนยันตั้งรหัสผ่านใหม่</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordModal;
