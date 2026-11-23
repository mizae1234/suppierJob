'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle } from '@/types';
import { CarCategory, SelectedWashItem, SupplierServiceOption } from '../_types';
import { createWashItemFromVehicle } from '../_utils';

interface UseVehiclePickerParams {
  vehicles: Vehicle[];
  selectedBranchId: string;
  carCategory: CarCategory;
  selectedItems: SelectedWashItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<SelectedWashItem[]>>;
  categoryServices: SupplierServiceOption[];
  supplierServices: SupplierServiceOption[];
}

export function useVehiclePicker({
  vehicles,
  selectedBranchId,
  carCategory,
  selectedItems,
  setSelectedItems,
  categoryServices,
  supplierServices,
}: UseVehiclePickerParams) {
  // VIN & License Plate search tags
  const [searchTags, setSearchTags] = useState<string[]>([]);

  // Global vehicles search from server across all branches (when carCategory === 'SERVICE')
  const [globalServerVehicles, setGlobalServerVehicles] = useState<Vehicle[]>([]);
  const [allSystemVehicles, setAllSystemVehicles] = useState<Vehicle[]>([]);
  const [isPreloadingGlobal, setIsPreloadingGlobal] = useState(false);
  const [isQuerySearchingGlobal, setIsQuerySearchingGlobal] = useState(false);

  // Add Custom Service Vehicle Modal state
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [addServiceInitialTerm, setAddServiceInitialTerm] = useState('');

  // Branch vehicles (only vehicles currently in stock at selected branch)
  const branchStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.currentBranchId === selectedBranchId && v.status !== 'OUT_OF_STOCK');
  }, [vehicles, selectedBranchId]);

  // Preload all vehicles across all branches when carCategory === 'SERVICE'
  useEffect(() => {
    if (carCategory !== 'SERVICE') return;
    let isCurrent = true;

    Promise.resolve()
      .then(() => {
        if (!isCurrent) return null;
        setIsPreloadingGlobal(true);
        return fetch('/api/vehicles?scope=all&limit=200');
      })
      .then(res => (res ? res.json() : null))
      .then(data => {
        if (isCurrent && data?.vehicles) {
          setAllSystemVehicles(data.vehicles);
        }
      })
      .catch(err => console.error('Error fetching all vehicles:', err))
      .finally(() => {
        if (isCurrent) setIsPreloadingGlobal(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [carCategory]);

  // Debounced global search when typing tags in SERVICE mode
  useEffect(() => {
    if (carCategory !== 'SERVICE' || searchTags.length === 0) return;

    let isCurrent = true;
    const latestTerm = searchTags[searchTags.length - 1]?.trim();
    if (!latestTerm) return;

    const timer = setTimeout(async () => {
      if (!isCurrent) return;
      setIsQuerySearchingGlobal(true);
      try {
        const res = await fetch(`/api/vehicles?q=${encodeURIComponent(latestTerm)}&scope=all`);
        const data = await res.json();
        if (isCurrent && data.vehicles) {
          setGlobalServerVehicles(data.vehicles);
        }
      } catch (err) {
        console.error('Error fetching global vehicles:', err);
      } finally {
        if (isCurrent) setIsQuerySearchingGlobal(false);
      }
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [carCategory, searchTags]);

  const isSearchingGlobal = carCategory === 'SERVICE' && (isPreloadingGlobal || (searchTags.length > 0 && isQuerySearchingGlobal));

  // Available vehicles based on carCategory:
  // - NEW_CAR: only vehicles currently in stock at selected branch
  // - SERVICE: prioritize branch vehicles, then all branch vehicles across entire system, plus global search results
  const availableVehicles = useMemo(() => {
    if (carCategory === 'NEW_CAR') {
      return branchStockVehicles;
    }
    const seenVins = new Set<string>();
    const combined: Vehicle[] = [];

    // 1. Branch vehicles first
    for (const v of branchStockVehicles) {
      seenVins.add(v.vin);
      combined.push(v);
    }
    // 2. All system vehicles across branches
    for (const v of allSystemVehicles) {
      if (!seenVins.has(v.vin)) {
        seenVins.add(v.vin);
        combined.push(v);
      }
    }
    // 3. Global server search results (only active when searching by tags)
    if (searchTags.length > 0) {
      for (const v of globalServerVehicles) {
        if (!seenVins.has(v.vin)) {
          seenVins.add(v.vin);
          combined.push(v);
        }
      }
    }
    // 4. Other vehicles preloaded in context
    for (const v of vehicles) {
      if (!seenVins.has(v.vin)) {
        seenVins.add(v.vin);
        combined.push(v);
      }
    }
    return combined;
  }, [carCategory, branchStockVehicles, allSystemVehicles, globalServerVehicles, searchTags.length, vehicles]);

  // Filtered available vehicles by search tags
  const filteredVehicles = useMemo(() => {
    const listToFilter = carCategory === 'NEW_CAR' ? branchStockVehicles : availableVehicles;
    if (searchTags.length === 0) return listToFilter;

    return listToFilter.filter(v => {
      return searchTags.some(q => {
        const term = q.toLowerCase().replace(/[\s\-.]/g, '');
        const vinClean = v.vin.toLowerCase().replace(/[\s\-.]/g, '');
        const plateClean = (v.licensePlate || '').toLowerCase().replace(/[\s\-.]/g, '');
        const modelClean = v.model.toLowerCase().replace(/[\s\-.]/g, '');
        return vinClean.includes(term) || plateClean.includes(term) || modelClean.includes(term);
      });
    });
  }, [availableVehicles, branchStockVehicles, carCategory, searchTags]);

  // Cars with unfinished work can't be picked (select-all skips them)
  const selectableVehicles = useMemo(
    () => filteredVehicles.filter(v => !v.activeJob),
    [filteredVehicles]
  );

  // Select all filtered vehicles state and handlers
  const isAllFilteredSelected =
    selectableVehicles.length > 0 &&
    selectableVehicles.every(v => selectedItems.some(it => it.vin === v.vin));
  const someFilteredSelected = filteredVehicles.some(v =>
    selectedItems.some(it => it.vin === v.vin)
  );

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered vehicles
      const filteredVins = new Set(filteredVehicles.map(v => v.vin));
      setSelectedItems(prev => prev.filter(it => !filteredVins.has(it.vin)));
    } else {
      // Add all missing filtered vehicles to selected items
      const existingVins = new Set(selectedItems.map(it => it.vin));
      const toAdd: SelectedWashItem[] = selectableVehicles
        .filter(v => !existingVins.has(v.vin))
        .map(v => createWashItemFromVehicle(v, categoryServices, supplierServices, carCategory));
      setSelectedItems(prev => [...prev, ...toAdd]);
    }
  };

  const openAddServiceModal = (initialTerm: string) => {
    setAddServiceInitialTerm(initialTerm);
    setShowAddServiceModal(true);
  };

  return {
    searchTags,
    setSearchTags,
    isSearchingGlobal,
    filteredVehicles,
    selectableVehicles,
    isAllFilteredSelected,
    someFilteredSelected,
    handleToggleSelectAllFiltered,
    showAddServiceModal,
    setShowAddServiceModal,
    addServiceInitialTerm,
    openAddServiceModal,
  };
}
