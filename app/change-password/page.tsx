'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Eye, EyeOff, Truck, Sparkles, Check, LogOut, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage() {
  const { user, setUser, logout, isLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rules = [
    { ok: newPassword.length >= 8, label: 'อย่างน้อย 8 ตัวอักษร' },
    { ok: /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword), label: 'มีทั้งตัวอักษรและตัวเลข' },
    { ok: !!newPassword && newPassword === confirmPassword, label: 'ยืนยันรหัสผ่านตรงกัน' },
  ];
  const canSubmit = rules.every(r => r.ok) && !!currentPassword && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user); // AuthContext จะ redirect ไปหน้าหลักตาม role
      } else {
        setError(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f9f5]">
        <div className="w-8 h-8 border-4 border-[#0f5238] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputClass =
    'w-full h-11 px-3 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5238] via-[#1a6b4a] to-[#0a3d28] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl" />
      </div>

      <main className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
            <div className="flex items-center gap-1">
              <Truck className="w-5 h-5 text-emerald-300" />
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">VendorOps</p>
          <p className="text-emerald-200/80 text-sm mt-1">Supplier Job Management — EV7 &amp; GI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#0f5238]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ตั้งรหัสผ่านใหม่</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                สวัสดี {user.displayName} — เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสผ่านก่อนเริ่มใช้งาน
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="current-password" className="block text-xs font-semibold text-gray-700 mb-1.5">รหัสผ่านปัจจุบัน</label>
            <input id="current-password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-gray-700 mb-1.5">รหัสผ่านใหม่</label>
            <div className="relative">
              <input id="new-password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
              <button type="button" id="toggle-password-visibility" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
            <input id="confirm-password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
          </div>

          <ul className="space-y-1.5">
            {rules.map(r => (
              <li key={r.label} className={`flex items-center gap-2 text-xs transition-colors ${r.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${r.ok ? 'bg-emerald-500 scale-100' : 'bg-gray-200 scale-90'}`}>
                  <Check className="w-3 h-3 text-white" />
                </span>
                {r.label}
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <button id="change-password-submit" type="submit" disabled={!canSubmit}
            className="w-full h-11 rounded-xl bg-[#0f5238] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#0c4430] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
            บันทึกรหัสผ่านใหม่
          </button>

          <button id="change-password-logout" type="button" onClick={logout}
            className="w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1.5 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
          </button>
        </form>
      </main>
    </div>
  );
}
