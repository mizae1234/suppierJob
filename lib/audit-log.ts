import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Audit Log Action Types
 */
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_JOB'
  | 'UPDATE_JOB'
  | 'APPROVE_JOB'
  | 'REJECT_JOB'
  | 'CANCEL_JOB'
  | 'SUBMIT_JOB'
  | 'UPDATE_ITEM_STATUS'
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'UPLOAD_EVIDENCE'
  | 'CREATE_VEHICLE'
  | 'UPDATE_VEHICLE'
  | 'CREATE_SUPPLIER'
  | 'UPDATE_SUPPLIER'
  | 'SWITCH_ROLE'
  | 'VIEW_REPORT'
  | 'EXPORT_DATA';

export type EntityType =
  | 'Job'
  | 'Invoice'
  | 'Vehicle'
  | 'User'
  | 'CarWashItem'
  | 'Supplier'
  | 'Branch';

interface AuditLogParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  supplierId?: string | null;
  action: AuditAction;
  entityType?: EntityType | null;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, any> | null;
  request?: NextRequest | null; // Auto-extracts IP & User-Agent
}

/**
 * สร้าง Audit Log entry — fire-and-forget (ไม่ await เพื่อไม่ให้ block response)
 */
export function logAudit(params: AuditLogParams): void {
  const {
    userId,
    userName,
    userRole,
    supplierId,
    action,
    entityType,
    entityId,
    description,
    metadata,
    request,
  } = params;

  // Extract IP & User-Agent from request
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (request) {
    ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    userAgent = request.headers.get('user-agent')?.substring(0, 255) || null;
  }

  // Fire-and-forget — ไม่ await
  (prisma as any).auditLog
    .create({
      data: {
        userId: userId || null,
        userName: userName || null,
        userRole: userRole || null,
        supplierId: supplierId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
      },
    })
    .catch((err: Error) => {
      console.error('[AuditLog] Failed to write audit log:', err.message);
    });
}

/**
 * Helper สำหรับ auth user object
 */
export function logAuditFromUser(
  user: { id?: string; username?: string; displayName?: string; role?: string; supplierId?: string | null },
  params: Omit<AuditLogParams, 'userId' | 'userName' | 'userRole' | 'supplierId'>
): void {
  logAudit({
    ...params,
    userId: user.id,
    userName: user.displayName || user.username,
    userRole: user.role,
    supplierId: user.supplierId || undefined,
  });
}
