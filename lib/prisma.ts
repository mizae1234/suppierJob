import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatasourceUrl?: string;
};

/**
 * เติมค่าพารามิเตอร์ป้องกัน Connection Pool ค้างสำหรับ SQL Server (เช่น หลังเครื่อง Sleep/Wake หรือเน็ตสะดุด):
 * - connection_limit=30: รองรับการยิง query พร้อมกัน (เช่น include หลายตาราง) ได้โดยไม่ชนเพดาน 15 เดิม
 * - connect_timeout=15: ตัดการเชื่อมต่อถ้าสร้าง TCP connection ใหม่เกิน 15 วินาที
 * - socket_timeout=30: ตัดคำสั่งที่ค้างบน Dead TCP Socket เกิน 30 วินาที เพื่อคืน slot ให้ Pool อัตโนมัติ
 * - pool_timeout=20: เวลารอขอ connection จาก Pool
 */
function buildDatasourceUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed.toLowerCase().startsWith('sqlserver://')) return trimmed;

  const defaults: Record<string, string> = {
    connection_limit: '30',
    pool_timeout: '20',
    connect_timeout: '15',
    socket_timeout: '30',
  };

  const lower = trimmed.toLowerCase();
  const additions: string[] = [];
  for (const [key, val] of Object.entries(defaults)) {
    if (!lower.includes(`${key}=`)) {
      additions.push(`${key}=${val}`);
    }
  }
  if (additions.length === 0) return trimmed;
  const separator = trimmed.endsWith(';') ? '' : ';';
  return `${trimmed}${separator}${additions.join(';')};`;
}

const datasourceUrl = buildDatasourceUrl(process.env.DATABASE_URL);

// หากมี PrismaClient ตัวเก่าค้างอยู่ใน globalThis (เช่น ก่อนใส่ socket_timeout หรือหลังเครื่องพับจอ/Sleep)
// ให้สั่ง disconnect ตัวเก่าและสร้าง Pool ใหม่ทันทีเมื่อ HMR โหลดไฟล์นี้
if (globalForPrisma.prisma && globalForPrisma.prismaDatasourceUrl !== datasourceUrl) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatasourceUrl = datasourceUrl;
}
