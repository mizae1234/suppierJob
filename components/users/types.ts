export interface CompanyData {
  id: string;
  code: string;
  name: string;
  branches: { id: string; code: string; name: string }[];
}

export interface SupplierData {
  id: string;
  code: string;
  name: string;
}

export interface UserItem {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  phone: string | null;
  role: 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER';
  companyId: string | null;
  branchId: string | null;
  supplierId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; code: string; name: string } | null;
  branch?: { id: string; code: string; name: string } | null;
  supplier?: { id: string; code: string; name: string } | null;
}
