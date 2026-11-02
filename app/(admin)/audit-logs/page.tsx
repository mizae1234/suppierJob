'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import CustomDropdown, { DropdownOption } from '@/components/ui/CustomDropdown';
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
  Server,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react';

interface D365PoLogEntry {
  id: string;
  jobId: string;
  jobNumber: string;
  jobType: string;
  trigger: string;
  companyCode: string | null;
  branchName: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  vendorAccount: string | null;
  vin: string | null;
  itemNumber: string | null;
  amount: number | null;
  status: 'SUCCESS' | 'FAILED' | string;
  purchId: string | null;
  httpStatus: number | null;
  message: string | null;
  requestUrl: string | null;
  requestPayload: string | null;
  responseBody: string | null;
  durationMs: number | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

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
  const [activeTab, setActiveTab] = useState<'audit' | 'po-interface'>('audit');

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // D365 PO Interface Logs State
  const [poLogs, setPoLogs] = useState<D365PoLogEntry[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [poSuccessCount, setPoSuccessCount] = useState(0);
  const [poFailedCount, setPoFailedCount] = useState(0);
  const [poPage, setPoPage] = useState(1);
  const [poTotalPages, setPoTotalPages] = useState(1);
  const [poLoading, setPoLoading] = useState(false);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poFilterStatus, setPoFilterStatus] = useState('');
  const [poFilterCompany, setPoFilterCompany] = useState('');
  const [expandedPoLogId, setExpandedPoLogId] = useState<string | null>(null);
  const debouncedPoSearch = useDebouncedValue(poSearchQuery, 300);
  const poAbortRef = useRef<AbortController | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce typing so we don't hit the API on every keystroke; abort stale requests
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const logsAbortRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async (query: string = debouncedSearchQuery) => {
    logsAbortRef.current?.abort();
    const controller = new AbortController();
    logsAbortRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (query) params.set('q', query);
      if (filterAction) params.set('action', filterAction);
      if (filterDateFrom) params.set('from', filterDateFrom);
      if (filterDateTo) params.set('to', filterDateTo);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (controller.signal.aborted) return;
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Failed to fetch audit logs:', err);
    } finally {
      if (logsAbortRef.current === controller) setLoading(false);
    }
  }, [page, debouncedSearchQuery, filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fetchPoLogs = useCallback(async (query: string = debouncedPoSearch) => {
    poAbortRef.current?.abort();
    const controller = new AbortController();
    poAbortRef.current = controller;
    setPoLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(poPage));
      params.set('limit', '30');
      if (query) params.set('q', query);
      if (poFilterStatus) params.set('status', poFilterStatus);
      if (poFilterCompany) params.set('companyCode', poFilterCompany);

      const res = await fetch(`/api/integrations/d365/po-logs?${params.toString()}`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (controller.signal.aborted) return;
        setPoLogs(data.logs || []);
        setPoTotal(data.total || 0);
        setPoSuccessCount(data.successCount || 0);
        setPoFailedCount(data.failedCount || 0);
        setPoTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Failed to fetch D365 PO logs:', err);
    } finally {
      if (poAbortRef.current === controller) setPoLoading(false);
    }
  }, [poPage, debouncedPoSearch, poFilterStatus, poFilterCompany]);

  useEffect(() => {
    if (activeTab === 'po-interface') {
      fetchPoLogs();
    }
  }, [activeTab, fetchPoLogs]);

  useEffect(() => () => {
    logsAbortRef.current?.abort();
    poAbortRef.current?.abort();
  }, []);

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
    fetchLogs(searchQuery);
  };

  const actionDropdownOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: 'ทั้งหมด', icon: Filter },
    ...Object.entries(ACTION_CONFIG).map(([key, val]) => ({
      value: key,
      label: val.label,
      icon: val.icon as any,
    })),
  ], []);

  const roleDropdownOptions: DropdownOption[] = useMemo(() => [
    { value: '', label: 'ทั้งหมด', icon: Shield },
    { value: 'MASTER', label: 'Master (สูงสุด)', dot: '#8b5cf6', badge: 'Master', badgeClass: 'bg-violet-100 text-violet-700' },
    { value: 'ADMIN', label: 'Admin (บริษัท)', dot: '#3b82f6', badge: 'Admin', badgeClass: 'bg-blue-100 text-blue-700' },
    { value: 'BRANCH', label: 'Branch (สาขา)', dot: '#f59e0b', badge: 'Branch', badgeClass: 'bg-amber-100 text-amber-700' },
    { value: 'SUPPLIER', label: 'Supplier (คู่ค้า)', dot: '#10b981', badge: 'Supplier', badgeClass: 'bg-emerald-100 text-emerald-700' },
  ], []);

  const formatJsonPretty = (raw: string | null) => {
    if (!raw) return '-';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Audit & Interface Logs</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {activeTab === 'audit'
                ? `ประวัติการใช้งานระบบ • ${total.toLocaleString()} รายการ`
                : `ประวัติการยิงเปิด PO ไปยัง D365 • ${poTotal.toLocaleString()} ครั้ง (สำเร็จ ${poSuccessCount} / ล้มเหลว ${poFailedCount})`}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('po-interface')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'po-interface'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Log เชื่อมต่อ PO (D365)</span>
          </button>
        </div>
      </div>

      {activeTab === 'po-interface' ? (
        <div className="flex flex-col gap-4">
          {/* PO Interface Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={poSearchQuery}
                onChange={(e) => {
                  setPoSearchQuery(e.target.value);
                  setPoPage(1);
                }}
                placeholder="ค้นหาเลขใบงาน, เลข PO, รหัส Vendor, VIN, ข้อความ Error..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:outline-none bg-white"
                style={{ ['--tw-ring-color' as any]: theme.primary }}
              />
            </div>
            <select
              value={poFilterStatus}
              onChange={(e) => {
                setPoFilterStatus(e.target.value);
                setPoPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700"
            >
              <option value="">ทุกสถานะ ({poTotal})</option>
              <option value="SUCCESS">สำเร็จ (SUCCESS)</option>
              <option value="FAILED">ล้มเหลว (FAILED)</option>
            </select>
            <select
              value={poFilterCompany}
              onChange={(e) => {
                setPoFilterCompany(e.target.value);
                setPoPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-700"
            >
              <option value="">ทุกสาขา (Company)</option>
              {['GI', 'GI01', 'GI02', 'GI03', 'GI04', 'GI05', 'GI06', 'GI07', 'GI08', 'GI09', 'GI10', 'GI11', 'GI12'].map((code) => (
                <option key={code} value={code}>
                  สาขา {code}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchPoLogs(poSearchQuery)}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${poLoading ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>

          {poLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 opacity-40" />
              <p className="text-sm font-medium">กำลังโหลด D365 PO Interface Logs...</p>
            </div>
          ) : poLogs.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white/60 rounded-3xl border border-gray-100">
              <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-600">ไม่พบประวัติการส่ง PO</p>
              <p className="text-xs text-gray-400 mt-1">ยังไม่มีรายการยิง Interface PO ที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {poLogs.map((item) => {
                const isSuccess = item.status === 'SUCCESS';
                const isExpanded = expandedPoLogId === item.id;
                const triggerLabel =
                  item.trigger === 'MANUAL_RETRY'
                    ? 'กดส่งซ้ำ (Manual Retry)'
                    : item.trigger === 'ODATA_RECOVERY'
                    ? 'กู้คืน PO จาก D365 OData'
                    : 'อนุมัติงานอัตโนมัติ';

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-white border transition-all overflow-hidden ${
                      isSuccess ? 'border-gray-100 hover:border-emerald-200' : 'border-red-100 hover:border-red-200'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedPoLogId(isExpanded ? null : item.id)}
                      className="p-3.5 cursor-pointer flex items-start gap-3"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="font-mono text-xs font-black text-gray-900">
                            {item.jobNumber}
                          </span>
                          {item.purchId && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              PO: {item.purchId}
                            </span>
                          )}
                          {item.companyCode && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {item.companyCode}
                            </span>
                          )}
                          {item.vendorAccount && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Vendor: {item.vendorAccount}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.createdAt)}
                            {item.durationMs != null && ` • ${(item.durationMs / 1000).toFixed(2)}s`}
                          </span>
                        </div>

                        <p
                          className={`text-xs sm:text-sm font-semibold leading-snug ${
                            isSuccess ? 'text-gray-800' : 'text-red-700'
                          }`}
                        >
                          {item.message || '-'}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                          <span>Supplier: <strong>{item.supplierName || '-'}</strong></span>
                          {item.vin && <span className="font-mono">VIN: {item.vin}</span>}
                          {item.amount != null && (
                            <span>ยอดเงิน: <strong>฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></span>
                          )}
                          <span>ช่องทาง: {triggerLabel}</span>
                          {item.actorName && <span>ผู้สั่ง: {item.actorName}</span>}
                        </div>
                      </div>

                      <div className="text-gray-400 pt-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50/80 border-t border-gray-100 text-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="font-bold text-gray-600 mb-1">
                              Request Payload (ส่งไป D365){item.requestUrl ? ` • ${item.requestUrl}` : ''}
                            </div>
                            <pre className="p-2.5 rounded-xl bg-gray-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-60">
                              {formatJsonPretty(item.requestPayload)}
                            </pre>
                          </div>
                          <div>
                            <div className="font-bold text-gray-600 mb-1">
                              Response Body (ตอบกลับจาก D365){item.httpStatus ? ` • HTTP ${item.httpStatus}` : ''}
                            </div>
                            <pre className="p-2.5 rounded-xl bg-gray-900 text-amber-200 font-mono text-[11px] overflow-x-auto max-h-60">
                              {formatJsonPretty(item.responseBody)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {poTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPoPage((p) => Math.max(1, p - 1))}
                disabled={poPage <= 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-gray-600 px-3">
                หน้า {poPage} / {poTotalPages}
              </span>
              <button
                onClick={() => setPoPage((p) => Math.min(poTotalPages, p + 1))}
                disabled={poPage >= poTotalPages}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
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
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  showFilters ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>ตัวกรอง</span>
              </button>
            </form>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ประเภท Action</label>
                  <CustomDropdown
                    value={filterAction}
                    onChange={v => { setFilterAction(v); setPage(1); }}
                    options={actionDropdownOptions}
                    icon={Filter}
                    dropdownWidth="w-full sm:w-[240px]"
                    placeholder="ทั้งหมด"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Role</label>
                  <CustomDropdown
                    value={filterRole}
                    onChange={v => { setFilterRole(v); setPage(1); }}
                    options={roleDropdownOptions}
                    icon={Shield}
                    dropdownWidth="w-full sm:w-[220px]"
                    placeholder="ทั้งหมด"
                  />
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
        </>
      )}
    </div>
  );
}
