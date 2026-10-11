'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mail, Lock, User, CheckCircle2, Activity, ShieldCheck, 
  Eye, Sparkles, ArrowLeft, Shield, Check, X, Plus
} from 'lucide-react';

function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

import { useAuth } from '@/context/AuthContext';

interface SystemAccount {
  name: string;
  email: string;
  avatarText: string;
  role: string;
  provider: 'google' | 'microsoft';
}

const SYSTEM_GOOGLE_ACCOUNTS: SystemAccount[] = [
  {
    name: 'Samala',
    email: 'samal@gmail.com',
    avatarText: 'S',
    role: 'Verified Google Account',
    provider: 'google'
  },
  {
    name: 'Dr. Vikram Sharma',
    email: 'dr.sharma.med@gmail.com',
    avatarText: 'V',
    role: 'Clinical Healthcare Specialist',
    provider: 'google'
  }
];

const SYSTEM_MICROSOFT_ACCOUNTS: SystemAccount[] = [
  {
    name: 'Samala',
    email: 'samal@outlook.com',
    avatarText: 'S',
    role: 'Microsoft Work & Personal Account',
    provider: 'microsoft'
  },
  {
    name: 'Dr. Ananya Reddy',
    email: 'ananya.reddy@phc.telangana.gov.in',
    avatarText: 'A',
    role: 'Health Organization Account',
    provider: 'microsoft'
  }
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const redirectTarget = searchParams.get('redirect') || '/chat';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authStepMessage, setAuthStepMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // SSO Modals State
  const [ssoProvider, setSsoProvider] = useState<'google' | 'microsoft' | null>(null);
  const [customEmailMode, setCustomEmailMode] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<SystemAccount | null>(null);
  const [isSsoRedirecting, setIsSsoRedirecting] = useState(false);
  const [ssoRedirectMessage, setSsoRedirectMessage] = useState('');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@hospital.org).');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Password must be at least 4 characters for security.');
      return;
    }

    setIsLoading(true);
    setAuthStepMessage('Generating clinical user credentials...');

    setTimeout(() => {
      setAuthStepMessage('Provisioning secure medical record repository...');
      setTimeout(() => {
        const user = {
          email: cleanEmail,
          name: cleanName.toLowerCase().startsWith('dr') ? cleanName : `Dr. ${cleanName}`,
          role: 'Registered Healthcare User',
          provider: 'email',
          facility: 'Clinical Diagnostics Network'
        };

        login(user, true);
        setIsLoading(false);
        setAuthStepMessage('');
        showToast(`Welcome to DR. DOOM, ${user.name}`);
        setTimeout(() => router.replace(redirectTarget), 400);
      }, 350);
    }, 350);
  };

  // Demo Access
  const handleDemoAccess = () => {
    setIsLoading(true);
    setAuthStepMessage('Provisioning Instant Demo Physician Session...');

    setTimeout(() => {
      const demoUser = {
        email: 'demo.physician@doom-med.ai',
        name: 'Dr. Guest Physician (Demo)',
        role: 'Clinical Evaluation Specialist',
        provider: 'demo',
        facility: 'DR. DOOM Virtual Clinical Lab'
      };

      login(demoUser, true);
      setIsLoading(false);
      setAuthStepMessage('');
      showToast('Logged in with Instant Demo Access');
      setTimeout(() => router.replace(redirectTarget), 350);
    }, 450);
  };

  // Open Real SSO Account Selector
  const openAccountChooser = (provider: 'google' | 'microsoft') => {
    setSsoProvider(provider);
    setCustomEmailMode(false);
    setCustomEmailInput('');
    setSelectedAccount(null);
    setIsSsoRedirecting(false);
    setSsoRedirectMessage('');
  };

  // Select Account from System Google / Microsoft Mails
  const handleSelectAccount = (acc: SystemAccount) => {
    setSelectedAccount(acc);
    setIsSsoRedirecting(true);
    setSsoRedirectMessage(`Registering with ${acc.provider === 'google' ? 'Google' : 'Microsoft'} Account (${acc.email})...`);

    setTimeout(() => {
      setSsoRedirectMessage('OAuth Verified. Provisioning workspace and redirecting...');
      setTimeout(() => {
        const user = {
          email: acc.email,
          name: acc.name.toLowerCase().startsWith('dr') ? acc.name : `Dr. ${acc.name}`,
          role: acc.role || 'Clinical Healthcare User',
          provider: acc.provider,
          facility: acc.provider === 'google' ? 'Google Health Cloud Network' : 'Microsoft Azure Health Institute'
        };

        login(user, true);
        setIsSsoRedirecting(false);
        setSsoProvider(null);
        showToast(`Account registered via ${acc.email}`);
        setTimeout(() => router.replace(redirectTarget), 400);
      }, 450);
    }, 450);
  };

  // Custom Mail Submit
  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = customEmailInput.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@') || !cleanMail.includes('.')) {
      return;
    }

    setIsSsoRedirecting(true);
    setSsoRedirectMessage(`Registering ${ssoProvider === 'google' ? 'Google' : 'Microsoft'} Account (${cleanMail})...`);

    setTimeout(() => {
      setSsoRedirectMessage('Granting secure access & redirecting to MED AI...');
      setTimeout(() => {
        const namePart = cleanMail.split('@')[0].replace(/[._-]/g, ' ');
        const formattedName = namePart
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');

        const user = {
          email: cleanMail,
          name: `Dr. ${formattedName}`,
          role: ssoProvider === 'google' ? 'Verified Google User' : 'Microsoft 365 User',
          provider: ssoProvider || 'google',
          facility: 'Clinical Diagnostics Network'
        };

        login(user, true);
        setIsSsoRedirecting(false);
        setSsoProvider(null);
        showToast(`Registered as ${cleanMail}`);
        setTimeout(() => router.replace(redirectTarget), 400);
      }, 450);
    }, 450);
  };

  return (
    <div className="min-h-screen w-full bg-[#071311] text-[#172B3A] font-sans flex flex-col justify-between selection:bg-[#E8F6F2] selection:text-[#087F72] relative overflow-hidden" suppressHydrationWarning>
      
      {/* Cinematic Emerald & Gold Architectural Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/login-bg.webp'), url('/login-bg.jpg')",
        }}
        aria-hidden="true"
      >
        {/* Subtle dark gradient overlay for optimal text contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071311]/85 via-[#0A1A16]/75 to-[#040C0B]/90 backdrop-blur-[1px]" />
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-[#172B3A] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="w-full border-b border-white/10 bg-[#071311]/70 backdrop-blur-md px-6 sm:px-12 py-4 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white border border-white/20 p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Dr. Doom Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white drop-shadow-sm">
                  DR. DOOM
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#087F72]/30 text-[#2DD4BF] border border-[#2DD4BF]/30 px-2 py-0.5 rounded-full">
                  MED AI
                </span>
              </div>
            </div>
          </Link>

          {/* Secure Clinical Badge & Home Return */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#2DD4BF] bg-[#087F72]/20 border border-[#2DD4BF]/30 px-3 py-1.5 rounded-full backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" />
              <span>256-Bit SSL End-to-End Encrypted</span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-[#CBD5E1] hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
          
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F6F2] border border-[#087F72]/20 mx-auto flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#087F72]" />
            </div>
            <h1 className="text-2xl font-black text-[#172B3A] tracking-tight">
              Create an Account
            </h1>
            <p className="text-xs text-[#64748B]">
              Register for personal, clinic, or hospital clinical health MED AI.
            </p>
          </div>

          {/* Demo Instant Access */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#E8F6F2] hover:bg-[#d8f2eb] border border-[#087F72]/30 text-[#087F72] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#087F72]" />
              <span>Try Instant Demo Usage (No Account Required)</span>
            </button>
          </div>

          {/* Social Sign-in Buttons */}
          <div className="space-y-2.5 mb-6">
            <button
              type="button"
              onClick={() => openAccountChooser('google')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:border-[#4285F4] hover:bg-[#F8FAFC] font-semibold text-xs text-[#172B3A] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign up with Google Account</span>
            </button>

            <button
              type="button"
              onClick={() => openAccountChooser('microsoft')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:border-[#0078D4] hover:bg-[#F8FAFC] font-semibold text-xs text-[#172B3A] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f3" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>Sign up with Microsoft 365</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-[#E2E8F0]"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-[#64748B] uppercase tracking-widest">or register with email</span>
            <div className="flex-grow border-t border-[#E2E8F0]"></div>
          </div>

          {/* Validation Alert */}
          {errorMessage && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172B3A] mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Dr. Rajesh Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl text-xs text-[#172B3A] placeholder-[#64748B] outline-none focus:border-[#087F72] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#172B3A] mb-1.5">
                Work or Personal Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="doctor@hospital.org"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl text-xs text-[#172B3A] placeholder-[#64748B] outline-none focus:border-[#087F72] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#172B3A] mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F5F8FA] border border-[#E2E8F0] rounded-xl text-xs text-[#172B3A] placeholder-[#64748B] outline-none focus:border-[#087F72] focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#64748B] hover:text-[#172B3A] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim() || !fullName.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-[#087F72] hover:bg-[#06695F] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin text-white" />
                  <span>{authStepMessage || 'Registering Account...'}</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#64748B] mt-6 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-[#087F72] font-bold hover:underline">
              Sign In
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-center gap-2 text-[11px] text-[#64748B]">
            <Shield className="w-3.5 h-3.5 text-[#087F72]" />
            <span>HIPAA Compliant & SOC2 Type II Certified Session</span>
          </div>

        </div>
      </main>

      {/* Realistic System Account Chooser Modal */}
      {ssoProvider && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D14]/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!isSsoRedirecting) setSsoProvider(null);
          }}
        >
          <div 
            className="bg-[#FFFFFF] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-5">
              <div className="flex items-center gap-3">
                {ssoProvider === 'google' ? (
                  <div className="w-10 h-10 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-xs">
                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f3" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-[#172B3A] tracking-tight">
                    {ssoProvider === 'google' ? 'Choose a Google Account' : 'Pick a Microsoft Account'}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    to register for <strong className="text-[#087F72]">DR. DOOM MED AI</strong>
                  </p>
                </div>
              </div>

              {!isSsoRedirecting && (
                <button
                  type="button"
                  onClick={() => setSsoProvider(null)}
                  className="w-8 h-8 rounded-full bg-[#F5F8FA] hover:bg-[#E2E8F0] text-[#64748B] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Redirecting State */}
            {isSsoRedirecting ? (
              <div className="py-8 text-center space-y-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-[#E8F6F2] border border-[#087F72]/30 flex items-center justify-center mx-auto shadow-sm">
                  <Activity className="w-7 h-7 text-[#087F72] animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#172B3A]">
                    {selectedAccount?.email || customEmailInput}
                  </h4>
                  <p className="text-xs text-[#087F72] font-semibold animate-pulse">
                    {ssoRedirectMessage}
                  </p>
                </div>
              </div>
            ) : (
              /* Account Chooser List */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#64748B] mb-2">
                  System Accounts Found:
                </p>

                {(ssoProvider === 'google' ? SYSTEM_GOOGLE_ACCOUNTS : SYSTEM_MICROSOFT_ACCOUNTS).map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] hover:border-[#087F72] hover:bg-[#F8FAFC] transition-all text-left cursor-pointer group shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#087F72] to-[#2DD4BF] text-white font-bold flex items-center justify-center shadow-xs shrink-0 text-sm">
                        {acc.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#172B3A] group-hover:text-[#087F72] transition-colors truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate font-medium">
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      Signed in
                    </span>
                  </button>
                ))}

                {/* Use Another Account Option */}
                {!customEmailMode ? (
                  <button
                    type="button"
                    onClick={() => setCustomEmailMode(true)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-[#CBD5E1] hover:border-[#087F72] hover:bg-[#F8FAFC] transition-all text-left cursor-pointer text-xs font-bold text-[#172B3A] hover:text-[#087F72]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F5F8FA] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] shrink-0">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span>Use another {ssoProvider === 'google' ? 'Google' : 'Microsoft'} Account</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomEmailSubmit} className="pt-2 space-y-3 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-[#172B3A] mb-1">
                        Enter your {ssoProvider === 'google' ? 'Gmail' : 'Microsoft Email'}:
                      </label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={customEmailInput}
                        onChange={e => setCustomEmailInput(e.target.value)}
                        placeholder={ssoProvider === 'google' ? 'user@gmail.com' : 'user@outlook.com'}
                        className="w-full px-3.5 py-2.5 bg-[#F5F8FA] border border-[#CBD5E1] focus:border-[#087F72] focus:bg-white rounded-xl text-xs text-[#172B3A] outline-none font-medium transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!customEmailInput.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-[#087F72] hover:bg-[#06695F] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Authorize & Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomEmailMode(false)}
                        className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] text-[#64748B] text-xs font-bold hover:bg-[#F5F8FA] cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}

                <div className="pt-3 text-[11px] text-[#64748B] leading-relaxed text-center border-t border-[#E2E8F0] mt-3">
                  Selecting an account will securely connect and register your session to DR. DOOM MED AI.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-white/10 py-4 text-center text-xs text-[#94A3B8] font-medium bg-[#040C0B]/80 backdrop-blur-md relative z-10">
        <p className="tracking-wide font-semibold text-[#CBD5E1]">all copyrights are belongs to team doom</p>
      </footer>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-white flex items-center justify-center">
          <Activity className="w-8 h-8 text-[#087F72] animate-pulse" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
