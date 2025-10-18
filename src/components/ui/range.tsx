'use client';
export default function Range({ label, min, max, step, value, onChange, id }: any) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-900">{label}</label>
      <div className="flex items-center gap-4">
        <input id={id} type="range" min={min} max={max} step={step} value={value}
               onChange={(e)=>onChange(Number(e.target.value))} className="flex-1 accent-purple-600"/>
        <div className="w-20">
          <input type="number" min={min} max={max} step={step} value={value}
                 onChange={(e)=>onChange(Number(e.target.value))}
                 className="w-full rounded-lg border px-3 py-2 text-center font-semibold"/>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">Current: <span className="font-medium">{value}</span></p>
    </div>
  );
}
