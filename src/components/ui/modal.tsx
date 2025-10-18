'use client';
import React from 'react';

export default function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
