// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import BridgePreview from "@/components/PreviewSite";
import {
  Download,
  HelpCircle,
  Settings,
  Eye,
  Brain,
  Sliders,
  Info,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  requireUserOrRedirect,
  setUser as persistUser,
  logoutUser,
  type DemoUser,
  DEFAULT_PREFS,
  type BridgePreferences,
} from "@/lib/demoAuth";

type Tab = "overview" | "profile" | "guide";

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
    description: "Reduce motion, emphasize focus, and hide distractions.",
  },
  {
    id: "dyslexia",
    name: "Dyslexia",
    icon: Brain,
    description: "Improve readability with spacing and link affordances.",
  },
  {
    id: "low-vision",
    name: "Low Vision",
    icon: Eye,
    description: "Increase contrast, text size, focus visibility, and zoom.",
  },
  {
    id: "motor-control",
    name: "Motor Control Difficulties",
    icon: Sliders,
    description: "Bigger targets, extra spacing, dwell-click, hands-free.",
  },
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [user, setU] = useState<DemoUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const u = requireUserOrRedirect();
    if (u) {
      const merged: DemoUser = {
        ...u,
        preferences: { ...DEFAULT_PREFS, ...u.preferences },
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
        ...(patch.preferences ?? {}),
      },
    };
    persistUser(next);
    setU(next);
  }

  function resetPreferences() {
    if (!user) return;
    save({
      conditions: [],
      preferences: DEFAULT_PREFS,
    });
  }

  function toggleCond(id: string) {
    if (!user) return;
    const has = user.conditions.includes(id);
    const nextConditions = has
      ? user.conditions.filter((c) => c !== id)
      : [...user.conditions, id];
    save({ conditions: nextConditions });
  }

  function downloadZip() {
    const a = document.createElement("a");
    a.href = "/downloads/robyn-extension.zip";
    a.download = "robyn-extension.zip";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // hook up to your help search later
    console.log("Search:", searchQuery);
  }

  if (!user) return null;
  const p = user.preferences;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-bold">
              R
            </div>
            <span className="text-2xl font-bold text-gray-800">Robyn</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-700 sm:inline">
              <b>{user.name}</b>
            </span>
            <button
              onClick={() => {
                logoutUser();
                location.href = "/login";
              }}
              className="rounded-lg bg-purple-600 px-3.5 py-1.5 text-sm text-white transition hover:bg-purple-700"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Tabs (unstyled links with underline indicator) */}
        <div className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex gap-2">
              <TabLink
                active={tab === "overview"}
                onClick={() => setTab("overview")}
                icon={<Info size={16} />}
              >
                Overview
              </TabLink>
              <TabLink
                active={tab === "profile"}
                onClick={() => setTab("profile")}
                icon={<Settings size={16} />}
              >
                Specs
              </TabLink>
              <TabLink
                active={tab === "guide"}
                onClick={() => setTab("guide")}
                icon={<HelpCircle size={16} />}
              >
                Guide
              </TabLink>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-5 py-6">
        {tab === "overview" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-300 bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white shadow-lg">
              <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
              <p className="mt-1 text-sm text-purple-50">
                Download the extension, then try it on any website to see
                adaptive changes live.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadZip}
                  className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-purple-800 shadow hover:bg-slate-100"
                >
                  <Download className="mr-1 inline" size={16} /> Download
                  Extension
                </button>
                <span className="text-xs text-purple-50">
                  Token:{" "}
                  <code className="rounded bg-white/20 px-1.5 py-0.5">
                    {user.token}
                  </code>
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Setup Steps
                </h3>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-slate-700">
                  <li>
                    Unzip →{" "}
                    <code className="rounded bg-slate-100 px-1 text-xs">
                      chrome://extensions
                    </code>{" "}
                    → Load unpacked
                  </li>
                  <li>
                    Open extension Options → set <b>Hub URL</b> and <b>Token</b>
                  </li>
                  <li>Visit any website → enable Robyn</li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">
                  Quick Info
                </h3>
                <p className="mt-2 text-xs text-slate-700">
                  This is a proof-of-concept demo. All preferences are stored
                  locally. The extension adapts websites in real-time based on
                  your accessibility needs.
                </p>
              </div>
            </div>
          </section>
        )}

        {tab === "profile" && (
          <section className="space-y-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mx-auto max-w-3xl">
              <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask me anything about accessibility settings..."
                  className="w-full px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-purple-600 p-2 text-white transition hover:bg-purple-700"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Profile */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Your Profile
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Select categories that apply, then fine-tune settings
                        below.
                      </p>
                    </div>
                    <button
                      onClick={resetPreferences}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      title="Reset all preferences"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {CONDITIONS.map(({ id, name, icon: Icon, description }) => {
                    const active = user.conditions.includes(id);
                    return (
                      <div
                        key={id}
                        className={
                          "rounded-xl border p-3 transition " +
                          (active
                            ? "border-purple-600 bg-purple-50"
                            : "border-slate-300 hover:bg-slate-50")
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={
                                "grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg " +
                                (active ? "bg-purple-100" : "bg-slate-100")
                              }
                            >
                              <Icon
                                className={
                                  active ? "text-purple-700" : "text-slate-600"
                                }
                                size={16}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {name}
                              </div>
                              <div className="text-xs leading-tight text-slate-600">
                                {description}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleCond(id)}
                            className={
                              "flex-shrink-0 rounded-lg px-2 py-1 text-xs font-semibold " +
                              (active
                                ? "bg-purple-600 text-white"
                                : "border border-slate-300 bg-white text-slate-900")
                            }
                          >
                            {active ? "✓" : "Add"}
                          </button>
                        </div>

                        {active && (
                          <div className="mt-3 space-y-3">
                            {id === "adhd" && (
                              <ADHDControls
                                prefs={p}
                                onChange={(prefs) =>
                                  save({ preferences: prefs })
                                }
                              />
                            )}
                            {id === "dyslexia" && (
                              <DyslexiaControls
                                prefs={p}
                                onChange={(prefs) =>
                                  save({ preferences: prefs })
                                }
                              />
                            )}
                            {id === "low-vision" && (
                              <LowVisionControls
                                prefs={p}
                                onChange={(prefs) =>
                                  save({ preferences: prefs })
                                }
                              />
                            )}
                            {id === "motor-control" && (
                              <MotorControls
                                prefs={p}
                                onChange={(prefs) =>
                                  save({ preferences: prefs })
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  Live Preview
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <BridgePreview prefs={p} variant="compact" />
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "guide" && (
          <HelpGuides />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white text-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-bold">
                  R
                </div>
                <span className="text-lg font-bold text-gray-800">Robyn</span>
              </div>
              <p className="text-xs text-slate-600">
                Making the web accessible for everyone through adaptive
                technology.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Quick Links
              </h3>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>
                  <a className="transition hover:text-purple-600" href="#">
                    Documentation
                  </a>
                </li>
                <li>
                  <a className="transition hover:text-purple-600" href="#">
                    Support
                  </a>
                </li>
                <li>
                  <a className="transition hover:text-purple-600" href="#">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a className="transition hover:text-purple-600" href="#">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Contact
              </h3>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>Email: support@robyn.ai</li>
                <li>
                  GitHub:{" "}
                  <a
                    href="https://github.com/AjitMallav/bridgeui-hub"
                    target="_blank"
                    rel="noopener"
                    className="transition hover:text-purple-600"
                  >
                    bridgeui-hub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Robyn. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------
   Tabs (compact link style)
----------------------------*/
function TabLink({
  children,
  icon,
  active,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-3 py-3 text-sm font-medium text-slate-700 hover:text-slate-900"
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {children}
      </span>
      <span
        className={
          "absolute inset-x-2 -bottom-[1px] block rounded-full transition-all " +
          (active ? "h-[2px] bg-purple-600" : "h-[2px] bg-transparent")
        }
      />
    </button>
  );
}

/* --------------------------
   Help Guides (unchanged content)
----------------------------*/
function HelpGuides() {
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Accessibility Categories Guide
        </h2>
        <p className="text-sm text-slate-600">
          Understanding your accessibility needs helps you configure Robyn
          effectively. Below are detailed guides for each category.
        </p>
      </div>

      {/* ADHD */}
      <div className="rounded-xl border border-purple-300 bg-purple-50 p-5 shadow-sm">
        <GuideHeader icon={<Brain className="text-purple-700" size={20} />} title="ADHD (Attention Deficit Hyperactivity Disorder)" />
        <Severity
          items={[
            ["Mild", "Occasional difficulty focusing, easily distracted by animations or pop-ups"],
            ["Moderate", "Frequent loss of focus, struggle to complete tasks with visual clutter"],
            ["Severe", "Extreme difficulty maintaining attention, overwhelmed by multiple UI elements"],
          ]}
        />
        <Recs
          color="purple"
          items={[
            ["Reduce animations", "Minimizes motion and transitions that can be distracting. Essential for moderate to severe ADHD."],
            ["Highlight key elements", "Emphasizes important content and actions. Helps direct focus to relevant information."],
            ["Hide distracting UI", "Removes ads, sidebars, and non-essential elements. Critical for severe ADHD or high distractibility."],
          ]}
        />
      </div>

      {/* Dyslexia */}
      <div className="rounded-xl border border-blue-300 bg-blue-50 p-5 shadow-sm">
        <GuideHeader icon={<Brain className="text-blue-700" size={20} />} title="Dyslexia" />
        <Severity
          items={[
            ["Mild", "Occasional letter reversal, slow reading with standard fonts"],
            ["Moderate", "Difficulty tracking lines, frequent re-reading, confusion with similar-looking letters"],
            ["Severe", "Significant reading challenges, extreme difficulty with dense text blocks"],
          ]}
        />
        <Recs
          color="blue"
          items={[
            ["Dyslexia-friendly font", "Uses OpenDyslexic or similar fonts to reduce letter confusion. Beneficial for all severity levels."],
            ["Letter spacing (Wide)", "Increases space between letters to improve readability. Recommended for moderate to severe dyslexia."],
            ["Line height (Relaxed/Loose)", "Adds vertical spacing to prevent line-jumping. Essential for moderate to severe cases."],
            ["Underline links", "Makes clickable elements more obvious. Helpful for all severity levels to improve navigation."],
          ]}
        />
      </div>

      {/* Low Vision */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <GuideHeader icon={<Eye className="text-amber-700" size={20} />} title="Low Vision" />
        <Severity
          items={[
            ["Mild", "Need reading glasses, slight difficulty with small text or low contrast"],
            ["Moderate", "Significant vision impairment, need magnification, struggle with standard text sizes"],
            ["Severe", "Legal blindness or near-blindness, require maximum zoom and contrast"],
          ]}
        />
        <Recs
          color="amber"
          items={[
            ["Global zoom (1.0x - 1.4x)", "Mild: 1.0x–1.15x • Moderate: 1.15x–1.3x • Severe: 1.3x–1.4x"],
            ["Contrast levels", "Normal: standard • High: moderate loss • Maximum: severe impairment (stark b/w)"],
          ]}
        />
      </div>

      {/* Motor Control */}
      <div className="rounded-xl border border-green-300 bg-green-50 p-5 shadow-sm">
        <GuideHeader icon={<Sliders className="text-green-700" size={20} />} title="Motor Control Difficulties" />
        <Severity
          items={[
            ["Mild", "Occasional tremors, difficulty with small targets, minor clicking issues"],
            ["Moderate", "Consistent hand tremors, frequent misclicks, struggle with closely-spaced buttons"],
            ["Severe", "Limited hand control, inability to use traditional mouse, need alternative input methods"],
          ]}
        />
        <Recs
          color="green"
          items={[
            ["Enlarge interactive targets", "Makes buttons and links bigger and easier to click. Essential for moderate–severe tremors."],
            ["Increase button spacing", "Adds space between interactive elements to prevent accidental clicks."],
            ["Enable dwell click", "Activates elements by hovering instead of clicking."],
            ["Hands-free mode", "Enables voice control or alt input—critical for severe impairment."],
          ]}
        />
      </div>

      {/* Quick Tips */}
      <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-slate-900">
          Quick Configuration Tips
        </h3>
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
          <li>
            Start with the category that best matches your primary need, then
            experiment with individual toggles.
          </li>
          <li>
            You can select multiple categories if you have overlapping needs.
          </li>
          <li>
            Use the Live Preview to see changes in real-time before applying to
            actual websites.
          </li>
          <li>
            The Reset button will restore all settings to defaults if you want
            to start over.
          </li>
          <li>
            Settings are saved locally in your browser and sync with the Robyn
            extension automatically.
          </li>
        </ul>
      </div>
    </section>
  );
}

function GuideHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/70">{icon}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

function Severity({
  items,
}: {
  items: Array<[label: string, text: string]>;
}) {
  return (
    <div className="mb-3">
      <h4 className="mb-1 text-sm font-semibold text-slate-900">
        How to Identify Severity:
      </h4>
      <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
        {items.map(([label, text], i) => (
          <li key={i}>
            <strong>{label}:</strong> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recs({
  color,
  items,
}: {
  color: "purple" | "blue" | "amber" | "green";
  items: Array<[title: string, desc: string]>;
}) {
  const border = {
    purple: "border-purple-200",
    blue: "border-blue-200",
    amber: "border-amber-200",
    green: "border-green-200",
  }[color];

  const title = {
    purple: "text-purple-900",
    blue: "text-blue-900",
    amber: "text-amber-900",
    green: "text-green-900",
  }[color];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(([t, d], i) => (
        <div
          key={i}
          className={`rounded-lg border ${border} bg-white p-3`}
        >
          <div className={`mb-1 text-xs font-semibold ${title}`}>{t}</div>
          <p className="text-xs text-slate-600">{d}</p>
        </div>
      ))}
    </div>
  );
}

/* --------------------------
   Controls (compact)
----------------------------*/
function ADHDControls({
  prefs,
  onChange,
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="space-y-2">
      <ToggleRow
        label="Reduce animations"
        value={prefs.reduceMotion}
        onChange={(v) => onChange({ ...prefs, reduceMotion: v })}
      />
      <ToggleRow
        label="Highlight key elements"
        value={prefs.focusHighlight}
        onChange={(v) => onChange({ ...prefs, focusHighlight: v })}
      />
      <ToggleRow
        label="Hide distracting UI"
        value={prefs.hideDistractingUI}
        onChange={(v) => onChange({ ...prefs, hideDistractingUI: v })}
      />
    </div>
  );
}

function DyslexiaControls({
  prefs,
  onChange,
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="space-y-2">
      <ToggleRow
        label="Dyslexia-friendly font"
        value={prefs.dyslexiaFriendly}
        onChange={(v) => onChange({ ...prefs, dyslexiaFriendly: v })}
      />
      <SegmentRow
        label="Letter spacing"
        options={["normal", "wide"] as const}
        current={prefs.letterSpacing}
        onSelect={(v) => onChange({ ...prefs, letterSpacing: v })}
      />
      <SegmentRow
        label="Line height"
        options={["normal", "relaxed", "loose"] as const}
        current={prefs.lineHeight}
        onSelect={(v) => onChange({ ...prefs, lineHeight: v })}
      />
      <ToggleRow
        label="Underline links"
        value={prefs.underlineLinks}
        onChange={(v) => onChange({ ...prefs, underlineLinks: v })}
      />
    </div>
  );
}

function LowVisionControls({
  prefs,
  onChange,
}: {
  prefs: BridgePreferences;
  onChange: (p: BridgePreferences) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-900">
          Global zoom
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1.0}
            max={1.4}
            step={0.05}
            value={prefs.globalZoom}
            onChange={(e) =>
              onChange({ ...prefs, globalZoom: Number(e.target.value) })
            }
            className="flex-1 accent-purple-600"
          />
          <div className="w-18 rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-sm font-semibold text-slate-900">
            {prefs.globalZoom.toFixed(2)}×
          </div>
        </div>
      </div>
      <SegmentRow
        label="Contrast"
        options={["normal", "high", "maximum"] as const}
        current={prefs.contrast}
        onSelect={(v) => onChange({ ...prefs, contrast: v })}
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
    <div className="space-y-2">
      <ToggleRow label="Enlarge interactive targets" value={prefs.enlargeInteractive} onChange={(v) => onChange({ ...prefs, enlargeInteractive: v })} />
      <ToggleRow label="Increase button spacing" value={prefs.extraButtonGap} onChange={(v) => onChange({ ...prefs, extraButtonGap: v })} />
      <ToggleRow label="Enable dwell click" value={prefs.dwellClickSim} onChange={(v) => onChange({ ...prefs, dwellClickSim: v })} />
      <ToggleRow label="Hands-free mode" value={prefs.handsFreeMode} onChange={(v) => onChange({ ...prefs, handsFreeMode: v })} />

      {/* ✅ Show button when hands-free is enabled */}
      {prefs.handsFreeMode && (
        <button
          onClick={() => window.location.href = "/mock"}
          className="w-full mt-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 transition"
        >
          Try Hands-Free with Mock Web
        </button>
      )}
    </div>
  );
}


function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-3">
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
  onSelect,
}: {
  label: string;
  options: readonly T[];
  current: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-slate-900">{label}</div>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition " +
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
