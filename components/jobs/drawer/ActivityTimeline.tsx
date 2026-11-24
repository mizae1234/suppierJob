'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { JobActivity } from '@/types';

interface ActivityTimelineProps {
  activities: JobActivity[] | undefined;
}

const DEFAULT_VISIBLE_LIMIT = 5;
const TAIL_VISIBLE_COUNT = 4;

const DOT_COLORS: Record<string, string> = {
  ITEM_ADDED: '#10b981',
  ITEM_COMPLETED: '#059669',
  ITEM_VERIFIED: '#0f5238',
  VERIFY_FAILED: '#f59e0b',
  ITEM_REJECTED: '#dc2626',
  ITEM_CANCELLED: '#ef4444',
  JOB_WAITING_APPROVAL: '#2563eb',
  JOB_APPROVED: '#059669',
  JOB_REJECTED: '#dc2626',
  JOB_CANCELLED: '#6b7280',
  EVIDENCE_UPLOADED: '#0891b2',
};

function renderActivityRow(activity: JobActivity, isLast: boolean) {
  const dotColor = DOT_COLORS[activity.action] || '#9ca3af';
  const time = new Date(activity.createdAt);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  return (
    <div key={activity.id} className="flex gap-3">
      {/* Left: dot + connecting line */}
      <div className="flex flex-col items-center shrink-0" style={{ width: '12px' }}>
        <div
          className="w-[10px] h-[10px] rounded-full shrink-0 mt-[3px]"
          style={{ backgroundColor: dotColor }}
        />
        {!isLast && <div className="w-[2px] flex-1 bg-gray-200 min-h-[8px]" />}
      </div>

      {/* Right: content */}
      <div
        className={`flex-1 flex items-baseline justify-between gap-2 text-[11px] ${
          !isLast ? 'pb-2.5' : ''
        }`}
      >
        <p className="text-gray-700 leading-snug">
          {activity.description
            .replace(/✅/g, 'เสร็จ')
            .replace(/❌/g, 'ปฏิเสธ')
            .replace(/🚫/g, 'ปฏิเสธ')
            .replace(/⏳/g, 'รอ')}
          {activity.vin && (
            <span className="ml-1 text-[9px] font-mono text-gray-400">
              ...{activity.vin.slice(-6)}
            </span>
          )}
        </p>
        <span className="text-[9px] text-gray-400 font-mono shrink-0">{timeStr}</span>
      </div>
    </div>
  );
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (!activities || activities.length === 0) return null;

  const jobKey = activities[0]?.jobId || 'default';
  const hasOverflow = activities.length > DEFAULT_VISIBLE_LIMIT;
  const isExpanded = !hasOverflow || expandedJobId === jobKey;
  const hiddenCount = hasOverflow ? activities.length - 1 - TAIL_VISIBLE_COUNT : 0;

  const toggleExpand = () => {
    setExpandedJobId(expandedJobId === jobKey ? null : jobKey);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>กิจกรรม</span>
          <span className="px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">
            {activities.length}
          </span>
        </h4>

        {hasOverflow && (
          <button
            type="button"
            onClick={toggleExpand}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[#0f5238] hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>ย่อรายการ</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>ดูทั้งหมด ({activities.length})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col">
        {isExpanded ? (
          activities.map((activity, idx) =>
            renderActivityRow(activity, idx === activities.length - 1)
          )
        ) : (
          <>
            {/* รายการแรก (เริ่มต้นใบงาน) */}
            {renderActivityRow(activities[0], false)}

            {/* แถบกดขยายรายการที่ซ่อนอยู่ตรงกลาง */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center shrink-0" style={{ width: '12px' }}>
                <div className="w-[2px] flex-1 border-l-2 border-dashed border-gray-300 min-h-[24px]" />
              </div>
              <div className="flex-1 pb-2.5">
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-[11px] font-semibold text-gray-600 hover:text-[#0f5238] transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>แสดงกิจกรรมที่ซ่อนอยู่อีก {hiddenCount} รายการ</span>
                </button>
              </div>
            </div>

            {/* 4 รายการล่าสุด */}
            {activities
              .slice(-TAIL_VISIBLE_COUNT)
              .map((activity, idx, arr) => renderActivityRow(activity, idx === arr.length - 1))}
          </>
        )}
      </div>
    </div>
  );
}
