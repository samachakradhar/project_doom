'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, ShieldCheck, Globe, HeartPulse, Sparkles, ArrowRight, PhoneCall, X } from 'lucide-react';

const GOVT_HELPLINES = [
  {
    title: 'National Emergency Service (All-in-One)',
    number: '112',
    tag: 'Emergency',
    desc: 'Unified 24x7 emergency response for Police, Fire, and Immediate Medical Disaster.'
  },
  {
    title: 'National Ambulance Medical Service',
    number: '108',
    tag: 'Ambulance',
    desc: 'Free 24x7 emergency medical transit with trained paramedics across all districts.'
  },
  {
    title: 'National Health Helpline (MOHFW)',
    number: '1075',
    tag: 'Govt Health',
    desc: 'Official Ministry of Health & Family Welfare national tele-health guidance.'
  },
  {
    title: 'Tele-MANAS Mental Health Assistance',
    number: '14416',
    tag: 'Mental Health',
    desc: 'Toll-free 24x7 psychiatric and psychological counselling in 20+ languages.'
  },
  {
    title: 'Ayushman Bharat (ABDM / PM-JAY)',
    number: '14555',
    tag: 'PM-JAY',
    desc: 'National Health Authority support for hospital empanelment and scheme claims.'
  },
  {
    title: 'National Poison Information Centre',
    number: '1800-116-117',
    tag: 'Poison Control',
    desc: 'AIIMS 24-hour national toxicology emergency advisory for accidental ingestion.'
  },
  {
    title: 'Women & Maternal Emergency Helpline',
    number: '181',
    tag: 'Women Safety',
    desc: '24x7 crisis helpline for women, pregnancy emergencies, and maternal support.'
  },
  {
    title: 'Senior Citizen Medical Helpline',
    number: '14567',
    tag: 'Elder Care',
    desc: 'Elder Line 24x7 medical assistance, guidance, and emergency field rescue.'
  }
];

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [showHelplineModal, setShowHelplineModal] = useState(false);

  // Draggable Flying Bot State
  const [botPos, setBotPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingBot, setIsDraggingBot] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });
  const botElemRef = React.useRef<HTMLDivElement>(null);

  // Initialize bot position once mounted
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      setBotPos({
        x: isMobile ? 12 : 28,
        y: isMobile ? 160 : 200,
      });
    }
  }, []);

  // Handle Drag Move & End
  React.useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingBot) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragStartRef.current.moved = true;
      }

      const nextX = Math.max(10, Math.min(window.innerWidth - 170, dragStartRef.current.initialX + deltaX));
      const nextY = Math.max(70, Math.min(window.innerHeight - 220, dragStartRef.current.initialY + deltaY));

      setBotPos({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      if (isDraggingBot) {
        setIsDraggingBot(false);
      }
    };

    if (isDraggingBot) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingBot]);

  const onBotPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentX = botPos?.x ?? 28;
    const currentY = botPos?.y ?? 200;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: currentX,
      initialY: currentY,
      moved: false,
    };
    setIsDraggingBot(true);
  };

  // When returning to the website after having logged in, directly open the chatbot
  // Fresh visits (or explicit homepage clicks via ?fresh=1) remain on the homepage
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fresh') !== '1') {
          router.replace('/chat');
        }
      }
    }
  }, [isAuthenticated, isLoading, router]);

  const handleDoomClick = () => {
    if (isAuthenticated) {
      router.push('/chat');
    } else {
      router.push('/signup');
    }
  };

  const handleBotClick = (e: React.MouseEvent) => {
    if (dragStartRef.current.moved) {
      e.stopPropagation();
      return;
    }
    handleDoomClick();
  };

  return (
    <div className="min-h-screen bg-transparent font-sans selection:bg-emerald-200 relative">

      {/* 
        =========================================================
        THE ANIMATION ENGINE (Silky Smooth, Naturally Paced)
        =========================================================
      */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes smoothDropIn {
          0% {
            transform: translateY(-28px);
            opacity: 0;
            filter: blur(4px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0px);
          }
        }
        @keyframes smoothContentRise {
          0% {
            transform: translateY(32px);
            opacity: 0;
            filter: blur(4px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0px);
          }
        }
        .animate-nav-drop {
          opacity: 0;
          animation: smoothDropIn 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity, filter;
        }
        .animate-content-rise {
          opacity: 0;
          animation: smoothContentRise 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.1s;
          will-change: transform, opacity, filter;
        }
        .animate-hero-badge {
          opacity: 0;
          animation: smoothDropIn 1.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.12s;
        }
        .animate-hero-title {
          opacity: 0;
          animation: smoothContentRise 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.18s;
        }
        .animate-hero-desc {
          opacity: 0;
          animation: smoothContentRise 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.24s;
        }
        .animate-hero-cta {
          opacity: 0;
          animation: smoothContentRise 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.30s;
        }
        .animate-bot-entrance {
          opacity: 0;
          animation: smoothDropIn 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }
        @keyframes flyingDoom {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-16px) rotate(-3deg);
          }
          50% {
            transform: translateY(-8px) rotate(2deg);
          }
          75% {
            transform: translateY(-22px) rotate(-1.5deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        @keyframes thrusterGlow {
          0%, 100% {
            transform: translateX(-50%) scale(0.85);
            opacity: 0.35;
          }
          50% {
            transform: translateX(-50%) scale(1.25);
            opacity: 0.8;
          }
        }
        .animate-flying-doom {
          animation: flyingDoom 3.8s ease-in-out infinite;
        }
        .animate-thruster {
          animation: thrusterGlow 2.2s ease-in-out infinite;
        }
      `}} />

      {/* 
        =========================================================
        TOP NAVBAR (Transparent Background)
        =========================================================
      */}
      <nav className="animate-nav-drop fixed w-full z-50 bg-transparent px-6 md:px-12 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/90 backdrop-blur-md border border-[#E2E8F0] shadow-xs flex items-center justify-center p-0.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Dr. Doom Medical Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B3A] drop-shadow-xs">DR. DOOM</h1>
        </Link>

        {/* Top Right: White Govt Helpline Button & Green Get Started Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHelplineModal(true)}
            className="bg-white hover:bg-[#F5F8FA] text-[#172B3A] border border-[#E2E8F0] hover:border-[#087F72] px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
            title="View 24x7 Government Health & Emergency Helplines"
          >
            <PhoneCall className="w-4 h-4 text-[#087F72] shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">Govt Helplines</span>
          </button>

          <Link
            href="/signin"
            className="bg-[#087F72] hover:bg-[#06695F] text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </nav>

      {/* 
        =========================================================
        GOVERNMENT HEALTHCARE HELPLINES MODAL
        =========================================================
      */}
      {showHelplineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowHelplineModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-[#E2E8F0] relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#E8F6F2] border border-[#087F72]/20 flex items-center justify-center text-[#087F72] shrink-0 shadow-xs">
                  <PhoneCall className="w-5 h-5 text-[#087F72]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#172B3A] tracking-tight">Government Health Helplines</h3>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">Official 24x7 National Emergency & Medical Services Directory (India)</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelplineModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F8FA] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#172B3A] transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Helpline Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {GOVT_HELPLINES.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#F5F8FA] border border-[#E2E8F0] hover:border-[#087F72] hover:bg-[#E8F6F2]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F72] bg-[#E8F6F2] border border-[#087F72]/20 px-2 py-0.5 rounded-md">
                        {item.tag}
                      </span>
                      <span className="text-[11px] font-semibold text-[#087F72] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
                        24x7
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#172B3A] mb-1">{item.title}</h4>
                    <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">{item.desc}</p>
                  </div>
                  <a
                    href={`tel:${item.number.replace(/[^0-9]/g, '')}`}
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-[#087F72] text-[#087F72] hover:text-white border border-[#087F72]/30 hover:border-[#087F72] font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Dial {item.number}</span>
                  </a>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5 text-[#087F72] font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#087F72]" /> Verified Government Toll-Free Lines
              </span>
              <button
                onClick={() => setShowHelplineModal(false)}
                className="text-[#64748B] hover:text-[#172B3A] font-bold px-4 py-1.5 rounded-lg hover:bg-[#F5F8FA] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 
        =========================================================
        TRUE 100% FIXED BACKGROUND (Locked to Viewport, Never Moves)
        =========================================================
      */}
      <div
        className="fixed inset-0 pointer-events-none select-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: "url('/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* 
        =========================================================
        FLYING AGENT BOT (Interactive & Draggable Anywhere on Screen)
        =========================================================
      */}
      <div
        ref={botElemRef}
        onMouseDown={onBotPointerDown}
        onTouchStart={onBotPointerDown}
        onClick={handleBotClick}
        style={{
          left: botPos ? `${botPos.x}px` : '1.5rem',
          top: botPos ? `${botPos.y}px` : '12.5rem',
          touchAction: 'none',
        }}
        className={`animate-bot-entrance fixed z-40 flex flex-col items-center select-none transition-shadow ${
          isDraggingBot ? 'cursor-grabbing scale-105 opacity-95' : 'cursor-grab group'
        }`}
        title="Click and drag anywhere on screen • Click to open Dr. Doom"
      >
        {/* Interactive Floating Speech Bubble / Status Badge */}
        <div className="mb-2 bg-white/95 backdrop-blur-md border border-[#E2E8F0] text-[#172B3A] px-3.5 py-1.5 rounded-full shadow-md text-[11px] font-bold flex items-center gap-1.5 group-hover:scale-105 group-hover:border-[#087F72] transition-all pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#15803D] animate-ping shrink-0" />
          <span className="tracking-tight whitespace-nowrap">
            {isAuthenticated ? "Dr. Doom • Enter Chat" : "Consult Dr. Doom • Sign Up"}
          </span>
          <ArrowRight className="w-3 h-3 text-[#087F72] group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Flying Bot Avatar with smooth floating motion and thruster aura */}
        <div className="relative animate-flying-doom group-hover:scale-110 transition-transform duration-300 pointer-events-none">
          {/* Glowing thruster beneath feet */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-[#087F72]/30 blur-md rounded-full animate-thruster" />

          {/* Transparent Green Dr. Doom Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flying-doom.png"
            alt="Flying Dr. Doom AI Bot"
            className="w-24 sm:w-32 lg:w-36 h-auto drop-shadow-[0_15px_25px_rgba(8,127,114,0.25)] pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Subtitle prompt */}
        <span className="text-[10px] font-bold text-[#087F72] bg-white/95 backdrop-blur-xs border border-[#E2E8F0] px-2 py-0.5 rounded-md mt-1 shadow-xs group-hover:bg-[#087F72] group-hover:text-white transition-colors pointer-events-none">
          {isDraggingBot ? "Dragging Bot..." : isAuthenticated ? "Hold to Drag • Open →" : "Hold to Drag • Sign Up →"}
        </span>
      </div>

      {/* 
        =========================================================
        MAIN CONTENT (Silky Smooth Fade and Slide Up)
        =========================================================
      */}
      <main className="animate-content-rise pt-32 pb-20 px-6 max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">

        {/* HERO SECTION */}
        <div className="mt-12 mb-20">
          <div className="animate-hero-badge inline-flex items-center gap-2 bg-[#E8F6F2] border border-[#087F72]/20 text-[#087F72] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-8">
            <Sparkles className="w-4 h-4 text-[#087F72]" />
            The Future of Personal Healthcare
          </div>

          <h2 className="animate-hero-title text-5xl md:text-7xl font-extrabold text-[#172B3A] mb-8 leading-[1.1] tracking-tight max-w-4xl">
            Destroying Medical Jargon. <br />
            <span className="text-[#087F72]">
              Personalized Health Intelligence.
            </span>
          </h2>

          <p className="animate-hero-desc text-lg md:text-xl text-[#64748B] mb-10 max-w-2xl font-medium leading-relaxed mx-auto">
            Upload messy prescriptions and complex lab reports. Dr. Doom&apos;s Multimodal Vision AI extracts, organizes, and translates your health data into actionable insights instantly.
          </p>

          <div className="animate-hero-cta flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="bg-[#087F72] hover:bg-[#06695F] text-white px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-5 h-5" />
              <span>Launch MED AI Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-[#F5F8FA] text-[#172B3A] border border-[#E2E8F0] px-7 py-3 rounded-full font-bold text-base transition-all cursor-pointer shadow-xs"
            >
              Sign In to Account
            </Link>
          </div>
        </div>

        {/* OUR INTENTION / BLOG SECTION */}
        <section className="w-full bg-[#E8F6F2]/60 border border-[#087F72]/20 rounded-[2.5rem] p-10 md:p-16 shadow-xs relative overflow-hidden mb-24 text-left">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-[#087F72] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-xs">
              <HeartPulse className="w-5 h-5" /> Our Core Intention
            </h3>
            <h4 className="text-3xl md:text-4xl font-black text-[#172B3A] mb-6 leading-tight">
              Healthcare shouldn&apos;t require a medical degree to understand.
            </h4>
            <p className="text-[#64748B] text-lg leading-relaxed mb-8">
              Millions of patients leave clinics confused by illegible prescriptions and terrifying medical jargon. Our mission is to bridge the healthcare literacy gap. We built DR. DOOM to ensure that whether you speak English, Hindi, Telugu, or Tamil, you fully understand your body, your medications, and your path to wellness.
            </p>
          </div>
        </section>

        {/* FEATURES GRID */}
        <div className="w-full text-center mb-12">
          <h3 className="text-3xl font-extrabold text-[#172B3A] mb-12">Powered by Enterprise AI</h3>
          <div className="grid md:grid-cols-3 gap-8 text-left">

            <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:-translate-y-1 transition-transform">
              <div className="bg-[#E8F6F2] w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-[#087F72]/20">
                <Globe className="w-7 h-7 text-[#087F72]" />
              </div>
              <h4 className="text-xl font-bold text-[#172B3A] mb-3">Zero-English Leakage</h4>
              <p className="text-[#64748B] leading-relaxed font-medium">
                Native translations in Telugu, Hindi, Tamil, and Tanglish. We culturally adapt complex medical terms for absolute clarity.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:-translate-y-1 transition-transform">
              <div className="bg-[#E8F6F2] w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-[#087F72]/20">
                <YoutubeIcon className="w-7 h-7 text-[#087F72]" />
              </div>
              <h4 className="text-xl font-bold text-[#172B3A] mb-3">3D Visual Explanations</h4>
              <p className="text-[#64748B] leading-relaxed font-medium">
                Our AI automatically generates specific search queries to embed cinematic 3D medical animations right in your dashboard.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm hover:-translate-y-1 transition-transform">
              <div className="bg-[#E8F6F2] w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-[#087F72]/20">
                <ShieldCheck className="w-7 h-7 text-[#087F72]" />
              </div>
              <h4 className="text-xl font-bold text-[#172B3A] mb-3">Contraindication Alerts</h4>
              <p className="text-[#64748B] leading-relaxed font-medium">
                Our safety engine cross-references your uploaded prescriptions against your health history to flag dangerous drug conflicts instantly.
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* 
        =========================================================
        FOOTER (Team Doom Copyrights)
        =========================================================
      */}
      <footer className="w-full relative z-10 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-md py-6 text-center text-xs text-[#64748B] font-medium">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center text-center">
          <p className="tracking-wide font-semibold text-[#172B3A]">all copyrights are belongs to team doom</p>
        </div>
      </footer>
    </div>
  );
}
