'use client';

import React from 'react';
import type { ScheduleContactValues } from '../_types';

interface ScheduleContactSectionProps {
  values: ScheduleContactValues;
  onChange: <K extends keyof ScheduleContactValues>(field: K, value: ScheduleContactValues[K]) => void;
}

export default function ScheduleContactSection({
  values,
  onChange,
}: ScheduleContactSectionProps) {
  const { pickupDateTime, deliveryDateTime, contactPerson, contactPhone, transferReason } = values;

  return (
    <>
      {/* Pickup Time */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          วันและเวลารับรถ (Pickup Date/Time): *
        </label>
        <input
          type="datetime-local"
          value={pickupDateTime}
          onChange={(e) => onChange('pickupDateTime', e.target.value)}
          required
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
        />
      </div>

      {/* Delivery Time */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          กำหนดเวลาส่งมอบ (Estimated Delivery): *
        </label>
        <input
          type="datetime-local"
          value={deliveryDateTime}
          onChange={(e) => onChange('deliveryDateTime', e.target.value)}
          required
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
        />
      </div>

      {/* Contact Person */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          ชื่อผู้ติดต่อปลายทาง / ชื่อลูกค้า: *
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => onChange('contactPerson', e.target.value)}
          required
          placeholder="เช่น คุณสมชาย (ลูกค้า / ผู้จัดการสาขา)"
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
        />
      </div>

      {/* Contact Phone */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700">
            เบอร์โทรผู้ติดต่อ: *
          </label>
          <span
            className={`text-[10px] font-medium ${
              contactPhone.length === 10 ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            {contactPhone.length}/10 หลัก
          </span>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          pattern="[0-9]{10}"
          value={contactPhone}
          onChange={(e) => onChange('contactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          required
          placeholder="เช่น 08xxxxxxxx (ตัวเลข 10 หลัก)"
          className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
        />
      </div>

      {/* Reason */}
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          เหตุผลการย้ายรถ: *
        </label>
        <textarea
          rows={2}
          value={transferReason}
          onChange={(e) => onChange('transferReason', e.target.value)}
          required
          placeholder="เช่น ย้ายสต็อกตามใบจองลูกค้า, รถทดลองขับสาขา, ส่งซ่อมด่วน..."
          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0f5238] outline-none"
        />
      </div>
    </>
  );
}
