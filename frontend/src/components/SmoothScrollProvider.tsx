'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only initialize smooth scrolling on non-reduced-motion devices
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
      infinite: false,
      prevent: (node) => {
        if (!node) return false;
        // Don't intercept scroll for inner scrollable containers, chat areas, textareas, etc.
        return (
          node.hasAttribute('data-lenis-prevent') ||
          node.classList?.contains('custom-scrollbar') ||
          Boolean(node.closest?.('[data-lenis-prevent]')) ||
          Boolean(node.closest?.('.custom-scrollbar')) ||
          Boolean(node.closest?.('textarea')) ||
          Boolean(node.closest?.('select')) ||
          Boolean(node.closest?.('.overflow-y-auto')) ||
          Boolean(node.closest?.('.overflow-auto'))
        );
      },
    });

    lenisRef.current = lenis;

    let animationFrameId: number;

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  // Pause window-level smooth scrolling on fixed-screen workspace pages so trackpad/mouse wheel works 100% natively
  useEffect(() => {
    if (!lenisRef.current) return;
    if (pathname === '/chat' || pathname === '/copilot') {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [pathname]);

  return <>{children}</>;
}
