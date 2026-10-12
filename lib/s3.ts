import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Environment variables (names match the .NET side; legacy names kept as fallback)
const S3_ENDPOINT = process.env.S3_SERVICE_URL || process.env.S3_ENDPOINT || 'https://sgp1.digitaloceanspaces.com';
const S3_BUCKET = process.env.S3_BUCKET_IMAGES || process.env.S3_BUCKET || '';
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
const S3_PUBLIC_BASE_URL = (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const S3_DISABLE_ACL = process.env.S3_DISABLE_ACL === 'true';
// ไฟล์ใหม่เก็บแบบ private และเปิดผ่าน /api/files (ตรวจสิทธิ์ก่อน) — ตั้ง S3_PUBLIC_UPLOADS=true เพื่อกลับไปใช้ public-read
const S3_PUBLIC_UPLOADS = process.env.S3_PUBLIC_UPLOADS === 'true';
// Local fallback อยู่นอก public/ เพื่อไม่ให้เปิดได้ตรงๆ โดยไม่ผ่านการตรวจสิทธิ์
const UPLOAD_DIR = process.env.UPLOAD_DIR || './storage/uploads';

export const FILES_ROUTE_PREFIX = '/api/files/';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_TYPES: Record<string, { ext: string; mime: string }> = {
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
};

/**
 * ตรวจชนิดไฟล์จาก magic bytes (ไม่เชื่อนามสกุลหรือ content-type ที่ผู้ใช้ส่งมา)
 */
export function detectImageType(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return IMAGE_TYPES.jpg;
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return IMAGE_TYPES.png;
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return IMAGE_TYPES.webp;
  return null;
}

export function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  return (IMAGE_TYPES[ext === 'jpeg' ? 'jpg' : ext] || IMAGE_TYPES.jpg).mime;
}

/** อนุญาตเฉพาะ A-Z a-z 0-9 _ - ในแต่ละ segment ของ key (กัน path traversal) */
function safeSegment(value: string, fallback: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 64);
  return cleaned && cleaned !== '-' ? cleaned : fallback;
}

export function isSafeStorageKey(key: string): boolean {
  return /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(key) && !key.includes('..');
}

// Initialize S3Client if credentials exist
export const s3Client = S3_ACCESS_KEY && S3_SECRET_ACCESS_KEY && S3_BUCKET
  ? new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: S3_FORCE_PATH_STYLE,
    })
  : null;

/**
 * Format job type for folder path:
 * CAR_WASH -> carwash
 * VEHICLE_SLIDE -> vehicleslide
 */
export function getJobTypeFolder(jobType?: string | null): string {
  const clean = (jobType || '').toUpperCase().trim();
  if (clean.includes('WASH')) return 'carwash';
  if (clean.includes('SLIDE')) return 'vehicleslide';
  return clean.toLowerCase().replace(/[^a-z0-9]/g, '') || 'general';
}

/**
 * Format year-month folder: YYYY-MM
 */
export function getYearMonthFolder(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format S3 Key:
 * {jobType}/{year-month}/{jobNumber}/{vin}/{filename}
 * Example: carwash/2026-10/CW-202610-001/005566/1728080000000_after_ab12cd.jpg
 */
export function buildS3EvidenceKey(params: {
  jobType?: string | null;
  createdAt?: Date | string | null;
  jobNumber?: string | null;
  vin?: string | null;
  evidenceType?: string | null;
  extension?: string;
}): string {
  const typeFolder = getJobTypeFolder(params.jobType);
  const ymFolder = getYearMonthFolder(params.createdAt);
  const jobFolder = safeSegment(params.jobNumber || '', 'unassigned');
  const vinFolder = safeSegment(params.vin || '', 'general');
  const extKey = (params.extension || 'jpg').replace(/^\./, '').toLowerCase();
  const ext = (IMAGE_TYPES[extKey === 'jpeg' ? 'jpg' : extKey] || IMAGE_TYPES.jpg).ext;
  const typeTag = params.evidenceType ? `${safeSegment(params.evidenceType.toLowerCase(), 'photo')}_` : '';
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `${Date.now()}_${typeTag}${rand}.${ext}`;

  return `${typeFolder}/${ymFolder}/${jobFolder}/${vinFolder}/${filename}`;
}

/**
 * Get the public URL for an S3 key
 */
export function getS3PublicUrl(key: string): string {
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL}/${key}`;
  }
  const cleanEndpoint = S3_ENDPOINT.replace(/\/+$/, '');
  if (S3_FORCE_PATH_STYLE) {
    return `${cleanEndpoint}/${S3_BUCKET}/${key}`;
  }
  // Standard DigitalOcean Spaces / S3 virtual-hosted style
  const host = cleanEndpoint.replace(/^https?:\/\//, '');
  const protocol = cleanEndpoint.startsWith('http://') ? 'http://' : 'https://';
  return `${protocol}${S3_BUCKET}.${host}/${key}`;
}

/**
 * Upload buffer to S3 or fallback to local disk.
 * Returns the URL to store in DB (ค่า default: /api/files/<key> ซึ่งต้อง login และมีสิทธิ์ในงานนั้น)
 */
export async function uploadToStorage(params: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<string> {
  const { buffer, key, contentType } = params;
  if (!isSafeStorageKey(key)) throw new Error('Invalid storage key');

  if (s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: S3_PUBLIC_UPLOADS && !S3_DISABLE_ACL ? 'public-read' : undefined,
      })
    );
    return S3_PUBLIC_UPLOADS ? getS3PublicUrl(key) : `${FILES_ROUTE_PREFIX}${key}`;
  }

  // Local storage fallback
  const baseDir = path.resolve(process.cwd(), UPLOAD_DIR);
  const localTarget = path.resolve(baseDir, key);
  if (!localTarget.startsWith(baseDir + path.sep)) throw new Error('Invalid storage path');
  fs.mkdirSync(path.dirname(localTarget), { recursive: true });
  fs.writeFileSync(localTarget, buffer);
  return `${FILES_ROUTE_PREFIX}${key}`;
}

/**
 * Read a stored object (S3 or local). Returns null if not found.
 */
export async function readFromStorage(key: string): Promise<Buffer | null> {
  if (!isSafeStorageKey(key)) return null;

  if (s3Client) {
    try {
      const obj = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      if (!obj.Body) return null;
      return Buffer.from(await obj.Body.transformToByteArray());
    } catch {
      return null;
    }
  }

  const baseDir = path.resolve(process.cwd(), UPLOAD_DIR);
  const localTarget = path.resolve(baseDir, key);
  if (!localTarget.startsWith(baseDir + path.sep) || !fs.existsSync(localTarget)) return null;
  return fs.promises.readFile(localTarget);
}

/**
 * Upload base64 image data URL (e.g. data:image/jpeg;base64,...)
 */
export async function uploadBase64Evidence(params: {
  base64Data: string;
  job: {
    jobType?: string | null;
    createdAt?: Date | string | null;
    jobNumber?: string | null;
    vin?: string | null;
  };
  vin?: string | null;
  evidenceType?: string | null;
}): Promise<{ url: string; key: string }> {
  const match = params.base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) {
    throw new Error('รูปแบบ Base64 Data URL ไม่ถูกต้อง');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('ไฟล์รูปใหญ่เกิน 10MB');
  }

  // ตัดสินชนิดไฟล์จากเนื้อไฟล์จริง ไม่ใช่จาก data URL header
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new Error('รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP');
  }
  const contentType = detected.mime;
  const extension = detected.ext;

  const effectiveVin = params.vin || params.job.vin || 'general';

  const key = buildS3EvidenceKey({
    jobType: params.job.jobType,
    createdAt: params.job.createdAt,
    jobNumber: params.job.jobNumber,
    vin: effectiveVin,
    evidenceType: params.evidenceType,
    extension,
  });

  const url = await uploadToStorage({
    buffer,
    key,
    contentType,
  });

  return { url, key };
}
