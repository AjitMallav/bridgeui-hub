'use client';
import React, { useEffect, useRef } from 'react';

export default function OtpInput({
  value,
  setValue,
  length = 6,
}: {
  value: string;
  setValue: (v: string) => void;
  length?: number;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current = inputs.current.slice(0, length);
  }, [length]);

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[i] = v;
    const next = chars.join('').slice(0, length);
    setValue(next);
    if (v && i < length - 1) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) inputs.current[i + 1]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 rounded-xl border border-slate-300 bg-white text-center text-lg font-semibold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      ))}
    </div>
  );
}
