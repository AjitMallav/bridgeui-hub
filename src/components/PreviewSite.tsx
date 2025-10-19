'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import type { BridgePreferences } from '@/lib/demoAuth';

type Variant = 'compact' | 'full';

export default function PreviewSite({
  prefs,
  variant = 'compact',
}: {
  prefs: BridgePreferences;
  variant?: Variant;
}) {
  // —— Derive tokens from prefs (single source of truth)
  const vars = useMemo(() => {
    // Enhanced contrast system using shades of existing DubHacks colors
    const contrastSettings = {
      normal: {
        background: '#7dd3f7',      // Original light blue
        text: '#1e2952',             // Original navy text
        accent: '#ffb627',           // Original yellow accent
        navBg: '#ffffff',            // White navigation
        navText: '#1e2952',          // Navy navigation text
        buttonBg: '#ffb627',         // Yellow button
        buttonText: '#1e2952',       // Navy button text
        border: '#e5e7eb',           // Light gray border
      },
      high: {
        background: '#5bb8e8',      // Darker blue for more contrast
        text: '#0f1a2e',             // Darker navy for better readability
        accent: '#e6a500',           // Darker yellow for better contrast
        navBg: '#f8fafc',            // Very light gray navigation
        navText: '#0f1a2e',          // Darker navy navigation text
        buttonBg: '#e6a500',         // Darker yellow button
        buttonText: '#0f1a2e',       // Darker navy button text
        border: '#cbd5e1',           // Darker gray border
      },
      maximum: {
        background: '#3b82f6',      // Much darker blue for maximum contrast
        text: '#ffffff',            // White text for maximum contrast
        accent: '#fbbf24',           // Brighter yellow for maximum visibility
        navBg: '#1e293b',           // Dark navigation
        navText: '#ffffff',         // White navigation text
        buttonBg: '#fbbf24',         // Bright yellow button
        buttonText: '#1e293b',       // Dark text on bright button
        border: '#64748b',           // Medium gray border
      }
    };

    const contrast = contrastSettings[prefs.contrast];

    const letter = prefs.letterSpacing === 'wide' ? '0.04em' : '0';
    const leading = prefs.lineHeight === 'loose' ? 1.9 : prefs.lineHeight === 'relaxed' ? 1.65 : 1.5;
    const gap = prefs.spacing === 'compact' ? 6 : prefs.spacing === 'relaxed' ? 14 : 10;

    const padY = Math.max(8, Math.floor(prefs.buttonSize / 3));
    const padX = Math.max(12, Math.floor(prefs.buttonSize / 2));
    const focusRing =
      prefs.highVisibilityFocusRing || prefs.focusHighlight
        ? '3px solid #a78bfa'
        : '2px solid #94a3b8';

    return {
      // typography
      '--pv-font-size': `${prefs.fontSize}px`,
      '--pv-letter': letter,
      '--pv-leading': String(leading),

      // spacing
      '--pv-gap': `${gap}px`,
      '--pv-row-gap': prefs.extraButtonGap ? '16px' : '8px',

      // interactive size
      '--pv-btn-pad-y': `${padY}px`,
      '--pv-btn-pad-x': `${padX}px`,
      '--pv-input-pad': prefs.enlargeInteractive ? '14px 16px' : '8px 10px',

      // focus & contrast
      '--pv-focus': focusRing,

      // link affordance
      '--pv-link-decoration': prefs.underlineLinks ? 'underline' : 'none',
      
      // Enhanced contrast colors
      '--pv-bg': contrast.background,
      '--pv-text': contrast.text,
      '--pv-accent': contrast.accent,
      '--pv-nav-bg': contrast.navBg,
      '--pv-nav-text': contrast.navText,
      '--pv-button-bg': contrast.buttonBg,
      '--pv-button-text': contrast.buttonText,
      '--pv-border': contrast.border,
    } as React.CSSProperties;
  }, [prefs]);

  // —— Refs for frame (fixed) and canvas (scaled)
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [appliedScale, setAppliedScale] = useState(1);
  const isUpdatingPreferences = useRef(false);
  const baseScale = useRef(1);

  // —— Compact sizing
  const compact = variant === 'compact';
  const maxHeight = compact ? 420 : 680;

  // —— Preload OpenDyslexic font when dyslexiaFriendly is enabled
  useEffect(() => {
    if (prefs.dyslexiaFriendly) {
      // Preload the font to ensure it's available
      const font = new FontFace('OpenDyslexic', 'url(https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff)');
      font.load().then(() => {
        document.fonts.add(font);
        console.log('OpenDyslexic font loaded successfully');
      }).catch((error) => {
        console.error('Failed to load OpenDyslexic font:', error);
      });
    }
  }, [prefs.dyslexiaFriendly]);

  // —— Clamp the scale so the canvas never overflows the frame
  useEffect(() => {
    function recalc() {
      // Skip recalculation if we're updating preferences
      if (isUpdatingPreferences.current) return;
      
      const frame = frameRef.current;
      const canvas = canvasRef.current;
      if (!frame || !canvas) return;

      // Temporarily remove transform to measure natural size
      const prev = canvas.style.transform;
      canvas.style.transform = 'none';

      const frameW = frame.clientWidth;
      const frameH = frame.clientHeight;
      const { width: naturalW, height: naturalH } = canvas.getBoundingClientRect();

      // Restore previous transform
      canvas.style.transform = prev;

      // Protect against zero width/height
      const safeW = naturalW || 1;
      const safeH = naturalH || 1;

      // Calculate the base scale that fits within the frame
      const baseFitScale = Math.min(frameW / safeW, frameH / safeH);
      
      // Apply global zoom to make content larger
      // The zoom will make elements bigger as the slider moves
      const nextScale = baseFitScale * prefs.globalZoom;
      
      // Store the base scale on first calculation
      if (baseScale.current === 1) {
        baseScale.current = nextScale;
      }
      
      setAppliedScale(nextScale);
    }

    // Only recalc on mount and when globalZoom actually changes
    recalc();

    // Recalc on resize of frame only (not canvas content changes)
    const ro = new ResizeObserver(recalc);
    if (frameRef.current) ro.observe(frameRef.current);
    // Don't observe canvas to prevent zoom on text changes
    window.addEventListener('resize', recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [prefs.globalZoom]); // Only depend on globalZoom, not all prefs

  // —— Handle preference changes without triggering scale recalculation
  useEffect(() => {
    isUpdatingPreferences.current = true;
    const timer = setTimeout(() => {
      isUpdatingPreferences.current = false;
    }, 300); // Longer delay to allow text changes to settle, especially for line height
    
    return () => clearTimeout(timer);
  }, [prefs.fontSize, prefs.letterSpacing, prefs.lineHeight, prefs.dyslexiaFriendly]);

  // —— Separate effect for line height changes to prevent zoom
  useEffect(() => {
    if (prefs.lineHeight) {
      isUpdatingPreferences.current = true;
      const timer = setTimeout(() => {
        isUpdatingPreferences.current = false;
      }, 500); // Extra long delay for line height changes
      
      return () => clearTimeout(timer);
    }
  }, [prefs.lineHeight]);

  return (
    <div className="space-y-2">
      <style jsx global>{`
        /* Load OpenDyslexic font correctly */
        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        @font-face {
          font-family: 'OpenDyslexic';
          src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      {/* FRAME — fixed container that never scales */}
      <div
        ref={frameRef}
        className="rounded-2xl border border-slate-300 overflow-hidden mx-auto"
        style={{
            ...vars,
            maxHeight: maxHeight * prefs.globalZoom,
            width: '100%',
            minWidth: '500px',
            maxWidth: '900px',
            backgroundColor: 'var(--pv-bg)',
            position: 'relative',
            fontFamily: prefs.dyslexiaFriendly ? 'OpenDyslexic, "Comic Sans MS", cursive, sans-serif' : 'inherit',
        }}
        key={`dyslexia-${prefs.dyslexiaFriendly}`}
      >
        {/* DH pattern background - alternating rows */}
        <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.3, zIndex: 0 }}>
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <div 
              key={rowIndex}
              className="absolute w-full flex justify-center"
              style={{ 
                top: `${rowIndex * 12.5}%`,
                left: rowIndex % 2 === 0 ? '0' : '12.5%', // Offset even rows
              }}
            >
              {Array.from({ length: 6 }).map((_, colIndex) => (
                <div 
                  key={`${rowIndex}-${colIndex}`}
                  className="text-white font-bold text-2xl mx-4"
                  style={{ 
                    transform: `rotate(${Math.random() * 20 - 10}deg)`, // Slight random rotation
                  }}
                >
                  DH
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* CANVAS — inner content that scales, always contained */}
        <div
          ref={canvasRef}
          style={{
            transform: `scale(${appliedScale})`,
            transformOrigin: 'top left',
            width: 'max-content',
            fontSize: 'var(--pv-font-size)',
            letterSpacing: 'var(--pv-letter)',
            lineHeight: 'var(--pv-leading)',
            position: 'relative',
            zIndex: 1,
            padding: '1rem',
            paddingTop: '3rem',
          }}
        >
          {/* Header with navigation menu */}
          <div className="rounded-3xl overflow-hidden mb-4">
            <div
              className="flex items-center p-2 rounded-lg backdrop-blur-md bg-white/20 border border-white/30 shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)', // translucent glass effect
                backdropFilter: 'blur(12px)', // Safari support
              }}
            >
              <div className="mr-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded border border-white/30 bg-white/20 backdrop-blur-sm"
                >
                  <span
                    className="font-bold text-xs"
                    style={{ color: 'var(--pv-nav-text)' }}
                  >
                    DH
                  </span>
                </div>
              </div>

              <div className="flex flex-1 justify-between">
                {['Impact', 'Theme', 'Tracks', 'Attend', 'Schedule', 'Sponsor', 'FAQs'].map(
                  (item) => (
                    <a
                      key={item}
                      href="#"
                      className="px-3 py-1 rounded-md transition-colors duration-200"
                      style={{
                        color: 'var(--pv-nav-text)',
                        textDecoration: 'var(--pv-link-decoration)',
                        fontWeight: 500,
                        fontFamily: prefs.dyslexiaFriendly
                          ? 'OpenDyslexic, sans-serif'
                          : 'inherit',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          prefs.contrast === 'maximum'
                            ? 'rgba(51, 51, 51, 0.4)'
                            : prefs.contrast === 'high'
                            ? 'rgba(55, 65, 81, 0.4)'
                            : 'rgba(255, 255, 255, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {item}
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          
          {/* Main content */}
          <div className="mt-8">
            <div className="flex">
              <div className="w-1/2">
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--pv-text)', fontFamily: prefs.dyslexiaFriendly ? 'OpenDyslexic, sans-serif' : 'inherit' }}>
                  DubHacks<br />2025
                </h1>
                <p className="text-lg mb-4" style={{ color: 'var(--pv-text)', fontFamily: prefs.dyslexiaFriendly ? 'OpenDyslexic, sans-serif' : 'inherit' }}>
                  October 18-19, 2025
                </p>
                <p className="text-md mb-6 italic" style={{ color: 'var(--pv-text)', fontFamily: prefs.dyslexiaFriendly ? 'OpenDyslexic, sans-serif' : 'inherit' }}>
                  University of Washington, Seattle
                </p>
                <a 
                  href="#"
                  className="pv-button font-bold px-6 inline-block"
                  style={{ 
                    backgroundColor: 'var(--pv-button-bg)',
                    color: 'var(--pv-button-text)',
                    border: 'none',
                    textDecoration: 'var(--pv-link-decoration)',
                    fontFamily: prefs.dyslexiaFriendly ? 'OpenDyslexic, sans-serif' : 'inherit'
                  }}
                >
                  Sponsor Us
                </a>
              </div>
              <div className="w-1/2">
                {/* Animated Toy Box */}
                <div className="h-40 flex items-center justify-center relative">
                  <div className="relative">
                    {/* Main toy box */}
                    <div className="w-32 h-32 bg-gradient-to-b from-amber-600 to-amber-800 rounded-lg shadow-lg border-2 border-amber-700 relative overflow-hidden">
                      {/* Toy box lid */}
                      <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-amber-500 to-amber-600 rounded-t-lg border-b-2 border-amber-700"></div>
                      
                      {/* Toys inside the box */}
                      <div className="absolute inset-0 p-2">
                        {/* Teddy bear */}
                        <div className="absolute bottom-2 left-2 w-6 h-6 bg-amber-300 rounded-full toy-float" style={{ animationDelay: '0s' }}></div>
                        
                        {/* Ball */}
                        <div className="absolute bottom-4 right-3 w-4 h-4 bg-red-400 rounded-full toy-wiggle" style={{ animationDelay: '1s' }}></div>
                        
                        {/* Block */}
                        <div className="absolute top-4 left-4 w-5 h-5 bg-blue-400 rounded-sm toy-pop" style={{ animationDelay: '2s' }}></div>
                      </div>
                    </div>
                    
                    {/* Toys moving out of the box */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-300 rounded-full toy-float" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-green-400 rounded-full toy-wiggle" style={{ animationDelay: '1.5s' }}></div>
                    <div className="absolute top-4 -left-3 w-5 h-5 bg-yellow-300 rounded-sm toy-pop" style={{ animationDelay: '2.5s' }}></div>
                    <div className="absolute -top-4 left-4 w-4 h-4 bg-purple-400 rounded-full toy-float" style={{ animationDelay: '3s' }}></div>
                    
                    {/* Additional floating toys */}
                    <div className="absolute -right-6 top-8 w-5 h-5 bg-orange-400 rounded-full toy-wiggle" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute -left-6 bottom-8 w-6 h-6 bg-cyan-400 rounded-full toy-float" style={{ animationDelay: '2.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



      </div>

      <style jsx>{`
        /* Global motion control inside preview */
        div :global(*) {
          transition: ${prefs.reduceMotion ? 'none' : 'all 160ms ease'};
        }

        /* Custom toy box animations */
        @keyframes toyFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(2deg); }
          50% { transform: translateY(-4px) rotate(-1deg); }
          75% { transform: translateY(-12px) rotate(1deg); }
        }

        @keyframes toyWiggle {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          25% { transform: translateX(3px) rotate(1deg); }
          50% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(0.5deg); }
        }

        @keyframes toyPop {
          0%, 100% { transform: scale(1) translateY(0px); }
          50% { transform: scale(1.1) translateY(-6px); }
        }

        /* Apply custom animations to toys */
        .toy-float {
          animation: ${prefs.reduceMotion ? 'none' : 'toyFloat 4s ease-in-out infinite'};
        }

        .toy-wiggle {
          animation: ${prefs.reduceMotion ? 'none' : 'toyWiggle 3s ease-in-out infinite'};
        }

        .toy-pop {
          animation: ${prefs.reduceMotion ? 'none' : 'toyPop 2.5s ease-in-out infinite'};
        }

        /* Shared interactive primitives driven by CSS variables */
        div :global(.pv-button) {
          padding: var(--pv-btn-pad-y) var(--pv-btn-pad-x);
          border-radius: 0.75rem; /* xl */
          font-weight: 600;
          outline: none;
        }
        div :global(.pv-button:focus) {
          outline: var(--pv-focus);
          outline-offset: 2px;
        }

        div :global(.pv-input) {
          padding: var(--pv-input-pad);
          outline: none;
        }
        div :global(.pv-input:focus),
        div :global(a:focus) {
          outline: var(--pv-focus);
          outline-offset: 2px;
        }

        /* Dyslexia-friendly text tuning */
        ${prefs.dyslexiaFriendly
          ? `
          div :global(.pv-button),
          div :global(.pv-input),
          div :global(a),
          div :global(p),
          div :global(li),
          div :global(h1),
          div :global(h2),
          div :global(h3),
          div :global(span) {
            font-family: 'OpenDyslexic', "Comic Sans MS", cursive, sans-serif !important;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        `
          : ''}
      `}</style>
    </div>
  );
}