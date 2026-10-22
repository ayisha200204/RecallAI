import React from 'react';
import { BookOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = BookOpen,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 font-heading">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mt-1 mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
