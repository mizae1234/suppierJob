import { Company, Branch, Supplier, Vehicle, Job, Invoice } from '@/types';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-ev7',
    code: 'EV7',
    name: 'บริษัท อีวี เซเว่น จำกัด (EV7 Co., Ltd.)',
    taxId: '0105565012345',
    address: '99/9 อาคารอีวีทาวเวอร์ ชั้น 12 ถนนพระราม 9 ห้วยขวาง กรุงเทพฯ 10310'
  },
  {
    id: 'comp-gi',
    code: 'GI',
    name: 'บริษัท เจเนอรัล อินเทลลิเจนท์ จำกัด (GI Fleet)',
    taxId: '0105564098765',
    address: '888 หมู่ 5 ถนนบางนา-ตราด กม.18 ตำบลบางโฉลง อำเภอบางพลี สมุทรปราการ 10540'
  }
];

export const INITIAL_BRANCHES: Branch[] = [
  // EV7 Branches
  {
    id: 'br-ev7-rm9',
    companyId: 'comp-ev7',
    code: 'EV7-RM9',
    name: 'EV7 สาขาพระราม 9 (สำนักงานใหญ่)',
    address: '99/9 ถ.พระราม 9 แขวงบางกะปิ เขตห้วยขวาง กทม.',
    phone: '02-719-8888'
  },
  {
    id: 'br-ev7-rng',
    companyId: 'comp-ev7',
    code: 'EV7-RNG',
    name: 'EV7 สาขารังสิต คลอง 1',
    address: '15/2 ถ.พหลโยธิน ต.ประชาธิปัตย์ อ.ธัญบุรี ปทุมธานี',
    phone: '02-998-1122'
  },
  {
    id: 'br-ev7-cnx',
    companyId: 'comp-ev7',
    code: 'EV7-CNX',
    name: 'EV7 สาขาเชียงใหม่ ซุปเปอร์ไฮเวย์',
    address: '244 หมู่ 4 ถ.เชียงใหม่-ลำปาง ต.หนองป่าครั่ง อ.เมือง จ.เชียงใหม่',
    phone: '053-245-566'
  },
  // GI Branches
  {
    id: 'br-gi-bna',
    companyId: 'comp-gi',
    code: 'GI-BNA',
    name: 'GI Hub บางนา-สุวรรณภูมิ',
    address: '888 ถ.บางนา-ตราด กม.18 ต.บางโฉลง อ.บางพลี สมุทรปราการ',
    phone: '02-334-5500'
  },
  {
    id: 'br-gi-chon',
    companyId: 'comp-gi',
    code: 'GI-CHON',
    name: 'GI Hub แหลมฉบัง ชลบุรี',
    address: '123/45 นิคมอุตสาหกรรมแหลมฉบัง ต.ทุ่งสุขลา อ.ศรีราชา จ.ชลบุรี',
    phone: '038-490-123'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-001',
    code: 'SP-CLEANPRO',
    name: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
    taxId: '0105558091234',
    phone: '081-456-7890',
    email: 'contact@cleanpro-fleet.com',
    address: '45/8 ถนนศรีนครินทร์ สวนหลวง กรุงเทพฯ',
    services: ['CAR_WASH'],
    bankName: 'ธนาคารกสิกรไทย',
    bankAccount: '789-2-34567-8',
    isActive: true
  },
  {
    id: 'sup-002',
    code: 'SP-FASTSLIDE',
    name: 'ห้างหุ้นส่วนจำกัด ฟาสต์สไลด์ ทรานสปอร์ต',
    taxId: '0103559012398',
    phone: '089-987-6543',
    email: 'dispatch@fastslide.co.th',
    address: '128/9 ถนนร่มเกล้า มีนบุรี กรุงเทพฯ',
    services: ['VEHICLE_SLIDE'],
    bankName: 'ธนาคารไทยพาณิชย์',
    bankAccount: '123-4-56789-0',
    isActive: true
  },
  {
    id: 'sup-003',
    code: 'SP-SIAMEXPRESS',
    name: 'บริษัท สยาม ออโต้ แคร์ แอนด์ โลจิสติกส์ จำกัด',
    taxId: '0105562087654',
    phone: '086-333-2211',
    email: 'service@siamautocare.com',
    address: '333 ถนนวิภาวดีรังสิต จตุจักร กรุงเทพฯ',
    services: ['CAR_WASH', 'VEHICLE_SLIDE'],
    bankName: 'ธนาคารกรุงเทพ',
    bankAccount: '456-7-89012-3',
    isActive: true
  }
];

export const INITIAL_VEHICLES: Vehicle[] = [
  // EV7 Stock - พระราม 9
  {
    vin: 'LC07C5EB8PA001234',
    model: 'BYD Atto 3 Extended Range',
    color: 'Ski White',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rm9',
    currentBranchCode: 'EV7-RM9',
    currentBranchName: 'EV7 สาขาพระราม 9',
    vehicleType: 'SUV',
    licensePlate: '3ขข-1234 กทม.',
    mileage: 14200,
    status: 'AVAILABLE'
  },
  {
    vin: 'LC07C5EB1PA005678',
    model: 'BYD Dolphin Premium Extended',
    color: 'Coral Pink',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rm9',
    currentBranchCode: 'EV7-RM9',
    currentBranchName: 'EV7 สาขาพระราม 9',
    vehicleType: 'Hatchback',
    licensePlate: '4ขค-5678 กทม.',
    mileage: 8300,
    status: 'AVAILABLE'
  },
  {
    vin: 'LC07C5EB9PA009012',
    model: 'BYD Seal AWD Performance',
    color: 'Aurora White',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rm9',
    currentBranchCode: 'EV7-RM9',
    currentBranchName: 'EV7 สาขาพระราม 9',
    vehicleType: 'Sedan',
    licensePlate: '1ขฉ-9012 กทม.',
    mileage: 5600,
    status: 'IN_WASH'
  },
  {
    vin: 'LSJ574892PA003344',
    model: 'MG4 Electric EV Long Range',
    color: 'Andes Grey',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rm9',
    currentBranchCode: 'EV7-RM9',
    currentBranchName: 'EV7 สาขาพระราม 9',
    vehicleType: 'Hatchback',
    licensePlate: '2กง-3344 กทม.',
    mileage: 18900,
    status: 'AVAILABLE'
  },
  // EV7 Stock - รังสิต
  {
    vin: 'LZW7AE324PA007788',
    model: 'ORA Good Cat 500 Ultra',
    color: 'Hamilton White',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rng',
    currentBranchCode: 'EV7-RNG',
    currentBranchName: 'EV7 สาขารังสิต คลอง 1',
    vehicleType: 'Hatchback',
    licensePlate: '5ขฐ-7788 กทม.',
    mileage: 22100,
    status: 'AVAILABLE'
  },
  {
    vin: 'LZW7AE329PA004455',
    model: 'ORA 07 GT Long Range',
    color: 'Amethyst Purple',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-rng',
    currentBranchCode: 'EV7-RNG',
    currentBranchName: 'EV7 สาขารังสิต คลอง 1',
    vehicleType: 'Sedan',
    licensePlate: '3ขต-4455 กทม.',
    mileage: 4100,
    status: 'AVAILABLE'
  },
  // EV7 Stock - เชียงใหม่
  {
    vin: 'LC07C5EB4PA002233',
    model: 'BYD Atto 3 Dynamic',
    color: 'Forest Green',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    currentBranchId: 'br-ev7-cnx',
    currentBranchCode: 'EV7-CNX',
    currentBranchName: 'EV7 สาขาเชียงใหม่ ซุปเปอร์ไฮเวย์',
    vehicleType: 'SUV',
    licensePlate: 'ขข-2233 เชียงใหม่',
    mileage: 16500,
    status: 'AVAILABLE'
  },
  // GI Stock - บางนา
  {
    vin: 'LGS4D8618PA001199',
    model: 'Deepal S07 Smart EV',
    color: 'Nebula Green',
    companyId: 'comp-gi',
    companyCode: 'GI',
    currentBranchId: 'br-gi-bna',
    currentBranchCode: 'GI-BNA',
    currentBranchName: 'GI Hub บางนา-สุวรรณภูมิ',
    vehicleType: 'SUV',
    licensePlate: '1ขษ-1199 กทม.',
    mileage: 7400,
    status: 'AVAILABLE'
  },
  {
    vin: 'LGS4D8613PA006677',
    model: 'Deepal L07 Fastback EV',
    color: 'Lunar Grey',
    companyId: 'comp-gi',
    companyCode: 'GI',
    currentBranchId: 'br-gi-bna',
    currentBranchCode: 'GI-BNA',
    currentBranchName: 'GI Hub บางนา-สุวรรณภูมิ',
    vehicleType: 'Sedan',
    licensePlate: '4ขส-6677 กทม.',
    mileage: 11200,
    status: 'IN_TRANSIT'
  },
  {
    vin: 'LNN6A5229PA008811',
    model: 'NETA V-II Smart',
    color: 'Baby Blue',
    companyId: 'comp-gi',
    companyCode: 'GI',
    currentBranchId: 'br-gi-bna',
    currentBranchCode: 'GI-BNA',
    currentBranchName: 'GI Hub บางนา-สุวรรณภูมิ',
    vehicleType: 'Hatchback',
    licensePlate: '2ขภ-8811 กทม.',
    mileage: 26500,
    status: 'AVAILABLE'
  },
  // GI Stock - ชลบุรี
  {
    vin: 'LGS4D8610PA009944',
    model: 'Deepal S07 Smart EV',
    color: 'Eclipse Black',
    companyId: 'comp-gi',
    companyCode: 'GI',
    currentBranchId: 'br-gi-chon',
    currentBranchCode: 'GI-CHON',
    currentBranchName: 'GI Hub แหลมฉบัง ชลบุรี',
    vehicleType: 'SUV',
    licensePlate: 'กง-9944 ชลบุรี',
    mileage: 19800,
    status: 'AVAILABLE'
  }
];

export const INITIAL_JOBS: Job[] = [
  // 1. Car Wash Order (EV7 พระราม 9) - WAITING_APPROVAL (มีรูปหลักฐานรอตรวจรับ)
  {
    id: 'job-cw-001',
    jobNumber: 'CW-EV7-2609-001',
    jobType: 'CAR_WASH',
    status: 'WAITING_APPROVAL',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    branchId: 'br-ev7-rm9',
    branchName: 'EV7 สาขาพระราม 9',
    supplierId: 'sup-001',
    supplierName: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
    carWashItems: [
      {
        id: 'cwi-001',
        jobId: 'job-cw-001',
        vin: 'LC07C5EB8PA001234',
        vehicleModel: 'BYD Atto 3 Extended Range',
        vehicleColor: 'Ski White',
        licensePlate: '3ขข-1234 กทม.',
        actualWashDate: '2026-09-14',
        washType: 'STANDARD',
        unitPrice: 180,
        status: 'COMPLETED',
        remarks: 'ล้างภายนอก ดูดฝุ่น ลงแว็กซ์ยาง'
      },
      {
        id: 'cwi-002',
        jobId: 'job-cw-001',
        vin: 'LC07C5EB1PA005678',
        vehicleModel: 'BYD Dolphin Premium Extended',
        vehicleColor: 'Coral Pink',
        licensePlate: '4ขค-5678 กทม.',
        actualWashDate: '2026-09-14',
        washType: 'DEEP_CLEAN',
        unitPrice: 350,
        status: 'COMPLETED',
        remarks: 'ล้างห้องเครื่อง ฟอกเบาะหน้าซ้าย'
      }
    ],
    requestedBy: 'สมชาย ผู้จัดการสาขาพระราม 9',
    completedAt: '2026-09-14T11:20:00Z',
    evidences: [
      {
        id: 'evi-001',
        jobId: 'job-cw-001',
        vin: 'LC07C5EB8PA001234',
        photoUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
        caption: 'ก่อนล้าง มีคราบโคลนบริเวณซุ้มล้อและกันชนหน้า',
        evidenceType: 'BEFORE',
        uploadedAt: '2026-09-14T09:30:00Z'
      },
      {
        id: 'evi-002',
        jobId: 'job-cw-001',
        vin: 'LC07C5EB8PA001234',
        photoUrl: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
        caption: 'หลังล้างสะอาดเรียบร้อย อบโอโซนและเคลือบยางแล้ว',
        evidenceType: 'AFTER',
        uploadedAt: '2026-09-14T11:15:00Z'
      },
      {
        id: 'evi-003',
        jobId: 'job-cw-001',
        vin: 'LC07C5EB1PA005678',
        photoUrl: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80',
        caption: 'หลังล้าง Deep Clean BYD Dolphin สะอาดพร้อมส่งมอบลูกค้า',
        evidenceType: 'AFTER',
        uploadedAt: '2026-09-14T11:18:00Z'
      }
    ],
    estimatedCost: 530,
    actualCost: 530,
    createdAt: '2026-09-14T08:30:00Z',
    updatedAt: '2026-09-14T11:20:00Z'
  },
  // 2. Vehicle Slide (GI บางนา ไป ชลบุรี) - APPROVED (พร้อมวางบิล)
  {
    id: 'job-vs-002',
    jobNumber: 'VS-GI-2609-002',
    jobType: 'VEHICLE_SLIDE',
    status: 'APPROVED',
    companyId: 'comp-gi',
    companyCode: 'GI',
    branchId: 'br-gi-bna',
    branchName: 'GI Hub บางนา-สุวรรณภูมิ',
    supplierId: 'sup-002',
    supplierName: 'ห้างหุ้นส่วนจำกัด ฟาสต์สไลด์ ทรานสปอร์ต',
    vin: 'LGS4D8613PA006677',
    originBranchId: 'br-gi-bna',
    originBranchName: 'GI Hub บางนา-สุวรรณภูมิ',
    destBranchId: 'br-gi-chon',
    destBranchName: 'GI Hub แหลมฉบัง ชลบุรี',
    pickupDateTime: '2026-09-13T09:00:00Z',
    deliveryDateTime: '2026-09-13T13:30:00Z',
    contactPerson: 'คุณธวัชชัย (ผู้ดูแลคลังชลบุรี)',
    contactPhone: '081-998-7766',
    transferReason: 'ย้ายสต็อกรองรับงานส่งมอบลูกค้านิคมฯ แหลมฉบัง',
    requestedBy: 'วิชัย เจ้าหน้าที่คลัง GI',
    completedAt: '2026-09-13T14:00:00Z',
    approvedAt: '2026-09-13T15:30:00Z',
    approvedBy: 'ธวัชชัย ผู้จัดการสาขาชลบุรี',
    evidences: [
      {
        id: 'evi-004',
        jobId: 'job-vs-002',
        vin: 'LGS4D8613PA006677',
        photoUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
        caption: 'ยกรถขึ้นสไลด์ที่ต้นทาง บางนา ตรวจริ้วรอยรอบคันเรียบร้อย',
        evidenceType: 'PICKUP',
        uploadedAt: '2026-09-13T09:20:00Z'
      },
      {
        id: 'evi-005',
        jobId: 'job-vs-002',
        vin: 'LGS4D8613PA006677',
        photoUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
        caption: 'ส่งมอบรถที่ Hub แหลมฉบัง ปลอดภัย เซ็นรับมอบเอกสารแล้ว',
        evidenceType: 'DROPOFF',
        uploadedAt: '2026-09-13T13:45:00Z'
      }
    ],
    estimatedCost: 3500,
    actualCost: 3500,
    createdAt: '2026-09-12T16:00:00Z',
    updatedAt: '2026-09-13T15:30:00Z'
  },
  // 3. Car Wash Order (EV7 พระราม 9) - REJECTED (มีเหตุผลขอให้แก้ไข)
  {
    id: 'job-cw-003',
    jobNumber: 'CW-EV7-2609-003',
    jobType: 'CAR_WASH',
    status: 'REJECTED',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    branchId: 'br-ev7-rm9',
    branchName: 'EV7 สาขาพระราม 9',
    supplierId: 'sup-003',
    supplierName: 'บริษัท สยาม ออโต้ แคร์ แอนด์ โลจิสติกส์ จำกัด',
    carWashItems: [
      {
        id: 'cwi-003',
        jobId: 'job-cw-003',
        vin: 'LSJ574892PA003344',
        vehicleModel: 'MG4 Electric EV Long Range',
        vehicleColor: 'Andes Grey',
        licensePlate: '2กง-3344 กทม.',
        actualWashDate: '2026-09-13',
        washType: 'STANDARD',
        unitPrice: 180,
        status: 'REJECTED',
        remarks: 'ยังมีคราบแมลงหน้ารถและขอบกระจกหลัง'
      }
    ],
    requestedBy: 'สมชาย ผู้จัดการสาขาพระราม 9',
    completedAt: '2026-09-13T16:00:00Z',
    rejectReason: 'พบคราบแมลงแห้งติดแน่นที่กระจังหน้าและคราบน้ำบนกระจกหลัง ขอให้ช่างช่วยล้างเก็บรายละเอียดซ้ำอีกครั้งครับ',
    evidences: [
      {
        id: 'evi-006',
        jobId: 'job-cw-003',
        vin: 'LSJ574892PA003344',
        photoUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
        caption: 'ภาพส่งงานจากช่าง แต่ตรวจพบจุดที่ยังไม่เรียบร้อย',
        evidenceType: 'AFTER',
        uploadedAt: '2026-09-13T15:50:00Z'
      }
    ],
    estimatedCost: 180,
    actualCost: 180,
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-09-13T16:45:00Z'
  },
  // 4. Vehicle Slide (EV7 พระราม 9 ไป เชียงใหม่) - IN_PROGRESS
  {
    id: 'job-vs-004',
    jobNumber: 'VS-EV7-2609-004',
    jobType: 'VEHICLE_SLIDE',
    status: 'IN_PROGRESS',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    branchId: 'br-ev7-rm9',
    branchName: 'EV7 สาขาพระราม 9',
    supplierId: 'sup-002',
    supplierName: 'ห้างหุ้นส่วนจำกัด ฟาสต์สไลด์ ทรานสปอร์ต',
    vin: 'LC07C5EB9PA009012',
    originBranchId: 'br-ev7-rm9',
    originBranchName: 'EV7 สาขาพระราม 9',
    destBranchId: 'br-ev7-cnx',
    destBranchName: 'EV7 สาขาเชียงใหม่ ซุปเปอร์ไฮเวย์',
    pickupDateTime: '2026-09-14T06:00:00Z',
    deliveryDateTime: '2026-09-14T19:00:00Z',
    contactPerson: 'คุณอรรถพล สาขาเชียงใหม่',
    contactPhone: '053-245-566',
    transferReason: 'ย้ายรถเทสไดรฟ์ BYD Seal ให้ลูกค้า VIP สาขาเชียงใหม่',
    requestedBy: 'สมชาย ผู้จัดการสาขาพระราม 9',
    evidences: [
      {
        id: 'evi-007',
        jobId: 'job-vs-004',
        vin: 'LC07C5EB9PA009012',
        photoUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
        caption: 'รับรถขึ้นสไลด์เรียบร้อย ออกเดินทางจาก กทม. เวลา 06:30 น.',
        evidenceType: 'PICKUP',
        uploadedAt: '2026-09-14T06:35:00Z'
      }
    ],
    estimatedCost: 12000,
    createdAt: '2026-09-13T17:00:00Z',
    updatedAt: '2026-09-14T06:35:00Z'
  },
  // 5. Car Wash Order (EV7 รังสิต) - APPROVED (พร้อมวางบิล)
  {
    id: 'job-cw-005',
    jobNumber: 'CW-EV7-2609-005',
    jobType: 'CAR_WASH',
    status: 'APPROVED',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    branchId: 'br-ev7-rng',
    branchName: 'EV7 สาขารังสิต คลอง 1',
    supplierId: 'sup-001',
    supplierName: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
    carWashItems: [
      {
        id: 'cwi-004',
        jobId: 'job-cw-005',
        vin: 'LZW7AE324PA007788',
        vehicleModel: 'ORA Good Cat 500 Ultra',
        vehicleColor: 'Hamilton White',
        licensePlate: '5ขฐ-7788 กทม.',
        actualWashDate: '2026-09-12',
        washType: 'STANDARD',
        unitPrice: 180,
        status: 'COMPLETED'
      },
      {
        id: 'cwi-005',
        jobId: 'job-cw-005',
        vin: 'LZW7AE329PA004455',
        vehicleModel: 'ORA 07 GT Long Range',
        vehicleColor: 'Amethyst Purple',
        licensePlate: '3ขต-4455 กทม.',
        actualWashDate: '2026-09-12',
        washType: 'STANDARD',
        unitPrice: 180,
        status: 'COMPLETED'
      }
    ],
    requestedBy: 'ศิริพร สาขารังสิต',
    completedAt: '2026-09-12T15:00:00Z',
    approvedAt: '2026-09-12T16:30:00Z',
    approvedBy: 'ศิริพร สาขารังสิต',
    evidences: [
      {
        id: 'evi-008',
        jobId: 'job-cw-005',
        vin: 'LZW7AE324PA007788',
        photoUrl: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
        caption: 'ล้างทำความสะอาด ORA Good Cat เรียบร้อย',
        evidenceType: 'AFTER',
        uploadedAt: '2026-09-12T14:50:00Z'
      }
    ],
    estimatedCost: 360,
    actualCost: 360,
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-12T16:30:00Z'
  },
  // 6. Car Wash (GI บางนา) - INVOICED (วางบิลแล้ว)
  {
    id: 'job-cw-006',
    jobNumber: 'CW-GI-2609-006',
    jobType: 'CAR_WASH',
    status: 'INVOICED',
    companyId: 'comp-gi',
    companyCode: 'GI',
    branchId: 'br-gi-bna',
    branchName: 'GI Hub บางนา-สุวรรณภูมิ',
    supplierId: 'sup-001',
    supplierName: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
    carWashItems: [
      {
        id: 'cwi-006',
        jobId: 'job-cw-006',
        vin: 'LNN6A5229PA008811',
        vehicleModel: 'NETA V-II Smart',
        vehicleColor: 'Baby Blue',
        licensePlate: '2ขภ-8811 กทม.',
        actualWashDate: '2026-09-10',
        washType: 'STANDARD',
        unitPrice: 180,
        status: 'COMPLETED'
      }
    ],
    requestedBy: 'วิชัย เจ้าหน้าที่คลัง GI',
    completedAt: '2026-09-10T14:00:00Z',
    approvedAt: '2026-09-10T16:00:00Z',
    approvedBy: 'วิชัย เจ้าหน้าที่คลัง GI',
    evidences: [],
    estimatedCost: 180,
    actualCost: 180,
    invoiceId: 'inv-gi-001',
    invoiceNumber: 'INV-GI-202609-001',
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z'
  },
  // 7. Vehicle Slide (EV7 พระราม 9) - PENDING_SUPPLIER (รอ Supplier รับงาน)
  {
    id: 'job-vs-007',
    jobNumber: 'VS-EV7-2609-007',
    jobType: 'VEHICLE_SLIDE',
    status: 'PENDING_SUPPLIER',
    companyId: 'comp-ev7',
    companyCode: 'EV7',
    branchId: 'br-ev7-rm9',
    branchName: 'EV7 สาขาพระราม 9',
    supplierId: 'sup-002',
    supplierName: 'ห้างหุ้นส่วนจำกัด ฟาสต์สไลด์ ทรานสปอร์ต',
    vin: 'LC07C5EB8PA001234',
    originBranchId: 'br-ev7-rm9',
    originBranchName: 'EV7 สาขาพระราม 9',
    destBranchId: 'br-ev7-rng',
    destBranchName: 'EV7 สาขารังสิต คลอง 1',
    pickupDateTime: '2026-09-15T10:00:00Z',
    deliveryDateTime: '2026-09-15T12:00:00Z',
    contactPerson: 'คุณศิริพร (สาขารังสิต)',
    contactPhone: '02-998-1122',
    transferReason: 'เตรียมส่งมอบลูกค้านัดรับสาขารังสิต',
    requestedBy: 'สมชาย ผู้จัดการสาขาพระราม 9',
    evidences: [],
    estimatedCost: 1800,
    createdAt: '2026-09-14T11:00:00Z',
    updatedAt: '2026-09-14T11:00:00Z'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-gi-001',
    invoiceNumber: 'INV-GI-202609-001',
    supplierId: 'sup-001',
    supplierName: 'บริษัท คลีนโปร คาร์วอช เซอร์วิส จำกัด',
    companyId: 'comp-gi',
    companyCode: 'GI',
    status: 'VERIFIED',
    invoiceDate: '2026-09-11',
    dueDate: '2026-10-11',
    subtotal: 180,
    vatAmount: 12.6,
    totalAmount: 192.6,
    jobIds: ['job-cw-006'],
    notes: 'วางบิลงวดประจำวันที่ 1-10 กันยายน 2569 ของบริษัท GI',
    createdAt: '2026-09-11T10:00:00Z'
  }
];
