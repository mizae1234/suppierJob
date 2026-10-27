import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { findVendorInCompany, normalizeVendorCode } from '@/lib/d365/vendors';

/**
 * รหัส Vendor D365 ของ Supplier แยกตามสาขา (ADMIN/MASTER)
 * GET    → ทุกสาขา (สาขาที่ยังไม่มีรหัส vendorCode = null)
 * PUT    → { branchId, vendorCode } ตรวจกับ D365 ก่อนบันทึก
 * DELETE → ?branchId=
 */

async function listVendorCodes(supplierId: string) {
  const [branches, codes] = await Promise.all([
    prisma.branch.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.supplierVendorCode.findMany({ where: { supplierId } }),
  ]);
  const byBranch = new Map(codes.map((c) => [c.branchId, c]));
  return branches.map((b) => {
    const vc = byBranch.get(b.id);
    return {
      branchId: b.id,
      branchCode: b.code,
      branchName: b.name,
      vendorCode: vc?.vendorCode ?? null,
      vendorName: vc?.vendorName ?? null,
      source: vc?.source ?? null,
      verifiedAt: vc?.verifiedAt ?? null,
    };
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true, d365PartyNumber: true } });
  if (!supplier) return NextResponse.json({ error: 'ไม่พบ Supplier' }, { status: 404 });

  return NextResponse.json({ partyNumber: supplier.d365PartyNumber, vendorCodes: await listVendorCodes(id) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const branchId = String(body.branchId || '').trim();
    const vendorCode = normalizeVendorCode(String(body.vendorCode || ''));
    if (!branchId || !vendorCode) {
      return NextResponse.json({ error: 'กรุณาระบุสาขาและรหัส Vendor' }, { status: 400 });
    }

    const [supplier, branch] = await Promise.all([
      prisma.supplier.findUnique({ where: { id }, select: { id: true, d365PartyNumber: true } }),
      prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, code: true } }),
    ]);
    if (!supplier) return NextResponse.json({ error: 'ไม่พบ Supplier' }, { status: 404 });
    if (!branch) return NextResponse.json({ error: 'ไม่พบสาขา' }, { status: 404 });

    // ตรวจกับ D365 ว่ารหัสนี้มีอยู่จริงในบริษัทของสาขานี้
    const vendor = await findVendorInCompany(branch.code, vendorCode);
    if (!vendor) {
      return NextResponse.json(
        { error: `ไม่พบรหัส Vendor "${vendorCode}" ในบริษัท ${branch.code} ของ D365` },
        { status: 400 },
      );
    }

    let warning: string | null = null;
    if (supplier.d365PartyNumber && vendor.partyNumber && supplier.d365PartyNumber !== vendor.partyNumber) {
      warning = `รหัสนี้เป็นของ "${vendor.vendorName}" ซึ่งไม่ใช่ Party เดียวกับรหัสสาขาอื่นของ Supplier นี้ — กรุณาตรวจสอบ`;
    }
    if (!supplier.d365PartyNumber && vendor.partyNumber) {
      await prisma.supplier.update({ where: { id }, data: { d365PartyNumber: vendor.partyNumber } });
    }

    const data = {
      vendorCode: vendor.vendorCode,
      vendorName: vendor.vendorName || null,
      source: 'MANUAL',
      verifiedAt: new Date(),
    };
    await prisma.supplierVendorCode.upsert({
      where: { supplierId_branchId: { supplierId: id, branchId } },
      create: { supplierId: id, branchId, ...data },
      update: data,
    });

    return NextResponse.json({
      success: true,
      warning,
      vendor,
      vendorCodes: await listVendorCodes(id),
    });
  } catch (error: any) {
    console.error(`PUT /api/suppliers/${id}/vendor-codes error:`, error);
    return NextResponse.json(
      { error: 'บันทึกรหัส Vendor ไม่สำเร็จ', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(request, ['MASTER', 'ADMIN']);
  if (auth.response) return auth.response;

  const branchId = request.nextUrl.searchParams.get('branchId');
  if (!branchId) return NextResponse.json({ error: 'กรุณาระบุสาขา' }, { status: 400 });

  await prisma.supplierVendorCode.deleteMany({ where: { supplierId: id, branchId } });
  return NextResponse.json({ success: true, vendorCodes: await listVendorCodes(id) });
}
