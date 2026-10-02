'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  Edit3,
  FileText,
  Upload,
  RefreshCw,
  Filter,
  Calendar,
  User,
  Clock,
  Globe,
  Monitor,
  Hash,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  supplierId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  LOGIN: { label: 'เข้าสู่ระบบ', icon: LogIn, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  LOGOUT: { label: 'ออกจากระบบ', icon: LogOut, color: 'text-gray-500', bgColor: 'bg-gray-50' },
  CREATE_JOB: { label: 'สร้างงาน', icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  UPDATE_JOB: { label: 'อัปเดตงาน', icon: Edit3, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  APPROVE_JOB: { label: 'อนุมัติงาน', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  REJECT_JOB: { label: 'ตีกลับงาน', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  CANCEL_JOB: { label: 'ยกเลิกงาน', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  SUBMIT_JOB: { label: 'ส่งงาน', icon: Upload, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  UPDATE_ITEM_STATUS: { label: 'อัปเดตรายการ', icon: RefreshCw, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  CREATE_INVOICE: { label: 'สร้าง Invoice', icon: FileText, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  UPDATE_INVOICE: { label: 'อัปเดต Invoice', icon: Edit3, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  UPLOAD_EVIDENCE: { label: 'อัปโหลดหลักฐาน', icon: Upload, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
};

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  MASTER: { label: 'Master', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  ADMIN: { label: 'Admin', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  BRANCH: { label: 'Branch', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUPPLIER: { label: 'Supplier', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export default function AuditLogsPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (searchQuery) params.set('q', searchQuery);
      if (filterAction) params.set('action', filterAction);
      if (filterDateFrom) params.set('from', filterDateFrom);
      if (filterDateTo) params.set('to', filterDateTo);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;

    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const actionOptions = Object.entries(ACTION_CONFIG).map(([key, val]) => ({
    value: key,
    label: val.label,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Audit Logs</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              ประวัติการใช้งานระบบ • {total.toLocaleString()} รายการ
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>ตัวกรอง</span>
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อผู้ใช้, เลขที่งาน, คำอธิบาย..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none bg-white"
              style={{ ['--tw-ring-color' as any]: theme.primary }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer shadow-sm"
            style={{ backgroundColor: theme.primary }}
          >
            ค้นหา
          </button>
        </form>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ประเภท Action</label>
              <select
                value={filterAction}
                onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs bg-white"
              >
                <option value="">ทั้งหมด</option>
                {actionOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Role</label>
              <select
                value={filterRole}
                onChange={e => { setFilterRole(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs bg-white"
              >
                <option value="">ทั้งหมด</option>
                <option value="MASTER">Master</option>
                <option value="ADMIN">Admin</option>
                <option value="BRANCH">Branch</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">จากวันที่</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
                className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 opacity-40" />
          <p className="text-sm font-medium">กำลังโหลด Audit Logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white/60 rounded-3xl border border-gray-100">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-bold text-gray-600">ไม่พบรายการ</p>
          <p className="text-xs text-gray-400 mt-1">ยังไม่มี Audit Log ที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map(log => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: Edit3,
              color: 'text-gray-600',
              bgColor: 'bg-gray-50',
            };
            const Icon = config.icon;
            const roleBadge = log.userRole ? ROLE_BADGE[log.userRole] : null;

            return (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-2xs hover:border-gray-200 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Action Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${config.bgColor} ${config.color}`}>
                        {config.label}
                      </span>
                      {roleBadge && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${roleBadge.className}`}>
                          {roleBadge.label}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 leading-snug">{log.description}</p>

                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 flex-wrap">
                      {log.userName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.userName}
                        </span>
                      )}
                      {log.entityType && log.entityId && (
                        <span className="flex items-center gap-1 font-mono">
                          <Hash className="w-3 h-3" />
                          {log.entityType}: {log.entityId.slice(0, 8)}...
                        </span>
                      )}
                      {log.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 px-3">
            หน้า {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
