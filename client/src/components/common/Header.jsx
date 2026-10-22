import React from 'react';
import { Flame, Sparkles, Plus, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header({
  title,
  subtitle,
  streak = 0,
  actionButton,
}) {
  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Streak indicator */}
        <div
          title={`Active study streak: ${streak} day${streak === 1 ? '' : 's'}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-semibold"
        >
          <Flame className={`w-4 h-4 ${streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          <span>{streak} day{streak === 1 ? '' : 's'} streak</span>
        </div>

        {/* Custom action button or default quick action */}
        {actionButton || (
          <Link
            to="/practice"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Quick Practice
          </Link>
        )}
      </div>
    </header>
  );
}
