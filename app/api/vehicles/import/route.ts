import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface ImportVehicleItem {
  vin: string;
  model: string;
  color: string;
  vehicleType?: string;
  companyCode?: string;
  branchCodeOrName?: string;
  licensePlate?: string;
  mileage?: number;
  status?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  if (user.role === 'SUPPLIER') {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ในการนำเข้าข้อมูลรถ' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      vehicles, 
      defaultCompanyId, 
      defaultBranchId, 
      duplicateAction = 'UPDATE' // 'UPDATE' | 'SKIP'
    } = body as {
      vehicles: ImportVehicleItem[];
      defaultCompanyId?: string;
      defaultBranchId?: string;
      duplicateAction?: 'UPDATE' | 'SKIP';
    };

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการข้อมูลรถที่ต้องการนำเข้า' }, { status: 400 });
    }

    // Fetch master companies and branches for lookup
    const allCompanies = await prisma.company.findMany();
    const allBranches = await prisma.branch.findMany();

    // Default company and branch resolution
    let effectiveDefaultCompanyId = defaultCompanyId || allCompanies[0]?.id;
    let effectiveDefaultBranchId = defaultBranchId || allBranches[0]?.id;

    if (user.role === 'BRANCH') {
      if (user.companyId) effectiveDefaultCompanyId = user.companyId;
      if (user.branchId) effectiveDefaultBranchId = user.branchId;
    } else if (user.role === 'ADMIN' && user.companyId) {
      effectiveDefaultCompanyId = user.companyId;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Filter and sanitize items
    const sanitizedItems: Array<{
      vin: string;
      model: string;
      color: string;
      vehicleType: string;
      companyId: string;
      currentBranchId: string;
      licensePlate: string | null;
      mileage: number | null;
      status: string;
    }> = [];

    const seenVins = new Set<string>();

    for (let i = 0; i < vehicles.length; i++) {
      const item = vehicles[i];
      const rowNum = i + 1;

      const rawVin = String(item.vin || '').trim().toUpperCase();
      if (!rawVin) {
        errors.push(`แถวที่ ${rowNum}: ขาดเลขตัวถัง (VIN)`);
        continue;
      }

      if (seenVins.has(rawVin)) {
        errors.push(`แถวที่ ${rowNum}: เลขตัวถัง (VIN) ${rawVin} ซ้ำกับแถวก่อนหน้าในไฟล์`);
        continue;
      }
      seenVins.add(rawVin);

      const rawModel = String(item.model || '').trim();
      if (!rawModel) {
        errors.push(`แถวที่ ${rowNum} (${rawVin}): ขาดข้อมูลรุ่นรถ (Model)`);
        continue;
      }

      const rawColor = String(item.color || '').trim() || 'สีมาตรฐาน';
      const rawType = String(item.vehicleType || '').trim() || 'Sedan';

      // Company resolution
      let targetCompanyId = effectiveDefaultCompanyId;
      if (item.companyCode && (user.role === 'MASTER' || user.role === 'ADMIN')) {
        const matchedComp = allCompanies.find(c => c.code.toLowerCase() === item.companyCode?.trim().toLowerCase());
        if (matchedComp) {
          if (user.role === 'ADMIN' && user.companyId && user.companyId !== matchedComp.id) {
            // ADMIN cannot import to other company
          } else {
            targetCompanyId = matchedComp.id;
          }
        }
      }

      // Branch resolution
      let targetBranchId = effectiveDefaultBranchId;
      const ev7Branch = allBranches.find(b => b.companyId === targetCompanyId && b.code === 'EV7');
      if (ev7Branch) {
        // EV7 has no sub-branches, always assign to the unified EV7 branch
        targetBranchId = ev7Branch.id;
      } else if (item.branchCodeOrName && user.role !== 'BRANCH') {
        const query = item.branchCodeOrName.trim().toLowerCase();
        const matchedBranch = allBranches.find(b => 
          b.companyId === targetCompanyId && 
          (b.code.toLowerCase() === query || b.name.toLowerCase().includes(query) || query.includes(b.name.toLowerCase()))
        ) || allBranches.find(b => 
          b.code.toLowerCase() === query || b.name.toLowerCase().includes(query)
        );

        if (matchedBranch) {
          targetBranchId = matchedBranch.id;
        }
      }

      const rawMileage = item.mileage ? parseInt(String(item.mileage).replace(/[^0-9]/g, ''), 10) : null;
      const rawPlate = item.licensePlate ? String(item.licensePlate).trim() : null;
      const rawStatus = (item.status && ['AVAILABLE', 'IN_TRANSIT', 'IN_WASH'].includes(item.status)) 
        ? item.status 
        : 'AVAILABLE';

      sanitizedItems.push({
        vin: rawVin,
        model: rawModel,
        color: rawColor,
        vehicleType: rawType,
        companyId: targetCompanyId,
        currentBranchId: targetBranchId,
        licensePlate: rawPlate,
        mileage: Number.isNaN(rawMileage) ? null : rawMileage,
        status: rawStatus,
      });
    }

    if (sanitizedItems.length === 0) {
      return NextResponse.json({ 
        error: 'ไม่มีข้อมูลรถที่ถูกต้องตามเงื่อนไขเพื่อนำเข้า', 
        errors 
      }, { status: 400 });
    }

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of sanitizedItems) {
        const existing = await tx.vehicle.findUnique({
          where: { vin: item.vin },
        });

        if (existing) {
          if (duplicateAction === 'SKIP') {
            skippedCount++;
            continue;
          } else {
            // Update existing vehicle info
            await tx.vehicle.update({
              where: { vin: item.vin },
              data: {
                model: item.model,
                color: item.color,
                vehicleType: item.vehicleType,
                licensePlate: item.licensePlate || existing.licensePlate,
                mileage: item.mileage !== null ? item.mileage : existing.mileage,
                currentBranchId: item.currentBranchId,
                companyId: item.companyId,
              },
            });
            updatedCount++;
          }
        } else {
          // Create new vehicle
          await tx.vehicle.create({
            data: {
              vin: item.vin,
              model: item.model,
              color: item.color,
              vehicleType: item.vehicleType,
              licensePlate: item.licensePlate,
              mileage: item.mileage,
              status: item.status,
              companyId: item.companyId,
              currentBranchId: item.currentBranchId,
            },
          });
          createdCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: {
        totalParsed: vehicles.length,
        imported: createdCount + updatedCount,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: errors.length,
      },
      errors,
    }, { status: 201 });

  } catch (err: any) {
    console.error('Vehicle import error:', err);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล กรุณาตรวจสอบรูปแบบไฟล์และลองใหม่อีกครั้ง' 
    }, { status: 500 });
  }
}
