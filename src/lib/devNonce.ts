// src/lib/devNonce.ts
// This value is injected by Next at build/boot time and is stable for the whole dev run.
export const DEV_NONCE =
  process.env.NODE_ENV === 'production'
    ? 'prod'
    : (process.env.BRIDGEUI_DEV_BOOT as string) || 'dev';
