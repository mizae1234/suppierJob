/**
 * OpenAPI 3.0.3 Specification สำหรับ SupplierJob App
 * ครอบคลุมทั้ง 35 Endpoints (27 Routes) ของระบบ
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SupplierJob Management API',
    description: `ระบบบริหารจัดการงานคู่ค้าบริการล้างรถ (Car Wash) และรถสไลด์ขนส่งรถยนต์ (Vehicle Slide)
บริษัท โกลด์ อินทิเกรท จำกัด (Gold Integrate Co., Ltd.)

### การยืนยันตัวตน (Authentication)
* ส่ง Session Cookie ชื่อ \`auth_token\` หรือ
* ส่ง Authorization Header: \`Bearer <jwt_token>\``,
    version: '1.0.0',
    contact: {
      name: 'Gold Integrate Tech Team',
      email: 'contact@goldintegrate.co.th',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment (Auto Host)',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'ระบบล็อกอิน, ตรวจสอบผู้ใช้ และเปลี่ยนรหัสผ่าน' },
    { name: 'Jobs', description: 'ระบบสร้างงาน, ตรวจสอบสถานะ, รับมอบงาน และอัปโหลดหลักฐาน' },
    { name: 'Branches', description: 'จัดการข้อมูลสาขา และบันทึกพิกัด GPS ประจำสาขา' },
    { name: 'Users', description: 'จัดการผู้ใช้งานระบบ, สิทธิ์, รีเซ็ตรหัสผ่าน' },
    { name: 'Vehicles', description: 'ข้อมูลสต็อกรถยนต์ประจำสาขา และการนำเข้าข้อมูล' },
    { name: 'Suppliers & Invoices', description: 'ข้อมูลคู่ค้าบริการ และการออกใบวางบิล' },
    { name: 'Maps & Routing', description: 'ค้นหาสถานที่อัจฉริยะ และคำนวณระยะทางขับรถจริง' },
    { name: 'Files & System', description: 'การดึงไฟล์รูปภาพ และบันทึกประวัติการทำงาน (Audit Logs)' },
  ],
  paths: {
    // ----------------------------------------------------
    // Authentication
    // ----------------------------------------------------
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'เข้าสู่ระบบ (Login)',
        description: 'ตรวจสอบ Username & Password และออก JWT Session Cookie',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'เข้าสู่ระบบสำเร็จ',
            headers: {
              'Set-Cookie': {
                description: 'auth_token cookie สำหรับยืนยันตัวตน',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/SessionUser' },
                  },
                },
              },
            },
          },
          401: { description: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'ออกจากระบบ (Logout)',
        description: 'ล้าง Session Cookie ของผู้ใช้',
        responses: {
          200: {
            description: 'ออกจากระบบสำเร็จ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'ดึงข้อมูลผู้ใช้งานปัจจุบัน (Current User Profile)',
        description: 'ดึงข้อมูลบัญชีผู้ใช้จาก Session Token ปัจจุบัน',
        responses: {
          200: {
            description: 'ข้อมูลผู้ใช้ปัจจุบัน',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/SessionUser' },
                  },
                },
              },
            },
          },
          401: { description: 'ไม่ได้เข้าสู่ระบบ (Unauthorized)' },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'เปลี่ยนรหัสผ่าน (Change Password)',
        description: 'เปลี่ยนรหัสผ่านของผู้ใช้ปัจจุบัน (ทั้งแบบปกติและ First-time login)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: {
                  currentPassword: { type: 'string', description: 'รหัสผ่านเดิม (ไม่บังคับถ้าเป็นผู้ใช้ที่ต้องเปลี่ยนรหัส)' },
                  newPassword: { type: 'string', minLength: 6, example: 'NewSecret123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'เปลี่ยนรหัสผ่านสำเร็จ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'เปลี่ยนรหัสผ่านสำเร็จ' },
                  },
                },
              },
            },
          },
          400: { description: 'รหัสผ่านเดิมไม่ถูกต้อง หรือรหัสผ่านใหม่สั้นเกินไป' },
        },
      },
    },
    '/api/auth/check-user': {
      post: {
        tags: ['Authentication'],
        summary: 'ตรวจสอบสถานะบัญชีก่อนล็อกอิน',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username'],
                properties: {
                  username: { type: 'string', example: 'branch-ayutthaya' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'ผลการตรวจสอบบัญชี',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exists: { type: 'boolean' },
                    mustChangePassword: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------
    // Jobs
    // ----------------------------------------------------
    '/api/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'ดึงรายการงานทั้งหมด (List Jobs)',
        description: 'ดึงรายการงานตามสิทธิ์ของผู้ใช้ พร้อมรองรับการกรองตามสถานะ, สาขา, Supplier, วันที่',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['CAR_WASH', 'VEHICLE_SLIDE'] }, description: 'ประเภทงาน' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'สถานะงาน (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)' },
          { name: 'branchId', in: 'query', schema: { type: 'string' }, description: 'รหัสสาขา' },
          { name: 'supplierId', in: 'query', schema: { type: 'string' }, description: 'รหัสคู่ค้า' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'ค้นหาตามเลขที่งาน / VIN / ทะเบียน' },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'ตั้งแต่วันที่ (YYYY-MM-DD)' },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'ถึงวันที่ (YYYY-MM-DD)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'รายการงาน',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'สร้างงานใหม่ (Create Job)',
        description: 'สร้างใบงานล้างรถ หรือ ใบงานรถสไลด์ขนส่งรถยนต์',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateJobInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'สร้างงานสำเร็จ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job: { $ref: '#/components/schemas/Job' },
                  },
                },
              },
            },
          },
          400: { description: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง' },
        },
      },
    },
    '/api/jobs/{id}/status': {
      patch: {
        tags: ['Jobs'],
        summary: 'อัปเดตสถานะของงาน (Update Job Status)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Job ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_VERIFY', 'COMPLETED', 'CANCELLED'] },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'อัปเดตสถานะสำเร็จ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { job: { $ref: '#/components/schemas/Job' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/jobs/{id}/items/{itemId}/status': {
      patch: {
        tags: ['Jobs'],
        summary: 'อัปเดตสถานะรถแต่ละคันในงานล้างรถ',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Job ID' },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' }, description: 'Job Item ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'WASHING', 'COMPLETED', 'CANCELLED'] },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'อัปเดตสำเร็จ' },
        },
      },
    },
    '/api/jobs/{id}/evidence': {
      post: {
        tags: ['Jobs'],
        summary: 'อัปโหลดรูปภาพหลักฐานงาน (Upload Evidence)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Job ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'type'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  type: { type: 'string', enum: ['BEFORE', 'AFTER', 'INSPECTION', 'SIGNATURE'] },
                  jobItemId: { type: 'string', description: 'ระบุถ้าเป็นหลักฐานเฉพาะคัน' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'อัปโหลดหลักฐานสำเร็จ' },
        },
      },
    },
    '/api/jobs/{id}/verify': {
      post: {
        tags: ['Jobs'],
        summary: 'ตรวจรับและอนุมัติงานโดยสาขา/Admin (Verify Job)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Job ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verified'],
                properties: {
                  verified: { type: 'boolean' },
                  comment: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'ตรวจรับงานสำเร็จ' },
        },
      },
    },

    // ----------------------------------------------------
    // Branches
    // ----------------------------------------------------
    '/api/branches': {
      get: {
        tags: ['Branches'],
        summary: 'ดึงรายชื่อสาขาทั้งหมด (List Branches)',
        parameters: [
          { name: 'companyId', in: 'query', schema: { type: 'string' }, description: 'รหัสบริษัท' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'รายชื่อสาขา',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Branch' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Branches'],
        summary: 'สร้างสาขาใหม่ (Create Branch)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBranchInput' },
            },
          },
        },
        responses: {
          201: { description: 'สร้างสาขาสำเร็จ' },
        },
      },
    },
    '/api/branches/{id}': {
      get: {
        tags: ['Branches'],
        summary: 'ดูรายละเอียดสาขา (Get Branch by ID)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Branch' } } } },
        },
      },
      patch: {
        tags: ['Branches'],
        summary: 'แก้ไขข้อมูลสาขา (Update Branch)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          200: { description: 'แก้ไขสำเร็จ' },
        },
      },
      delete: {
        tags: ['Branches'],
        summary: 'ลบสาขา (Delete Branch)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'ลบสำเร็จ' },
        },
      },
    },
    '/api/branches/{id}/location': {
      patch: {
        tags: ['Branches'],
        summary: 'บันทึก/อัปเดตพิกัด GPS ประจำสาขาถาวร',
        description: 'ใช้สำหรับปักหมุดตำแหน่งที่ตั้งถาวรของสาขา เพื่อใช้นำทางและคำนวณระยะทางรถสไลด์',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['latitude', 'longitude'],
                properties: {
                  latitude: { type: 'number', example: 14.3532 },
                  longitude: { type: 'number', example: 100.5684 },
                  address: { type: 'string', example: 'ตำบลหอรัตนไชย อำเภอพระนครศรีอยุธยา' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'บันทึกพิกัดสาขาสำเร็จ',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    branch: { $ref: '#/components/schemas/Branch' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------
    // Users
    // ----------------------------------------------------
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'ดึงรายชื่อผู้ใช้ทั้งหมด (List Users)',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'branchId', in: 'query', schema: { type: 'string' } },
          { name: 'companyId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'สร้างผู้ใช้ใหม่ (Create User)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserInput' },
            },
          },
        },
        responses: {
          201: { description: 'สร้างผู้ใช้สำเร็จ' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'ดูข้อมูลผู้ใช้รายบุคคล (Get User)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } } },
      },
      put: {
        tags: ['Users'],
        summary: 'อัปเดตข้อมูลผู้ใช้ (Update User)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'อัปเดตสำเร็จ' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'ลบผู้ใช้ (Delete User)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'ลบสำเร็จ' } },
      },
    },
    '/api/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'เปิด/ปิดการใช้งานผู้ใช้ (Toggle Active Status)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: { isActive: { type: 'boolean' } },
              },
            },
          },
        },
        responses: { 200: { description: 'ปรับสถานะสำเร็จ' } },
      },
    },
    '/api/users/{id}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'รีเซ็ตรหัสผ่านผู้ใช้โดย Admin',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newPassword'],
                properties: { newPassword: { type: 'string', minLength: 6 } },
              },
            },
          },
        },
        responses: { 200: { description: 'รีเซ็ตรหัสผ่านสำเร็จ' } },
      },
    },

    // ----------------------------------------------------
    // Vehicles
    // ----------------------------------------------------
    '/api/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'ดึงรายการรถยนต์ในสต็อก (List Vehicles)',
        parameters: [
          { name: 'branchId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } },
              },
            },
          },
        },
      },
    },
    '/api/vehicles/import': {
      post: {
        tags: ['Vehicles'],
        summary: 'นำเข้าข้อมูลรถยนต์จำนวนมาก (Batch Import Vehicles)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vehicles'],
                properties: {
                  vehicles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['vin', 'branchId'],
                      properties: {
                        vin: { type: 'string', example: 'VF8ABC1234567890' },
                        licensePlate: { type: 'string', example: '1กข 1234' },
                        model: { type: 'string', example: 'VF8' },
                        color: { type: 'string', example: 'White' },
                        branchId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'นำเข้าสำเร็จ' } },
      },
    },
    '/api/vehicle-reports': {
      get: {
        tags: ['Vehicles'],
        summary: 'ดึงรายงานสถิติงานรถและสต็อกสาขา',
        parameters: [
          { name: 'branchId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'ข้อมูลรายงาน' } },
      },
    },
    '/api/integrations/d365/sync': {
      get: {
        tags: ['Vehicles'],
        summary: 'ประวัติการ Sync รถจาก D365 (10 รอบล่าสุด) และสถานะการตั้งค่า',
        responses: { 200: { description: 'configured, autoSyncEnabled, intervalMinutes, runs[]' } },
      },
      post: {
        tags: ['Vehicles'],
        summary: 'สั่ง Sync รถในสต็อกจาก D365 ทันที (MASTER / ADMIN)',
        description:
          'ดึงรถรายคันจาก D365 (BPC_InventOnHand) ทุกบริษัท แล้ว upsert ลงตาราง Vehicle ' +
          'รถที่ไม่อยู่ใน D365 แล้วจะถูก mark เป็น OUT_OF_STOCK',
        responses: {
          200: { description: 'Sync สำเร็จ หรือสำเร็จบางส่วน (status: SUCCESS | PARTIAL)' },
          409: { description: 'มีการ Sync กำลังทำงานอยู่' },
          502: { description: 'เชื่อมต่อ / ดึงข้อมูลจาก D365 ไม่สำเร็จ' },
          503: { description: 'ยังไม่ได้ตั้งค่า D365_* ใน environment' },
        },
      },
    },

    // ----------------------------------------------------
    // Suppliers, Companies & Invoices
    // ----------------------------------------------------
    '/api/suppliers': {
      get: {
        tags: ['Suppliers & Invoices'],
        summary: 'ดึงรายชื่อ Supplier คู่ค้าทั้งหมด',
        parameters: [
          { name: 'serviceType', in: 'query', schema: { type: 'string', enum: ['CAR_WASH', 'VEHICLE_SLIDE'] } },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Supplier' } },
              },
            },
          },
        },
      },
    },
    '/api/companies': {
      get: {
        tags: ['Suppliers & Invoices'],
        summary: 'ดึงรายชื่อบริษัทในเครือ (Companies)',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Company' } },
              },
            },
          },
        },
      },
    },
    '/api/invoices': {
      get: {
        tags: ['Suppliers & Invoices'],
        summary: 'ดึงรายการใบแจ้งหนี้ / ใบวางบิล',
        parameters: [
          { name: 'supplierId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'รายการใบวางบิล' } },
      },
      post: {
        tags: ['Suppliers & Invoices'],
        summary: 'ออกใบวางบิลสรุปยอดงาน (Create Invoice)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['supplierId', 'jobIds'],
                properties: {
                  supplierId: { type: 'string' },
                  jobIds: { type: 'array', items: { type: 'string' } },
                  invoiceNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'ออกใบวางบิลสำเร็จ' } },
      },
    },

    // ----------------------------------------------------
    // Maps & Routing
    // ----------------------------------------------------
    '/api/places/search': {
      get: {
        tags: ['Maps & Routing'],
        summary: 'ค้นหาสถานที่อัจฉริยะ (Smart Place Search)',
        description: `ระบบค้นหาสถานที่สำหรับปักหมุดแผนที่:
1. พิกัดตรง (13.7597, 100.6437)
2. ถอดรหัสลิงก์ย่อ Google Maps (maps.app.goo.gl)
3. OpenStreetMap Nominatim พร้อมระบบ Progressive Address Relaxation
4. Google Gemini AI Fallback สำหรับคำค้นหายาก / ภาษาพูด`,
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'คำค้นหา, ที่อยู่, พิกัด หรือ ลิงก์ Google Maps' },
          { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'พิกัดละติจูดอ้างอิง (Bias)' },
          { name: 'lng', in: 'query', schema: { type: 'number' }, description: 'พิกัดลองจิจูดอ้างอิง (Bias)' },
        ],
        responses: {
          200: {
            description: 'ผลการค้นหาสถานที่',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    provider: { type: 'string', enum: ['coordinate', 'google_url', 'google', 'osm', 'gemini', 'none'] },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' },
                          name: { type: 'string' },
                          detail: { type: 'string' },
                          type: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/routes/driving': {
      get: {
        tags: ['Maps & Routing'],
        summary: 'คำนวณระยะทางขับรถจริงตามถนน (Road Driving Distance)',
        description: 'คำนวณเส้นทางและระยะทางจริงระหว่าง 2 พิกัดด้วย OSRM Driving Engine',
        parameters: [
          { name: 'originLat', in: 'query', required: true, schema: { type: 'number' }, example: 14.3532 },
          { name: 'originLng', in: 'query', required: true, schema: { type: 'number' }, example: 100.5684 },
          { name: 'destLat', in: 'query', required: true, schema: { type: 'number' }, example: 13.7597 },
          { name: 'destLng', in: 'query', required: true, schema: { type: 'number' }, example: 100.6437 },
        ],
        responses: {
          200: {
            description: 'ผลการคำนวณเส้นทาง',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    distanceKm: { type: 'number', example: 78.4 },
                    durationMin: { type: 'number', example: 65 },
                    coordinates: {
                      type: 'array',
                      items: { type: 'array', items: { type: 'number' } },
                      description: 'จุด Polyline [lat, lng] สำหรับวาดบนแผนที่',
                    },
                    provider: { type: 'string', example: 'osrm' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------
    // Files & System
    // ----------------------------------------------------
    '/api/files/{key}': {
      get: {
        tags: ['Files & System'],
        summary: 'ดึง / แสดงผลไฟล์รูปภาพที่อัปโหลด (Get File)',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' }, description: 'Path ไฟล์ เช่น jobs/evidence/image.jpg' },
        ],
        responses: {
          200: {
            description: 'ไฟล์ข้อมูล Binary (Image/PDF)',
            content: {
              'image/jpeg': {},
              'image/png': {},
              'application/octet-stream': {},
            },
          },
        },
      },
    },
    '/api/audit-logs': {
      get: {
        tags: ['Files & System'],
        summary: 'ดึงบันทึกประวัติการทำรายการย้อนหลัง (Audit Logs)',
        parameters: [
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { 200: { description: 'รายการ Log' } },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',
        description: 'Secure JWT Session Cookie ที่ได้รับหลังเข้าสู่ระบบ',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer Token ใน Authorization Header',
      },
    },
    schemas: {
      SessionUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'BRANCH', 'SUPPLIER', 'EXECUTIVE'] },
          branchId: { type: 'string', nullable: true },
          companyId: { type: 'string', nullable: true },
          supplierId: { type: 'string', nullable: true },
          name: { type: 'string' },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          jobNumber: { type: 'string', example: 'JOB-202610-001' },
          type: { type: 'string', enum: ['CAR_WASH', 'VEHICLE_SLIDE'] },
          status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_VERIFY', 'COMPLETED', 'CANCELLED'] },
          branchId: { type: 'string' },
          supplierId: { type: 'string' },
          totalAmount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateJobInput: {
        type: 'object',
        required: ['type', 'supplierId'],
        properties: {
          type: { type: 'string', enum: ['CAR_WASH', 'VEHICLE_SLIDE'] },
          supplierId: { type: 'string' },
          branchId: { type: 'string' },
          originBranchId: { type: 'string' },
          destBranchId: { type: 'string' },
          distanceKm: { type: 'number' },
          estimatedCost: { type: 'number' },
          vins: { type: 'array', items: { type: 'string' } },
        },
      },
      Branch: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string', example: 'GI11' },
          name: { type: 'string', example: 'GOLD INTEGRATE AYUTTHAYA CO.,LTD' },
          companyId: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          latitude: { type: 'number', nullable: true, example: 14.3532 },
          longitude: { type: 'number', nullable: true, example: 100.5684 },
          isActive: { type: 'boolean' },
        },
      },
      CreateBranchInput: {
        type: 'object',
        required: ['code', 'name', 'companyId'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          companyId: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          role: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          branchId: { type: 'string', nullable: true },
          companyId: { type: 'string', nullable: true },
          supplierId: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['username', 'role'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'BRANCH', 'SUPPLIER', 'EXECUTIVE'] },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          branchId: { type: 'string' },
          companyId: { type: 'string' },
          supplierId: { type: 'string' },
        },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vin: { type: 'string' },
          licensePlate: { type: 'string' },
          model: { type: 'string' },
          color: { type: 'string' },
          currentBranchId: { type: 'string' },
          status: { type: 'string' },
        },
      },
      Supplier: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          serviceType: { type: 'string', enum: ['CAR_WASH', 'VEHICLE_SLIDE'] },
          phone: { type: 'string' },
          address: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  },
  security: [
    { cookieAuth: [] },
    { bearerAuth: [] },
  ],
};
