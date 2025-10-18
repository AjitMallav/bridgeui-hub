'use client';

import { DEV_NONCE } from './devNonce';

export type BridgeContrast = 'normal' | 'high' | 'maximum';
export type BridgeSpacing = 'compact' | 'default' | 'relaxed';
export type BridgeLetterSpacing = 'normal' | 'wide';
export type BridgeLineHeight = 'normal' | 'relaxed' | 'loose';

export type BridgePreferences = {
  // Core
  buttonSize: number;              // px
  fontSize: number;                // px
  contrast: BridgeContrast;
  spacing: BridgeSpacing;

  // ADHD
  reduceMotion: boolean;           // prefers-reduced-motion simulation
  focusHighlight: boolean;         // strong focus outline/highlight
  hideDistractingUI: boolean;      // hides "ads/sidebars" in preview

  // Dyslexia
  dyslexiaFriendly: boolean;       // font tweaks
  letterSpacing: BridgeLetterSpacing;
  lineHeight: BridgeLineHeight;
  underlineLinks: boolean;         // underline links for discoverability

  // Low Vision
  highVisibilityFocusRing: boolean;
  globalZoom: number;              // 1.0–1.4 (scale UI)

  // Motor Control
  enlargeInteractive: boolean;     // bigger hit targets
  extraButtonGap: boolean;         // spacing between interactive items
  dwellClickSim: boolean;          // longer press = click (preview sim)
  handsFreeMode: boolean;          // shows big voice/CTA placeholder in preview
};

export type DemoUser = {
  name: string;
  email?: string;
  phone?: string;
  token: string;
  conditions: string[];
  preferences: BridgePreferences;
};

export const DEFAULT_PREFS: BridgePreferences = {
  // Core
  buttonSize: 48,
  fontSize: 16,
  contrast: 'normal',
  spacing: 'default',

  // ADHD
  reduceMotion: false,
  focusHighlight: true,
  hideDistractingUI: false,

  // Dyslexia
  dyslexiaFriendly: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  underlineLinks: false,

  // Low Vision
  highVisibilityFocusRing: true,
  globalZoom: 1.0,

  // Motor Control
  enlargeInteractive: false,
  extraButtonGap: false,
  dwellClickSim: false,
  handsFreeMode: false,
};

// Session-scoped storage key (invalidated each dev server boot)
const USER_KEY = (nonce: string) => `bridgeui_demo_user__${nonce}`;

export function getUser(): DemoUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY(process.env.NODE_ENV === 'production' ? 'prod' : (process.env.BRIDGEUI_DEV_BOOT as string)));
  return raw ? (JSON.parse(raw) as DemoUser) : null;
}

export function setUser(u: DemoUser) {
  const key = USER_KEY(process.env.NODE_ENV === 'production' ? 'prod' : (process.env.BRIDGEUI_DEV_BOOT as string));
  sessionStorage.setItem(key, JSON.stringify(u));
}

export function logoutUser() {
  const key = USER_KEY(process.env.NODE_ENV === 'production' ? 'prod' : (process.env.BRIDGEUI_DEV_BOOT as string));
  sessionStorage.removeItem(key);
}

/** Redirect to /login if no valid session. */
export function requireUserOrRedirect() {
  const u = getUser();
  if (!u) window.location.href = '/login';
  return u;
}
