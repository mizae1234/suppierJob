/**
 * Simple in-memory fixed-window rate limiter.
 * เหมาะกับการรัน instance เดียว (Docker container เดียว) — ถ้า scale หลาย instance ควรย้ายไป Redis
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  if (buckets.size > 10000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  return {
    allowed: bucket.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * IP ของ client สำหรับ rate limit / audit log
 * X-Forwarded-For ค่า "ซ้ายสุด" client ปลอมเองได้ → ใช้ค่าที่ reverse proxy ของเราเป็นคนต่อท้าย (นับจากขวา)
 * TRUSTED_PROXY_HOPS = จำนวน proxy ที่อยู่หน้าแอป (ค่าเริ่มต้น 1 เช่น Load Balancer / Nginx ตัวเดียว)
 */
export function getClientIp(headers: Headers): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const forwarded = (headers.get('x-forwarded-for') || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (forwarded.length > 0) {
    return forwarded[Math.max(0, forwarded.length - hops)];
  }
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
