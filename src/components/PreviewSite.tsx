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
  const vars = useMemo<React.CSSProperties>(() => {
    const contrastBg =
      prefs.contrast === 'maximum' ? '#0a0a0a' : prefs.contrast === 'high' ? '#111827' : '#1f2937';

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
      '--pv-contrast-bg': contrastBg,

      // link affordance
      '--pv-link-decoration': prefs.underlineLinks ? 'underline' : 'none',
    } as React.CSSProperties;
  }, [prefs]);

  // —— Refs for frame (fixed) and canvas (scaled)
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [appliedScale, setAppliedScale] = useState(1);

  // —— Compact sizing
  const compact = variant === 'compact';
  const maxHeight = compact ? 420 : 680;

  // —— Clamp the scale so the canvas never overflows the frame
  useEffect(() => {
    function recalc() {
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

      // Scale that fits within the frame
      const fitScale = Math.min(frameW / safeW, frameH / safeH);

      // Final scale = min(user zoom, fit-to-frame)
      const nextScale = Math.min(prefs.globalZoom, fitScale);
      setAppliedScale(nextScale);
    }

    recalc();

    // Recalc on resize of either frame or canvas
    const ro = new ResizeObserver(recalc);
    if (frameRef.current) ro.observe(frameRef.current);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recalc);
    };
  }, [prefs.globalZoom]);

  return (
    <div className="space-y-2">
      {/* FRAME — fixed container that never scales */}
      <div
        ref={frameRef}
        className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm overflow-hidden mx-auto"
        style={{
            ...vars,
            maxHeight,
            width: '100%',
            minWidth: '500px',
            maxWidth: '900px', // ⬅️ Increase width here
        }}
      >
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
          }}
        >
          {/* Header row */}
          <div
            className="rounded-xl px-3 py-2 text-white"
            style={{ background: 'linear-gradient(90deg, var(--pv-contrast-bg), #312e81)' }}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold tracking-wide">Preview</div>
              {prefs.handsFreeMode && (
                <button className="pv-button bg-white/20 text-white">🎤 Voice Mode</button>
              )}
            </div>
          </div>

          {/* Top nav */}
          <div className="mt-2 flex flex-wrap" style={{ gap: 'var(--pv-gap)' }}>
            {['Home', 'Catalog', 'Orders', 'Support'].map((t, i) => (
              <a
                key={t}
                href="#"
                className="rounded-md px-2 py-1 text-slate-900 hover:bg-slate-100 focus:bg-slate-100"
                style={{ textDecoration: 'var(--pv-link-decoration)', outline: 'none' }}
              >
                {t}
                {i < 3 ? ' ›' : ''}
              </a>
            ))}
          </div>

          {/* Content row */}
          <div className={`mt-2 grid ${prefs.hideDistractingUI ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
            {/* Main card */}
            <div className={prefs.hideDistractingUI ? '' : 'col-span-2'}>
              <div className="rounded-xl border border-slate-300 p-3">
                <div className="text-slate-900 font-semibold">Featured Product</div>
                <p className="mt-1 text-slate-800">
                  Text size, letter spacing, line height, and link style are reflected here.{' '}
                  <a href="#" style={{ textDecoration: 'var(--pv-link-decoration)' }}>
                    Learn more
                  </a>
                  .
                </p>

                {/* Buttons row */}
                <div className="pv-row mt-2 flex flex-wrap" style={{ gap: 'var(--pv-row-gap)' }}>
                  <button className="pv-button bg-slate-900 text-white">Primary</button>
                  <button className="pv-button border border-slate-300 bg-white text-slate-900">Secondary</button>
                  <button className="pv-button bg-white text-slate-900" style={{ border: '2px dashed #cbd5e1' }}>
                    Outline
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="mt-2 rounded-xl border border-slate-300 p-3">
                <div className="text-slate-900 font-semibold">Filters</div>
                <input
                  className="pv-input mt-2 w-full rounded-lg border border-slate-300 text-slate-900 placeholder-slate-500"
                  placeholder="Search products…"
                />
                <div className="mt-2 flex flex-wrap" style={{ gap: 'var(--pv-gap)' }}>
                  {['Small', 'Medium', 'Large'].map((lbl) => (
                    <label key={lbl} className="flex items-center gap-2">
                      <input type="checkbox" className="h-5 w-5" />
                      <span className="text-slate-900">{lbl}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* High-contrast area */}
              {prefs.contrast !== 'normal' && (
                <div className="mt-2 rounded-xl p-3 text-white" style={{ background: 'var(--pv-contrast-bg)' }}>
                  <div className="font-semibold">High Contrast</div>
                  <p>Buttons and inputs remain readable in this block.</p>
                  <div className="pv-row mt-2 flex flex-wrap" style={{ gap: 'var(--pv-row-gap)' }}>
                    <button className="pv-button bg-white text-slate-900">Action</button>
                    <button className="pv-button bg-white/20 text-white" style={{ outline: 'var(--pv-focus)' }}>
                      Focused
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar (hidden if “hide distractions” on) */}
            {!prefs.hideDistractingUI && (
              <aside className="rounded-xl border border-slate-300 p-3">
                <div className="text-slate-900 font-semibold">Sidebar</div>
                <ul className="mt-1 space-y-1">
                  <li>
                    <a href="#" style={{ textDecoration: 'var(--pv-link-decoration)' }}>
                      Trending #1
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{ textDecoration: 'var(--pv-link-decoration)' }}>
                      Trending #2
                    </a>
                  </li>
                  <li>
                    <a href="#" style={{ textDecoration: 'var(--pv-link-decoration)' }}>
                      Trending #3
                    </a>
                  </li>
                </ul>
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Style scope — minimal and consistent */}
      <style jsx>{`
        /* Global motion control inside preview */
        div :global(*) {
          transition: ${prefs.reduceMotion ? 'none' : 'all 160ms ease'};
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
          div :global(li) {
            font-variation-settings: "wght" 520;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
        `
          : ''}
      `}</style>
    </div>
  );
}