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
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);

  const companyOptions: { value: 'ALL' | 'EV7' | 'GI'; label: string; color: string; dot: string }[] = [
    { value: 'ALL', label: 'ทุกบริษัท', color: '#0f5238', dot: '#52b788' },
    { value: 'EV7', label: 'EV7', color: '#0f5238', dot: '#2d6a4f' },
    { value: 'GI', label: 'GI Fleet', color: '#1e3a5f', dot: '#3b82f6' },
  ];
  const activeCompanyOption = companyOptions.find(o => o.value === currentCompany) || companyOptions[0];

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
        {currentRole === 'MASTER' && (
        <div
          className="hidden sm:flex items-center p-1 rounded-full border shadow-xs transition-colors duration-300"
          style={{ backgroundColor: theme.bgSoft, borderColor: theme.borderSoft }}
        >
          {(['MASTER', 'SUPPLIER'] as UserRole[]).map((role) => {
            const isActive = currentRole === role;
            const labels: Record<string, string> = {
              MASTER: 'Master',
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
                    router.push('/vendor');
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
        )}

        {/* Company & Branch Selector Dropdown — only MASTER can switch */}
        {currentRole === 'MASTER' && (
          <div className="hidden md:flex items-center relative">
            {/* Trigger Button */}
            <button
              onClick={() => setIsCompanyOpen(!isCompanyOpen)}
              onBlur={() => setTimeout(() => setIsCompanyOpen(false), 200)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:opacity-90 shadow-sm max-w-[220px]"
              style={{ backgroundColor: activeCompanyOption.color }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeCompanyOption.dot }} />
              <span className="truncate">
                {currentBranchId && currentCompany !== 'ALL'
                  ? branches.find(b => b.id === currentBranchId)?.name || activeCompanyOption.label
                  : activeCompanyOption.label
                }
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/70 shrink-0 transition-transform duration-200 ${isCompanyOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isCompanyOpen && (
              <div 
                className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-white border border-gray-100 shadow-xl overflow-hidden animate-slide-down z-50"
              >
                {/* ทุกบริษัท option */}
                <button
                  onMouseDown={(e) => { 
                    e.preventDefault(); 
                    setCurrentCompany('ALL');
                    setCurrentBranchId('');
                    setIsCompanyOpen(false); 
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors ${
                    currentCompany === 'ALL'
                      ? 'bg-emerald-50 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                  <span className="flex-1 text-left">ทุกบริษัท</span>
                  {currentCompany === 'ALL' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <div className="h-px bg-gray-100" />

                {/* EV7 & GI with branches */}
                {companyOptions.filter(o => o.value !== 'ALL').map((opt) => {
                  const isCompanySelected = currentCompany === opt.value;
                  const companyBranches = branches.filter(b => (b as typeof b & { companyCode?: string }).companyCode === opt.value);
                  
                  return (
                    <div key={opt.value}>
                      {/* Company header */}
                      <button
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          setCurrentCompany(opt.value);
                          setCurrentBranchId('');
                          setIsCompanyOpen(false); 
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${
                          isCompanySelected
                            ? 'bg-gray-50 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                        <span className="flex-1 text-left">{opt.label}</span>
                        {isCompanySelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                      
                      {/* Branch sub-items */}
                      {companyBranches.map((branch) => (
                        <button
                          key={branch.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCurrentCompany(opt.value);
                            setCurrentBranchId(branch.id);
                            setIsCompanyOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 pl-9 pr-4 py-2 text-[11px] transition-colors ${
                            currentBranchId === branch.id && isCompanySelected
                              ? 'bg-gray-50 text-gray-900 font-semibold'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'
                          }`}
                        >
                          <Building className="w-3 h-3 shrink-0 opacity-50" />
                          <span className="flex-1 text-left truncate">{branch.name}</span>
                          {currentBranchId === branch.id && isCompanySelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </button>
                      ))}
                      
                      <div className="h-px bg-gray-100 last:hidden" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
            {user?.displayName?.charAt(0)?.toUpperCase() || (currentRole === 'MASTER' ? 'M' : currentRole === 'ADMIN' ? 'AD' : currentRole === 'BRANCH' ? 'BR' : 'SP')}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {user?.displayName || (currentRole === 'MASTER' ? 'Master' : currentRole === 'ADMIN' ? 'ผู้ดูแลระบบ' : currentRole === 'BRANCH' ? 'เจ้าหน้าที่สาขา' : 'คู่ค้า Supplier')}
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
