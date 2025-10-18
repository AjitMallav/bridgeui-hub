import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* existing config here */
  env: {
    // Changes every time you restart `npm run dev` (server evaluates this file once).
    BRIDGEUI_DEV_BOOT: process.env.NODE_ENV === 'production' ? 'prod' : String(Date.now()),
  },
};

export default nextConfig;
