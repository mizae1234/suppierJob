import { NextResponse } from 'next/server';
import type { SessionUser } from '@/lib/session';

export type JobScope = {
  companyId: string;
  branchId: string;
  pickupBranchId?: string | null;
  destBranchId?: string | null;
  pickupBranchCompanyId?: string | null;
  destBranchCompanyId?: string | null;
  pickupBranch?: { companyId?: string | null } | null;
  destBranch?: { companyId?: string | null } | null;
  requestedById?: string | null;
  supplierId: string;
};

function resolveBranchCompanyIds(job: JobScope): {
  pickupBranchCompanyId: string | null;
  destBranchCompanyId: string | null;
} {
  return {
    pickupBranchCompanyId: job.pickupBranchCompanyId ?? job.pickupBranch?.companyId ?? null,
    destBranchCompanyId: job.destBranchCompanyId ?? job.destBranch?.companyId ?? null,
  };
}

/**
 * ตรวจว่า user มีสิทธิ์ "ดู" งานนี้หรือไม่ (ใช้กฎเดียวกับ GET /api/jobs)
 */
export function canViewJob(user: SessionUser, job: JobScope): boolean {
  const pickupBranchId = job.pickupBranchId;
  const { pickupBranchCompanyId, destBranchCompanyId } = resolveBranchCompanyIds(job);

  switch (user.role) {
    case 'MASTER':
      return true;
    case 'ADMIN':
      if (!user.companyId) return true;
      return (
        job.companyId === user.companyId ||
        pickupBranchCompanyId === user.companyId ||
        destBranchCompanyId === user.companyId
      );
    case 'BRANCH':
      if (!user.branchId) {
        return Boolean(user.companyId) && job.companyId === user.companyId;
      }
      return (
        job.branchId === user.branchId ||
        pickupBranchId === user.branchId ||
        job.destBranchId === user.branchId ||
        job.requestedById === user.id
      );
    case 'SUPPLIER':
      return Boolean(user.supplierId) && job.supplierId === user.supplierId;
    default:
      return false;
  }
}

/**
 * ตรวจว่า user มีสิทธิ์ "แก้ไข/เปลี่ยนแปลง" งานนี้หรือไม่
 * (ใช้ขอบเขตเดียวกับ canViewJob โดย SUPPLIER แก้ไขได้เฉพาะงานของ supplierId ตนเอง)
 */
export function canMutateJob(user: SessionUser, job: JobScope): boolean {
  return canViewJob(user, job);
}

/**
 * ตรวจสิทธิ์แก้ไขงาน — หากไม่มีสิทธิ์คืน NextResponse(403), หากมีสิทธิ์คืน null
 */
export function assertCanMutateJob(
  user: SessionUser,
  job: JobScope,
  customError?: string
): NextResponse | null {
  if (canMutateJob(user, job)) return null;

  const errorByRole: Record<SessionUser['role'], string> = {
    MASTER: 'คุณไม่มีสิทธิ์แก้ไขงานนี้',
    ADMIN: 'คุณไม่มีสิทธิ์แก้ไขงานของบริษัทอื่น',
    BRANCH: 'คุณไม่มีสิทธิ์จัดการงานของสาขาอื่น',
    SUPPLIER: 'คุณไม่มีสิทธิ์แก้ไขงานของ Supplier อื่น',
  };

  return NextResponse.json(
    { error: customError || errorByRole[user.role] || 'คุณไม่มีสิทธิ์แก้ไขงานนี้' },
    { status: 403 }
  );
}
