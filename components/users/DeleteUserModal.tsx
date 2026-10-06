'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { UserItem } from './types';

export interface DeleteUserModalProps {
  user: UserItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-900 text-base mb-1">ยืนยันการลบผู้ใช้งาน?</h3>
        <p className="text-xs text-gray-500 mb-4">
          คุณต้องการลบผู้ใช้ <span className="font-bold text-gray-800">"{user.displayName}"</span> ใช่หรือไม่?
          หากผู้ใช้นี้มีประวัติสร้างงานในระบบ แนะนำให้ใช้การ <span className="text-rose-600 font-semibold">"ระงับการใช้งาน"</span> แทน
        </p>

        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserModal;
