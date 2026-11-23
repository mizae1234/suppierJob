import { describe, expect, it } from 'vitest';
import {
  validateJobStatusTransition,
  validateItemStatusTransition,
  isValidJobStatus,
  isValidCarWashItemStatus,
} from '@/lib/services/jobs/state-machine';
import type { UserRole } from '@/types';

describe('state-machine: validateJobStatusTransition', () => {
  it('ปฏิเสธสถานะเป้าหมายที่ไม่รู้จักด้วย 400', () => {
    const res = validateJobStatusTransition({
      role: 'MASTER',
      from: 'IN_PROGRESS',
      to: 'UNKNOWN_STATUS',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it('ปฏิเสธการเปลี่ยนเป็น INVOICED ผ่าน status route ด้วย 400', () => {
    const res = validateJobStatusTransition({
      role: 'MASTER',
      from: 'APPROVED',
      to: 'INVOICED',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it('ปฏิเสธสถานะปัจจุบันที่ไม่ถูกต้องด้วย 409', () => {
    const res = validateJobStatusTransition({
      role: 'BRANCH',
      from: 'BOGUS',
      to: 'CANCELLED',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(409);
  });

  describe('บทบาท SUPPLIER', () => {
    it('อนุญาต PENDING_SUPPLIER → IN_PROGRESS, WAITING_APPROVAL, CANCELLED', () => {
      for (const to of ['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'] as const) {
        expect(
          validateJobStatusTransition({ role: 'SUPPLIER', from: 'PENDING_SUPPLIER', to })
        ).toEqual({ ok: true, from: 'PENDING_SUPPLIER', to });
      }
    });

    it('อนุญาต IN_PROGRESS → WAITING_APPROVAL, CANCELLED และ REJECTED → WAITING_APPROVAL, IN_PROGRESS', () => {
      expect(
        validateJobStatusTransition({ role: 'SUPPLIER', from: 'IN_PROGRESS', to: 'WAITING_APPROVAL' }).ok
      ).toBe(true);
      expect(
        validateJobStatusTransition({ role: 'SUPPLIER', from: 'IN_PROGRESS', to: 'CANCELLED' }).ok
      ).toBe(true);
      expect(
        validateJobStatusTransition({ role: 'SUPPLIER', from: 'REJECTED', to: 'WAITING_APPROVAL' }).ok
      ).toBe(true);
      expect(
        validateJobStatusTransition({ role: 'SUPPLIER', from: 'REJECTED', to: 'IN_PROGRESS' }).ok
      ).toBe(true);
    });

    it('ห้าม SUPPLIER อนุมัติหรือตีกลับงาน (403)', () => {
      for (const to of ['APPROVED', 'REJECTED'] as const) {
        const res = validateJobStatusTransition({
          role: 'SUPPLIER',
          from: 'WAITING_APPROVAL',
          to,
        });
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.status).toBe(403);
      }
    });

    it('ห้าม SUPPLIER แก้ไขงานที่อยู่ใน WAITING_APPROVAL / APPROVED / CANCELLED (409)', () => {
      for (const from of ['WAITING_APPROVAL', 'APPROVED', 'CANCELLED'] as const) {
        const res = validateJobStatusTransition({
          role: 'SUPPLIER',
          from,
          to: 'IN_PROGRESS',
        });
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.status).toBe(409);
      }
    });
  });

  describe('บทบาทผู้ตรวจรับ (BRANCH / ADMIN / MASTER)', () => {
    const reviewerRoles: UserRole[] = ['BRANCH', 'ADMIN', 'MASTER'];

    it.each(reviewerRoles)('%s อนุมัติ/ตีกลับ/ยกเลิกงานที่รอตรวจรับได้', (role) => {
      for (const to of ['APPROVED', 'REJECTED', 'CANCELLED'] as const) {
        expect(
          validateJobStatusTransition({ role, from: 'WAITING_APPROVAL', to })
        ).toEqual({ ok: true, from: 'WAITING_APPROVAL', to });
      }
    });

    it.each(reviewerRoles)('%s ยกเลิกงานที่ยังไม่ปิดจบได้ แต่ห้ามอนุมัติข้ามขั้นตอน', (role) => {
      expect(
        validateJobStatusTransition({ role, from: 'IN_PROGRESS', to: 'CANCELLED' }).ok
      ).toBe(true);
      const approveTooEarly = validateJobStatusTransition({
        role,
        from: 'IN_PROGRESS',
        to: 'APPROVED',
      });
      expect(approveTooEarly.ok).toBe(false);
      if (!approveTooEarly.ok) expect(approveTooEarly.status).toBe(409);
    });

    it('อนุมัติซ้ำงานที่ APPROVED แล้วคืน 409 พร้อมชื่อผู้อนุมัติ', () => {
      const res = validateJobStatusTransition({
        role: 'BRANCH',
        from: 'APPROVED',
        to: 'APPROVED',
        approvedBy: 'สาขามีนบุรี',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(409);
        expect(res.error).toContain('สาขามีนบุรี');
      }
    });

    it('ห้ามยกเลิกงานที่ APPROVED / INVOICED แล้ว และห้ามอนุมัติงานที่ CANCELLED แล้ว', () => {
      const cancelApproved = validateJobStatusTransition({
        role: 'MASTER',
        from: 'APPROVED',
        to: 'CANCELLED',
      });
      expect(cancelApproved.ok).toBe(false);
      if (!cancelApproved.ok) expect(cancelApproved.status).toBe(409);

      const approveCancelled = validateJobStatusTransition({
        role: 'MASTER',
        from: 'CANCELLED',
        to: 'APPROVED',
      });
      expect(approveCancelled.ok).toBe(false);
      if (!approveCancelled.ok) expect(approveCancelled.status).toBe(409);
    });
  });
});

describe('state-machine: validateItemStatusTransition', () => {
  it('ตรวจความถูกต้องของ status helpers', () => {
    expect(isValidJobStatus('WAITING_APPROVAL')).toBe(true);
    expect(isValidJobStatus('INVALID')).toBe(false);
    expect(isValidCarWashItemStatus('COMPLETED')).toBe(true);
    expect(isValidCarWashItemStatus('DONE')).toBe(false);
  });

  it('ปฏิเสธสถานะ item ที่ไม่รู้จักด้วย 400', () => {
    const res = validateItemStatusTransition({
      role: 'BRANCH',
      jobStatus: 'IN_PROGRESS',
      from: 'COMPLETED',
      to: 'WRONG',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it('ห้ามแก้ไขรายการรถหากใบงานปิดจบแล้ว (APPROVED / INVOICED / CANCELLED) ด้วย 409', () => {
    for (const jobStatus of ['APPROVED', 'INVOICED', 'CANCELLED'] as const) {
      const res = validateItemStatusTransition({
        role: 'MASTER',
        jobStatus,
        from: 'COMPLETED',
        to: 'APPROVED',
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe(409);
    }
  });

  it('SUPPLIER ส่งงาน/ยกเลิกรายคันได้ แต่ห้ามอนุมัติหรือตีกลับ (403)', () => {
    expect(
      validateItemStatusTransition({
        role: 'SUPPLIER',
        jobStatus: 'IN_PROGRESS',
        from: 'PENDING',
        to: 'COMPLETED',
      }).ok
    ).toBe(true);

    expect(
      validateItemStatusTransition({
        role: 'SUPPLIER',
        jobStatus: 'IN_PROGRESS',
        from: 'PENDING',
        to: 'CANCELLED',
      }).ok
    ).toBe(true);

    expect(
      validateItemStatusTransition({
        role: 'SUPPLIER',
        jobStatus: 'IN_PROGRESS',
        from: 'REJECTED',
        to: 'COMPLETED',
      }).ok
    ).toBe(true);

    const forbidApprove = validateItemStatusTransition({
      role: 'SUPPLIER',
      jobStatus: 'WAITING_APPROVAL',
      from: 'COMPLETED',
      to: 'APPROVED',
    });
    expect(forbidApprove.ok).toBe(false);
    if (!forbidApprove.ok) expect(forbidApprove.status).toBe(403);
  });

  it('ผู้ตรวจรับ (BRANCH / ADMIN / MASTER) อนุมัติ/ตีกลับ/ยกเลิกได้ แต่ห้ามส่งงาน COMPLETED (403)', () => {
    for (const role of ['BRANCH', 'ADMIN', 'MASTER'] as const) {
      expect(
        validateItemStatusTransition({
          role,
          jobStatus: 'WAITING_APPROVAL',
          from: 'COMPLETED',
          to: 'APPROVED',
        }).ok
      ).toBe(true);
      expect(
        validateItemStatusTransition({
          role,
          jobStatus: 'WAITING_APPROVAL',
          from: 'COMPLETED',
          to: 'REJECTED',
        }).ok
      ).toBe(true);
      expect(
        validateItemStatusTransition({
          role,
          jobStatus: 'IN_PROGRESS',
          from: 'PENDING',
          to: 'CANCELLED',
        }).ok
      ).toBe(true);

      const forbidComplete = validateItemStatusTransition({
        role,
        jobStatus: 'IN_PROGRESS',
        from: 'PENDING',
        to: 'COMPLETED',
      });
      expect(forbidComplete.ok).toBe(false);
      if (!forbidComplete.ok) expect(forbidComplete.status).toBe(403);
    }
  });

  it('ห้ามเปลี่ยนสถานะ item ที่ APPROVED หรือ CANCELLED ไปแล้ว (409)', () => {
    const reApprove = validateItemStatusTransition({
      role: 'BRANCH',
      jobStatus: 'IN_PROGRESS',
      from: 'APPROVED',
      to: 'APPROVED',
    });
    expect(reApprove.ok).toBe(false);
    if (!reApprove.ok) expect(reApprove.status).toBe(409);

    const reCancel = validateItemStatusTransition({
      role: 'BRANCH',
      jobStatus: 'IN_PROGRESS',
      from: 'CANCELLED',
      to: 'CANCELLED',
    });
    expect(reCancel.ok).toBe(false);
    if (!reCancel.ok) expect(reCancel.status).toBe(409);
  });
});
