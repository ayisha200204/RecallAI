import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Brain, ArrowRight, PlayCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleDemoClick = async () => {
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      navigate('/login');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-heading">
                Recall<span className="text-indigo-600">AI</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200/60">
                Adaptive
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline -mt-0.5">
              Learn deeply. Remember longer.
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-indigo-600 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
            How It Works
          </a>
          <a href="#learning-science" className="hover:text-indigo-600 transition-colors">
            Learning Science
          </a>
          <a href="#adaptive-ml" className="hover:text-indigo-600 transition-colors">
            ML Predictions
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDemoClick}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/90 border border-indigo-200/80 transition-all cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
            Try Demo Mode
          </button>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4.5 py-2.5 rounded-xl shadow-sm shadow-indigo-600/20 hover:shadow-md transition-all"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Start Learning
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
