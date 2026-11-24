'use client';

import React, { Suspense } from 'react';
import { ClipboardList, Sparkles, Truck } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import {
  VendorRejectModal,
  VendorSubmitPhotoModal,
  VendorVerifyVehicleModal,
  VendorFailedAttemptModal,
} from '@/components/vendor';
import { useVendorJobs } from './_hooks/useVendorJobs';
import { VendorJobTabs } from './_components/VendorJobTabs';
import { WashItemCard } from './_components/WashItemCard';
import { SlideItemCard } from './_components/SlideItemCard';
import { LegacySlideJobCard } from './_components/LegacySlideJobCard';

function SupplierJobsPageContent() {
  const theme = useTheme();
  const {
    isAll,
    vehicles,
    activeBranch,
    myJobsCount,
    allItemCardsCount,
    activeTab,
    setActiveTab,
    tabCounts,
    filteredItems,
    filteredSlideItems,
    filteredSlides,
    totalFilteredCount,
    cardActions,
    modals,
  } = useVendorJobs();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">รายการงานของฉัน</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            งานทั้งหมด {myJobsCount} ใบงาน • {allItemCardsCount} รายการรถ {activeBranch ? `(${activeBranch.name})` : '(ทุกสาขา)'}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
          {totalFilteredCount} รายการในหมวดนี้
        </span>
      </div>

      {/* Tab Bar */}
      <VendorJobTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tabCounts={tabCounts}
        primaryColor={theme.primary}
      />

      {/* Content */}
      {totalFilteredCount === 0 ? (
        <div className="text-center py-16 px-4 bg-white/60 rounded-3xl border border-gray-100 shadow-2xs text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold text-gray-600">ไม่มีงานในหมวดนี้</p>
          <p className="text-xs text-gray-400 mt-1">งานจะปรากฏเมื่อมีการมอบหมายหรือเปลี่ยนสถานะ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Section Header for Car Wash Items */}
          {filteredItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">ล้างรถ (รายคัน)</span>
                <span className="text-[10px] text-gray-400">{filteredItems.length} คัน</span>
              </div>
              {filteredItems.map(card => (
                <WashItemCard
                  key={card.itemId}
                  card={card}
                  isAll={isAll}
                  theme={theme}
                  actions={cardActions}
                />
              ))}
            </>
          )}

          {/* Section Header for Vehicle Slide (Per-Car) */}
          {(filteredSlideItems.length > 0 || filteredSlides.length > 0) && (
            <>
              <div className="flex items-center gap-2 px-1 mt-2">
                <Truck className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">รถสไลด์ (รายคัน)</span>
                <span className="text-[10px] text-gray-400">{filteredSlideItems.length + filteredSlides.length} คัน</span>
              </div>
              {filteredSlideItems.map(card => (
                <SlideItemCard
                  key={card.itemId}
                  card={card}
                  isAll={isAll}
                  theme={theme}
                  actions={cardActions}
                />
              ))}
              {filteredSlides.map(job => (
                <LegacySlideJobCard
                  key={job.id}
                  job={job}
                  vehicles={vehicles}
                  theme={theme}
                  actions={cardActions}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <VendorRejectModal
        target={modals.rejectingTarget}
        onClose={modals.closeRejectModal}
        onConfirm={modals.onConfirmReject}
      />

      {/* Vehicle Verification Modal (step 1) */}
      <VendorVerifyVehicleModal
        key={modals.verifyTarget ? `verify:${modals.verifyTarget.jobId}:${modals.verifyTarget.itemId || ''}` : 'verify-none'}
        target={modals.verifyTarget}
        onClose={modals.closeVerifyModal}
        onVerified={modals.onVehicleVerified}
      />

      {/* Photo Upload Modal */}
      <VendorSubmitPhotoModal
        target={modals.photoModalTarget}
        onClose={modals.closePhotoModal}
        onSubmit={modals.onSubmitPhotos}
      />

      {/* Failed Attempt (เที่ยวเปล่า) Modal */}
      <VendorFailedAttemptModal
        key={modals.failedAttemptJob?.id ? `failed:${modals.failedAttemptJob.id}` : 'failed-none'}
        job={modals.failedAttemptJob}
        onClose={modals.closeFailedAttemptModal}
        onSubmit={modals.onSubmitFailedAttempt}
      />
    </div>
  );
}

export default function SupplierJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">กำลังโหลด...</div>}>
      <SupplierJobsPageContent />
    </Suspense>
  );
}
