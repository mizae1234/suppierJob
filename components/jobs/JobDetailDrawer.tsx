'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { Job } from '@/types';
import { CancelJobConfirmModal } from './CancelJobConfirmModal';
import { WorkOrderPrintDocument } from './WorkOrderPrintDocument';
import { useJobDrawerActions } from './drawer/useJobDrawerActions';
import { useAddVehicles } from './drawer/useAddVehicles';
import { DrawerHeader } from './drawer/DrawerHeader';
import { JobOverview } from './drawer/JobOverview';
import { D365Panel } from './drawer/D365Panel';
import { JobWorkflowStepper } from './drawer/JobWorkflowStepper';
import { ItemsList } from './drawer/ItemsList';
import { SlideRouteCard } from './drawer/SlideRouteCard';
import { EvidenceGallery } from './drawer/EvidenceGallery';
import { ActivityTimeline } from './drawer/ActivityTimeline';
import { DrawerFooter } from './drawer/DrawerFooter';

export interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
  onPrevJob?: () => void;
  onNextJob?: () => void;
  hasPrevJob?: boolean;
  hasNextJob?: boolean;
  currentJobIndex?: number;
  totalJobs?: number;
  onApprove: (jobId: string, customApprovedBy?: string) => Promise<void>;
  onReject: (job: Job) => void;
  onAcceptJob: (jobId: string) => Promise<void>;
  onCompleteJob: (job: Job) => void;
  onPreviewPhoto: (url: string) => void;
}

export function JobDetailDrawer({
  job,
  onClose,
  onPrevJob,
  onNextJob,
  hasPrevJob = false,
  hasNextJob = false,
  currentJobIndex = -1,
  totalJobs = 0,
  onApprove,
  onReject,
  onAcceptJob,
  onCompleteJob,
  onPreviewPhoto,
}: JobDetailDrawerProps) {
  const { currentRole, activeBranch, currentBranchId, currentCompany, vehicles } = useApp();
  const theme = useTheme();

  const {
    contextJob,
    activeJob,
    detailJobId,
    copiedText,
    handleCopyText,
    isRetryingPo,
    handleRetryPo,
    isRetryingTransfer,
    handleRetryTransfer,
    isCancellingJob,
    cancellingItemId,
    cancelModalState,
    setCancelModalState,
    handleOpenCancelEntireJob,
    handleOpenCancelSingleItem,
    handleConfirmCancel,
    showSubstituteModal,
    setShowSubstituteModal,
    permissions,
  } = useJobDrawerActions({
    job,
    onClose,
    onPrevJob,
    onNextJob,
    hasPrevJob,
    hasNextJob,
  });

  const addVehicles = useAddVehicles({
    contextJob,
    activeJob,
    detailJobId,
    canModifyBeforeSupplierStarts: permissions.canModifyBeforeSupplierStarts,
  });

  if (!job || !activeJob) return null;

  const myBranchId = activeBranch?.id || currentBranchId;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        onClick={() => onClose()}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-8 pointer-events-none">
        <div className="w-screen max-w-2xl lg:max-w-3xl bg-white shadow-2xl flex flex-col h-full pointer-events-auto border-l border-gray-100 animate-slide-in-right">
          {/* Sticky Drawer Header */}
          <DrawerHeader
            job={activeJob}
            theme={theme}
            copiedText={copiedText}
            onCopyText={handleCopyText}
            onClose={onClose}
            myBranchId={myBranchId}
            currentCompany={currentCompany}
            navigation={{
              currentJobIndex,
              totalJobs,
              hasPrevJob,
              hasNextJob,
              onPrevJob,
              onNextJob,
            }}
          />

          {/* Scrollable Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            {/* ─── Compact Job Overview ─── */}
            <JobOverview job={activeJob} theme={theme} />

            {/* ─── D365 F&O PO + Transfer Journal Status Cards ─── */}
            <D365Panel
              job={activeJob}
              currentRole={currentRole}
              isRetryingPo={isRetryingPo}
              isRetryingTransfer={isRetryingTransfer}
              onRetryPo={handleRetryPo}
              onRetryTransfer={handleRetryTransfer}
            />

            {/* ─── Reject Reason Alert & Compact Workflow Stepper ─── */}
            <JobWorkflowStepper job={activeJob} theme={theme} />

            {/* ─── Job Items (Car Wash & Vehicle Slide) + Add Vehicles Panel ─── */}
            <ItemsList
              job={activeJob}
              theme={theme}
              currentRole={currentRole}
              permissions={permissions}
              copiedText={copiedText}
              onCopyText={handleCopyText}
              cancellingItemId={cancellingItemId}
              onCancelItem={handleOpenCancelSingleItem}
              addVehicles={addVehicles}
            />

            {/* ─── Specific Job Details: Vehicle Slide ─── */}
            <SlideRouteCard
              job={activeJob}
              vehicles={vehicles}
              theme={theme}
              copiedText={copiedText}
              onCopyText={handleCopyText}
            />

            {/* ─── Photo Evidences Gallery ─── */}
            <EvidenceGallery
              job={activeJob}
              theme={theme}
              onPreviewPhoto={onPreviewPhoto}
            />
          </div>

          {/* ─── Activity Timeline (Flex-based) ─── */}
          <ActivityTimeline activities={activeJob.activities} />

          {/* ══════════════════════════════════════════════
              OFFICIAL PRINT WORK ORDER DOCUMENT
              ══════════════════════════════════════════════ */}
          <WorkOrderPrintDocument job={activeJob} />

          {/* Sticky Drawer Footer */}
          <DrawerFooter
            job={activeJob}
            theme={theme}
            currentRole={currentRole}
            myBranchId={myBranchId}
            activeBranchName={activeBranch?.name}
            canUserCancelOrModifyJob={permissions.canUserCancelOrModifyJob}
            isCancellingJob={isCancellingJob}
            onCancelJob={handleOpenCancelEntireJob}
            onAcceptJob={onAcceptJob}
            onCompleteJob={onCompleteJob}
            onApprove={onApprove}
            onReject={onReject}
            onOpenSubstituteModal={() => setShowSubstituteModal(true)}
            onClose={onClose}
          />
        </div>
      </div>

      {/* Cancel Job / Single Item Modal */}
      <CancelJobConfirmModal
        isOpen={cancelModalState.isOpen}
        onClose={() => setCancelModalState({ isOpen: false, type: 'JOB' })}
        onConfirm={handleConfirmCancel}
        isLoading={isCancellingJob || Boolean(cancellingItemId)}
        title={
          cancelModalState.type === 'JOB'
            ? 'ยืนยันการยกเลิกใบงาน'
            : 'ยืนยันการยกเลิกคำสั่งสำหรับรถคันนี้'
        }
        subtitle={
          cancelModalState.type === 'JOB'
            ? 'การยกเลิกใบงานจะมีผลกับรถทุกคันในใบสั่งงานนี้'
            : 'การยกเลิกจะมีผลเฉพาะรถคันที่เลือกเท่านั้น'
        }
        jobNumber={activeJob.jobNumber}
        vin={cancelModalState.type === 'ITEM' ? cancelModalState.item?.vin : undefined}
        vehicleModel={
          cancelModalState.type === 'ITEM' ? cancelModalState.item?.vehicleModel : undefined
        }
        vehicleColor={
          cancelModalState.type === 'ITEM' ? cancelModalState.item?.vehicleColor : undefined
        }
        licensePlate={
          cancelModalState.type === 'ITEM' ? cancelModalState.item?.licensePlate : undefined
        }
        warningMessage={
          cancelModalState.type === 'JOB'
            ? 'เมื่อยกเลิกแล้ว รถทุกคันในใบงานนี้จะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที'
            : 'เมื่อยกเลิกแล้ว รถคันนี้จะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที'
        }
      />

      {/* Substitute Approve Modal */}
      <CancelJobConfirmModal
        isOpen={showSubstituteModal}
        onClose={() => setShowSubstituteModal(false)}
        onConfirm={() => {
          setShowSubstituteModal(false);
          onApprove(activeJob.id);
        }}
        title="ยืนยันการอนุมัติแทนสาขาปลายทาง"
        subtitle={`คุณกำลังจะดำเนินการอนุมัติงานแทน ${activeJob.destBranchName || 'สาขาปลายทาง'}`}
        jobNumber={activeJob.jobNumber}
        warningMessage="กรุณาตรวจสอบว่าได้รับการประสานงานหรือยืนยันความถูกต้องจากสาขาปลายทางเรียบร้อยแล้ว"
        confirmButtonText="ยืนยันอนุมัติแทนปลายทาง"
      />
    </div>
  );
}

export default JobDetailDrawer;
