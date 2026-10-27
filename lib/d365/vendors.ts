import { prisma } from '@/lib/prisma';
import { d365FetchAll } from './client';

/**
 * Lookup รหัสคู่ค้า (Vendor) ใน D365 ผ่าน OData entity VendorsV3
 *
 * - แต่ละบริษัท (Legal Entity = รหัสสาขาในระบบเรา เช่น GI, GI02) มีรหัส Vendor ของตัวเอง
 * - Vendor รายเดียวกันทุกบริษัทจะมี VendorPartyNumber (Global Address Book) เดียวกัน
 *   จึงใช้ PartyNumber เป็นตัวจับคู่ข้ามบริษัท
 * - dataAreaId ที่ D365 ส่งกลับมามีทั้งตัวเล็ก/ใหญ่ปนกัน → normalize เป็นตัวใหญ่เสมอ
 */

export interface D365VendorRecord {
  company: string; // dataAreaId (ตัวใหญ่) เช่น GI02
  vendorCode: string; // VendorAccountNumber เช่น V000357
  vendorName: string; // VendorOrganizationName
  partyNumber: string; // VendorPartyNumber
}

interface RawVendor {
  VendorAccountNumber: string;
  VendorOrganizationName?: string;
  VendorPartyNumber?: string;
  dataAreaId: string;
}

const VENDOR_SELECT = 'VendorAccountNumber,VendorOrganizationName,VendorPartyNumber,dataAreaId';

export const normalizeCompany = (code: string) => code.trim().toUpperCase();
export const normalizeVendorCode = (code: string) => code.trim().toUpperCase();

/** escape ' สำหรับ OData string literal */
const odataStr = (v: string) => `'${v.replace(/'/g, "''")}'`;

function mapVendor(v: RawVendor): D365VendorRecord {
  return {
    company: normalizeCompany(v.dataAreaId),
    vendorCode: normalizeVendorCode(v.VendorAccountNumber),
    vendorName: (v.VendorOrganizationName || '').trim(),
    partyNumber: (v.VendorPartyNumber || '').trim(),
  };
}

/** ค้นหารหัส Vendor ในบริษัทที่ระบุ — ไม่เจอคืน null */
export async function findVendorInCompany(company: string, vendorCode: string): Promise<D365VendorRecord | null> {
  const rows = await d365FetchAll<RawVendor>('VendorsV3', {
    $filter: `dataAreaId eq ${odataStr(company.trim().toLowerCase())} and VendorAccountNumber eq ${odataStr(normalizeVendorCode(vendorCode))}`,
    $select: VENDOR_SELECT,
    'cross-company': 'true',
  });
  const match = rows.map(mapVendor).find((v) => v.company === normalizeCompany(company));
  return match ?? null;
}

/** ดึง Vendor ของ Party เดียวกันจากทุกบริษัท */
export async function findVendorsByParty(partyNumber: string): Promise<D365VendorRecord[]> {
  const rows = await d365FetchAll<RawVendor>('VendorsV3', {
    $filter: `VendorPartyNumber eq ${odataStr(partyNumber.trim())}`,
    $select: VENDOR_SELECT,
    'cross-company': 'true',
  });
  return rows.map(mapVendor);
}

export interface VendorSyncResult {
  partyNumber: string | null;
  created: { branchCode: string; vendorCode: string }[];
  updated: { branchCode: string; from: string; to: string }[];
  unchanged: { branchCode: string; vendorCode: string }[];
  conflicts: { branchCode: string; current: string; d365: string; reason: string }[];
  notFound: string[]; // รหัสสาขาที่ไม่มี Vendor ของ Party นี้ใน D365
  message: string;
}

/**
 * ดึงรหัส Vendor ของ Supplier ทุกสาขาจาก D365 แล้วบันทึกลง SupplierVendorCode
 *
 * 1) หา PartyNumber — ใช้ค่าที่เก็บไว้ หรือหาจากรหัสที่มีอยู่แล้วของสาขาใดสาขาหนึ่ง
 * 2) ดึง Vendor ของ Party นี้จากทุกบริษัท
 * 3) upsert เฉพาะบริษัทที่มีสาขาในระบบ
 *    - รหัสที่ admin กรอกเอง (MANUAL) แล้วไม่ตรงกับ D365 → ไม่เขียนทับ รายงานเป็น conflict
 *    - Party มีหลายรหัสในบริษัทเดียว → ไม่เลือกให้ รายงานเป็น conflict
 */
export async function syncSupplierVendorCodes(supplierId: string): Promise<VendorSyncResult> {
  const result: VendorSyncResult = {
    partyNumber: null,
    created: [],
    updated: [],
    unchanged: [],
    conflicts: [],
    notFound: [],
    message: '',
  };

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: { vendorCodes: { include: { branch: true } } },
  });
  if (!supplier) throw new Error('ไม่พบ Supplier');

  // 1) หา PartyNumber
  let partyNumber = supplier.d365PartyNumber?.trim() || null;
  if (!partyNumber) {
    for (const vc of supplier.vendorCodes) {
      const found = await findVendorInCompany(vc.branch.code, vc.vendorCode);
      if (found?.partyNumber) {
        partyNumber = found.partyNumber;
        break;
      }
    }
  }
  if (!partyNumber) {
    result.message = 'ยังหา Party ของ Supplier นี้ใน D365 ไม่ได้ — กรุณากรอกรหัส Vendor อย่างน้อย 1 สาขาก่อน';
    return result;
  }
  result.partyNumber = partyNumber;
  if (partyNumber !== supplier.d365PartyNumber) {
    await prisma.supplier.update({ where: { id: supplierId }, data: { d365PartyNumber: partyNumber } });
  }

  // 2) ดึง Vendor ทุกบริษัท
  const vendors = await findVendorsByParty(partyNumber);
  const byCompany = new Map<string, D365VendorRecord[]>();
  for (const v of vendors) {
    const list = byCompany.get(v.company) ?? [];
    list.push(v);
    byCompany.set(v.company, list);
  }

  // 3) upsert ตามสาขาในระบบ
  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } });
  const existingByBranch = new Map(supplier.vendorCodes.map((vc) => [vc.branchId, vc]));
  const now = new Date();

  for (const branch of branches) {
    const branchCode = normalizeCompany(branch.code);
    const candidates = byCompany.get(branchCode) ?? [];
    const existing = existingByBranch.get(branch.id);

    if (candidates.length === 0) {
      result.notFound.push(branch.code);
      continue;
    }

    // ถ้ามีหลายรหัส แต่รหัสเดิมตรงกับตัวใดตัวหนึ่ง → ใช้ตัวนั้น
    const match = existing ? candidates.find((c) => c.vendorCode === normalizeVendorCode(existing.vendorCode)) : undefined;
    if (!match && candidates.length > 1) {
      result.conflicts.push({
        branchCode: branch.code,
        current: existing?.vendorCode || '-',
        d365: candidates.map((c) => c.vendorCode).join(', '),
        reason: 'พบหลายรหัส Vendor ในบริษัทเดียวกัน',
      });
      continue;
    }
    const vendor = match ?? candidates[0];

    if (!existing) {
      await prisma.supplierVendorCode.create({
        data: {
          supplierId,
          branchId: branch.id,
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName || null,
          source: 'D365_SYNC',
          verifiedAt: now,
        },
      });
      result.created.push({ branchCode: branch.code, vendorCode: vendor.vendorCode });
    } else if (normalizeVendorCode(existing.vendorCode) === vendor.vendorCode) {
      await prisma.supplierVendorCode.update({
        where: { id: existing.id },
        data: { vendorName: vendor.vendorName || existing.vendorName, verifiedAt: now },
      });
      result.unchanged.push({ branchCode: branch.code, vendorCode: vendor.vendorCode });
    } else if (existing.source === 'MANUAL') {
      result.conflicts.push({
        branchCode: branch.code,
        current: existing.vendorCode,
        d365: vendor.vendorCode,
        reason: 'รหัสที่กรอกเองไม่ตรงกับ D365',
      });
    } else {
      await prisma.supplierVendorCode.update({
        where: { id: existing.id },
        data: { vendorCode: vendor.vendorCode, vendorName: vendor.vendorName || null, verifiedAt: now },
      });
      result.updated.push({ branchCode: branch.code, from: existing.vendorCode, to: vendor.vendorCode });
    }
  }

  result.message =
    `ดึงรหัสจาก D365 สำเร็จ — เพิ่มใหม่ ${result.created.length}, อัปเดต ${result.updated.length}, ` +
    `ไม่เปลี่ยน ${result.unchanged.length}, ขัดแย้ง ${result.conflicts.length}, ไม่มีใน D365 ${result.notFound.length} สาขา`;
  return result;
}
