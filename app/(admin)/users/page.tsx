'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Shield,
  Building2,
  MapPin,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Phone,
  Briefcase,
  X,
  Copy,
  Check,
  RefreshCw,
  Lock,
  ChevronDown,
} from 'lucide-react';

interface CompanyData {
  id: string;
  code: string;
  name: string;
  branches: { id: string; code: string; name: string }[];
}

interface SupplierData {
  id: string;
  code: string;
  name: string;
}

interface UserItem {
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

export default function UserManagementPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const theme = useTheme();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    position: '',
    phone: '',
    role: 'BRANCH' as 'MASTER' | 'ADMIN' | 'BRANCH' | 'SUPPLIER',
    companyId: '',
    branchId: '',
    supplierId: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Reset password states
  const [newPassword, setNewPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้', 'error');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Fetch metadata (companies & suppliers)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [compRes, supRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/suppliers'),
        ]);
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompanies(compData.companies || []);
        }
        if (supRes.ok) {
          const supData = await supRes.json();
          setSuppliers(supData.suppliers || []);
        }
      } catch (e) {
        console.error('Metadata fetch error:', e);
      }
    };

    if (currentUser?.role === 'MASTER') {
      fetchMetadata();
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  // Quick Password Generator
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultCompany = companies[0]?.id || '';
    const defaultBranch = companies[0]?.branches[0]?.id || '';
    const defaultSupplier = suppliers[0]?.id || '';

    setFormData({
      username: '',
      password: generatePassword(),
      displayName: '',
      firstName: '',
      lastName: '',
      position: '',
      phone: '',
      role: 'BRANCH',
      companyId: defaultCompany,
      branchId: defaultBranch,
      supplierId: defaultSupplier,
    });
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      displayName: user.displayName,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      position: user.position || '',
      phone: user.phone || '',
      role: user.role,
      companyId: user.companyId || (companies[0]?.id || ''),
      branchId: user.branchId || '',
      supplierId: user.supplierId || (suppliers[0]?.id || ''),
    });
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim()) {
      showToast('กรุณากรอกชื่อที่แสดง (Display Name)', 'warning');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingUser) {
        // Edit User
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.displayName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            position: formData.position,
            phone: formData.phone,
            role: formData.role,
            companyId: formData.role === 'MASTER' ? null : formData.companyId,
            branchId: formData.role === 'BRANCH' ? formData.branchId : null,
            supplierId: formData.role === 'SUPPLIER' ? formData.supplierId : null,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
          setEditingUser(null);
          fetchUsers();
        } else {
          showToast(data.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
        }
      } else {
        // Create User
        if (!formData.username.trim() || formData.username.length < 3) {
          showToast('Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษร', 'warning');
          setFormSubmitting(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
          setFormSubmitting(false);
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            displayName: formData.displayName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            position: formData.position,
            phone: formData.phone,
            role: formData.role,
            companyId: formData.role === 'MASTER' ? null : formData.companyId,
            branchId: formData.role === 'BRANCH' ? formData.branchId : null,
            supplierId: formData.role === 'SUPPLIER' ? formData.supplierId : null,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast(`สร้างผู้ใช้ "${data.user.displayName}" สำเร็จ`, 'success');
          setShowCreateModal(false);
          fetchUsers();
        } else {
          showToast(data.error || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้', 'error');
        }
      }
    } catch (err) {
      console.error('Submit user error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUser?.id) {
      showToast('คุณไม่สามารถระงับบัญชีของตนเองได้', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, isActive: !user.isActive } : u))
        );
      } else {
        showToast(data.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (user: UserItem) => {
    setResetPasswordUser(user);
    setNewPassword(generatePassword());
    setCopiedPassword(false);
  };

  // Submit Reset Password
  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!newPassword || newPassword.length < 6) {
      showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`รีเซ็ตรหัสผ่านสำหรับ ${resetPasswordUser.displayName} เรียบร้อยแล้ว`, 'success');
        setResetPasswordUser(null);
      } else {
        showToast(data.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      const res = await fetch(`/api/users/${deleteConfirmUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('ลบผู้ใช้งานเรียบร้อยแล้ว', 'success');
        setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
        setDeleteConfirmUser(null);
      } else {
        showToast(data.error || 'ไม่สามารถลบผู้ใช้งานได้', 'error');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      showToast('เกิดข้อผิดพลาดในการลบผู้ใช้งาน', 'error');
    }
  };

  // Available branches for current selected company in modal
  const modalBranches = useMemo(() => {
    const comp = companies.find(c => c.id === formData.companyId);
    return comp?.branches || [];
  }, [companies, formData.companyId]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = user.displayName?.toLowerCase().includes(q);
        const matchUser = user.username?.toLowerCase().includes(q);
        const matchPhone = user.phone?.includes(q);
        const matchPos = user.position?.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchPos) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      // Company filter
      if (companyFilter !== 'ALL') {
        if (user.companyId !== companyFilter) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !user.isActive) return false;
      if (statusFilter === 'INACTIVE' && user.isActive) return false;

      return true;
    });
  }, [users, search, roleFilter, companyFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter(u => u.role === 'MASTER' || u.role === 'ADMIN').length,
      branch: users.filter(u => u.role === 'BRANCH').length,
      supplier: users.filter(u => u.role === 'SUPPLIER').length,
      inactive: users.filter(u => !u.isActive).length,
    };
  }, [users]);

  // Access Guard
  if (!authLoading && currentUser?.role !== 'MASTER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">สงวนสิทธิ์เฉพาะผู้ดูแลระบบสูงสุด (Master)</h2>
        <p className="text-sm text-gray-500 max-w-md">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หากต้องการใช้งานกรุณาติดต่อผู้ดูแลระบบสูงสุดเพื่อขออนุญาต
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7" style={{ color: theme.primary }} />
            จัดการผู้ใช้งาน (User Management)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            บริหารจัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และสังกัดสาขาหรือคู่ค้า (เฉพาะ Master)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
            style={{ backgroundColor: theme.primary }}
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มผู้ใช้งานใหม่</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">ผู้ใช้ทั้งหมด</p>
            <p className="text-xl font-black text-gray-900">{stats.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Master / Admin</p>
            <p className="text-xl font-black text-gray-900">{stats.admin}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">เจ้าหน้าที่สาขา</p>
            <p className="text-xl font-black text-gray-900">{stats.branch}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">คู่ค้า Supplier</p>
            <p className="text-xl font-black text-gray-900">{stats.supplier}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3.5 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">ระงับใช้งาน</p>
            <p className="text-xl font-black text-gray-900">{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, Username, เบอร์โทร, ตำแหน่ง..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">ทุกบทบาท (Role)</option>
            <option value="MASTER">Master (สูงสุด)</option>
            <option value="ADMIN">Admin (บริษัท)</option>
            <option value="BRANCH">Branch (สาขา)</option>
            <option value="SUPPLIER">Supplier (คู่ค้า)</option>
          </select>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">ทุกสังกัดบริษัท</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="ACTIVE">🟢 ใช้งานอยู่</option>
            <option value="INACTIVE">🔴 ระงับใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <RotateCw className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
            <p className="text-sm font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Users className="w-12 h-12 stroke-1 text-gray-300 mb-3" />
            <p className="text-base font-bold text-gray-700">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ผู้ใช้งาน</th>
                  <th className="py-3.5 px-4">บทบาท (Role)</th>
                  <th className="py-3.5 px-4">สังกัด / สาขา / คู่ค้า</th>
                  <th className="py-3.5 px-4">เบอร์โทรศัพท์</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredUsers.map(user => {
                  const isCurrent = user.id === currentUser?.id;

                  // Role badge styling
                  let roleBadge = {
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    icon: Shield,
                    label: user.role,
                  };

                  if (user.role === 'MASTER') {
                    roleBadge = {
                      bg: 'bg-purple-50',
                      text: 'text-purple-700',
                      border: 'border-purple-200',
                      icon: Shield,
                      label: 'MASTER',
                    };
                  } else if (user.role === 'ADMIN') {
                    roleBadge = {
                      bg: 'bg-blue-50',
                      text: 'text-blue-700',
                      border: 'border-blue-200',
                      icon: Building2,
                      label: 'ADMIN',
                    };
                  } else if (user.role === 'BRANCH') {
                    roleBadge = {
                      bg: 'bg-emerald-50',
                      text: 'text-emerald-700',
                      border: 'border-emerald-200',
                      icon: MapPin,
                      label: 'BRANCH',
                    };
                  } else if (user.role === 'SUPPLIER') {
                    roleBadge = {
                      bg: 'bg-amber-50',
                      text: 'text-amber-700',
                      border: 'border-amber-200',
                      icon: Truck,
                      label: 'SUPPLIER',
                    };
                  }

                  const RoleIcon = roleBadge.icon;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              user.role === 'MASTER'
                                ? 'bg-purple-600 text-white'
                                : user.role === 'ADMIN'
                                ? 'bg-blue-600 text-white'
                                : user.role === 'BRANCH'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 truncate">
                                {user.displayName}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  (บัญชีของคุณ)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 font-mono">
                              @{user.username}
                              {user.position ? ` • ${user.position}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Affiliation */}
                      <td className="py-3.5 px-4 text-gray-600">
                        {user.role === 'MASTER' ? (
                          <span className="text-gray-400 italic">ส่วนกลาง (ทุกระบบ)</span>
                        ) : user.role === 'SUPPLIER' ? (
                          <span className="font-semibold text-amber-900">
                            {user.supplier?.name || 'ไม่ระบุ Supplier'}
                          </span>
                        ) : user.role === 'BRANCH' ? (
                          <div>
                            <span className="font-semibold text-gray-900">
                              {user.branch?.name || 'ไม่ระบุสาขา'}
                            </span>
                            {user.company && (
                              <span className="text-[11px] text-gray-400 block">
                                ({user.company.code})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {user.company?.name || user.company?.code || 'ไม่ระบุบริษัท'}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-gray-600">
                        {user.phone ? (
                          <span className="inline-flex items-center gap-1 text-gray-700">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {user.phone}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          disabled={isCurrent}
                          title={isCurrent ? 'ไม่สามารถระงับบัญชีตนเองได้' : user.isActive ? 'กดเพื่อระงับการใช้งาน' : 'กดเพื่อเปิดการใช้งาน'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'opacity-60 cursor-not-allowed'
                              : 'hover:scale-105 active:scale-95'
                          } ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {user.isActive ? 'ใช้งาน' : 'ระงับ'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenResetPassword(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmUser(user)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-gray-300'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title={isCurrent ? 'ไม่สามารถลบบัญชีตนเองได้' : 'ลบผู้ใช้งาน'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Modal: Create / Edit User */}
      {/* ========================================================= */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primary }}
                >
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {editingUser ? `แก้ไขผู้ใช้งาน: ${editingUser.displayName}` : 'เพิ่มผู้ใช้งานใหม่'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {editingUser ? 'แก้ไขข้อมูล สิทธิ์ และสังกัดของผู้ใช้' : 'กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่ในระบบ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUser(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={formData.username}
                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().trim() }))}
                    placeholder="เช่น user.ev7"
                    className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  />
                  {editingUser && (
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Username ไม่สามารถเปลี่ยนได้</span>
                  )}
                </div>

                {!editingUser && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700">
                        รหัสผ่านเริ่มต้น <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                        className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> สุ่มรหัส
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.password}
                        onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ชื่อที่แสดง (Display Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="เช่น สมชาย ใจดี (พระราม 9)"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อจริง</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="ชื่อจริง"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="นามสกุล"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              {/* Position & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="เช่น ผู้จัดการสาขา, จนท.ขาย"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  บทบาทและสิทธิ์การใช้งาน (Role) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'BRANCH', label: 'BRANCH', desc: 'เจ้าหน้าที่สาขา', icon: MapPin },
                    { key: 'ADMIN', label: 'ADMIN', desc: 'ผู้ดูแลระดับบริษัท', icon: Building2 },
                    { key: 'SUPPLIER', label: 'SUPPLIER', desc: 'คู่ค้าบริการ', icon: Truck },
                    { key: 'MASTER', label: 'MASTER', desc: 'ผู้ดูแลระบบสูงสุด', icon: Shield },
                  ].map(r => {
                    const isSelected = formData.role === r.key;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: r.key as any }))}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500 text-emerald-950'
                            : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-bold text-xs">{r.label}</p>
                          <p className="text-[10px] text-gray-400">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional: Company & Branch if ADMIN or BRANCH */}
              {(formData.role === 'ADMIN' || formData.role === 'BRANCH') && (
                <div className="space-y-3 p-3.5 rounded-xl bg-gray-50/70 border border-gray-200/70">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      สังกัดบริษัท <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.companyId}
                      onChange={e => {
                        const newCompId = e.target.value;
                        const comp = companies.find(c => c.id === newCompId);
                        setFormData(prev => ({
                          ...prev,
                          companyId: newCompId,
                          branchId: comp?.branches[0]?.id || '',
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden cursor-pointer"
                    >
                      <option value="">เลือกบริษัท</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.role === 'BRANCH' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        สังกัดสาขา <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.branchId}
                        onChange={e => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden cursor-pointer"
                      >
                        <option value="">เลือกสาขา</option>
                        {modalBranches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.code} — {b.name}
                          </option>
                        ))}
                      </select>
                      {modalBranches.length === 0 && (
                        <span className="text-[10px] text-amber-600 mt-1 block">
                          บริษัทนี้ยังไม่มีข้อมูลสาขา
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional: Supplier if SUPPLIER */}
              {formData.role === 'SUPPLIER' && (
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    สังกัดคู่ค้า Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={e => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="">เลือก Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: theme.primary }}
                >
                  {formSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้งาน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal: Reset Password */}
      {/* ========================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">รีเซ็ตรหัสผ่าน</h3>
                  <p className="text-[11px] text-gray-500">
                    สำหรับ: {resetPasswordUser.displayName} (@{resetPasswordUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitResetPassword} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    รหัสผ่านใหม่
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword(generatePassword());
                      setCopiedPassword(false);
                    }}
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> สุ่มรหัสใหม่
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-20 py-2.5 text-sm font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-amber-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                    className="absolute right-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                  >
                    {copiedPassword ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 text-[10px]">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px]">คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  💡 แนะนำให้กดคัดลอกรหัสผ่านนี้เพื่อส่งให้ผู้ใช้งานก่อนกดบันทึก
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {resetSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>ยืนยันตั้งรหัสผ่านใหม่</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal: Delete Confirmation */}
      {/* ========================================================= */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-scale-up p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">ยืนยันการลบผู้ใช้งาน?</h3>
            <p className="text-xs text-gray-500 mb-4">
              คุณต้องการลบผู้ใช้ <span className="font-bold text-gray-800">"{deleteConfirmUser.displayName}"</span> ใช่หรือไม่?
              หากผู้ใช้นี้มีประวัติสร้างงานในระบบ แนะนำให้ใช้การ <span className="text-rose-600 font-semibold">"ระงับการใช้งาน"</span> แทน
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
