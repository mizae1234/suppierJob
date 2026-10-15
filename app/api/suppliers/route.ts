import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);

  try {
    let suppliers: any[];
    try {
      suppliers = await (prisma.supplier as any).findMany({
        where: { isActive: true },
        include: {
          rateItems: {
            where: { isActive: true },
            orderBy: { serviceCode: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (includeErr: any) {
      // Only fallback if the rateItems relation/table does not exist in database yet
      if (includeErr?.code === 'P2021' || includeErr?.code === 'P2017') {
        console.warn('Fallback: querying suppliers without rateItems include');
        suppliers = await prisma.supplier.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        });
      } else {
        throw includeErr;
      }
    }

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
        services: Array.isArray(s.services) ? s.services : s.services.split(',').map((sv: string) => sv.trim()),
        phone: s.phone,
        email: s.email,
        address: s.address,
        bankName: isOwnerOrAdmin ? s.bankName : null,
        bankAccount: isOwnerOrAdmin ? s.bankAccount : (s.bankAccount ? '***-*-*****-*' : null),
        taxId: isOwnerOrAdmin ? s.taxId : null,
        isActive: s.isActive,
        vatType: s.vatType,
        vatRate: s.vatRate,
        showroomLabel: s.showroomLabel,
        rateItems: s.rateItems || [],
      };
    });

    return NextResponse.json({ suppliers: formatted });
  } catch (error: any) {
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Supplier ได้', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
