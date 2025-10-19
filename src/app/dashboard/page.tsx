"use client";

import { useEffect, useMemo, useState } from 'react';
import BridgePreview from '@/components/PreviewSite';
import { Download, Check, User, HelpCircle, Settings, Eye, Brain, Sliders, InfoIcon } from 'lucide-react';
import {
  requireUserOrRedirect,
  setUser as persistUser,
  logoutUser,
  type DemoUser,
  DEFAULT_PREFS,
  type BridgePreferences
} from "@/lib/demoAuth";

type Tab = 'overview' | 'profile' | 'help';

const CONDITIONS: Array<{
  id: string;
  name: string;
  icon: any;
  description: string;
}> = [
  {
    id: "adhd",
    name: "ADHD",
    icon: Brain,
    description: "Reduce motion, emphasize focus, and hide distractions."
  },
  {
    id: "dyslexia",
    name: "Dyslexia",
    icon: Brain,
    description: "Improve readability with spacing and link affordances."
  },
  {
    id: "low-vision",
    name: "Low Vision",
    icon: Eye,
    description: "Increase contrast, text size, focus visibility, and zoom."
  },
  {
    id: "motor-control",
    name: "Motor Control Difficulties",
    icon: Sliders,
    description: "Bigger targets, extra spacing, dwell-click, hands-free."
  }
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setU] = useState<DemoUser | null>(null);

  useEffect(() => {
    const u = requireUserOrRedirect();
    if (u) {
      // Merge any older user prefs with today's defaults (non-destructive)
      const merged: DemoUser = {
        ...u,
        preferences: { ...DEFAULT_PREFS, ...u.preferences }
      };
      setU(merged);
      persistUser(merged);
    }
  }, []);

  function save(patch: Partial<DemoUser>) {
    if (!user) return;
    const next: DemoUser = {
      ...user,
      ...patch,
      preferences: {
        ...user.preferences,
        ...(patch.preferences ?? {})
      }
    };
    persistUser(next);
    setU(next);
  }

  function toggleCond(id: string) {
    if (!user) return;
    const has = user.conditions.includes(id);
    const nextConditions = has
      ? user.conditions.filter(c => c !== id)
      : [...user.conditions, id];
    save({ conditions: nextConditions });
  }

  function downloadZip() {
    const a = document.createElement("a");
    a.href = "/downloads/bridgeui-extension.zip";
    a.download = "bridgeui-extension.zip";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!user) return null;
  const p = user.preferences;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Top bar */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold">R</div>
            <div className="text-2xl font-bold text-slate-900">Robyn</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-slate-900 sm:inline">
              Hello, <b>{user.name}</b>
            </span>
            <button
              onClick={() => {
                logoutUser();
                location.href = "/login";
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <TabBtn icon={<InfoIcon size={16} />} active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
          <TabBtn icon={<Settings size={16} />} active={tab === 'profile'} onClick={() => setTab('profile')}>Specs</TabBtn>
          <TabBtn icon={<HelpCircle size={16} />} active={tab === 'help'} onClick={() => setTab('help')}>Help</TabBtn>
        </div>

        {/* Content */}
        <div className="mt-6">
          {tab === "overview" && (
            <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
              <div className="lg:col-span-2 rounded-2xl border border-slate-300 bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white shadow-xl">
                <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
                <p className="mt-1 text-purple-50">
                  Download the extension, then try it on eBay or BBC to see
                  adaptive changes live.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={downloadZip}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-purple-800 shadow hover:bg-slate-100"
                  >
                    <Download className="mr-1 inline" size={18} /> Download
                    Extension (ZIP)
                  </button>
                  <span className="text-xs text-purple-50">
                    Token:{" "}
                    <code className="rounded bg-white/20 px-2 py-0.5">
                      {user.token}
                    </code>
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Next steps
                </h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-800">
                  <li>
                    Unzip →{" "}
                    <code className="rounded bg-slate-100 px-1">
                      chrome://extensions
                    </code>{" "}
                    → Load unpacked
                  </li>
                  <li>
                    Open extension Options → set <b>Hub URL</b> and <b>Token</b>
                  </li>
                  <li>Visit eBay/BBC → enable BridgeUI</li>
                </ol>
              </div>
            </section>
          )}

          {tab === 'profile' && (
            <section className="flex flex-col lg:flex-row gap-6">
              {/* Your Profile */}
              <div className="w-full lg:w-1/2 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
                <p className="mt-1 text-sm text-slate-800">
                  Pick the categories that apply, then fine-tune specifics.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {CONDITIONS.map(({ id, name, icon: Icon, description }) => {
                    const active = user.conditions.includes(id);
                    return (
                      <div
                        key={id}
                        className={
                          'rounded-xl border p-4 transition ' +
                          (active
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-slate-300 hover:bg-slate-50')
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={
                                'grid h-10 w-10 place-items-center rounded-lg ' +
                                (active ? 'bg-purple-100' : 'bg-slate-100')
                              }
                            >
                              <Icon
                                className={active ? 'text-purple-700' : 'text-slate-600'}
                                size={18}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {name}
                              </div>
                              <div className="text-xs text-slate-700">
                                {description}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleCond(id)}
                            className={
                              'rounded-xl px-3 py-1 text-xs font-semibold ' +
                              (active
                                ? 'bg-purple-600 text-white'
                                : 'border border-slate-300 text-slate-900 bg-white')
                            }
                          >
                            {active ? "Selected" : "Select"}
                          </button>
                        </div>

                        {active && (
                          <div className="mt-4 space-y-4">
                            {id === 'adhd' && (
                              <ADHDControls
                                prefs={p}
                                onChange={(prefs) => save({ preferences: prefs })}
                              />
                            )}
                            {id === 'dyslexia' && (
                              <DyslexiaControls
                                prefs={p}
                                onChange={(prefs) => save({ preferences: prefs })}
                              />
                            )}
                            {id === 'low-vision' && (
                              <LowVisionControls
                                prefs={p}
                                onChange={(prefs) => save({ preferences: prefs })}
                              />
                            )}
                            {id === 'motor-control' && (
                              <MotorControls
                                prefs={p}
                                onChange={(prefs) => save({ preferences: prefs })}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div className="w-full lg:w-1/2 rounded-2xl border border-slate-300 bg-white p-8 shadow-sm overflow-hidden">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Live Preview</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden p-4 bg-slate-50">
                  <BridgePreview prefs={p} variant="compact" />
                </div>
              </div>
            </section>
          )}

          {tab === "help" && (
            <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                How to run the demo
              </h2>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-800">
                <li>Download and load the Robyn extension.</li>
                <li>Visit eBay or BBC. Click the Robyn icon.</li>
                <li>Preset preferences apply instantly; misclicks will “grow” buttons to 96% success (scripted).</li>
              </ol>
              <p className="mt-3 text-sm text-slate-800">
                Everything here is hardcoded for a smooth POC. No backend. Local
                only.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------
   Controls: Core & per-category
----------------------------*/

function ADHDControls({ prefs, onChange }: { prefs: BridgePreferences; onChange: (p: BridgePreferences) => void }) {
  return (
    <div className="grid gap-4">
      <ToggleRow label="Reduce animations" value={prefs.reduceMotion} onChange={(v) => onChange({ ...prefs, reduceMotion: v })} />
      <ToggleRow label="Highlight key elements" value={prefs.focusHighlight} onChange={(v) => onChange({ ...prefs, focusHighlight: v })} />
      <ToggleRow label="Hide distracting UI" value={prefs.hideDistractingUI} onChange={(v) => onChange({ ...prefs, hideDistractingUI: v })} />
    </div>
  );
}

function DyslexiaControls({
  prefs,
  onChange
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="grid gap-4">
      <ToggleRow label="Dyslexia-friendly font" value={prefs.dyslexiaFriendly} onChange={(v) => onChange({ ...prefs, dyslexiaFriendly: v })} />
      <SegmentRow label="Letter spacing" options={['normal','wide'] as const} current={prefs.letterSpacing} onSelect={(v) => onChange({ ...prefs, letterSpacing: v })} />
      <SegmentRow label="Line height" options={['normal','relaxed','loose'] as const} current={prefs.lineHeight} onSelect={(v) => onChange({ ...prefs, lineHeight: v })} />
      <ToggleRow label="Underline links" value={prefs.underlineLinks} onChange={(v) => onChange({ ...prefs, underlineLinks: v })} />
    </div>
  );
}

function LowVisionControls({
  prefs,
  onChange
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-900">
          Global zoom
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1.0}
            max={1.4}
            step={0.05}
            value={prefs.globalZoom}
            onChange={e =>
              onChange({ ...prefs, globalZoom: Number(e.target.value) })
            }
            className="flex-1 accent-purple-600"
          />
          <div className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center font-semibold text-slate-900">
            {prefs.globalZoom.toFixed(2)}×
          </div>
        </div>
      </div>
      <SegmentRow
        label="Contrast"
        options={["normal", "high", "maximum"] as const}
        current={prefs.contrast}
        onSelect={v => onChange({ ...prefs, contrast: v })}
      />
    </div>
  );
}

function MotorControls({
  prefs,
  onChange
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="grid gap-4">
      <ToggleRow label="Enlarge interactive targets" value={prefs.enlargeInteractive} onChange={(v) => onChange({ ...prefs, enlargeInteractive: v })} />
      <ToggleRow label="Increase button spacing" value={prefs.extraButtonGap} onChange={(v) => onChange({ ...prefs, extraButtonGap: v })} />
      <ToggleRow label="Enable dwell click" value={prefs.dwellClickSim} onChange={(v) => onChange({ ...prefs, dwellClickSim: v })} />
      <ToggleRow label="Hands-free mode" value={prefs.handsFreeMode} onChange={(v) => onChange({ ...prefs, handsFreeMode: v })} />
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={
          "relative inline-flex h-6 w-11 items-center rounded-full transition " +
          (value ? "bg-purple-600" : "bg-slate-300")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 transform rounded-full bg-white transition " +
            (value ? "translate-x-5" : "translate-x-1")
          }
        />
      </button>
    </label>
  );
}

function SegmentRow<T extends string>({
  label,
  options,
  current,
  onSelect
}: {
  label: string;
  options: readonly T[];
  current: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-900">{label}</div>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={
              "rounded-xl px-3 py-2 text-sm font-medium capitalize transition " +
              (current === opt
                ? "bg-purple-600 text-white"
                : "bg-slate-100 text-slate-900 hover:bg-slate-200")
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------
   Preview site (reflects prefs)
----------------------------*/

function PreviewSite({ prefs }: { prefs: BridgePreferences }) {
  // Derive CSS variables from prefs for consistent application
  const styleVars = useMemo(() => {
    const baseContrastBg =
      prefs.contrast === "maximum"
        ? "#0a0a0a"
        : prefs.contrast === "high"
        ? "#111827"
        : "#1f2937";
    const baseContrastText = "#ffffff";

    const baseSpacing =
      prefs.spacing === "compact" ? 6 : prefs.spacing === "relaxed" ? 14 : 10; // px
    const linkUnderline = prefs.underlineLinks ? "underline" : "none";

    const letterSpacing = prefs.letterSpacing === "wide" ? "0.04em" : "0";
    const lineHeight =
      prefs.lineHeight === "loose"
        ? 1.9
        : prefs.lineHeight === "relaxed"
        ? 1.65
        : 1.45;

    const focusOutline =
      prefs.highVisibilityFocusRing || prefs.focusHighlight
        ? "3px solid #a78bfa"
        : "2px solid #94a3b8";

    const buttonPadY = Math.max(8, Math.floor(prefs.buttonSize / 3));
    const buttonPadX = Math.max(12, Math.floor(prefs.buttonSize / 2));

    const zoom = prefs.globalZoom;

    return {
      "--pv-font-size": `${prefs.fontSize}px`,
      "--pv-letter-spacing": letterSpacing,
      "--pv-line-height": String(lineHeight),
      "--pv-focus-outline": focusOutline,
      "--pv-contrast-bg": baseContrastBg,
      "--pv-contrast-fg": baseContrastText,
      "--pv-link-decoration": linkUnderline,
      "--pv-gap": `${baseSpacing}px`,
      "--pv-btn-pad-y": `${buttonPadY}px`,
      "--pv-btn-pad-x": `${buttonPadX}px`,
      "--pv-zoom": String(zoom)
    } as React.CSSProperties;
  }, [prefs]);

  return (
    <div
      className="mt-3 rounded-xl border border-slate-300 p-3"
      style={{
        fontSize: `var(--pv-font-size)`,
        letterSpacing: `var(--pv-letter-spacing)`,
        lineHeight: `var(--pv-line-height)`,
        transform: `scale(var(--pv-zoom))`,
        transformOrigin: "top left"
      }}
    >
      {/* Simulated top nav */}
      <div
        className="rounded-lg p-3 text-white"
        style={{
          background: "linear-gradient(90deg, var(--pv-contrast-bg), #312e81)"
        }}
      >
        <div className="flex items-center justify-between">
          <div className="font-bold">Demo Site</div>
          {prefs.handsFreeMode && (
            <button
              className="rounded-lg bg-white/20 px-3 py-1 text-sm font-semibold"
              style={{ outline: "var(--pv-focus-outline)" }}
            >
              🎤 Voice Mode
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        {/* Breadcrumb / links */}
        <div className="flex flex-wrap gap-2">
          {["Home", "Products", "Deals", "Support"].map((txt, i) => (
            <a
              key={txt}
              href="#"
              className="rounded-md px-2 py-1 text-slate-800 hover:bg-slate-100 focus:bg-slate-100"
              style={{
                textDecoration: "var(--pv-link-decoration)",
                outline: "none"
              }}
              onFocus={e => {
                if (prefs.focusHighlight)
                  (e.currentTarget as HTMLElement).style.outline =
                    "var(--pv-focus-outline)";
              }}
              onBlur={e =>
                ((e.currentTarget as HTMLElement).style.outline = "none")
              }
            >
              {txt}
              {i < 3 ? " ›" : ""}
            </a>
          ))}
        </div>

        {/* Hero card */}
        <div className="rounded-xl border border-slate-300 bg-white p-3">
          <div className="text-slate-900 font-semibold">Featured Product</div>
          <p className="text-slate-800 mt-1">
            This block demonstrates text sizing, line height, letter spacing,
            and link decorations.
            {prefs.dyslexiaFriendly && " (Dyslexia-friendly text enabled)"}
          </p>

          {/* Buttons row */}
          <div
            className="mt-3 flex flex-wrap"
            style={{ gap: prefs.extraButtonGap ? "16px" : "8px" }}
          >
            <button
              className="rounded-xl bg-slate-900 text-white font-semibold"
              style={{
                padding: `var(--pv-btn-pad-y) var(--pv-btn-pad-x)`,
                outline: "var(--pv-focus-outline)"
              }}
            >
              Primary Action
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white font-semibold text-slate-900"
              style={{
                padding: `var(--pv-btn-pad-y) var(--pv-btn-pad-x)`
              }}
            >
              Secondary
            </button>
            <button
              className="rounded-xl bg-white font-semibold text-slate-900"
              style={{
                padding: `var(--pv-btn-pad-y) var(--pv-btn-pad-x)`,
                border: "2px dashed #cbd5e1"
              }}
            >
              Outline
            </button>
          </div>
        </div>

        {/* Form/demo of focus + enlarged interactive */}
        <div className="rounded-xl border border-slate-300 bg-white p-3">
          <div className="text-slate-900 font-semibold">Form Sample</div>
          <div className="mt-2 grid gap-2">
            <input
              placeholder="Search products..."
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-500"
              style={{
                outline: "none",
                padding: prefs.enlargeInteractive ? "14px 16px" : "8px 10px"
              }}
              onFocus={e =>
                ((e.currentTarget as HTMLElement).style.outline =
                  "var(--pv-focus-outline)")
              }
              onBlur={e =>
                ((e.currentTarget as HTMLElement).style.outline = "none")
              }
            />
            <div className="flex flex-wrap" style={{ gap: "var(--pv-gap)" }}>
              {["Small", "Medium", "Large"].map(lbl => (
                <label key={lbl} className="flex items-center gap-2">
                  <input type="checkbox" className="h-5 w-5" />
                  <span className="text-slate-900">{lbl}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Distraction areas (ads/sidebars) */}
        {!prefs.hideDistractingUI && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-xl border border-slate-300 bg-white p-3">
              <div className="text-slate-900 font-semibold">Article</div>
              <p className="text-slate-800 mt-1">
                Example body copy to show spacing & contrast.{" "}
                <a
                  href="#"
                  style={{ textDecoration: "var(--pv-link-decoration)" }}
                >
                  Learn more
                </a>
                .
              </p>
            </div>
            <div className="rounded-xl border border-slate-300 bg-white p-3">
              <div className="text-slate-900 font-semibold">Sidebar</div>
              <ul className="mt-1 space-y-1">
                <li>
                  <a
                    href="#"
                    style={{ textDecoration: "var(--pv-link-decoration)" }}
                  >
                    Trending #1
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    style={{ textDecoration: "var(--pv-link-decoration)" }}
                  >
                    Trending #2
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    style={{ textDecoration: "var(--pv-link-decoration)" }}
                  >
                    Trending #3
                  </a>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* High-contrast section */}
        {prefs.contrast !== "normal" && (
          <div
            className="rounded-xl p-3 text-white"
            style={{ background: "var(--pv-contrast-bg)" }}
          >
            <div className="font-semibold">High Contrast Block</div>
            <p style={{ color: "var(--pv-contrast-fg)" }}>
              Buttons, inputs, and links maintain readability here.
            </p>
          </div>
        )}

        {/* Motion */}
        {prefs.reduceMotion && (
          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="text-slate-900 font-semibold">Reduced motion</div>
            <p className="text-slate-800 mt-1">Animations are minimized.</p>
          </div>
        )}
      </div>

      {/* Global styles for preview (scoped) */}
      <style jsx>{`
        div :global(*) {
          transition: ${
            /* limit motion if reduceMotion */ prefs.reduceMotion
              ? "none"
              : "all 160ms ease"
          };
        }
        div :global(a:focus),
        div :global(button:focus),
        div :global(input:focus) {
          outline: var(--pv-focus-outline);
          outline-offset: 2px;
        }
        /* Dyslexia-friendly tweaks */
        div :global(.rounded-xl p),
        div :global(.rounded-xl li),
        div :global(.rounded-xl input),
        div :global(.rounded-xl a),
        div :global(.rounded-xl button) {
          ${prefs.dyslexiaFriendly
            ? 'font-variation-settings:"wght" 520; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;'
            : ""}
        }
      `}</style>
    </div>
  );
}

/* --------------------------
   Tab button
----------------------------*/
function TabBtn({
  children,
  active,
  onClick,
  icon
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition " +
        (active
          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow"
          : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50")
      }
    >
      {icon}
      {children}
    </button>
  );
}
