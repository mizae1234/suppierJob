import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

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
  const jobFolder = (params.jobNumber || 'unassigned').trim().replace(/[\/\\]/g, '-');
  const vinFolder = (params.vin || 'general').trim().replace(/[\/\\]/g, '-');
  const ext = (params.extension || 'jpg').replace(/^\./, '');
  const typeTag = params.evidenceType ? `${params.evidenceType.toLowerCase()}_` : '';
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
 * Upload buffer to S3 or fallback to local disk
 */
export async function uploadToStorage(params: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<string> {
  const { buffer, key, contentType } = params;

  if (s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: S3_DISABLE_ACL ? undefined : 'public-read',
      })
    );
    return getS3PublicUrl(key);
  }

  // Local storage fallback
  const localTarget = path.join(process.cwd(), UPLOAD_DIR, key);
  const dir = path.dirname(localTarget);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(localTarget, buffer);
  return `/uploads/${key}`;
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

  const contentType = match[1];
  const base64Content = match[2];
  const buffer = Buffer.from(base64Content, 'base64');

  // Determine file extension
  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  else if (contentType.includes('webp')) extension = 'webp';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';

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
