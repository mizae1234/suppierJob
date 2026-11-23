'use client';

import React from 'react';
import { Route, Navigation, Flag, ExternalLink } from 'lucide-react';
import { Job } from '@/types';
import { getSlideLocations, mapsDirUrl } from '../_utils';

interface SlideRouteBoxProps {
  job: Job;
  showNav: boolean;
}

export function SlideRouteBox({ job, showNav }: SlideRouteBoxProps) {
  const loc = getSlideLocations(job);
  const canShowNav = showNav && Boolean(loc.pickup || loc.dropoff);

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <Route className="w-3.5 h-3.5 text-gray-400" />
          <span>เส้นทางขนส่ง</span>
        </span>
        {job.distance ? (
          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200/60">
            ~{job.distance} กม.
          </span>
        ) : null}
      </div>

      {/* Timeline: Origin & Destination */}
      <div className="flex flex-col gap-1.5">
        {/* Origin (Pickup) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ring-4 ring-amber-50" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate" title={loc.pickupLabel}>
                <span className="text-[10px] text-gray-400 font-normal mr-1">รับ:</span>
                {loc.pickupLabel}
              </p>
            </div>
          </div>
          {canShowNav && loc.pickup && (
            <a
              href={mapsDirUrl(loc.pickup)}
              target="_blank"
              rel="noopener noreferrer"
              title={`นำทางไปจุดรับรถ: ${loc.pickupLabel}`}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Navigation className="w-3 h-3 text-amber-600" />
              <span>นำทาง</span>
            </a>
          )}
        </div>

        {/* Connecting visual line */}
        <div className="w-0.5 h-2 bg-gray-200 ml-1 -my-0.5" />

        {/* Destination (Dropoff) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0 ring-4 ring-emerald-50" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate" title={loc.dropoffLabel}>
                <span className="text-[10px] text-gray-400 font-normal mr-1">ส่ง:</span>
                {loc.dropoffLabel}
              </p>
            </div>
          </div>
          {canShowNav && loc.dropoff && (
            <a
              href={mapsDirUrl(loc.dropoff)}
              target="_blank"
              rel="noopener noreferrer"
              title={`นำทางไปจุดส่งรถ: ${loc.dropoffLabel}`}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Flag className="w-3 h-3 text-emerald-600" />
              <span>นำทาง</span>
            </a>
          )}
        </div>
      </div>

      {/* Full route link */}
      {canShowNav && loc.pickup && loc.dropoff && (
        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <a
            href={mapsDirUrl(loc.dropoff, loc.pickup)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 transition-colors"
          >
            <span>ดูเส้นทางเต็มบน Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
