'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, Eye, EyeOff, Truck, Sparkles, ArrowRight, ArrowLeft, Check, Building2, User, Wrench } from 'lucide-react';

interface CheckedUser {
  displayName: string;
  role: string;
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [company, setCompany] = useState('');
  const [username, setUsername] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);
  const [checkedUser, setCheckedUser] = useState<CheckedUser | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Step 2 fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shared
  const [error, setError] = useState('');
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  // Fetch suppliers for login selector
  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => {
        if (data.suppliers) {
          setSuppliers(data.suppliers.map((s: SupplierOption) => ({
            id: s.id,
            code: s.code,
            name: s.name,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-focus password input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => passwordRef.current?.focus(), 300);
    }
  }, [step]);

  // Step 1: Validate username
  const handleNext = async () => {
    setError('');

    if (!company) {
      setError('กรุณาเลือกบริษัท / องค์กรของคุณ');
      return;
    }
    if (!username.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้');
      return;
    }

    setCheckingUser(true);

    try {
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCheckedUser(data.user);
        setSlideDirection('forward');
        setError('');
        setStep(2);
      } else {
        setError(data.error || 'ไม่พบชื่อผู้ใช้นี้ในระบบ');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setCheckingUser(false);
    }
  };

  // Step 2: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // For company codes (EV7/GI), pass as company. For supplier codes, don't pass company.
    const isCompanyCode = company === 'EV7' || company === 'GI';
    const selectedCompany = isCompanyCode ? (company as 'EV7' | 'GI') : undefined;
    const result = await login(username.trim(), password, selectedCompany);

    if (!result.success) {
      setError(result.error || 'รหัสผ่านไม่ถูกต้อง');
    }
    setIsSubmitting(false);
  };

  // Go back to step 1
  const handleBack = () => {
    setSlideDirection('backward');
    setError('');
    setPassword('');
    setStep(1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f9f5]">
        <div className="w-8 h-8 border-4 border-[#0f5238] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f5238] via-[#1a6b4a] to-[#0a3d28] px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
            <div className="flex items-center gap-1">
              <Truck className="w-5 h-5 text-emerald-300" />
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            VendorOps
          </h1>
          <p className="text-emerald-200/80 text-sm mt-1">
            Supplier Job Management — EV7 & GI
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 1 
                ? 'bg-white text-[#0f5238] shadow-lg scale-110' 
                : 'bg-emerald-400 text-white'
            }`}>
              {step === 2 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`text-xs font-medium transition-colors ${step === 1 ? 'text-white' : 'text-emerald-300'}`}>
              ผู้ใช้
            </span>
          </div>

          <div className={`w-12 h-0.5 rounded transition-colors duration-300 ${
            step === 2 ? 'bg-emerald-400' : 'bg-white/20'
          }`} />

          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 2 
                ? 'bg-white text-[#0f5238] shadow-lg scale-110' 
                : 'bg-white/20 text-white/50'
            }`}>
              2
            </div>
            <span className={`text-xs font-medium transition-colors ${step === 2 ? 'text-white' : 'text-white/40'}`}>
              รหัสผ่าน
            </span>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl">
          <div className="relative">
            {/* ── STEP 1: Company + Username ── */}
            <div
              className={`p-8 transition-all duration-400 ease-in-out ${
                step === 1 
                  ? 'opacity-100 translate-x-0' 
                  : slideDirection === 'forward'
                    ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'
                    : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
              }`}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-1">เข้าสู่ระบบ</h2>
              <p className="text-sm text-gray-500 mb-6">ขั้นตอนที่ 1: เลือกองค์กรและกรอกชื่อผู้ใช้</p>

              <div className="space-y-5">
                {/* Organization Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    เลือกองค์กรของคุณ
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className={`w-full h-11 px-3 rounded-xl border text-left text-sm flex items-center gap-2.5 transition-all ${
                        company
                          ? 'border-gray-300 bg-white'
                          : 'border-gray-200 bg-gray-50 text-gray-400'
                      } ${dropdownOpen ? 'ring-2 ring-[#0f5238] border-transparent' : 'hover:border-gray-300'}`}
                    >
                      {company ? (
                        (() => {
                          const isEV7 = company === 'EV7';
                          const isGI = company === 'GI';
                          const sup = suppliers.find(s => s.code === company);
                          return (
                            <>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                                isEV7 ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                                : isGI ? 'bg-gradient-to-br from-blue-600 to-blue-800'
                                : 'bg-gradient-to-br from-amber-500 to-orange-600'
                              }`}>
                                {isEV7 ? 'EV7' : isGI ? 'GI' : <Wrench className="w-3 h-3" />}
                              </div>
                              <span className="text-gray-900 font-medium truncate">
                                {isEV7 ? 'EV7 — อีวี เซเว่น' : isGI ? 'GI — เจเนอรัล อินเทลลิเจนท์' : sup?.name || company}
                              </span>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>— กรุณาเลือก —</span>
                        </>
                      )}
                      <svg className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
                        {/* Companies Group */}
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">บริษัท</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCompany('EV7'); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${company === 'EV7' ? 'bg-emerald-50' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">EV7</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">EV7</p>
                            <p className="text-[10px] text-gray-500">อีวี เซเว่น</p>
                          </div>
                          {company === 'EV7' && <Check className="w-4 h-4 text-emerald-600" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCompany('GI'); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${company === 'GI' ? 'bg-blue-50' : ''}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">GI</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">GI</p>
                            <p className="text-[10px] text-gray-500">เจเนอรัล อินเทลลิเจนท์</p>
                          </div>
                          {company === 'GI' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>

                        {/* Suppliers Group */}
                        {suppliers.length > 0 && (
                          <>
                            <div className="px-3 py-2 border-t border-b border-gray-100">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Supplier / คู่ค้า</p>
                            </div>
                            {suppliers.map(sup => (
                              <button
                                key={sup.code}
                                type="button"
                                onClick={() => { setCompany(sup.code); setDropdownOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${company === sup.code ? 'bg-amber-50' : ''}`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white flex-shrink-0">
                                  <Wrench className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{sup.name}</p>
                                  <p className="text-[10px] text-gray-500">{sup.code}</p>
                                </div>
                                {company === sup.code && <Check className="w-4 h-4 text-amber-600" />}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    ชื่อผู้ใช้ (Username)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                      placeholder="เช่น admin, branch-rm9"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f5238] focus:border-transparent focus:bg-white transition-all"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && step === 1 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 animate-[fadeIn_0.2s_ease-in]">
                    <span>⚠️ {error}</span>
                  </div>
                )}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={checkingUser || !company || !username.trim()}
                  className="w-full h-12 rounded-xl bg-[#0f5238] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0a3d28] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                >
                  {checkingUser ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ถัดไป</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── STEP 2: Password ── */}
            <div
              className={`p-8 transition-all duration-400 ease-in-out ${
                step === 2 
                  ? 'opacity-100 translate-x-0' 
                  : slideDirection === 'forward'
                    ? 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'
                    : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'
              }`}
            >
              {/* User info chip + back button */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0f5238] to-[#52b788] flex items-center justify-center text-white text-[10px] font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-700">{username}</span>
                  <span className="text-gray-400">@</span>
                  <span className={`text-xs font-bold ${company === 'EV7' ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {company}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#0f5238] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>เปลี่ยนผู้ใช้</span>
                </button>
              </div>

              {/* Welcome */}
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                สวัสดี, {checkedUser?.displayName || username}
              </h2>
              <p className="text-sm text-gray-500 mb-6">กรอกรหัสผ่านเพื่อเข้าสู่ระบบ</p>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่าน"
                      className="w-full h-11 px-4 pr-11 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0f5238] focus:border-transparent focus:bg-white transition-all"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && step === 2 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 animate-[fadeIn_0.2s_ease-in]">
                    <span>⚠️ {error}</span>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="w-full h-12 rounded-xl bg-[#0f5238] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0a3d28] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4.5 h-4.5" />
                      <span>เข้าสู่ระบบ</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-emerald-300/50 text-xs mt-6">
          © 2026 VendorOps — Supplier Job Management
        </p>
      </div>
    </div>
  );
}
