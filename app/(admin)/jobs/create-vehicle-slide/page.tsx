'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Truck, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { CompanyCode, Job } from '@/types';
import { getSupplierVendorCode } from '@/lib/job-utils';
import {
  SlideConfirmModal,
  SlideSuccessModal,
  CancelJobConfirmModal,
  SupplierSelector,
  D365VendorWarning,
} from '@/components/jobs';
import type { ScheduleContactValues } from './_types';
import {
  buildSlideJobPayload,
  getDefaultDateTimeInput,
  validateSlideJobForm,
} from './_utils';
import { useSlideRoute } from './_hooks/useSlideRoute';
import { useVehicleSelection } from './_hooks/useVehicleSelection';
import { useDestWarehouses } from './_hooks/useDestWarehouses';
import { useSlidePricing } from './_hooks/useSlidePricing';
import VehicleStockPicker from './_components/VehicleStockPicker';
import RouteSelector from './_components/RouteSelector';
import PricingSection from './_components/PricingSection';
import ScheduleContactSection from './_components/ScheduleContactSection';
import SubmitBar from './_components/SubmitBar';

// Dynamic import to avoid SSR issues with Leaflet
const MapPickerModal = dynamic(() => import('@/components/jobs/MapPickerModal'), { ssr: false });

export default function CreateVehicleSlidePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    currentRole,
    currentCompany,
    currentBranchId,
    activeBranch,
    branches,
    companies,
    suppliers,
    vehicles,
    createVehicleSlideJob,
    refreshData,
    updateJobStatus,
    updateCarWashItemStatus,
  } = useApp();
  const { user: authUser } = useAuth();

  // Slide suppliers (handles both array and comma-separated string)
  const slideSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (Array.isArray(s.services)) {
        return s.services.includes('VEHICLE_SLIDE');
      }
      return typeof s.services === 'string' && (s.services as string).includes('VEHICLE_SLIDE');
    });
  }, [suppliers]);

  // Branches filtered by selected company context
  const availableBranches = useMemo(() => {
    if (currentCompany === 'ALL') return branches;
    const companyObj = companies.find((c) => c.code === currentCompany);
    if (!companyObj) return branches;
    const filtered = branches.filter(
      (b) => b.companyId === companyObj.id || (currentCompany === 'EV7' && (b.code === 'GI06' || b.code?.startsWith('EV7')))
    );
    return filtered.length > 0 ? filtered : branches;
  }, [branches, companies, currentCompany]);

  // Branch selection for Origin
  const [rawSelectedOriginBranchId, setSelectedOriginBranchId] = useState<string>(
    currentBranchId || availableBranches[0]?.id || branches[0]?.id || ''
  );
  const selectedOriginBranchId = useMemo(() => {
    if (rawSelectedOriginBranchId && branches.some((b) => b.id === rawSelectedOriginBranchId)) {
      return rawSelectedOriginBranchId;
    }
    return (
      (currentBranchId && branches.find((b) => b.id === currentBranchId)?.id) ||
      (authUser?.branchId && branches.find((b) => b.id === authUser.branchId)?.id) ||
      availableBranches[0]?.id ||
      branches[0]?.id ||
      rawSelectedOriginBranchId
    );
  }, [rawSelectedOriginBranchId, branches, currentBranchId, authUser, availableBranches]);
  const originBranchObj = branches.find((b) => b.id === selectedOriginBranchId);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const canEditBranchPin = currentRole === 'ADMIN' || currentRole === 'MASTER';

  // Auto-fill requester from logged-in user
  const autoName =
    authUser?.firstName && authUser?.lastName
      ? `${authUser.firstName} ${authUser.lastName}`
      : authUser?.displayName || 'เจ้าหน้าที่สาขาต้นทาง';
  const [requestedBy] = useState<string>(autoName);
  const [requesterPosition] = useState<string>(authUser?.position || '');
  const [requesterPhone] = useState<string>(authUser?.phone || '');

  // Schedule & contact form state
  const [scheduleContact, setScheduleContact] = useState<ScheduleContactValues>(() => ({
    pickupDateTime: getDefaultDateTimeInput(2),
    deliveryDateTime: getDefaultDateTimeInput(6),
    contactPerson: '',
    contactPhone: '',
    transferReason: '',
  }));

  const handleScheduleContactChange = useCallback(
    <K extends keyof ScheduleContactValues>(field: K, value: ScheduleContactValues[K]) => {
      setScheduleContact((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Created job & confirmation modals
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Route, custom pins & real road distance
  const route = useSlideRoute({
    branches,
    originBranchObj,
    selectedOriginBranchId,
    refreshData,
    showToast,
  });

  // Vehicle stock filtering, selection & busy-job cancellation
  const vehicleSelection = useVehicleSelection({
    vehicles,
    branches,
    currentRole,
    activeBranchId: activeBranch?.id,
    currentBranchId,
    authUserBranchId: authUser?.branchId,
    setSelectedOriginBranchId,
    setDestBranchId: route.setDestBranchId,
    updateJobStatus,
    updateCarWashItemStatus,
    showToast,
  });

  const { selectedVehicles, getVehicleOwnerBranch, selectedBranchFilter } = vehicleSelection;

  // สาขาที่รับผิดชอบค่าใช้จ่ายและใช้ยิงเปิด PO ใน D365 = สาขาที่เป็นเจ้าของรถต้นสังกัดเสมอ
  const orderingBranchObj = useMemo(() => {
    if (selectedVehicles.length > 0) {
      const ownerBranch = getVehicleOwnerBranch(selectedVehicles[0]);
      if (ownerBranch) return ownerBranch;
    }
    if (selectedBranchFilter !== 'ALL') {
      const filterBranch = branches.find((b) => b.id === selectedBranchFilter);
      if (filterBranch) return filterBranch;
    }
    return originBranchObj;
  }, [selectedVehicles, getVehicleOwnerBranch, selectedBranchFilter, branches, originBranchObj]);

  const selectedSupplier = slideSuppliers.find((s) => s.id === selectedSupplierId);
  const hasVendorCode = Boolean(
    selectedSupplier &&
      (orderingBranchObj
        ? getSupplierVendorCode(selectedSupplier, orderingBranchObj)
        : selectedSupplier.vendorCodes && selectedSupplier.vendorCodes.length > 0)
  );
  const hasAnyVendorCode = Boolean(
    selectedSupplier &&
      ((selectedSupplier.vendorCodes && selectedSupplier.vendorCodes.length > 0) || hasVendorCode)
  );
  const isLockedBySupplier = !selectedSupplier || !hasAnyVendorCode;

  // D365 warehouses (destination & origin summary)
  const warehouses = useDestWarehouses({
    destBranch: route.destBranch,
    destBranchId: route.destBranchId,
    originBranchObj,
    vehicles,
    selectedVehicles: vehicleSelection.selectedVehicles,
  });

  // Auto & manual pricing calculation
  const pricing = useSlidePricing({
    selectedSupplier,
    selectedSupplierId,
    routeDistance: route.routeDistance,
    originMode: route.originMode,
    destMode: route.destMode,
    originBranchObj,
    destBranch: route.destBranch,
    selectedCount: vehicleSelection.selectedVins.length,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSlideJobForm({
      selectedVinsCount: vehicleSelection.selectedVins.length,
      originMode: route.originMode,
      customOrigin: route.customOrigin,
      destMode: route.destMode,
      destBranchId: route.destBranchId,
      selectedOriginBranchId,
      destWarehouseId: warehouses.destWarehouseId,
      customDest: route.customDest,
      selectedSupplierId,
      hasVendorCode,
      contactPhone: scheduleContact.contactPhone,
      isManualPricing: pricing.isManualPricing,
      manualDistance: pricing.manualDistance,
      manualCost: pricing.manualCost,
      manualPriceNote: pricing.manualPriceNote,
      estimatedCost: pricing.estimatedCost,
    });
    if (validationError) {
      showToast(validationError.message, validationError.type);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSlideJob = async () => {
    setIsSubmitting(true);
    try {
      const matchedCompany = companies.find((c) => c.id === orderingBranchObj?.companyId);
      const companyCode: CompanyCode = (matchedCompany?.code as CompanyCode) || 'EV7';

      const payload = buildSlideJobPayload({
        companyCode,
        branchId: orderingBranchObj?.id || selectedOriginBranchId,
        pickupBranchId: selectedOriginBranchId,
        destMode: route.destMode,
        destBranchId: route.destBranchId,
        destWarehouseId: warehouses.destWarehouseId,
        originMode: route.originMode,
        customOrigin: route.customOrigin,
        customDest: route.customDest,
        supplierId: selectedSupplierId,
        selectedVins: vehicleSelection.selectedVins,
        scheduleContact,
        requestedBy,
        requesterPosition,
        requesterPhone,
        estimatedCost: pricing.estimatedCost,
        distance: pricing.distance,
        pricingMode: pricing.pricingMode,
        isManualPricing: pricing.isManualPricing,
        manualPriceNote: pricing.manualPriceNote,
      });

      const newJob = await createVehicleSlideJob(
        payload as Parameters<typeof createVehicleSlideJob>[0]
      );

      setShowConfirmModal(false);
      showToast(`บันทึกและสร้างคำขอรถสไลด์เรียบร้อยแล้ว (${vehicleSelection.selectedVins.length} คัน)!`, 'success');
      if (newJob) setCreatedJob(newJob);
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      showToast(
        err instanceof Error && err.message ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" />
              <span>ขอรถสไลด์ขนส่งรถยนต์ (Vehicle Slide Request)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือกรถจากสต็อกสาขา กำหนดเส้นทาง เวลา และมอบหมายงานให้ Supplier รถสไลด์
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Choose Supplier & Select VIN */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Slide Supplier */}
          <SupplierSelector
            suppliers={slideSuppliers}
            selectedSupplierId={selectedSupplierId}
            onSelect={(id) => {
              setSelectedSupplierId(id);
            }}
            serviceType="VEHICLE_SLIDE"
            stepNumber={1}
            title="เลือก Supplier รถสไลด์"
            themeColor="#0f5238"
            currentBranchId={orderingBranchObj?.id}
            currentBranchCode={orderingBranchObj?.code}
            currentBranchName={orderingBranchObj?.name}
            recommendedSupplierCode={route.supplierRecommendation?.recommendedCode}
            recommendationReason={route.supplierRecommendation?.reason}
          />
          {/* ใบงานสไลด์ผูกกับสาขาของผู้สั่งงาน → PO เปิดในบริษัทของสาขาผู้สั่งงาน */}
          <D365VendorWarning supplier={selectedSupplier} branch={orderingBranchObj} />

          {/* Step 2: Select VIN from any branch + Selected Preview */}
          <VehicleStockPicker
            isLockedBySupplier={isLockedBySupplier}
            currentRole={currentRole}
            branches={branches}
            availableStockCount={vehicleSelection.availableStockVehicles.length}
            filter={{
              selectedBranchFilter: vehicleSelection.selectedBranchFilter,
              onBranchFilterChange: vehicleSelection.setSelectedBranchFilter,
              branchFilterOptions: vehicleSelection.branchFilterOptions,
              searchTags: vehicleSelection.searchTags,
              onSearchTagsChange: vehicleSelection.setSearchTags,
            }}
            selection={{
              selectedVins: vehicleSelection.selectedVins,
              selectedVinSet: vehicleSelection.selectedVinSet,
              selectedVehicles: vehicleSelection.selectedVehicles,
              filteredVehicles: vehicleSelection.filteredVehicles,
              selectableVehiclesCount: vehicleSelection.selectableVehicles.length,
              isAllFilteredSelected: vehicleSelection.isAllFilteredSelected,
              someFilteredSelected: vehicleSelection.someFilteredSelected,
              onToggleSelectAll: vehicleSelection.handleToggleSelectAllFiltered,
              onToggleVehicle: vehicleSelection.handleToggleVehicle,
            }}
            cancelBusyJob={{
              vehicleToCancel: vehicleSelection.vehicleToCancel,
              isCancellingBusyJob: vehicleSelection.isCancellingBusyJob,
              onOpenCancelModal: vehicleSelection.handleOpenCancelModal,
            }}
          />
        </div>

        {/* Column 2: Route, Schedule, Cost & Submit */}
        <div
          className={`lg:col-span-2 flex flex-col gap-5 transition-opacity ${
            isLockedBySupplier ? 'pointer-events-none opacity-45 select-none' : ''
          }`}
        >
          {/* Step 3: Route & Schedule */}
          <div className="p-6 rounded-2xl bg-white border border-emerald-950/10 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#0f5238] text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>ระบุเส้นทางและกำหนดการเดินทาง</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RouteSelector
                branches={branches}
                currentRole={currentRole}
                selectedVinsCount={vehicleSelection.selectedVins.length}
                origin={{
                  selectedOriginBranchId,
                  originBranchObj,
                  originMode: route.originMode,
                  customOrigin: route.customOrigin,
                  canEditBranchPin,
                  isSavingBranchPin: route.isSavingBranchPin,
                  originBranchMainWarehouse: warehouses.originBranchMainWarehouse,
                  originWarehouseGroups: warehouses.originWarehouseGroups,
                  onOriginBranchChange: (id) => {
                    setSelectedOriginBranchId(id);
                    vehicleSelection.setSelectedVins([]);
                  },
                  onOriginModeChange: route.setOriginMode,
                }}
                destination={{
                  destMode: route.destMode,
                  destBranchId: route.destBranchId,
                  customDest: route.customDest,
                  onDestModeChange: route.setDestMode,
                  onDestBranchChange: route.setDestBranchId,
                }}
                destWarehouse={{
                  destWarehouseId: warehouses.destWarehouseId,
                  defaultDestWarehouse: warehouses.defaultDestWarehouse,
                  options: warehouses.destWarehouseDropdownOptions,
                  selectedDestWarehouseName: warehouses.selectedDestWarehouseName,
                  originWarehouseSummary: warehouses.originWarehouseSummary,
                  onSelectWarehouse: warehouses.handleSelectDestWarehouse,
                }}
                pricingPreview={{
                  distance: pricing.distance,
                  selectedSupplierId,
                  previewCost: pricing.pricingCalculation?.costPerCar ?? pricing.estimatedCost,
                }}
                onOpenMapPicker={route.setMapPickerMode}
              />

              <PricingSection
                isManualPricing={pricing.isManualPricing}
                routeDistance={route.routeDistance}
                distance={pricing.distance}
                estimatedCost={pricing.estimatedCost}
                contractCostPerCar={pricing.contractCostPerCar}
                manualPriceNote={pricing.manualPriceNote}
                manualPriceDiff={pricing.manualPriceDiff}
                pricingCalculation={pricing.pricingCalculation}
                selectedSupplierId={selectedSupplierId}
                selectedVinsCount={vehicleSelection.selectedVins.length}
                onChangePricingMode={pricing.handleChangePricingMode}
                onManualDistanceChange={pricing.setManualDistance}
                onManualCostChange={pricing.setManualCost}
                onManualPriceNoteChange={pricing.setManualPriceNote}
                onResetManualToAuto={pricing.handleResetManualToAuto}
              />

              <ScheduleContactSection
                values={scheduleContact}
                onChange={handleScheduleContactChange}
              />
            </div>

            {/* Submit Action */}
            <SubmitBar
              supplierName={selectedSupplier?.name}
              originLabel={route.originLabel}
              destMode={route.destMode}
              destBranchName={route.destBranch?.name}
              customDest={route.customDest}
              distance={pricing.distance}
              selectedVinsCount={vehicleSelection.selectedVins.length}
              estimatedCost={pricing.estimatedCost}
            />
          </div>
        </div>
      </form>

      {/* Confirmation Alert Modal */}
      <SlideConfirmModal
        isOpen={showConfirmModal}
        isSubmitting={isSubmitting}
        selectedVins={vehicleSelection.selectedVins}
        originLabel={route.originLabel || ''}
        destLabel={
          route.destMode === 'branch'
            ? `${route.destBranch?.name || ''}${warehouses.destWarehouseId ? ` (คลัง ${warehouses.destWarehouseId})` : ''}`
            : route.customDest?.address || ''
        }
        distance={pricing.distance}
        supplierName={selectedSupplier?.name || ''}
        pickupDateTime={scheduleContact.pickupDateTime}
        estimatedCost={pricing.estimatedCost}
        formulaBadge={pricing.isManualPricing ? 'กรอกค่าบริการเอง' : pricing.pricingCalculation?.formulaBadge}
        formulaDetail={
          pricing.isManualPricing
            ? `หมายเหตุ: ${pricing.manualPriceNote.trim()} (ราคาตามสัญญา ฿${pricing.contractCostPerCar.toLocaleString()}/คัน)`
            : pricing.pricingCalculation?.formulaDetail
        }
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSlideJob}
      />

      {/* Confirmation Modal */}
      <SlideSuccessModal
        createdJob={createdJob}
        selectedVins={vehicleSelection.selectedVins}
        distance={pricing.distance}
        estimatedCost={pricing.estimatedCost}
        formulaBadge={pricing.isManualPricing ? 'กรอกค่าบริการเอง' : pricing.pricingCalculation?.formulaBadge}
        onClose={() => setCreatedJob(null)}
      />

      {/* Map Picker Modal — shared for pickup pin, destination pin and branch pin */}
      <MapPickerModal
        isOpen={route.mapPickerMode !== null}
        onClose={() => route.setMapPickerMode(null)}
        mode={route.mapPickerMode === 'dest' ? 'dest' : 'origin'}
        onConfirm={route.handleMapPickerConfirm}
        {...route.mapPickerProps}
      />

      {/* Cancel Busy Vehicle Modal */}
      <CancelJobConfirmModal
        isOpen={Boolean(vehicleSelection.vehicleToCancel)}
        onClose={() => vehicleSelection.setVehicleToCancel(null)}
        onConfirm={vehicleSelection.handleConfirmCancelBusyJob}
        isLoading={vehicleSelection.isCancellingBusyJob}
        jobNumber={vehicleSelection.vehicleToCancel?.activeJob?.jobNumber}
        vin={vehicleSelection.vehicleToCancel?.vin}
        vehicleModel={vehicleSelection.vehicleToCancel?.model}
        vehicleColor={vehicleSelection.vehicleToCancel?.color}
        licensePlate={vehicleSelection.vehicleToCancel?.licensePlate}
        warningMessage="เมื่อยกเลิกแล้ว รถจะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที"
      />
    </div>
  );
}
