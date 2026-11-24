import { prisma } from '@/lib/prisma';
import { d365PostService } from './client';

/**
 * Lookup รหัสคู่ค้า (Vendor) ใน D365 ผ่าน Custom Service (POST)
 *   /api/services/MIS_InterfaceServiceGroup/MIS_InterfaceService/getVendors
 *   Request : { company: "GI", vendorAccount: "" }  (vendorAccount ว่าง = ทุก Vendor ของบริษัทนั้น)
 *   Response: { success, message, count, data: [{ company, vendorAccount, vendorName, vendorPartyNumber, isBlocked, isActive, ... }] }
 *
 * - แต่ละบริษัท (Legal Entity = รหัสสาขาในระบบเรา เช่น GI, GI02) มีรหัส Vendor ของตัวเอง
 * - Vendor รายเดียวกันทุกบริษัทจะมี vendorPartyNumber (Global Address Book) เดียวกัน → ใช้จับคู่ข้ามบริษัท
 * - เส้นนี้ดึงได้ทีละบริษัท → การหาข้ามบริษัทจะวนดึงทุกบริษัท (สาขา) ที่มีในระบบ
 */

export const GET_VENDORS_SERVICE_PATH =
  'api/services/MIS_InterfaceServiceGroup/MIS_InterfaceService/getVendors';

export interface D365VendorRecord {
  company: string; // เช่น GI02 (ตัวใหญ่)
  vendorCode: string; // vendorAccount เช่น V000357
  vendorName: string; // vendorName
  partyNumber: string; // vendorPartyNumber
  searchName?: string;
  vendorGroup?: string;
  currency?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  taxRegistrationNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  isBlocked: boolean;
  isActive: boolean;
  modifiedDateTime?: string;
}

interface RawVendor {
  company?: string;
  vendorAccount?: string;
  vendorName?: string;
  searchName?: string;
  vendorGroup?: string;
  vendorPartyNumber?: string;
  currency?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  taxRegistrationNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  isBlocked?: boolean;
  isActive?: boolean;
  modifiedDateTime?: string;
}

interface GetVendorsResponse {
  success?: boolean;
  message?: string;
  count?: number;
  data?: RawVendor[];
}

export const normalizeCompany = (code: string) => code.trim().toUpperCase();
export const normalizeVendorCode = (code: string) => code.trim().toUpperCase();

const trimOrUndef = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

/** จัดรูปแบบที่อยู่จาก D365 ให้เป็นบรรทัดเดียวสะอาดตา (แทนที่ \r\n ด้วยช่องว่าง) */
export function normalizeD365Address(v?: string | null): string | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return cleaned || undefined;
}

function mapVendor(v: RawVendor, fallbackCompany: string): D365VendorRecord {
  return {
    company: normalizeCompany(v.company || fallbackCompany),
    vendorCode: normalizeVendorCode(v.vendorAccount || ''),
    vendorName: (v.vendorName || '').trim(),
    partyNumber: (v.vendorPartyNumber || '').trim(),
    searchName: trimOrUndef(v.searchName),
    vendorGroup: trimOrUndef(v.vendorGroup),
    currency: trimOrUndef(v.currency),
    paymentTerms: trimOrUndef(v.paymentTerms),
    paymentMethod: trimOrUndef(v.paymentMethod),
    taxRegistrationNumber: trimOrUndef(v.taxRegistrationNumber),
    address: normalizeD365Address(v.address),
    phone: trimOrUndef(v.phone),
    email: trimOrUndef(v.email),
    isBlocked: v.isBlocked === true,
    isActive: v.isActive !== false,
    modifiedDateTime: trimOrUndef(v.modifiedDateTime),
  };
}

/**
 * สร้าง object สำหรับอัปเดตข้อมูลโปรไฟล์ของ Supplier (address, taxId, paymentTerms, paymentMethod, phone, email) จากข้อมูล D365
 * - ให้ความสำคัญกับข้อมูลของบริษัทหลัก `GI` ก่อน แล้วค่อย fallback ไปยังสาขาอื่น
 * - `address`, `taxId`, `paymentTerms`, `paymentMethod`: อัปเดตให้ตรงกับ D365 เมื่อ D365 มีค่า
 * - `phone` และ `email`: เติมให้เฉพาะกรณีที่ในระบบเรายังว่างอยู่ (ไม่ทับเบอร์ที่กรอกไว้เอง)
 */
export function buildSupplierProfileUpdate(
  current: {
    address?: string | null;
    taxId?: string | null;
    paymentTerms?: string | null;
    paymentMethod?: string | null;
    phone?: string | null;
    email?: string | null;
  },
  vendors: D365VendorRecord[]
): {
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  phone?: string;
  email?: string;
} {
  const usable = vendors.filter(isVendorUsable);
  if (usable.length === 0) return {};

  // เรียงให้บริษัทหลัก GI มาก่อน
  const ordered = [...usable].sort((a, b) => {
    if (a.company === 'GI' && b.company !== 'GI') return -1;
    if (b.company === 'GI' && a.company !== 'GI') return 1;
    return a.company.localeCompare(b.company);
  });

  const d365Address = ordered.find((v) => v.address)?.address;
  const d365TaxId = ordered.find((v) => v.taxRegistrationNumber)?.taxRegistrationNumber;
  const d365PaymentTerms = ordered.find((v) => v.paymentTerms)?.paymentTerms;
  const d365PaymentMethod = ordered.find((v) => v.paymentMethod)?.paymentMethod;
  const d365Phone = ordered.find((v) => v.phone)?.phone;
  const d365Email = ordered.find((v) => v.email)?.email;

  const update: {
    address?: string;
    taxId?: string;
    paymentTerms?: string;
    paymentMethod?: string;
    phone?: string;
    email?: string;
  } = {};
  if (d365Address && d365Address !== (current.address || '').trim()) {
    update.address = d365Address;
  }
  if (d365TaxId && d365TaxId !== (current.taxId || '').trim()) {
    update.taxId = d365TaxId;
  }
  if (d365PaymentTerms && d365PaymentTerms !== (current.paymentTerms || '').trim()) {
    update.paymentTerms = d365PaymentTerms;
  }
  if (d365PaymentMethod && d365PaymentMethod !== (current.paymentMethod || '').trim()) {
    update.paymentMethod = d365PaymentMethod;
  }
  if (!current.phone?.trim() && d365Phone) {
    update.phone = d365Phone;
  }
  if (!current.email?.trim() && d365Email) {
    update.email = d365Email;
  }
  return update;
}

/** Vendor ที่ใช้เปิด PO ได้ (ไม่ถูก Block และยัง Active) */
export const isVendorUsable = (v: D365VendorRecord) => !v.isBlocked && v.isActive;

// ── Cache รายชื่อ Vendor ต่อบริษัท (กันยิงซ้ำระหว่าง sync หลาย Supplier ติดกัน) ──
const COMPANY_CACHE_TTL_MS = 5 * 60_000;
const companyCache = new Map<string, { expires: number; vendors: D365VendorRecord[] }>();

/**
 * เรียกเส้น getVendors ของ D365
 * @param company รหัสบริษัท เช่น GI, GI02
 * @param vendorAccount รหัส Vendor (ว่าง = ทั้งหมดของบริษัท)
 */
export async function getVendorsFromD365(company: string, vendorAccount = ''): Promise<D365VendorRecord[]> {
  const comp = normalizeCompany(company);
  const account = vendorAccount ? normalizeVendorCode(vendorAccount) : '';
  const res = await d365PostService<GetVendorsResponse>(GET_VENDORS_SERVICE_PATH, {
    company: comp,
    vendorAccount: account,
  });
  if (res && res.success === false && !(res.data && res.data.length)) {
    // ไม่พบ vendor ก็ถือเป็นผลลัพธ์ว่าง ไม่ใช่ error
    return [];
  }
  return (res?.data || [])
    .map((v) => mapVendor(v, comp))
    .filter((v) => v.vendorCode && v.company === comp);
}

/** ดึง Vendor ทั้งหมดของบริษัท (มี cache 5 นาที) */
export async function getCompanyVendors(company: string, opts?: { fresh?: boolean }): Promise<D365VendorRecord[]> {
  const comp = normalizeCompany(company);
  const cached = companyCache.get(comp);
  if (!opts?.fresh && cached && cached.expires > Date.now()) return cached.vendors;
  const vendors = await getVendorsFromD365(comp);
  companyCache.set(comp, { expires: Date.now() + COMPANY_CACHE_TTL_MS, vendors });
  return vendors;
}

/** ดึง Vendor ของหลายบริษัทพร้อมกัน (จำกัดจำนวนคำขอพร้อมกัน) — บริษัทที่ดึงไม่สำเร็จจะถูกข้าม */
async function getVendorsOfCompanies(companies: string[], opts?: { fresh?: boolean }): Promise<D365VendorRecord[]> {
  const unique = [...new Set(companies.map(normalizeCompany).filter(Boolean))];
  const results: D365VendorRecord[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((c) => getCompanyVendors(c, opts)));
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled') results.push(...r.value);
      else console.warn(`[D365 Vendor] ดึง Vendor ของบริษัท ${batch[idx]} ไม่สำเร็จ:`, r.reason);
    });
  }
  return results;
}

async function getAllBranchCompanies(): Promise<string[]> {
  const branches = await prisma.branch.findMany({ select: { code: true } });
  return branches.map((b) => b.code);
}

/** ค้นหารหัส Vendor ในบริษัทที่ระบุ — ไม่เจอคืน null */
export async function findVendorInCompany(company: string, vendorCode: string): Promise<D365VendorRecord | null> {
  const code = normalizeVendorCode(vendorCode);
  const rows = await getVendorsFromD365(company, code);
  return rows.find((v) => v.vendorCode === code) ?? null;
}

/** ดึง Vendor ของ Party เดียวกันจากทุกบริษัท (สาขา) ที่มีในระบบ */
export async function findVendorsByParty(
  partyNumber: string,
  opts?: { companies?: string[]; fresh?: boolean }
): Promise<D365VendorRecord[]> {
  const party = partyNumber.trim();
  if (!party) return [];
  const companies = opts?.companies ?? (await getAllBranchCompanies());
  const all = await getVendorsOfCompanies(companies, opts);
  return all.filter((v) => v.partyNumber === party);
}

/** ดึง Vendor ที่มีชื่อ (vendorName) ตรงกันเป๊ะจากทุกบริษัท (สำรองกรณีบางสาขาผูกคนละ PartyNumber) */
export async function findVendorsByOrgName(
  orgName: string,
  opts?: { companies?: string[]; fresh?: boolean }
): Promise<D365VendorRecord[]> {
  const trimmed = orgName.trim();
  if (!trimmed) return [];
  const companies = opts?.companies ?? (await getAllBranchCompanies());
  const all = await getVendorsOfCompanies(companies, opts);
  return all.filter((v) => v.vendorName === trimmed);
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

  // 2) ดึง Vendor ทุกบริษัท (สาขาในระบบ) แล้วกรองตาม PartyNumber — ดึงสดทุกครั้งที่กดซิงค์
  const branches = await prisma.branch.findMany({ orderBy: { code: 'asc' } });
  const companies = branches.map((b) => b.code);
  const allVendors = await getVendorsOfCompanies(companies, { fresh: true });
  const vendors = allVendors.filter((v) => v.partyNumber === partyNumber && isVendorUsable(v));
  const byCompany = new Map<string, D365VendorRecord[]>();
  for (const v of vendors) {
    const list = byCompany.get(v.company) ?? [];
    list.push(v);
    byCompany.set(v.company, list);
  }

  // 3) upsert ตามสาขาในระบบ (หากสาขาไหนไม่เจอด้วย PartyNumber แต่มีชื่อ vendorName เดียวกันใน D365 ให้ดึงมาเติม)
  const primaryOrgName = vendors.find((v) => v.vendorName)?.vendorName || supplier.vendorCodes.find((vc) => vc.vendorName)?.vendorName || '';
  const matchedVendors: D365VendorRecord[] = [...vendors];
  if (primaryOrgName && branches.some((b) => !byCompany.has(normalizeCompany(b.code)))) {
    const byName = allVendors.filter((v) => v.vendorName === primaryOrgName && isVendorUsable(v));
    for (const v of byName) {
      if (!byCompany.has(v.company)) {
        byCompany.set(v.company, [v]);
        matchedVendors.push(v);
      }
    }
  }

  // อัปเดตข้อมูลโปรไฟล์ Supplier (address, taxId และเติม phone/email ถ้ายังว่าง) จาก D365
  const profileUpdate = buildSupplierProfileUpdate(supplier, matchedVendors);
  if (Object.keys(profileUpdate).length > 0) {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: profileUpdate,
    });
  }
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
          paymentTerms: vendor.paymentTerms ?? null,
          paymentMethod: vendor.paymentMethod ?? null,
          source: 'D365_SYNC',
          verifiedAt: now,
        },
      });
      result.created.push({ branchCode: branch.code, vendorCode: vendor.vendorCode });
    } else if (normalizeVendorCode(existing.vendorCode) === vendor.vendorCode) {
      await prisma.supplierVendorCode.update({
        where: { id: existing.id },
        data: {
          vendorName: vendor.vendorName || existing.vendorName,
          paymentTerms: vendor.paymentTerms ?? existing.paymentTerms,
          paymentMethod: vendor.paymentMethod ?? existing.paymentMethod,
          verifiedAt: now,
        },
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
        data: {
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName || null,
          paymentTerms: vendor.paymentTerms ?? null,
          paymentMethod: vendor.paymentMethod ?? null,
          verifiedAt: now,
        },
      });
      result.updated.push({ branchCode: branch.code, from: existing.vendorCode, to: vendor.vendorCode });
    }
  }

  result.message =
    `ดึงรหัสจาก D365 สำเร็จ — เพิ่มใหม่ ${result.created.length}, อัปเดต ${result.updated.length}, ` +
    `ไม่เปลี่ยน ${result.unchanged.length}, ขัดแย้ง ${result.conflicts.length}, ไม่มีใน D365 ${result.notFound.length} สาขา`;
  return result;
}
