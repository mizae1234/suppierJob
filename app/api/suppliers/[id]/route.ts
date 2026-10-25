import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { d365VendorCode, phone, email, address, bankName, bankAccount, taxId } = body;

    const dataToUpdate: any = {};
    if (d365VendorCode !== undefined) {
      dataToUpdate.d365VendorCode = d365VendorCode ? String(d365VendorCode).trim() : null;
    }
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email;
    if (address !== undefined) dataToUpdate.address = address;
    if (bankName !== undefined) dataToUpdate.bankName = bankName;
    if (bankAccount !== undefined) dataToUpdate.bankAccount = bankAccount;
    if (taxId !== undefined) dataToUpdate.taxId = taxId;

    const updated = await prisma.supplier.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      supplier: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        d365VendorCode: updated.d365VendorCode,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        bankName: updated.bankName,
        bankAccount: updated.bankAccount,
        taxId: updated.taxId,
      },
    });
  } catch (error: any) {
    console.error(`PATCH /api/suppliers/${id} error:`, error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตข้อมูล Supplier ได้', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
