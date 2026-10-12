import type { SessionUser } from '@/lib/session';

type JobScope = {
  companyId: string;
  branchId: string;
  originBranchId?: string | null;
  destBranchId?: string | null;
  supplierId: string;
};

/**
 * ตรวจว่า user มีสิทธิ์ "ดู" งานนี้หรือไม่ (ใช้กฎเดียวกับ GET /api/jobs)
 */
export function canViewJob(user: SessionUser, job: JobScope): boolean {
  switch (user.role) {
    case 'MASTER':
      return true;
    case 'ADMIN':
      return !user.companyId || job.companyId === user.companyId;
    case 'BRANCH':
      if (!user.branchId) return !user.companyId || job.companyId === user.companyId;
      return (
        job.branchId === user.branchId ||
        job.originBranchId === user.branchId ||
        job.destBranchId === user.branchId
      );
    case 'SUPPLIER':
      return !!user.supplierId && job.supplierId === user.supplierId;
    default:
      return false;
  }
}
