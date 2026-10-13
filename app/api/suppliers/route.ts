import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        rateItems: {
          where: { isActive: true },
          orderBy: { serviceCode: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Mask sensitive financial information if user is not ADMIN/MASTER or the supplier themselves
    const formatted = suppliers.map(s => {
      const isOwnerOrAdmin = 
        user && (
          user.role === 'MASTER' || 
          user.role === 'ADMIN' || 
          (user.role === 'SUPPLIER' && user.supplierId === s.id)
        );

      return {
        id: s.id,
        code: s.code,
        name: s.name,
        services: s.services.split(',').map(sv => sv.trim()),
        phone: isOwnerOrAdmin ? s.phone : null,
        email: isOwnerOrAdmin ? s.email : null,
        address: isOwnerOrAdmin ? s.address : null,
        bankName: isOwnerOrAdmin ? s.bankName : null,
        bankAccount: isOwnerOrAdmin ? s.bankAccount : (s.bankAccount ? '***-*-*****-*' : null),
        taxId: isOwnerOrAdmin ? s.taxId : null,
        isActive: s.isActive,
        vatType: s.vatType,
        vatRate: s.vatRate,
        showroomLabel: s.showroomLabel,
        rateItems: s.rateItems,
      };
    });

    return NextResponse.json({ suppliers: formatted });
  } catch (error) {
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Supplier ได้' },
      { status: 500 }
    );
  }
}
