import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAuditFromUser } from '@/lib/audit-log';
import { parseBody, updateSupplierSchema } from '@/lib/validation';

type EditableSupplierField = 'phone' | 'email' | 'address' | 'bankName' | 'bankAccount' | 'taxId';

const MASTER_ONLY_FIELDS: ReadonlyArray<EditableSupplierField> = ['bankName', 'bankAccount', 'taxId'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const parsed = await parseBody(request, updateSupplierSchema);
    if (parsed.response) return parsed.response;
    const body = parsed.data;

    // เฉพาะ MASTER เท่านั้นที่แก้ไขข้อมูลบัญชีธนาคารและเลขประจำตัวผู้เสียภาษีได้
    if (user.role !== 'MASTER') {
      const attemptedSensitive = MASTER_ONLY_FIELDS.filter((field) => body[field] !== undefined);
      if (attemptedSensitive.length > 0) {
        return NextResponse.json(
          { error: 'เฉพาะผู้ดูแลระบบระดับ MASTER เท่านั้นที่สามารถแก้ไขข้อมูลบัญชีธนาคารหรือเลขประจำตัวผู้เสียภาษีได้' },
          { status: 403 }
        );
      }
    }

    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        bankName: true,
        bankAccount: true,
        taxId: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบข้อมูล Supplier นี้' }, { status: 404 });
    }

    const editableFields: EditableSupplierField[] = [
      'phone',
      'email',
      'address',
      'bankName',
      'bankAccount',
      'taxId',
    ];

    const dataToUpdate: Prisma.SupplierUpdateInput = {};
    const validatedValues: Partial<Record<EditableSupplierField, string | null>> = {};

    for (const field of editableFields) {
      if (body[field] === undefined) continue;
      const val = body[field] ?? null;
      dataToUpdate[field] = val;
      validatedValues[field] = val;
    }

    const providedFields = Object.keys(validatedValues) as EditableSupplierField[];
    if (providedFields.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข' }, { status: 400 });
    }

    const before: Partial<Record<EditableSupplierField, string | null>> = {};
    const after: Partial<Record<EditableSupplierField, string | null>> = {};
    for (const field of providedFields) {
      const prevVal = existing[field] ?? null;
      const nextVal = validatedValues[field] ?? null;
      if (prevVal !== nextVal) {
        before[field] = prevVal;
        after[field] = nextVal;
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: dataToUpdate,
    });

    const changedFields = Object.keys(after) as EditableSupplierField[];
    if (changedFields.length > 0) {
      logAuditFromUser(user, {
        action: 'UPDATE_SUPPLIER',
        entityType: 'Supplier',
        entityId: updated.id,
        description: `แก้ไขข้อมูลคู่ค้า ${updated.name} (${updated.code}) — ฟิลด์ที่เปลี่ยน: ${changedFields.join(', ')}`,
        metadata: {
          supplierCode: updated.code,
          supplierName: updated.name,
          changedFields,
          before,
          after,
        },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      supplier: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        bankName: updated.bankName,
        bankAccount: updated.bankAccount,
        taxId: updated.taxId,
      },
    });
  } catch (error) {
    console.error(`PATCH /api/suppliers/${id} error:`, error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตข้อมูล Supplier ได้' },
      { status: 500 }
    );
  }
}
