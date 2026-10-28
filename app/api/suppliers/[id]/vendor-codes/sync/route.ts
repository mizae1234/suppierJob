import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { syncSupplierVendorCodes } from '@/lib/d365/vendors';

/** ดึงรหัส Vendor ทุกสาขาของ Supplier จาก D365 (จับคู่ด้วย VendorPartyNumber) — ADMIN/MASTER */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  try {
    const exists = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: 'ไม่พบ Supplier' }, { status: 404 });

    const result = await syncSupplierVendorCodes(id);
    return NextResponse.json({ success: !!result.partyNumber, ...result });
  } catch (error) {
    console.error(`POST /api/suppliers/${id}/vendor-codes/sync error:`, error);
    return NextResponse.json(
      { error: 'ดึงรหัส Vendor จาก D365 ไม่สำเร็จ' },
      { status: 500 },
    );
  }
}
