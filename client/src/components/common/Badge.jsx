import React from 'react';

export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5';

  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
    high: 'bg-rose-50 text-rose-700 border-rose-200/60',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const currentVariant = variants[variant.toLowerCase()] || variants.default;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${sizeClasses} ${currentVariant}`}
    >
      {children}
    </span>
  );
}
