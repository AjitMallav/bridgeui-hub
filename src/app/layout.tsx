// src/app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'BridgeUI Hub',
  description: 'Demo-only frontend for BridgeUI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        {/* No global nav here; pages render their own */}
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
