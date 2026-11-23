'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useReportData } from './_hooks/useReportData';
import OverviewTab from './_components/OverviewTab';
import ReportsHeader from './_components/ReportsHeader';
import ReportsTabBar from './_components/ReportsTabBar';
import SlideReportTab from './_components/SlideReportTab';
import WashReportTab from './_components/WashReportTab';

export default function ReportsPage() {
  const {
    context,
    activeTab,
    setActiveTab,
    companyFilter,
    setCompanyFilter,
    overview,
    wash,
    slide,
    handleExportExcel,
  } = useReportData();

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* ─── Top Header & Controls ─── */}
      <ReportsHeader
        context={context}
        companyFilter={companyFilter}
        onChangeCompanyFilter={setCompanyFilter}
        onExportExcel={handleExportExcel}
      />

      {/* ─── Truncated Data Warning Banner ─── */}
      {context.jobsTruncated && (
        <div
          role="alert"
          className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-2xs"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold">ข้อมูลงานมีจำนวนเกินขีดจำกัดที่ระบบโหลดต่อครั้ง</p>
            <p className="text-amber-800/90 mt-0.5">
              ตัวเลขสรุป ค่าใช้จ่าย และไฟล์ Excel ที่ส่งออกจากหน้านี้อาจไม่ครบถ้วนทั้งหมด เนื่องจากรายการงานถูกตัดตามเพดานสูงสุดของ API
            </p>
          </div>
        </div>
      )}

      {/* ─── Segmented Tab Bar ─── */}
      <ReportsTabBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        washJobsCount={wash.analytics.washJobs.length}
        slideJobsCount={slide.analytics.slideJobs.length}
      />

      {/* ─── Active Tab Content ─── */}
      {activeTab === 'overview' && (
        <OverviewTab
          context={context}
          companyFilter={companyFilter}
          overview={overview}
          washAnalytics={wash.analytics}
          slideAnalytics={slide.analytics}
          onSelectTab={setActiveTab}
        />
      )}

      {activeTab === 'wash' && <WashReportTab context={context} wash={wash} />}

      {activeTab === 'slide' && <SlideReportTab context={context} slide={slide} />}
    </div>
  );
}
