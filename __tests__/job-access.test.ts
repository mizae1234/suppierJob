import { describe, expect, it } from 'vitest';
import {
  canViewJob,
  canMutateJob,
  assertCanMutateJob,
  type JobScope,
} from '@/lib/job-access';
import type { SessionUser } from '@/lib/session';

function makeUser(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: 'user-1',
    username: 'tester',
    displayName: 'Test User',
    firstName: null,
    lastName: null,
    position: null,
    phone: null,
    role: 'BRANCH',
    companyId: 'comp-gi',
    companyCode: 'GI',
    branchId: 'br-gi01',
    branchName: 'Branch GI01',
    branchCode: 'GI01',
    supplierId: null,
    supplierName: null,
    ...overrides,
  };
}

const baseJob: JobScope = {
  companyId: 'comp-gi',
  branchId: 'br-gi01',
  pickupBranchId: 'br-gi01',
  destBranchId: 'br-gi02',
  pickupBranch: { companyId: 'comp-gi' },
  destBranch: { companyId: 'comp-gi' },
  requestedById: 'user-creator',
  supplierId: 'sup-1',
};

describe('job-access: canViewJob / canMutateJob / assertCanMutateJob', () => {
  describe('MASTER', () => {
    it('เข้าถึงและแก้ไขงานได้ทุกบริษัท ทุกสาขา', () => {
      const master = makeUser({ role: 'MASTER', companyId: null, branchId: null });
      expect(canViewJob(master, baseJob)).toBe(true);
      expect(canMutateJob(master, baseJob)).toBe(true);
      expect(assertCanMutateJob(master, baseJob)).toBeNull();
    });
  });

  describe('ADMIN', () => {
    it('เข้าถึงงานในบริษัทตนเองได้', () => {
      const adminGi = makeUser({ role: 'ADMIN', companyId: 'comp-gi', branchId: null });
      expect(canViewJob(adminGi, baseJob)).toBe(true);
      expect(canMutateJob(adminGi, baseJob)).toBe(true);
      expect(assertCanMutateJob(adminGi, baseJob)).toBeNull();
    });

    it('ป้องกัน Cross-Company IDOR: ADMIN บริษัท EV7 ห้ามดูหรือแก้ไขงานของบริษัท GI ที่ไม่เกี่ยวข้อง', () => {
      const adminEv7 = makeUser({
        role: 'ADMIN',
        companyId: 'comp-ev7',
        companyCode: 'EV7',
        branchId: null,
      });
      expect(canViewJob(adminEv7, baseJob)).toBe(false);
      expect(canMutateJob(adminEv7, baseJob)).toBe(false);
      const res = assertCanMutateJob(adminEv7, baseJob);
      expect(res?.status).toBe(403);
    });

    it('อนุญาตงานสไลด์ข้ามบริษัทหากสาขาต้นทางหรือปลายทางสังกัดบริษัทของ ADMIN', () => {
      const adminEv7 = makeUser({
        role: 'ADMIN',
        companyId: 'comp-ev7',
        companyCode: 'EV7',
        branchId: null,
      });

      const crossDestJob: JobScope = {
        ...baseJob,
        destBranchId: 'br-ev7',
        destBranch: { companyId: 'comp-ev7' },
      };
      expect(canViewJob(adminEv7, crossDestJob)).toBe(true);
      expect(canMutateJob(adminEv7, crossDestJob)).toBe(true);

      const crossPickupJob: JobScope = {
        ...baseJob,
        pickupBranchId: 'br-ev7',
        pickupBranchCompanyId: 'comp-ev7',
        pickupBranch: null,
      };
      expect(canViewJob(adminEv7, crossPickupJob)).toBe(true);
    });

    it('ADMIN ที่ไม่ผูก companyId เข้าถึงได้ทั้งหมด', () => {
      const globalAdmin = makeUser({ role: 'ADMIN', companyId: null, branchId: null });
      expect(canViewJob(globalAdmin, baseJob)).toBe(true);
    });
  });

  describe('BRANCH', () => {
    it('เข้าถึงได้เมื่อเป็นสาขาเจ้าของงาน / สาขาต้นทาง / สาขาปลายทาง / ผู้สั่งงาน', () => {
      // เจ้าของ/ต้นทาง
      expect(canViewJob(makeUser({ role: 'BRANCH', branchId: 'br-gi01' }), baseJob)).toBe(true);
      // ปลายทาง
      expect(canViewJob(makeUser({ role: 'BRANCH', branchId: 'br-gi02' }), baseJob)).toBe(true);
      // ต้นทางแยกจาก branchId (owner)
      const slideJob: JobScope = {
        ...baseJob,
        branchId: 'br-owner',
        pickupBranchId: 'br-pickup',
        destBranchId: 'br-dest',
      };
      expect(canViewJob(makeUser({ role: 'BRANCH', branchId: 'br-pickup' }), slideJob)).toBe(true);
      // ผู้สั่งงานเอง
      expect(
        canViewJob(
          makeUser({ id: 'user-creator', role: 'BRANCH', branchId: 'br-other' }),
          baseJob
        )
      ).toBe(true);
    });

    it('ห้ามสาขาอื่นที่ไม่เกี่ยวข้องดูหรือแก้ไข (403)', () => {
      const otherBranch = makeUser({
        id: 'user-other',
        role: 'BRANCH',
        companyId: 'comp-gi',
        branchId: 'br-gi09',
      });
      expect(canViewJob(otherBranch, baseJob)).toBe(false);
      expect(canMutateJob(otherBranch, baseJob)).toBe(false);
      const res = assertCanMutateJob(otherBranch, baseJob);
      expect(res?.status).toBe(403);
    });

    it('กรณีผู้ใช้ BRANCH ไม่มี branchId: ตรวจด้วย companyId แทน (ไม่มี companyId → false)', () => {
      const sameCompany = makeUser({ role: 'BRANCH', branchId: null, companyId: 'comp-gi' });
      const diffCompany = makeUser({ role: 'BRANCH', branchId: null, companyId: 'comp-ev7' });
      const noCompany = makeUser({ role: 'BRANCH', branchId: null, companyId: null });

      expect(canViewJob(sameCompany, baseJob)).toBe(true);
      expect(canViewJob(diffCompany, baseJob)).toBe(false);
      expect(canViewJob(noCompany, baseJob)).toBe(false);
    });
  });

  describe('SUPPLIER', () => {
    it('เข้าถึงและแก้ไขได้เฉพาะงานที่ตรงกับ supplierId ของตนเท่านั้น', () => {
      const ownSupplier = makeUser({
        role: 'SUPPLIER',
        companyId: null,
        branchId: null,
        supplierId: 'sup-1',
      });
      const otherSupplier = makeUser({
        role: 'SUPPLIER',
        companyId: null,
        branchId: null,
        supplierId: 'sup-2',
      });
      const unboundSupplier = makeUser({
        role: 'SUPPLIER',
        companyId: null,
        branchId: null,
        supplierId: null,
      });

      expect(canViewJob(ownSupplier, baseJob)).toBe(true);
      expect(canMutateJob(ownSupplier, baseJob)).toBe(true);
      expect(assertCanMutateJob(ownSupplier, baseJob)).toBeNull();

      expect(canViewJob(otherSupplier, baseJob)).toBe(false);
      expect(assertCanMutateJob(otherSupplier, baseJob)?.status).toBe(403);

      expect(canViewJob(unboundSupplier, baseJob)).toBe(false);
    });
  });
});
