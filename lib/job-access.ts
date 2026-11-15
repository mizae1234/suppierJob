import type { SessionUser } from '@/lib/session';

type JobScope = {
  companyId: string;
  branchId: string;
  pickupBranchId?: string | null;
  originBranchId?: string | null;
  destBranchId?: string | null;
  requestedById?: string | null;
  supplierId: string;
};

/**
 * ตรวจว่า user มีสิทธิ์ "ดู" งานนี้หรือไม่ (ใช้กฎเดียวกับ GET /api/jobs)
 */
export function canViewJob(user: SessionUser, job: JobScope): boolean {
  const pickupBranchId = job.pickupBranchId ?? job.originBranchId;
  switch (user.role) {
    case 'MASTER':
      return true;
    case 'ADMIN':
      return !user.companyId || job.companyId === user.companyId || Boolean(pickupBranchId || job.destBranchId);
    case 'BRANCH':
      if (!user.branchId) return !user.companyId || job.companyId === user.companyId;
      return (
        job.branchId === user.branchId ||
        pickupBranchId === user.branchId ||
        job.destBranchId === user.branchId ||
        job.requestedById === user.id
      );
    case 'SUPPLIER':
      return !!user.supplierId && job.supplierId === user.supplierId;
    default:
      return false;
  }
}
