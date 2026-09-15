# คู่มือสถาปัตยกรรมและ Logic ระบบ Supplier Job Management (EV7 & GI Fleet)
ไฟล์นี้เป็นคู่มือสรุปโครงสร้างสถาปัตยกรรม (Architecture), Data Model, Business Logic, และ Flow การทำงานทั้งหมดของระบบ เพื่อใช้เป็นเอกสารอ้างอิงสำหรับทีมพัฒนา (Skill / Reference Guide)

---

## 1. ข้อมูลภาพรวมและ Tech Stack (System Overview)

ระบบบริหารงานซัพพลายเออร์ (Supplier Job Management) สำหรับกลุ่มธุรกิจยานยนต์ไฟฟ้า **EV7** และ **GI Fleet** เพื่อจัดการงานหลัก 2 ประเภท ได้แก่:
1. **Car Wash (สั่งล้างรถ)**: รองรับการสั่งงานแบบคราวละหลายคัน (Multi-VIN) และกำหนดวันทำงานจริงรายคัน
2. **Vehicle Slide (รถสไลด์ขนส่งรถยนต์)**: ขนย้ายรถระหว่างสาขา ระบุต้นทาง ปลายทาง วันเวลารับ-ส่ง ผู้ติดต่อ และเหตุผล

### เทคโนโลยีที่ใช้งาน (Tech Stack):
- **Framework**: Next.js 16+ (App Router, Turbopack, React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + Stitch Botanical Green / Mint Design System Tokens
- **Icons**: Lucide React
- **ORM / Database**: Prisma 6 ORM สำหรับ **Microsoft SQL Server** (`provider = "sqlserver"`)
- **Data Persistence**: Data Layer รองรับทั้ง Prisma SQL Server และ In-Memory Seed Repository ซิงค์กับ LocalStorage เพื่อให้สามารถรัน Demo และทดสอบ UI ได้ทันที

---

## 2. การจัดการฐานข้อมูลและสิ่งแวดล้อม (Database & Environment)

### การตั้งค่า `.env`
ในไฟล์ `.env` ได้จัดเตรียมตัวแปร `DATABASE_URL` ให้ผู้ดูแลระบบระบุ Connection String จริงของ SQL Server:
```env
DATABASE_URL="sqlserver://localhost:1433;database=SupplierJobDB;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true;"
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="Supplier Job Management (EV7 & GI)"
```

### Prisma Data Models (`prisma/schema.prisma`):
1. **`Company`**: บริษัทสังกัด เช่น `EV7`, `GI`
2. **`Branch`**: สาขา (เช่น พระราม 9, รังสิต, เชียงใหม่, บางนา, ชลบุรี)
3. **`Supplier`**: คู่ค้าผู้ให้บริการ (ล้างรถ / รถสไลด์) พร้อมข้อมูลบัญชีธนาคารเพื่อรับเงิน
4. **`Vehicle`**: คลังรถยนต์ (Interface มาจาก External Stock System) โดยใช้ **VIN** เป็น Primary Key (`@id`) พร้อม Model, สี, สาขาปัจจุบัน (`currentBranchId`), และสถานะ (`AVAILABLE`, `IN_WASH`, `IN_TRANSIT`)
5. **`Job`**: คำสั่งงานหลัก (Master Job Record) จัดเก็บ Job Number, ประเภทงาน, สถานะ, ค่าบริการ, ข้อมูลเส้นทางรถสไลด์
6. **`CarWashItem`**: รายการรถแต่ละคันในงาน Car Wash เก็บ VIN, วันปฏิบัติงานจริง (`actualWashDate`), ประเภทการล้าง, ราคาต่อหน่วย
7. **`JobEvidence`**: รูปถ่ายหลักฐานก่อน-หลังการทำงานที่ Supplier แนบส่ง
8. **`Invoice`**: ใบวางบิล ผูกกับงานที่ Approved แล้ว และแยกบริษัท EV7/GI โดยเด็ดขาด

### กฎการจัดการ Timezone สำหรับ SQL Server (Bangkok UTC+7):
SQL Server จะจัดเก็บเวลาแบบเวลาไทย (UTC+7) โดยตรง เมื่อ mssql driver ดึงข้อมูลจะมี Z suffix ระบบจึงใช้ Utility ใน `lib/date-utils.ts` เพื่อจัดรูปแบบเวลาภาษาไทยโดยไม่บวก Timezone ซ้ำซ้อน

---

## 3. สิทธิ์และบทบาทผู้ใช้งาน (3 User Roles)

1. **Admin (ส่วนกลาง)**:
   - ดูภาพรวม Dashboard ของทุกบริษัทและทุกสาขา
   - ติดตาม KPI, ตรวจสอบงานค้าง, ตรวจสอบบิล, และดูรายงานวิเคราะห์ภาพรวม
2. **Branch (เจ้าหน้าที่ประจำสาขา)**:
   - ก่อนเริ่มงานต้องเลือกบริบทสังกัดบริษัท (EV7 / GI) และสาขาของตนเอง
   - **เลือกได้เฉพาะ VIN ที่อยู่ในสต็อกสาขาตนเองเท่านั้น** (`vehicle.currentBranchId === currentBranchId`)
   - สร้างงาน Car Wash และ Vehicle Slide
   - ตรวจรับงาน (Approve / Reject ขอให้แก้ไข)
3. **Supplier (คู่ค้าผู้รับจ้าง)**:
   - **เข้าสู่ Mobile Portal อัตโนมัติ (`/mobile`)**: หากผู้ใช้งานมีบทบาทเป็น `SUPPLIER` ไม่ว่าจะมาจากการเลือก Role ใน Header, หน้า Settings, หรือค่าที่บันทึกไว้ใน LocalStorage ระบบ `AppShell` จะ Redirect เข้าสู่ Mobile Version ทันทีโดยไม่ต้องเปิดเมนู
   - เห็นเฉพาะงานที่ได้รับมอบหมายตาม Supplier ID ของตน
   - รับงาน (`IN_PROGRESS`), แนบรูปหลักฐานก่อน-หลัง, ส่งงานตรวจรับ (`WAITING_APPROVAL`)
   - ออกใบวางบิล (Create Invoice) สำหรับงานที่ผ่านการตรวจรับแล้ว
   - มีระบบสลับสิทธิ์กลับสู่ Desktop Portal (Admin/Branch) ในแท็บโปรไฟล์ (Profile Tab) เพื่อความสะดวกในการทดสอบระบบ

---

## 4. Business Logic และ Job Lifecycle

### สถานะของงาน (Job Status Lifecycle):
```
[PENDING_SUPPLIER] -> รอ Supplier กดรับงาน
       ↓
 [IN_PROGRESS]     -> Supplier กำลังปฏิบัติงาน
       ↓
[WAITING_APPROVAL] -> Supplier แนบรูปหลักฐานและกดส่งงาน (รอสาขาตรวจรับ)
       ↓
   [Branch Review]
     ├── [REJECTED] -> สาขาไม่อนุมัติ ระบุเหตุผลให้แก้ไข -> Supplier แก้ไขงาน
     └── [APPROVED] -> สาขาอนุมัติ ตรวจรับงานเรียบร้อย (พร้อมวางบิล)
           ↓
      [INVOICED]   -> นำไปสร้างใบวางบิลเรียบร้อยแล้ว (ห้ามนำมาวางบิลซ้ำ)
```

### Flow 1: Car Wash (สั่งล้างรถ)
1. สาขาเลือก Supplier ผู้ให้บริการล้างรถ
2. ระบบดึงเฉพาะ VIN ที่อยู่ในสต็อกของสาขานั้น
3. สาขาเลือก VIN ได้หลายคันพร้อมกัน (Multi-Select)
4. สำหรับแต่ละ VIN สาขาระบุ:
   - วันที่ปฏิบัติงานจริง (`actualWashDate`)
   - ประเภทการล้าง (`STANDARD` ฿180, `DEEP_CLEAN` ฿350, `POLISH` ฿650)
   - หมายเหตุเฉพาะคัน
5. บันทึกคำสั่งงาน -> สถานะรถเปลี่ยนเป็น `IN_WASH`
6. ส่งออกใบสั่งงาน / พิมพ์ PDF มีช่องลงลายมือชื่อของสาขาและผู้แทน Supplier

### Flow 2: Vehicle Slide (รถสไลด์ขนส่งรถยนต์)
1. สาขาเลือก 1 VIN จากสต็อกสาขาตนเอง -> สถานะรถเปลี่ยนเป็น `IN_TRANSIT`
2. ระบุสาขาต้นทาง (อัตโนมัติตามสาขาผู้สั่ง) และเลือกสาขาปลายทาง
3. ระบุวันเวลารับรถ และวันเวลาส่งมอบ
4. ระบุชื่อและเบอร์โทรผู้ติดต่อปลายทาง
5. ระบุเหตุผลในการย้ายรถ (ส่งมอบลูกค้า / ย้ายคลัง / ซ่อมบำรุง)
6. มอบหมาย Supplier รถสไลด์ พร้อมคำนวณประมาณการค่าบริการ

### Flow 3: การตรวจรับงาน (Waiting for Approval)
1. เมื่อ Supplier แนบรูปส่งงาน รายการจะปรากฏในหน้า `/approvals`
2. สาขาเปิดดูรูปภาพหลักฐานเปรียบเทียบก่อน-หลัง พร้อมกดขยายภาพ (Lightbox)
3. หากงานเรียบร้อย: กด **Approve** -> สถานะเปลี่ยนเป็น `APPROVED`, รถยนต์กลับสู่สถานะ `AVAILABLE` (หากเป็นรถสไลด์ ระบบจะย้าย `currentBranchId` ของรถไปยังสาขาปลายทางให้อัตโนมัติ)
4. หากพบจุดบกพร่อง: กด **Reject** -> ระบุข้อความขอให้แก้ไข เช่น "ขอบกระจังหน้ายังมีคราบฝังแน่น" เพื่อส่งกลับไปให้ช่างแก้ไข

### Flow 4: การออกใบวางบิล (Invoice Management)
ระบบมีกฎทางธุรกิจที่เข้มงวด 3 ข้อ:
1. **Approved Only**: งานที่จะนำมาวางบิลได้ ต้องมีสถานะเป็น `APPROVED` เท่านั้น
2. **Strict Company Separation**: ใบวางบิลของ **EV7** และ **GI** ต้องแยกจากกันโดยเด็ดขาด ห้ามรวมงานข้ามบริษัทในใบเดียวกัน
3. **No Duplicate Invoicing**: งานที่ถูกวางบิลแล้วจะมี `invoiceId` กำกับ และสถานะเปลี่ยนเป็น `INVOICED` ทันที ป้องกันการนำ Job เดิมมาเบิกเงินซ้ำ
4. **Tax Calculation**: ระบบคำนวณยอดรวมก่อนภาษี (Subtotal), VAT 7%, และยอดสุทธิ (Grand Total) พร้อมเลขบัญชีธนาคารสำหรับโอนเงิน

### Flow 5: Mobile Supplier Portal Operations (สำหรับคนขับและช่างหน้างาน)
ออกแบบเฉพาะสำหรับอุปกรณ์มือถือผ่านหน้า `/mobile` โดยถอดแบบดีไซน์จาก Stitch Design (`EV7 OPERATIONS PORTAL - SUPPLIER & BRANCH`):
1. **งานใหม่ (`PENDING_SUPPLIER`)**: ช่าง/คนขับกดปุ่ม **"กดรับงาน (เริ่มงาน)"** ➜ สถานะเปลี่ยนเป็น `IN_PROGRESS`
2. **ส่งมอบงาน (`IN_PROGRESS`)**: แตะปุ่ม **"ถ่ายรูปส่งงาน"** ➜ เปิด Modal ให้ถ่ายรูปจริงจากกล้อง อัปโหลดไฟล์ หรือเลือกรูปตัวอย่างด่วน พร้อมระบุประเภทรูป (ก่อนทำ / หลังทำ / รับรถ / ส่งมอบ) ➜ สถานะเปลี่ยนเป็น `WAITING_APPROVAL` (รอสาขาตรวจรับ)
3. **งานที่โดนปฏิเสธ (`REJECTED`)**: หน้าจอแสดงแบนเนอร์สีแดงระบุเหตุผลที่สาขาไม่อนุมัติ (เช่น "ยังมีคราบฝังแน่น") พร้อมปุ่ม **"ถ่ายรูปแก้ไขส่งงาน"** เพื่อส่งตรวจรับซ้ำ
4. **การวางบิลผ่านมือถือ (`APPROVED` ➜ `INVOICED`)**: ในแท็บ **"วางบิล"** ช่างสามารถติ๊กเลือกงานที่ผ่านเกณฑ์ ระบบคำนวณยอดเงิน Subtotal + VAT 7% และยอดสุทธิ Grand Total แบบ Real-time พร้อมกดออกเลข Invoice ได้ทันที

---

## 5. Shared Utilities Layer (Admin & Mobile Single Source of Truth)

เพื่อให้ทั้งระบบ Desktop Admin และ Mobile Portal ใช้ตรรกะเดียวกัน ไม่มีการเขียนสไตล์สี หรือสูตรคำนวณซ้ำซ้อน ระบบจึงแยก Utilities กลางไว้ใน `lib/`:
1. **`lib/job-utils.ts`**:
   - `JOB_STATUS_META` & `getJobStatusBadge(status)`: นิยาม Label ภาษาไทย, สีพื้นหลัง, สีข้อความ, สีกรอบ สำหรับทุกสถานะ (`PENDING_SUPPLIER`, `IN_PROGRESS`, `WAITING_APPROVAL`, `APPROVED`, `REJECTED`, `INVOICED`, `CANCELLED`)
   - `getJobVehicleDisplay(job)`: รวมข้อมูลรถ (รุ่น, สี, VIN, จำนวนคัน) ทั้งงาน Car Wash และ Vehicle Slide ออกมาเป็นฟอร์แมตมาตรฐาน
   - `getJobTotalCost(job)`: คืนค่ายอดเงินสุทธิ (Actual Cost หรือ Estimated Cost)
   - `getJobTypeDisplay(jobType)`: ข้อมูลและสีของประเภทงาน Car Wash / Vehicle Slide
2. **`lib/billing-utils.ts`**:
   - `calculateBillingSummary(jobs)`: คำนวณ Subtotal, VAT (7%), และ Grand Total พร้อมกัน
   - `formatCurrency(amount, options)`: จัดรูปแบบเงินบาทไทย เช่น `฿32,400` หรือ `฿32,400.00`
   - `validateJobsForInvoicing(jobs, expectedCompany)`: ตรวจสอบความถูกต้องก่อนออกบิล (ต้องเป็น APPROVED, ห้ามวางบิลซ้ำ, แยกบริษัท EV7/GI เด็ดขาด)
3. **`lib/date-utils.ts`**:
   - `formatThaiDate`, `formatThaiDateTime`, `formatTimeOnly`: จัดการเวลาไทย (Bangkok UTC+7) ป้องกันปัญหา Double Timezone

---

## 6. โครงสร้างไฟล์และ Modular Components (File & Component Architecture)

```
supplierJobManagement/
├── .env                          # SQL Server Database URL & Configuration
├── .env.example                  # Template env
├── package.json                  # Dependencies: Next.js 16, Prisma 6, Lucide
├── tsconfig.json                 # TypeScript strict configuration
├── prisma/
│   └── schema.prisma             # SQL Server Models & Constraints
├── types/
│   └── index.ts                  # TypeScript interfaces & enums (Job, Vehicle, etc.)
├── lib/
│   ├── prisma.ts                 # Prisma Client singleton
│   ├── mock-data.ts              # Seed data for EV7 & GI branches, cars, jobs
│   ├── date-utils.ts             # Safe Bangkok (UTC+7) date/time formatters
│   ├── job-utils.ts              # [SHARED] Status badges, vehicle summary, total cost
│   └── billing-utils.ts          # [SHARED] Subtotal, VAT 7%, Grand total, invoice validation
├── context/
│   └── AppContext.tsx            # Global state (Role, Company, Branch, CRUD, LocalStorage)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Responsive desktop sidebar with exact route matching & Mobile link
│   │   ├── Header.tsx            # Search, Role Switcher, Company Switcher, Mobile Portal CTA
│   │   └── AppShell.tsx          # Wrapper layout (bypasses chrome on /mobile for native view)
│   ├── dashboard/                # [MODULAR] Admin Desktop Dashboard Components
│   │   ├── DashboardHeader.tsx          # Header title, date, company filter, quick create buttons
│   │   ├── DashboardStatsCards.tsx      # 6 Key KPI summary cards (Total, In-Progress, Approvals, etc.)
│   │   ├── WorkflowPipeline.tsx         # 5-step visual pipeline (Dispatched -> Invoiced)
│   │   ├── UrgentApprovalsSection.tsx   # Highlight section for jobs waiting branch inspection
│   │   ├── RecentJobsTable.tsx          # Table of latest dispatched jobs with status badges
│   │   └── CompanyComparisonCards.tsx   # Side-by-side comparative analytics (EV7 vs GI Fleet)
│   └── mobile/                   # [MODULAR] EV7 Operations Supplier Mobile Portal
│       ├── MobileHeader.tsx             # iOS status simulation, EV7 CI logo, notification bell, avatar
│       ├── SupplierGreeting.tsx         # Real-time Thai date, supplier name greeting, branch dropdown
│       ├── ActionAlertBanner.tsx        # Urgent new job assigned alert banner
│       ├── JobCounterGrid.tsx           # 5-slot KPI grid with interactive filter triggers
│       ├── JobCard.tsx                  # Dedicated card for Car Wash & Slide with action buttons
│       ├── RecentJobsSection.tsx        # Recent jobs list container on home tab
│       ├── MyJobsTab.tsx                # Full job search & status filter tab
│       ├── BillingTab.tsx               # Invoice selection, VAT 7% calculation, invoice history
│       ├── ProfileTab.tsx               # Partner profile, banking info, switch supplier, desktop link
│       ├── BottomNavBar.tsx             # Fixed bottom dock with central (+) quick submit button
│       ├── SubmitEvidenceModal.tsx      # Camera/gallery upload modal with evidence type tagging
│       ├── ViewEvidenceModal.tsx        # Photo lightbox gallery modal
│       └── JobDetailDrawer.tsx          # Bottom drawer showing transfer route & vehicle list
└── app/
    ├── globals.css               # Stitch theme design tokens & print media
    ├── layout.tsx                # Root layout with fonts & AppProvider
    ├── page.tsx                  # Clean controller for Admin Dashboard
    ├── mobile/
    │   └── page.tsx              # Clean controller for Mobile Supplier Portal
    ├── jobs/
    │   ├── page.tsx              # All Jobs (Table View & Kanban Board View)
    │   ├── create-car-wash/
    │   │   └── page.tsx          # Multi-VIN Car Wash Order & Printable PDF
    │   └── create-vehicle-slide/
    │       └── page.tsx          # Vehicle Slide Request & Route details
    ├── approvals/
    │   └── page.tsx              # Waiting for Approval & Photo Evidence Viewer
    ├── vehicles/
    │   └── page.tsx              # Stock list, VIN search & History Drawer
    ├── suppliers/
    │   └── page.tsx              # Supplier profiles, services & bank info
    ├── invoices/
    │   └── page.tsx              # Invoice creation modal & Printable Invoice
    ├── reports/
    │   └── page.tsx              # Expense & volume analytics, CSV export
    └── settings/
        └── page.tsx              # Role simulator, SQL Server guide, Mobile Portal card, Data reset
```

---

## 7. แนวทางต่อยอดและพัฒนาในอนาคต (Next Steps & Integration)

1. **เชื่อมต่อ Live SQL Server**: นำ Connection String จริงใส่ใน `.env` และรัน `npx prisma db push`
2. **เชื่อมต่อ External Stock API**: สร้าง Route Handler ใน `app/api/external-stock/route.ts` เพื่อดึงข้อมูล VIN แบบอัตโนมัติตามระยะเวลา (Cron / Webhook)
3. **Cloud Object Storage สำหรับรูปถ่าย**: เสริม S3/Cloud Storage Adapter ในการอัปโหลดไฟล์รูปภาพจริงจากหน้างานแทน Data URL / Presets
