import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  FileText,
  RotateCcw,
  BarChart3,
  Mic,
  CalendarCheck,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Zap,
  Check,
  Volume2,
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [heroFlipped, setHeroFlipped] = useState(false);
  const [selectedHeroTab, setSelectedHeroTab] = useState('card');

  const handleQuickDemo = async () => {
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (e) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Soft atmospheric background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-100/50 via-purple-50/40 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold mb-6 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Next-Gen Adaptive Learning & Spaced Recall</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 font-heading leading-[1.12] mb-6">
                Your notes. Your learning style.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600">
                  Your next breakthrough.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mb-8">
                Turn study materials into interactive practice, discover what needs attention, and build an adaptive revision routine that works for you.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-6 py-3.5 rounded-xl shadow-md shadow-indigo-600/25 hover:shadow-lg transition-all"
                >
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={handleQuickDemo}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 font-semibold text-base px-5 py-3.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4 text-indigo-600" />
                  Try Live Demo
                </button>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Cognitive Spaced Repetition</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Machine Learning Retention Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Voice & Conceptual Evaluation</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Product Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xl shadow-slate-200/50">
                {/* Product preview header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-slate-600 ml-2">
                      Operating Systems — Finals Prep
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Session: 4/5
                  </span>
                </div>

                {/* Interactive Card Preview with 3D Flip Motion */}
                <div className="perspective-1000 mb-4 select-none">
                  <motion.div
                    animate={{ rotateY: heroFlipped ? 180 : 0 }}
                    transition={{ duration: 0.55, type: 'spring', damping: 20, stiffness: 140 }}
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => setHeroFlipped(!heroFlipped)}
                    className="relative min-h-[175px] cursor-pointer"
                  >
                    {/* Front Face (Question) */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        pointerEvents: heroFlipped ? 'none' : 'auto',
                      }}
                      className="p-5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 shadow-xs flex flex-col justify-between min-h-[175px] group"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          Deadlocks
                        </span>
                        <span className="text-[11px] flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <RotateCcw className="w-3 h-3" /> Click to flip
                        </span>
                      </div>

                      <div className="my-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Question</span>
                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          What are the four Coffman conditions necessary for a deadlock to occur?
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                        <span>Self-Assessment</span>
                        <span className="text-[11px] font-medium text-indigo-600">Active Recall</span>
                      </div>
                    </div>

                    {/* Back Face (Answer) */}
                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        pointerEvents: heroFlipped ? 'auto' : 'none',
                      }}
                      className="absolute inset-0 p-5 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-emerald-50/20 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Answer Revealed
                        </span>
                        <span className="text-[11px] flex items-center gap-1 text-emerald-600">
                          <RotateCcw className="w-3 h-3" /> Click to flip back
                        </span>
                      </div>

                      <div className="my-1">
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait. All four must hold simultaneously.
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-emerald-100">
                        <span>Confidence:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div
                              key={star}
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                                star <= 4 ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {star}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Topic Mastery Progress Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 mb-3">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700">Topic Mastery Breakdown</span>
                    <span className="text-slate-400 text-[11px]">ML-Calibrated</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                        <span>Processes & Threads</span>
                        <span className="font-semibold text-emerald-600">92% (Mastered)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                        <span>Deadlocks</span>
                        <span className="font-semibold text-amber-600">42% (Needs Revision)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Alert */}
                <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-indigo-950 block">Personalised Recommendation</span>
                    <p className="text-indigo-800 text-[11px] mt-0.5">
                      Retention risk high on <strong className="font-semibold">Deadlocks</strong> (last reviewed 48h ago). Recommended: complete 3 active recall questions today.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Problem</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-heading mt-2">
              Why traditional studying fails to stick
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Passive reading creates an illusion of competence. Real retention requires active retrieval and targeted timing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Information Overload</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Hundreds of textbook pages and lecture slides make it difficult to know what to prioritize before exams.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Rapid Memory Decay</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Without spaced active recall, students forget over 60% of learned material within 48 hours.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Invisible Blind Spots</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Students spend time re-reading material they already know, while weak concepts remain unaddressed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/80">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Manual Card Fatigue</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Making flashcards manually takes hours of tedious formatting instead of actual high-impact learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mt-2">
              How RecallAI transforms your study routine
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              A continuous, four-step adaptive learning cycle engineered for long-term conceptual recall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="flex flex-col items-start bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-indigo-600/20">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Upload your notes</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drop lecture PDFs or paste markdown notes. Our system parses headers, definitions, and key topics instantly.
              </p>
            </div>

            <div className="flex flex-col items-start bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-indigo-600/20">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Generate study material</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Transform source materials into active flip cards, multiple-choice questions, and conceptual short answers.
              </p>
            </div>

            <div className="flex flex-col items-start bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-indigo-600/20">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Practise & self-assess</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Engage in active retrieval. Rate confidence levels and receive immediate semantic evaluation with concept matching.
              </p>
            </div>

            <div className="flex flex-col items-start bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-sm shadow-indigo-600/20">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">Adaptive recommendations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The ML model predicts forgetting probabilities and schedules targeted revision tasks before memory degrades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mt-2">
              Engineered for genuine understanding
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Explore the core capabilities that turn rote memorization into lasting conceptual mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 mb-5">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">AI Material Generator</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Extracts structured flashcards, MCQs with plausible distractors, and conceptual short answers directly from lecture notes without hallucinations.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <span>Supports PDF & Paste</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-5">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Active Recall Practice</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Interactive flip cards and quizzes with immediate conceptual feedback. Evaluates explanations against key concepts rather than strict string matching.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <span>Semantic Concept Checking</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 mb-5">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">ML Performance Prediction</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Trained machine learning models assess time decay, historical accuracy, and confidence ratings to calculate your personal retention risk.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <span>Logistic Regression & RF</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-5">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Adaptive Revision Planner</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Dynamically prioritizes review tasks for weak topics. Set exam countdowns and receive daily targeted revision micro-tasks.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <span>Personalized Spacing</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-5">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Voice-Based Learning</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Speak your answers naturally using browser speech recognition. Hear questions read aloud and answer conversational follow-up questions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <span>Hands-free Voice Tutor</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-2xl bg-[#FAF9F6] border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 mb-5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">Learning Analytics</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Visual dashboards tracking true consecutive day streaks, topic mastery levels, difficult questions, and activity trends.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/70 text-xs font-semibold text-teal-700 flex items-center gap-1.5">
                <span>Transparent Mastery Indices</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Science & ML Prediction Spotlight */}
      <section id="adaptive-ml" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Cognitive Science & Machine Learning
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading mt-2 leading-tight">
                Predicting recall risk before memory degrades
              </h2>
              <p className="text-slate-300 mt-4 text-sm leading-relaxed">
                Rather than treating every topic identically, RecallAI estimates the probability that you will answer future questions correctly using cognitive forgetting curves and feature-weighted regression.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Ebbinghaus Retention Modeling</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Time decay factor calibrated based on hours elapsed since last active retrieval.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Multi-Factor Weighting</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Integrates prior correctness, topic difficulty, attempts count, and metacognitive confidence ratings.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Actionable Urgency Thresholds</h4>
                    <p className="text-xs text-slate-400 mt-0.5">High risk (&lt;45%) triggers foundational reviews; moderate stability (45-70%) recommends quizzes.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200">ML Model Benchmark Calibration</span>
                  </div>
                  <span className="text-[11px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                    ROC-AUC: 0.879
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block">Accuracy</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">81.4%</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block">Precision</span>
                    <span className="text-lg font-bold text-indigo-400 font-mono">82.5%</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block">F1-Score</span>
                    <span className="text-lg font-bold text-purple-400 font-mono">83.3%</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-slate-300 block">Top Predictive Feature Importances:</span>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Recent Topic Accuracy</span>
                      <span className="font-mono text-indigo-300">38.5%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '38.5%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Question Difficulty</span>
                      <span className="font-mono text-indigo-300">24.5%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '24.5%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Hours Elapsed Since Review</span>
                      <span className="font-mono text-indigo-300">16.5%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '16.5%' }} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Prototype Notice:</strong> Evaluated on reproducible student learning trajectory data modeling forgetting curves. Integrated directly into the revision scheduler.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-[#FAF9F6] text-center border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-6 shadow-md shadow-indigo-600/30">
            <Brain className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
            Ready to remember what you study?
          </h2>
          <p className="text-slate-600 text-base max-w-xl mx-auto mt-3 mb-8">
            Start transforming your notes into interactive practice with AI-generated flashcards, active recall quizzes, and personalized revision schedules.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base px-6 py-3.5 rounded-xl shadow-md transition-all"
            >
              Start Learning Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleQuickDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-base px-6 py-3.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-indigo-600" />
              Explore Sample Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-slate-900 font-heading">
              Recall<span className="text-indigo-600">AI</span>
            </span>
            <span className="text-xs text-slate-400 ml-2">
              © {new Date().getFullYear()} RecallAI. Adaptive Learning Platform.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#adaptive-ml" className="hover:text-indigo-600 transition-colors">Machine Learning</a>
            <Link to="/login" className="hover:text-indigo-600 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
