import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Mask sensitive financial information if user is not ADMIN/MASTER or the supplier themselves
    const formatted = suppliers.map(s => {
      const isOwnerOrAdmin = 
        user.role === 'MASTER' || 
        user.role === 'ADMIN' || 
        (user.role === 'SUPPLIER' && user.supplierId === s.id);

      return {
        ...s,
        services: s.services.split(',').map(sv => sv.trim()),
        bankAccount: isOwnerOrAdmin ? s.bankAccount : (s.bankAccount ? '***-*-*****-*' : null),
        taxId: isOwnerOrAdmin ? s.taxId : null,
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
