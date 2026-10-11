'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Mail, Phone, CheckCircle2, 
  Languages, Heart, LogOut, 
  ArrowLeft, Check, AlertTriangle, Sparkles, 
  Lock, FileText, RefreshCw, X, UploadCloud
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProfileAvatar } from '@/components/ProfileAvatar';

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout, isLoading } = useAuth();

  // Local state for editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [facility, setFacility] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState('english');
  const [healthPreferences, setHealthPreferences] = useState('');
  const [abhaId, setAbhaId] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(true);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Modal / Feedback state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form from authenticated user
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role || 'Clinical Healthcare Specialist');
      setFacility(user.facility || 'Apollo Health Institute / PHC');
      setPhone(user.phone || '+91 98765 43210');
      setPhoneVerified(user.phoneVerified !== false);
      setPreferredLanguage(user.preferredLanguage || 'english');
      setHealthPreferences(user.healthPreferences || 'Routine CBC monitoring; no known drug allergies (NKDA).');
      setAbhaId(user.abhaId || '91-8493-2948-1092');
      setEmergencyContact(user.emergencyContact || '+91 98480 22338 (Family Primary)');
      setWhatsAppEnabled(user.whatsAppEnabled !== false);
      setWhatsAppPhone(user.whatsAppPhone || user.phone || '+91 98765 43210');
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  // Auth Protection redirect
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signin?redirect=/profile');
    }
  }, [user, isLoading, router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty');
      return;
    }

    updateUser({
      name: name.trim(),
      role: role.trim(),
      facility: facility.trim(),
      phone: phone.trim(),
      phoneVerified,
      preferredLanguage,
      healthPreferences: healthPreferences.trim(),
      abhaId: abhaId.trim(),
      emergencyContact: emergencyContact.trim(),
      whatsAppEnabled,
      whatsAppPhone: whatsAppPhone.trim(),
      avatarUrl,
    });

    setIsEditing(false);
    showToast('Profile updated successfully');
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      updateUser({ avatarUrl: result });
      showToast('Profile photo updated');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(undefined);
    updateUser({ avatarUrl: undefined });
    showToast('Profile photo reset to default monogram');
  };

  // OTP Verification simulation
  const handleVerifyPhone = () => {
    setOtpInput('');
    setOtpError('');
    setShowOtpModal(true);
  };

  const handleConfirmOtp = () => {
    if (otpInput.trim() === '1234' || otpInput.trim().length === 4) {
      setPhoneVerified(true);
      updateUser({ phoneVerified: true, phone });
      setShowOtpModal(false);
      showToast('Mobile number verified successfully');
    } else {
      setOtpError('Invalid OTP. Please enter 1234 for demo verification.');
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F8FA] flex items-center justify-center p-6 text-[#172B3A]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#087F72] animate-spin" />
          <p className="text-sm font-semibold text-[#64748B]">Loading your clinical profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F8FA] text-[#172B3A] font-sans flex flex-col justify-between selection:bg-[#E8F6F2] selection:text-[#087F72]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#172B3A] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#2DD4BF] shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP NAVBAR (Light-only design, consistent with DOOM application) */}
      <header className="w-full border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 sm:px-8 py-3.5 shadow-2xs sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          {/* Brand Logo & Medical Workspace Indicator */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] p-0.5 shadow-2xs overflow-hidden flex items-center justify-center group-hover:border-[#087F72] transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Dr. Doom Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-[#172B3A] leading-tight">
                  DR. DOOM
                </span>
                <span className="text-[10px] text-[#087F72] font-bold uppercase tracking-wider">
                  Clinical Profile
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-flex text-[11px] font-bold text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/20 px-2.5 py-0.5 rounded-full">
              Verified Healthcare ID
            </span>
          </div>

          {/* Navigation Links & Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#172B3A] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors cursor-pointer"
            >
              <span>Home</span>
            </Link>

            <Link
              href="/chat"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172B3A] px-2.5 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#087F72]" />
              <span className="hidden sm:inline">Chatbot Workspace</span>
              <span className="sm:hidden">Chat</span>
            </Link>

            <Link
              href="/records"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#087F72] hover:text-[#06695F] bg-[#E8F6F2] hover:bg-[#d8f2eb] border border-[#087F72]/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#087F72]" />
              <span className="hidden sm:inline">My Medical Records</span>
              <span className="sm:hidden">Records</span>
            </Link>

            {/* Circular Profile Avatar */}
            <div className="pl-1 border-l border-[#E2E8F0]">
              <ProfileAvatar size="md" />
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN PROFILE CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Breadcrumb / Return action */}
        <div className="flex items-center justify-between">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#087F72] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Medical Workspace</span>
          </Link>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 bg-[#087F72] hover:bg-[#06695F] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-[#FFFFFF] hover:bg-[#F5F8FA] text-[#64748B] font-semibold text-xs py-2 px-3.5 rounded-xl border border-[#E2E8F0] shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1.5 bg-[#087F72] hover:bg-[#06695F] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <SaveIcon className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Hero Header Card */}
        <div className="bg-[#FFFFFF] rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="flex items-center gap-5">
              {/* Circular Avatar with Upload overlay */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#E2E8F0] overflow-hidden bg-white shadow-md flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={name || 'User avatar'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#E8F6F2] to-[#CCFBF1] text-[#087F72] font-black text-2xl flex items-center justify-center">
                      {(name || user.name || 'DO').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Upload Action overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile picture"
                  aria-label="Upload profile picture"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#087F72] hover:bg-[#06695F] text-white flex items-center justify-center shadow-md transition-all cursor-pointer border-2 border-white ring-1 ring-[#087F72]/20"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* User Bio Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#172B3A] tracking-tight">
                    {name || user.name || 'Clinical Specialist'}
                  </h1>
                  {phoneVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-[#087F72]" />
                      <span>Verified ID</span>
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-semibold text-[#087F72] flex items-center gap-1.5">
                  <BuildingIcon className="w-3.5 h-3.5 text-[#087F72]" />
                  <span>{role} • {facility}</span>
                </p>

                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>{user.email}</span>
                  <span className="text-[#CBD5E1]">•</span>
                  <span>Auth Provider: <strong className="capitalize">{user.provider || 'email'}</strong></span>
                </p>
              </div>
            </div>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[11px] font-semibold text-[#B91C1C] hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
              >
                Reset photo
              </button>
            )}
          </div>
        </div>

        {/* 3. DETAILED PROFILE SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Personal, Health, & Preferences */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section A: Personal & Professional Details */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <UserIcon className="w-4 h-4 text-[#087F72]" />
                <h3 className="text-sm font-bold text-[#172B3A]">Personal & Healthcare Designation</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-bold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">{name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Email Address</label>
                  <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                    <span>{user.email}</span>
                    <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Professional Role / Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">{role}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Facility / Health Organization</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={facility}
                      onChange={e => setFacility(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">{facility}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section B: Verified Contact & Language Settings */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <Phone className="w-4 h-4 text-[#087F72]" />
                <h3 className="text-sm font-bold text-[#172B3A]">Verified Mobile & Language Preferences</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* Mobile Phone & Verification */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Mobile Number</label>
                    {phoneVerified ? (
                      <span className="text-[10px] font-bold text-[#087F72] flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#087F72]" /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        className="text-[10px] font-bold text-[#D97706] hover:underline cursor-pointer"
                      >
                        Verify with OTP
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => {
                        setPhone(e.target.value);
                        setPhoneVerified(false);
                      }}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                      placeholder="+91 98765 43210"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <span>{phone}</span>
                      <ShieldCheckIcon className="w-4 h-4 text-[#087F72]" />
                    </p>
                  )}
                </div>

                {/* Preferred Consultation Language */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Default Consultation Language</label>
                  {isEditing ? (
                    <select
                      value={preferredLanguage}
                      onChange={e => setPreferredLanguage(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#087F72] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none cursor-pointer"
                    >
                      <option value="english">English</option>
                      <option value="telugu">తెలుగు (Telugu)</option>
                      <option value="hindi">हिन्दी (Hindi)</option>
                      <option value="tamil">தமிழ் (Tamil)</option>
                      <option value="tanglish">Tenglish (Telugu in English)</option>
                    </select>
                  ) : (
                    <p className="font-bold text-[#087F72] bg-[#E8F6F2] p-2.5 rounded-xl border border-[#087F72]/20 capitalize flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-[#087F72]" />
                      <span>{preferredLanguage === 'tanglish' ? 'Tenglish (Telugu in English)' : preferredLanguage}</span>
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Section C: Optional Health Preferences & ABHA Healthcare ID */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <Heart className="w-4 h-4 text-[#087F72]" />
                <h3 className="text-sm font-bold text-[#172B3A]">Health Profile & Clinical Preferences</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">ABHA ID / UHID Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={abhaId}
                      onChange={e => setAbhaId(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">{abhaId}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Emergency Contact</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={e => setEmergencyContact(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0]">{emergencyContact}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Health Notes & Allergies Summary</label>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={healthPreferences}
                      onChange={e => setHealthPreferences(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none resize-none"
                    />
                  ) : (
                    <p className="text-xs text-[#475569] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0] leading-relaxed">
                      {healthPreferences}
                    </p>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT 1 COLUMN: WhatsApp Connection Settings & Account Security / Logout */}
          <div className="space-y-6">
            
            {/* WhatsApp Integration Card */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <MessageSquareIcon className="w-4 h-4 text-[#16A34A]" />
                <h3 className="text-sm font-bold text-[#172B3A]">WhatsApp Connection</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#166534]">Instant Report Delivery</p>
                    <p className="text-[11px] text-[#15803D]">Receive full 8-section reports and audio on WhatsApp</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsAppEnabled}
                      onChange={e => {
                        setWhatsAppEnabled(e.target.checked);
                        updateUser({ whatsAppEnabled: e.target.checked });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CBD5E1] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#16A34A]"></div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Connected WhatsApp Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={whatsAppPhone}
                      onChange={e => setWhatsAppPhone(e.target.value)}
                      className="w-full bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
                    />
                  ) : (
                    <p className="font-semibold text-[#172B3A] bg-[#F5F8FA] p-2.5 rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <span>{whatsAppPhone}</span>
                      <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
                        Connected
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => showToast(`Sample medical verification report dispatched to WhatsApp (${whatsAppPhone})`)}
                  className="w-full bg-[#F5F8FA] hover:bg-[#E8F6F2] hover:text-[#087F72] text-[#64748B] font-semibold text-xs py-2 px-3 rounded-xl border border-[#E2E8F0] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <SmartphoneIcon className="w-3.5 h-3.5" />
                  <span>Test WhatsApp Dispatch</span>
                </button>
              </div>
            </div>

            {/* Account & Security / Logout Card */}
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
                <Lock className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-bold text-[#172B3A]">Account & Security</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-1">
                  <p className="font-bold text-[#991B1B]">Session Security</p>
                  <p className="text-[11px] text-[#B91C1C]">
                    Logging out will terminate this clinical session and clear cached credentials from this browser.
                  </p>
                </div>

                {/* Main Logout Action Button with Confirmation Dialog Trigger */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] hover:text-[#7F1D1D] font-bold text-xs py-2.5 px-4 rounded-xl border border-[#FCA5A5] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <LogOut className="w-4 h-4 text-[#B91C1C]" />
                  <span>Log Out of Account</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 4. CONFIRMATION MODAL BEFORE LOGOUT */}
      {showLogoutModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D14]/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="bg-[#FFFFFF] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E2E8F0] relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#B91C1C] mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#B91C1C]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-[#172B3A] tracking-tight">
                Log Out of Dr. Doom?
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Are you sure you want to log out? You will need to sign in again to access your saved medical consultations and CBC records.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-[#F5F8FA] hover:bg-[#E2E8F0] text-[#172B3A] font-semibold text-xs py-2.5 px-4 rounded-xl border border-[#CBD5E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. OTP VERIFICATION SIMULATION MODAL */}
      {showOtpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D14]/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowOtpModal(false)}
        >
          <div 
            className="bg-[#FFFFFF] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E2E8F0] relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <SmartphoneIcon className="w-4 h-4 text-[#087F72]" />
                <h4 className="text-sm font-bold text-[#172B3A]">Verify Mobile Number</h4>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1 text-[#64748B] hover:text-[#172B3A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Enter the 4-digit code sent to <strong className="text-[#172B3A]">{phone}</strong>. (Demo Code: <strong>1234</strong>)
            </p>

            <div className="space-y-2">
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={e => {
                  setOtpInput(e.target.value);
                  setOtpError('');
                }}
                placeholder="1234"
                className="w-full text-center text-xl font-bold tracking-widest bg-[#F5F8FA] border border-[#CBD5E1] rounded-xl py-2.5 text-[#172B3A] focus:border-[#087F72] focus:ring-1 focus:ring-[#087F72] outline-none"
              />
              {otpError && (
                <p className="text-[11px] font-bold text-[#B91C1C] text-center">{otpError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmOtp}
              className="w-full bg-[#087F72] hover:bg-[#06695F] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Verify OTP
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
