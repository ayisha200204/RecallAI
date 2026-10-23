import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Layers,
  CheckCircle2,
  Mic,
  BarChart3,
  CalendarCheck,
  Calendar,
  Settings,
  LogOut,
  Flame,
  Menu,
  X,
  Brain,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Create Study Set', to: '/create', icon: Sparkles, badge: 'AI' },
  { name: 'Review Calendar', to: '/calendar', icon: Calendar, badge: 'SRS' },
  { name: 'My Study Materials', to: '/materials', icon: FileText },
  { name: 'Practice Quiz', to: '/practice', icon: CheckCircle2 },
  { name: 'Voice Study', to: '/voice-study', icon: Mic, badge: 'Voice AI' },
  { name: 'My Progress', to: '/progress', icon: BarChart3 },
  { name: 'Revision Planner', to: '/planner', icon: CalendarCheck },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Logo */}
        <div className="h-18 flex items-center justify-between px-6 border-b border-slate-100">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 font-heading">
                  Recall<span className="text-indigo-600">AI</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium -mt-0.5">
                Adaptive Study Engine
              </span>
            </div>
          </NavLink>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Study Goal Tag */}
        {user?.studyGoals?.primaryGoal && (
          <div className="px-5 pt-4 pb-1">
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-xs font-semibold text-indigo-900 truncate">
                  {user.studyGoals.primaryGoal}
                </span>
              </div>
              {user.studyGoals.examDate && (
                <span className="text-[10px] font-medium text-indigo-700 shrink-0">
                  Target: {new Date(user.studyGoals.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4.5 h-4.5 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-white/50">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {user?.name || 'Student'}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {user?.email || ''}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 font-heading">RecallAI</span>
        </NavLink>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10">
            {navContent}
          </div>
        </div>
      )}

      {/* Persistent Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 h-screen">
        {navContent}
      </aside>
    </>
  );
}
