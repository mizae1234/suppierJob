import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { Job } from '@/types';
import { getSlideJobCarCount, ReportTab } from './report-calculations';

/** ป้องกัน CSV Formula Injection และ escape เครื่องหมายคำพูด */
export function sanitizeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export interface BuildReportCsvParams {
  activeTab: ReportTab;
  filteredJobs: Job[];
  filteredWashReportJobs: Job[];
  slideJobs: Job[];
  dateStr?: string;
}

/** สร้างเนื้อหา CSV และชื่อไฟล์ตามแท็บรายงานที่กำลังเปิดอยู่ */
export function buildReportCsv({
  activeTab,
  filteredJobs,
  filteredWashReportJobs,
  slideJobs,
  dateStr = new Date().toISOString().slice(0, 10),
}: BuildReportCsvParams): { filename: string; csvContent: string } {
  let filename = `Supplier_Jobs_Report_${dateStr}.csv`;
  let headers: string[] = [];
  let rows: string[][] = [];

  if (activeTab === 'wash') {
    filename = `Car_Wash_Report_${dateStr}.csv`;
    headers = [
      'เลขที่ใบงาน',
      'วันที่สร้าง',
      'บริษัท',
      'สาขา',
      'Supplier',
      'VIN',
      'ทะเบียน',
      'รุ่นรถ',
      'รายการบริการ',
      'ราคาต่อคัน',
      'สถานะ',
    ];
    rows = [];
    filteredWashReportJobs.forEach(j => {
      if (j.carWashItems && j.carWashItems.length > 0) {
        j.carWashItems.forEach(item => {
          const svcName = getWashServiceDisplay(item.washType).name;
          rows.push([
            sanitizeCsvCell(j.jobNumber),
            sanitizeCsvCell(formatThaiDate(j.createdAt)),
            sanitizeCsvCell(j.companyCode),
            sanitizeCsvCell(j.branchName),
            sanitizeCsvCell(j.supplierName),
            sanitizeCsvCell(item.vin),
            sanitizeCsvCell(item.licensePlate || '-'),
            sanitizeCsvCell(item.vehicleModel || '-'),
            sanitizeCsvCell(svcName),
            sanitizeCsvCell(item.unitPrice || 0),
            sanitizeCsvCell(j.status),
          ]);
        });
      } else {
        rows.push([
          sanitizeCsvCell(j.jobNumber),
          sanitizeCsvCell(formatThaiDate(j.createdAt)),
          sanitizeCsvCell(j.companyCode),
          sanitizeCsvCell(j.branchName),
          sanitizeCsvCell(j.supplierName),
          sanitizeCsvCell('-'),
          sanitizeCsvCell('-'),
          sanitizeCsvCell('-'),
          sanitizeCsvCell('-'),
          sanitizeCsvCell(getJobTotalCost(j)),
          sanitizeCsvCell(j.status),
        ]);
      }
    });
  } else if (activeTab === 'slide') {
    filename = `Vehicle_Slide_Report_${dateStr}.csv`;
    headers = [
      'เลขที่ใบงาน',
      'วันที่สร้าง',
      'บริษัท',
      'สาขาต้นทาง',
      'สาขาปลายทาง',
      'ระยะทาง(กม.)',
      'Supplier',
      'จำนวนรถ',
      'ค่าบริการรวม',
      'สถานะ',
    ];
    rows = slideJobs.map(j => {
      const carCount = getSlideJobCarCount(j);
      return [
        sanitizeCsvCell(j.jobNumber),
        sanitizeCsvCell(formatThaiDate(j.createdAt)),
        sanitizeCsvCell(j.companyCode),
        sanitizeCsvCell(j.pickupBranchName || j.branchName || '-'),
        sanitizeCsvCell(j.destBranchName || j.customDestAddress || '-'),
        sanitizeCsvCell(j.distance || '-'),
        sanitizeCsvCell(j.supplierName),
        sanitizeCsvCell(carCount),
        sanitizeCsvCell(getJobTotalCost(j)),
        sanitizeCsvCell(j.status),
      ];
    });
  } else {
    headers = ['JobNumber', 'JobType', 'Company', 'Branch', 'Supplier', 'Status', 'Cost', 'CreatedAt'];
    rows = filteredJobs.map(j => [
      sanitizeCsvCell(j.jobNumber),
      sanitizeCsvCell(j.jobType),
      sanitizeCsvCell(j.companyCode),
      sanitizeCsvCell(j.branchName),
      sanitizeCsvCell(j.supplierName),
      sanitizeCsvCell(j.status),
      sanitizeCsvCell(getJobTotalCost(j)),
      sanitizeCsvCell(j.createdAt),
    ]);
  }

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
  return { filename, csvContent };
}

/** ดาวน์โหลดไฟล์ CSV ฝั่งเบราว์เซอร์ */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
