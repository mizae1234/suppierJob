import { redirect } from 'next/navigation';

/**
 * รวมหน้าประวัติรายคันเข้าไปเป็นแท็บที่ 4 ในหน้า /reports แล้ว
 * คง route เดิมไว้เพื่อ redirect ลิงก์/บุ๊กมาร์กเก่าให้อัตโนมัติ
 */
export default function VehicleReportsRedirectPage() {
  redirect('/reports?tab=vehicles');
}
