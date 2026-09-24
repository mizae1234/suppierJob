import { JobStatus } from '@/types';

// Status display mapping
export const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING_SUPPLIER: { label: 'รอ Supplier รับงาน', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'กำลังทำงาน', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  WAITING_APPROVAL: { label: 'รอตรวจรับ', bg: 'bg-orange-100', text: 'text-orange-900 font-bold', dot: 'bg-orange-500' },
  APPROVED: { label: 'Approved พร้อมวางบิล', bg: 'bg-emerald-100', text: 'text-emerald-900 font-bold', dot: 'bg-emerald-600' },
  REJECTED: { label: 'ขอแก้ไข', bg: 'bg-red-100', text: 'text-red-800 font-bold', dot: 'bg-red-500' },
  INVOICED: { label: 'วางบิลแล้ว', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  CANCELLED: { label: 'ยกเลิก', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

// Kanban column definitions
export const KANBAN_COLUMNS: Array<{
  id: JobStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
}> = [
  {
    id: 'PENDING_SUPPLIER',
    title: 'รอ Supplier รับงาน',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    borderColor: 'border-t-blue-500',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'IN_PROGRESS',
    title: 'กำลังปฏิบัติงาน',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    borderColor: 'border-t-amber-500',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'WAITING_APPROVAL',
    title: 'รอสาขาตรวจรับ',
    badgeBg: 'bg-amber-200',
    badgeText: 'text-amber-900 font-bold',
    borderColor: 'border-t-orange-500',
    dotColor: 'bg-orange-500 animate-pulse',
  },
  {
    id: 'APPROVED',
    title: 'Approved (พร้อมวางบิล)',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900 font-bold',
    borderColor: 'border-t-emerald-600',
    dotColor: 'bg-emerald-600',
  },
  {
    id: 'REJECTED',
    title: 'ขอให้แก้ไข (Reject)',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800 font-bold',
    borderColor: 'border-t-red-500',
    dotColor: 'bg-red-500',
  },
  {
    id: 'INVOICED',
    title: 'วางบิลแล้ว',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800 font-bold',
    borderColor: 'border-t-purple-600',
    dotColor: 'bg-purple-600',
  },
];

// Sample evidence photos
export const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
];
