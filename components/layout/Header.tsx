'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { UserRole, CompanyCode } from '@/types';
import { 
  Search, 
  Bell, 
  User, 
  Building, 
  Wrench, 
  Shield, 
  Check, 
  ChevronDown,
  Menu,
  X,
  Smartphone,
  LogOut
} from 'lucide-react';

export const Header: React.FC<{ onMobileMenuToggle?: () => void }> = ({ onMobileMenuToggle }) => {
  const router = useRouter();
  const { logout, user } = useAuth();
  const theme = useTheme();
  const {
    currentRole,
    setCurrentRole,
    currentCompany,
    setCurrentCompany,
    currentBranchId,
    setCurrentBranchId,
    currentSupplierId,
    setCurrentSupplierId,
    branches,
    suppliers,
    waitingApprovalCount,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Branches filtered by current company if company selected
  const availableBranches = branches.filter(b => {
    if (currentCompany === 'ALL') return true;
    const compCode = b.code.startsWith('EV7') ? 'EV7' : 'GI';
    return compCode === currentCompany;
  });

  return (
    <header
      className="fixed top-0 left-0 lg:left-72 right-0 h-20 bg-white/95 backdrop-blur-md border-b z-40 px-4 lg:px-8 flex items-center justify-between gap-4 select-none print:hidden transition-colors duration-300"
      style={{ borderColor: theme.borderSoft }}
    >
      {/* Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-gray-700 border border-gray-200 transition-colors duration-200"
          style={{ }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = theme.bgSoft; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: theme.iconColor, opacity: 0.6 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลข VIN / รหัสงาน (Job No.) / ทะเบียนรถ..."
            className="w-full h-10 pl-10 pr-4 rounded-full border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all shadow-xs"
            style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}`; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
          />
        </form>
      </div>

      {/* Control Center & Role Context Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Role Selector Pill */}
        <div
          className="hidden sm:flex items-center p-1 rounded-full border shadow-xs transition-colors duration-300"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          {(['ADMIN', 'BRANCH', 'SUPPLIER'] as UserRole[]).map((role) => {
            const isActive = currentRole === role;
            const labels = {
              ADMIN: 'Admin ส่วนกลาง',
              BRANCH: 'สาขา (Branch)',
              SUPPLIER: 'Supplier คู่ค้า',
            };
            return (
              <button
                key={role}
                onClick={() => {
                  setCurrentRole(role);
                  if (role === 'SUPPLIER') {
                    router.push('/s');
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: theme.primary } : {}}
              >
                {labels[role]}
              </button>
            );
          })}
        </div>

        {/* Company Selector Pill */}
        <div
          className="hidden md:flex items-center p-1 rounded-full border shadow-xs transition-colors duration-300"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          {(['ALL', 'EV7', 'GI'] as const).map((comp) => {
            const isActive = currentCompany === comp;
            // Use specific color for active company button
            const activeColor = comp === 'GI' ? '#1e3a5f' : comp === 'EV7' ? '#0f5238' : theme.primary;
            return (
              <button
                key={comp}
                onClick={() => setCurrentCompany(comp)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: activeColor } : {}}
              >
                {comp === 'ALL' ? 'ทุกบริษัท' : comp}
              </button>
            );
          })}
        </div>

        {/* Branch Selector Dropdown (When Role is BRANCH) */}
        {currentRole === 'BRANCH' && (
          <div className="relative">
            <select
              value={currentBranchId}
              onChange={(e) => setCurrentBranchId(e.target.value)}
              className="text-xs font-semibold py-1.5 pl-3 pr-7 rounded-full border appearance-none cursor-pointer focus:outline-none transition-colors duration-300"
              style={{
                backgroundColor: theme.bgFooter,
                color: theme.textPrimary,
                borderColor: `${theme.primary}33`,
              }}
            >
              {availableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300" style={{ color: theme.iconColor }} />
          </div>
        )}

        {/* Supplier Selector Dropdown (When Role is SUPPLIER) */}
        {currentRole === 'SUPPLIER' && (
          <div className="relative">
            <select
              value={currentSupplierId}
              onChange={(e) => setCurrentSupplierId(e.target.value)}
              className="text-xs font-semibold py-1.5 pl-3 pr-7 rounded-full border appearance-none cursor-pointer focus:outline-none transition-colors duration-300"
              style={{
                backgroundColor: theme.bgFooter,
                color: theme.textPrimary,
                borderColor: `${theme.primary}33`,
              }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300" style={{ color: theme.iconColor }} />
          </div>
        )}

        {/* Mobile Portal Shortcut Button */}
        <Link
          href="/mobile"
          onClick={() => setCurrentRole('SUPPLIER')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border hover:text-white transition-all text-xs font-semibold shadow-xs"
          style={{
            backgroundColor: theme.badgeBg,
            color: theme.textPrimary,
            borderColor: `${theme.primary}22`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = theme.primary;
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = theme.badgeBg;
            (e.currentTarget as HTMLElement).style.color = theme.textPrimary;
          }}
          title="เปิดหน้าจอมือถือสำหรับคนขับ / ช่าง Supplier"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">โหมดมือถือ (Mobile)</span>
        </Link>

        {/* Pending Approval Notification Icon */}
        <button
          onClick={() => router.push('/approvals')}
          className="relative p-2 rounded-full text-gray-600 transition-colors"
          title="งานรอตรวจรับ"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = theme.textPrimary;
            (e.currentTarget as HTMLElement).style.backgroundColor = theme.bgSoft;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '';
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
          }}
        >
          <Bell className="w-5 h-5" />
          {waitingApprovalCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar + Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xs font-semibold text-xs transition-colors duration-300"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})` }}
          >
            {user?.displayName?.charAt(0)?.toUpperCase() || (currentRole === 'ADMIN' ? 'AD' : currentRole === 'BRANCH' ? 'BR' : 'SP')}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {user?.displayName || (currentRole === 'ADMIN' ? 'ผู้ดูแลระบบส่วนกลาง' : currentRole === 'BRANCH' ? 'เจ้าหน้าที่สาขา' : 'คู่ค้า Supplier')}
            </p>
            <p className="text-[11px] text-gray-500">
              {user?.username || (currentCompany === 'ALL' ? 'EV7 & GI Fleet' : currentCompany)}
            </p>
          </div>
          <button
            onClick={logout}
            className="ml-1 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
