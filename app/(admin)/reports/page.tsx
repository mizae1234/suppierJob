'use client';

import React, { Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { useReportData } from './_hooks/useReportData';
import { ReportTab } from './_lib/report-calculations';
import OverviewTab from './_components/OverviewTab';
import ReportsHeader from './_components/ReportsHeader';
import ReportsTabBar from './_components/ReportsTabBar';
import SlideReportTab from './_components/SlideReportTab';
import VehicleReportTab from './_components/VehicleReportTab';
import WashReportTab from './_components/WashReportTab';

const VALID_TABS: ReportTab[] = ['overview', 'wash', 'slide', 'vehicles'];

function parseTab(raw: string | null): ReportTab {
  return raw && VALID_TABS.includes(raw as ReportTab) ? (raw as ReportTab) : 'overview';
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = parseTab(searchParams.get('tab'));

  const {
    context,
    activeTab,
    setActiveTab,
    companyFilter,
    setCompanyFilter,
    baseJobs,
    vehiclesCount,
    overview,
    wash,
    slide,
    handleExportExcel,
  } = useReportData(initialTab);

  // เก็บฟังก์ชันส่งออก Excel ของแท็บสรุปยอดรายคัน เพื่อให้ปุ่มด้านบนส่งออกตามตัวกรองในแท็บนั้นได้
  const vehicleExportRef = useRef<(() => void) | null>(null);
  const registerVehicleExport = useCallback((handler: (() => void) | null) => {
    vehicleExportRef.current = handler;
  }, []);

  const handleChangeTab = useCallback(
    (tab: ReportTab) => {
      setActiveTab(tab);
      const nextUrl = tab === 'overview' ? '/reports' : `/reports?tab=${tab}`;
      router.replace(nextUrl, { scroll: false });
    },
    [router, setActiveTab]
  );

  const handleHeaderExportExcel = useCallback(() => {
    if (activeTab === 'vehicles' && vehicleExportRef.current) {
      vehicleExportRef.current();
      return;
    }
    handleExportExcel();
  }, [activeTab, handleExportExcel]);

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* ─── Top Header & Controls ─── */}
      <ReportsHeader
        context={context}
        companyFilter={companyFilter}
        onChangeCompanyFilter={setCompanyFilter}
        onExportExcel={handleHeaderExportExcel}
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
        onChangeTab={handleChangeTab}
        washJobsCount={wash.analytics.washJobs.length}
        slideJobsCount={slide.analytics.slideJobs.length}
        vehiclesCount={vehiclesCount}
      />

      {/* ─── Active Tab Content ─── */}
      {activeTab === 'overview' && (
        <OverviewTab
          context={context}
          companyFilter={companyFilter}
          overview={overview}
          washAnalytics={wash.analytics}
          slideAnalytics={slide.analytics}
          onSelectTab={handleChangeTab}
        />
      )}

      {activeTab === 'wash' && <WashReportTab context={context} wash={wash} />}

      {activeTab === 'slide' && <SlideReportTab context={context} slide={slide} />}

      {activeTab === 'vehicles' && (
        <VehicleReportTab
          jobs={baseJobs}
          companyFilter={companyFilter}
          registerExportHandler={registerVehicleExport}
        />
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gray-500">กำลังโหลดรายงาน...</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
