'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { JobActivity } from '@/types';

interface ActivityTimelineProps {
  activities: JobActivity[] | undefined;
}

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

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) return null;

  return (
    <div>
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-2">
        <Clock className="w-3.5 h-3.5" />
        กิจกรรม
      </h4>

      <div className="flex flex-col">
        {activities.map((activity, idx) => {
          const dotColor = DOT_COLORS[activity.action] || '#9ca3af';
          const time = new Date(activity.createdAt);
          const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
          const isLast = idx === activities.length - 1;

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
        })}
      </div>
    </div>
  );
}
