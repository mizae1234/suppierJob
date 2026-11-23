import { describe, expect, it } from 'vitest';
import {
  resolveJobDestWarehouse,
  getBranchCodeFromD365Warehouse,
  sortWarehouseOptionsForBranch,
  normalizeWarehouseId,
  isValidWarehouseId,
  getD365WarehouseForBranch,
} from '@/lib/d365/warehouses';

describe('d365/warehouses', () => {
  describe('resolveJobDestWarehouse', () => {
    it('ใช้ destWarehouseId ที่ผู้สั่งงานระบุก่อนเสมอ (พร้อม trim)', () => {
      expect(
        resolveJobDestWarehouse({
          destWarehouseId: ' 63001 ',
          destBranch: { code: 'GI06' },
        })
      ).toBe('63001');
    });

    it('หากไม่มี destWarehouseId (ใบงานเก่า) ให้ fallback เป็นคลังหลักของสาขาปลายทาง', () => {
      expect(
        resolveJobDestWarehouse({
          destWarehouseId: null,
          destBranch: { code: 'GI02' },
        })
      ).toBe('62010');

      expect(
        resolveJobDestWarehouse({
          destWarehouseId: '   ',
          destBranch: { code: 'gi06' },
        })
      ).toBe('63004');
    });

    it('คืน null เมื่อไม่พบทั้ง destWarehouseId และรหัสสาขาที่รู้จัก', () => {
      expect(resolveJobDestWarehouse({ destWarehouseId: null, destBranch: null })).toBeNull();
      expect(resolveJobDestWarehouse({ destBranch: { code: 'UNKNOWN' } })).toBeNull();
    });
  });

  describe('getBranchCodeFromD365Warehouse', () => {
    it('แปลงคลังโชว์รูมเป็นรหัสสาขาได้ถูกต้อง', () => {
      expect(getBranchCodeFromD365Warehouse('62008')).toBe('GI01');
      expect(getBranchCodeFromD365Warehouse(' 62010 ')).toBe('GI02');
      expect(getBranchCodeFromD365Warehouse('63004')).toBe('GI06');
      expect(getBranchCodeFromD365Warehouse('63001')).toBe('GI06');
    });

    it('คลังกลาง 62900 คืน null เมื่อ strictShowroomOnly=true และคืน GI เมื่อเป็น false', () => {
      expect(getBranchCodeFromD365Warehouse('62900')).toBeNull();
      expect(getBranchCodeFromD365Warehouse('62900', true)).toBeNull();
      expect(getBranchCodeFromD365Warehouse('62900', false)).toBe('GI');
    });

    it('คืน null สำหรับค่าว่างหรือคลังที่ไม่รู้จัก', () => {
      expect(getBranchCodeFromD365Warehouse(null)).toBeNull();
      expect(getBranchCodeFromD365Warehouse('')).toBeNull();
      expect(getBranchCodeFromD365Warehouse('99999')).toBeNull();
    });
  });

  describe('sortWarehouseOptionsForBranch', () => {
    it('กรองเฉพาะคลังของสาขานั้น และเรียงคลังหลักขึ้นก่อน', () => {
      const items = [
        { warehouseId: '62008', warehouseName: 'BangKhae', dataAreaId: 'GI01' }, // ของ GI01 ต้องถูกกรองออก
        { warehouseId: '63003', warehouseName: '', dataAreaId: 'GI06' },
        { warehouseId: '63001', warehouseName: 'EV7 HP', dataAreaId: 'GI06' },
        { warehouseId: '63004', warehouseName: 'EV7 Taxi', dataAreaId: 'GI06' },
        { warehouseId: '63002', warehouseName: 'EV7 Lineman', dataAreaId: 'GI06' },
      ];

      const sorted = sortWarehouseOptionsForBranch('gi06', items);
      expect(sorted.map((w) => w.warehouseId)).toEqual(['63004', '63001', '63002', '63003']);
      // ตัวที่ไม่ได้ส่งชื่อมา ต้อง fallback จาก D365_WAREHOUSE_NAMES
      expect(sorted.find((w) => w.warehouseId === '63003')?.warehouseName).toBe(
        'EV7-FINANCE LEASE (AOT)'
      );
      expect(sorted.every((w) => w.isPrimary)).toBe(true);
    });

    it('คืน array ว่างสำหรับสาขาที่ไม่มีข้อมูลคลัง', () => {
      expect(
        sortWarehouseOptionsForBranch('NO_BRANCH', [
          { warehouseId: '62008', warehouseName: 'BangKhae' },
        ])
      ).toEqual([]);
    });
  });

  describe('normalizeWarehouseId & isValidWarehouseId & getD365WarehouseForBranch', () => {
    it('ตรวจสอบและทำความสะอาดรหัสคลังได้ถูกต้อง', () => {
      expect(normalizeWarehouseId(' 62008 ')).toBe('62008');
      expect(normalizeWarehouseId(null)).toBe('');
      expect(isValidWarehouseId('62008')).toBe(true);
      expect(isValidWarehouseId('WH_01-A')).toBe(true);
      expect(isValidWarehouseId('')).toBe(false);
      expect(isValidWarehouseId('A'.repeat(21))).toBe(false);
      expect(isValidWarehouseId('62008 space')).toBe(false);
      expect(getD365WarehouseForBranch('gi01')).toBe('62008');
    });
  });
});
