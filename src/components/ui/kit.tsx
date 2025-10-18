'use client';
import React from 'react';

export const Button = ({ children, className = '', ...props }: any) => (
  <button
    className={
      'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ' +
      'bg-slate-900 text-white shadow hover:bg-black transition ' + className
    }
    {...props}
  >
    {children}
  </button>
);

export const Ghost = ({ children, className = '', ...props }: any) => (
  <button
    className={
      'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 transition ' +
      className
    }
    {...props}
  >
    {children}
  </button>
);

export const Card = ({ children, className = '' }: any) => (
  <div className={'rounded-2xl border border-slate-200/70 bg-white p-6 shadow-lg ' + className}>{children}</div>
);

export const Chip = ({ active, children, onClick }: any) => (
  <button
    onClick={onClick}
    className={
      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ' +
      (active ? 'border-purple-500 bg-purple-50 text-purple-900' : 'border-slate-200 hover:bg-slate-50')
    }
  >
    {children}
  </button>
);