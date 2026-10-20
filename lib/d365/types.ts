/**
 * Types สำหรับข้อมูลที่ดึงจาก Microsoft Dynamics 365 (D365 FO) OData
 * เก็บเฉพาะฟิลด์ที่เรา $select มาใช้งานจริง
 */

/** แถวจาก Entity BPC_InventOnHand (สต็อกรายคัน ระดับ Serial/VIN) */
export interface D365InventOnHandRow {
  dataAreaId: string;        // บริษัทใน D365 เช่น gi01
  ItemId: string;            // รหัสสินค้า เช่น GI-0700380
  InventSerialId: string;    // หมายเลข Serial = VIN
  InventSiteId: string;      // รหัส Site/สาขา เช่น GI01
  InventLocationId: string;  // รหัสคลัง เช่น 62008
  PhysicalInvent: number;    // จำนวนคงเหลือทางกายภาพ (รวมที่ถูกจอง)
  ReservPhysical: number;    // จำนวนที่ถูกจอง
}

/** แถวจาก Entity InventorySitesOnHandV2 (ใช้หา ProductName ของแต่ละ ItemNumber) */
export interface D365SiteOnHandRow {
  ItemNumber: string;
  ProductName: string | null;
}

export interface ODataPage<T> {
  value: T[];
  '@odata.nextLink'?: string;
}
