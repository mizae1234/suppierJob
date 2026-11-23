import { formatThaiDate } from '@/lib/date-utils';
import { getJobTotalCost } from '@/lib/job-utils';
import { getWashServiceDisplay } from '@/lib/car-wash-rates';
import { Job } from '@/types';
import { getSlideJobCarCount, ReportTab } from './report-calculations';

type CellValue = string | number;

export interface ReportSheet {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: CellValue[][];
  colWidths: number[];
}

export interface BuildReportExcelParams {
  activeTab: ReportTab;
  filteredJobs: Job[];
  filteredWashReportJobs: Job[];
  slideJobs: Job[];
  dateStr?: string;
}

/** สร้างข้อมูลชีต Excel และชื่อไฟล์ตามแท็บรายงานที่กำลังเปิดอยู่ */
export function buildReportSheet({
  activeTab,
  filteredJobs,
  filteredWashReportJobs,
  slideJobs,
  dateStr = new Date().toISOString().slice(0, 10),
}: BuildReportExcelParams): ReportSheet {
  if (activeTab === 'wash') {
    const rows: CellValue[][] = [];
    filteredWashReportJobs.forEach(j => {
      if (j.carWashItems && j.carWashItems.length > 0) {
        j.carWashItems.forEach(item => {
          rows.push([
            j.jobNumber,
            formatThaiDate(j.createdAt),
            j.companyCode,
            j.branchName,
            j.supplierName,
            item.vin,
            item.licensePlate || '-',
            item.vehicleModel || '-',
            getWashServiceDisplay(item.washType).name,
            item.unitPrice || 0,
            j.status,
          ]);
        });
      } else {
        rows.push([
          j.jobNumber,
          formatThaiDate(j.createdAt),
          j.companyCode,
          j.branchName,
          j.supplierName,
          '-',
          '-',
          '-',
          '-',
          getJobTotalCost(j),
          j.status,
        ]);
      }
    });
    return {
      filename: `Car_Wash_Report_${dateStr}.xlsx`,
      sheetName: 'รายงานล้างรถ',
      headers: ['เลขที่ใบงาน', 'วันที่สร้าง', 'บริษัท', 'สาขา', 'Supplier', 'VIN', 'ทะเบียน', 'รุ่นรถ', 'รายการบริการ', 'ราคาต่อคัน (บาท)', 'สถานะ'],
      rows,
      colWidths: [20, 15, 8, 32, 32, 22, 14, 26, 24, 16, 16],
    };
  }

  if (activeTab === 'slide') {
    return {
      filename: `Vehicle_Slide_Report_${dateStr}.xlsx`,
      sheetName: 'รายงานรถสไลด์',
      headers: ['เลขที่ใบงาน', 'วันที่สร้าง', 'บริษัท', 'สาขาต้นทาง', 'สาขาปลายทาง', 'ระยะทาง (กม.)', 'Supplier', 'จำนวนรถ (คัน)', 'ค่าบริการรวม (บาท)', 'สถานะ'],
      rows: slideJobs.map(j => [
        j.jobNumber,
        formatThaiDate(j.createdAt),
        j.companyCode,
        j.pickupBranchName || j.branchName || '-',
        j.destBranchName || j.customDestAddress || '-',
        j.distance ?? '-',
        j.supplierName,
        getSlideJobCarCount(j),
        getJobTotalCost(j),
        j.status,
      ]),
      colWidths: [20, 15, 8, 32, 36, 14, 32, 14, 18, 16],
    };
  }

  return {
    filename: `Supplier_Jobs_Report_${dateStr}.xlsx`,
    sheetName: 'ภาพรวมงานทั้งหมด',
    headers: ['เลขที่ใบงาน', 'ประเภทงาน', 'บริษัท', 'สาขา', 'Supplier', 'สถานะ', 'ค่าบริการ (บาท)', 'วันที่สร้าง'],
    rows: filteredJobs.map(j => [
      j.jobNumber,
      j.jobType === 'VEHICLE_SLIDE' ? 'รถสไลด์' : 'ล้างรถ',
      j.companyCode,
      j.branchName,
      j.supplierName,
      j.status,
      getJobTotalCost(j),
      formatThaiDate(j.createdAt),
    ]),
    colWidths: [20, 12, 8, 32, 32, 16, 16, 15],
  };
}

/** ดาวน์โหลดไฟล์ Excel (.xlsx) ฝั่งเบราว์เซอร์ */
export async function downloadReportExcel(sheet: ReportSheet): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
  ws['!cols'] = sheet.colWidths.map(wch => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
  XLSX.writeFile(wb, sheet.filename);
}
