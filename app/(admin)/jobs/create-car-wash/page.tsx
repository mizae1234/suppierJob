'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import {
  AddServiceVehicleModal,
  CancelJobConfirmModal,
  D365VendorWarning,
  SupplierSelector,
  WashConfirmModal,
  WashOrderPrintModal,
} from '@/components/jobs';
import { useCarWashOrder } from './_hooks/useCarWashOrder';
import { useVehiclePicker } from './_hooks/useVehiclePicker';
import { CarCategorySelector } from './_components/CarCategorySelector';
import { VehiclePickerCard } from './_components/VehiclePickerCard';
import { SelectedWashItemsPanel } from './_components/SelectedWashItemsPanel';

export default function CreateCarWashPage() {
  const router = useRouter();
  const theme = useTheme();
  const order = useCarWashOrder();

  const picker = useVehiclePicker({
    vehicles: order.vehicles,
    selectedBranchId: order.selectedBranchId,
    carCategory: order.carCategory,
    selectedItems: order.selectedItems,
    setSelectedItems: order.setSelectedItems,
    categoryServices: order.categoryServices,
    supplierServices: order.supplierServices,
  });

  const selectedVins = useMemo(
    () => new Set(order.selectedItems.map(it => it.vin)),
    [order.selectedItems]
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Banner */}
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
              <Sparkles className="w-6 h-6" style={{ color: theme.primary }} />
              <span>สร้างคำสั่งสั่งล้างรถ (Car Wash Order)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              เลือก Supplier และระบุรถ VIN จากสต็อกสาขาเพื่อออกใบสั่งงานหลายคันพร้อมกัน
            </p>
          </div>
        </div>
      </div>

      {/* Main Order Form */}
      <form onSubmit={order.handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier & Available Stock Selector */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Step 1: Choose Supplier */}
          <SupplierSelector
            suppliers={order.washSuppliers}
            selectedSupplierId={order.selectedSupplierId}
            onSelect={order.handleSelectSupplier}
            serviceType="CAR_WASH"
            stepNumber={1}
            title="เลือก Supplier คู่ค้า"
            themeColor={theme.primary}
            currentBranchId={order.selectedBranch?.id}
            currentBranchCode={order.selectedBranch?.code}
            currentBranchName={order.selectedBranch?.name}
          />
          <D365VendorWarning supplier={order.selectedSupplier} branch={order.selectedBranch} />

          {/* Step 2: Choose Car Category (รถใหม่ vs รถที่มา Service) */}
          <CarCategorySelector
            carCategory={order.carCategory}
            onChange={order.handleCarCategoryChange}
            isLocked={order.isLockedBySupplier}
            themePrimary={theme.primary}
          />

          {/* Step 3: Select Vehicles */}
          <VehiclePickerCard
            carCategory={order.carCategory}
            selectedBranchId={order.selectedBranchId}
            currentRole={order.currentRole}
            isLocked={order.isLockedBySupplier}
            themePrimary={theme.primary}
            selectedVins={selectedVins}
            selectedCount={order.selectedItems.length}
            picker={{
              searchTags: picker.searchTags,
              onSearchTagsChange: picker.setSearchTags,
              isSearchingGlobal: picker.isSearchingGlobal,
              filteredVehicles: picker.filteredVehicles,
              selectableVehicles: picker.selectableVehicles,
              isAllFilteredSelected: picker.isAllFilteredSelected,
              someFilteredSelected: picker.someFilteredSelected,
              onToggleSelectAll: picker.handleToggleSelectAllFiltered,
              onOpenAddServiceModal: picker.openAddServiceModal,
            }}
            onToggleVehicle={order.handleToggleVehicle}
            onQuickAddCustomVehicle={order.handleAddCustomServiceVehicle}
            cancelState={{
              vehicleToCancelVin: order.vehicleToCancel?.vin,
              isCancelling: order.isCancellingBusyJob,
              onOpenCancelModal: order.handleOpenCancelModal,
            }}
          />
        </div>

        {/* Right Column: Per-VIN Operation Dates & Order Breakdown */}
        <SelectedWashItemsPanel
          selectedItems={order.selectedItems}
          carCategory={order.carCategory}
          supplierServices={order.supplierServices}
          batchReason={order.batchReason}
          onBatchReasonChange={order.setBatchReason}
          onApplyReasonToAll={order.handleApplyReasonToAll}
          onUpdateItemField={order.updateItemField}
          onRemoveItem={order.handleRemoveSelectedItem}
          orderFinancials={order.orderFinancials}
          vatType={order.washConfig.vatType}
          isLocked={order.isLockedBySupplier}
          themePrimary={theme.primary}
          themeBgSoft={theme.bgSoft}
        />
      </form>

      {/* Confirmation Alert Modal */}
      <WashConfirmModal
        isOpen={order.showConfirmModal}
        isSubmitting={order.isSubmitting}
        branchName={order.selectedBranch?.name || ''}
        supplierName={order.selectedSupplier?.name || ''}
        requestedBy={order.requestedBy}
        requesterPosition={order.requesterPosition}
        totalItems={order.selectedItems.length}
        totalEstimatedCost={order.totalEstimatedCost}
        subtotal={order.orderFinancials.subtotal}
        vatType={order.washConfig.vatType}
        vatAmount={order.orderFinancials.vatAmount}
        carCategory={order.carCategory}
        onClose={() => order.setShowConfirmModal(false)}
        onConfirm={order.handleConfirmOrder}
      />

      {/* PDF Export & Order Confirmation Modal */}
      <WashOrderPrintModal
        createdJob={order.createdJob}
        onClose={() => order.setCreatedJob(null)}
      />

      {/* Cancel Busy Vehicle Modal */}
      <CancelJobConfirmModal
        isOpen={Boolean(order.vehicleToCancel)}
        onClose={() => order.setVehicleToCancel(null)}
        onConfirm={order.handleConfirmCancelBusyJob}
        isLoading={order.isCancellingBusyJob}
        jobNumber={order.vehicleToCancel?.activeJob?.jobNumber}
        vin={order.vehicleToCancel?.vin}
        vehicleModel={order.vehicleToCancel?.model}
        vehicleColor={order.vehicleToCancel?.color}
        licensePlate={order.vehicleToCancel?.licensePlate}
        warningMessage="เมื่อยกเลิกแล้ว รถจะถูกปลดล็อคให้สั่งงานใหม่ได้ทันที"
      />

      {/* Add Custom Service Vehicle Modal */}
      <AddServiceVehicleModal
        isOpen={picker.showAddServiceModal}
        onClose={() => picker.setShowAddServiceModal(false)}
        onAddVehicle={order.handleAddCustomServiceVehicle}
        initialSearchTerm={picker.addServiceInitialTerm}
      />
    </div>
  );
}
