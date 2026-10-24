import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  Mic,
  CalendarCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  TrendingUp,
  AlertTriangle,
  Play,
  Clock,
  BookOpen,
  Check,
  ChevronRight,
  BarChart2,
  RefreshCw,
  Plus,
  Calendar as CalendarIcon,
  HelpCircle,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, materialsRes, decksRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/materials'),
        api.get('/decks'),
      ]);

      setAnalytics(analyticsRes.data);
      setMaterials(materialsRes.data.materials || []);
      setDecks(decksRes.data.decks || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const greeting = `${getTimeGreeting()}, ${firstName}.`;

  const summary = analytics?.summary || {
    totalQuestionsAnswered: 0,
    overallAccuracy: 0,
    topicsPracticedCount: 0,
    streak: 0,
    topicsNeedingRevision: 0,
    todayAttemptsCount: 0,
    todayStudyMinutes: 0,
    dailyTarget: 15,
    dailyGoalProgress: 0,
  };

  const srs = analytics?.srs || {
    counts: { overdue: 0, dueToday: 0, totalDueToday: 0, newCards: 0, tomorrow: 0, in3Days: 0, in7Days: 0, later: 0 },
    upcomingGroups: { today: [], tomorrow: [], in3Days: [], in7Days: [], later: [] },
  };

  const nextStep = analytics?.nextStepRecommendation || {
    title: 'Review Due Cards',
    actionText: 'Start Review',
    actionLink: '/study',
    reason: 'Active recall spaced repetition cements concepts in long-term memory.',
  };

  const activityData = analytics?.activityTrend || [];
  const topicMastery = analytics?.topicMastery || [];

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title={greeting}
          subtitle={`${todayDateFormatted} • Adaptive Recall Dashboard`}
          streak={summary.streak}
          actionButton={
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRefreshing(true);
                  fetchDashboardData();
                }}
                disabled={refreshing}
                title="Refresh Analytics"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/create"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Study Set</span>
              </Link>
            </div>
          }
        />

        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* SECTION A: GREETING & DAILY GOAL PROGRESS */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                Today's Learning Progress
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
                {summary.todayAttemptsCount} of {summary.dailyTarget} Questions Practiced
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-3">
                <span>Study time today: <strong className="text-slate-800 font-semibold">{summary.todayStudyMinutes} mins</strong></span>
                <span>•</span>
                <span>Goal Target: <strong className="text-slate-800 font-semibold">{summary.dailyTarget} questions/day</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-4 min-w-[260px]">
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Daily Target Completion</span>
                  <span className="text-indigo-600">{summary.dailyGoalProgress}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${summary.dailyGoalProgress}%` }}
                  />
                </div>
              </div>

              <Link
                to="/settings"
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold shrink-0"
                title="Configure daily study goal"
              >
                Edit Goal
              </Link>
            </div>
          </div>

          {/* SECTION B: DUE TODAY (PROMINENT SPACED-REPETITION HERO SECTION) */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Spaced Repetition Engine • Retention Queue</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                  {srs.counts.totalDueToday > 0
                    ? `${srs.counts.totalDueToday} Reviews Due for Retention`
                    : 'All Scheduled Reviews Completed!'}
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {srs.counts.overdue > 0
                    ? `You have ${srs.counts.overdue} overdue cards awaiting review. Practicing them now prevents memory decay along the forgetting curve.`
                    : srs.counts.dueToday > 0
                      ? `${srs.counts.dueToday} flashcards are at their optimal spacing interval today. Complete them to advance their intervals.`
                      : 'You have zero overdue cards today. Learn new cards or explore practice tests to build your mastery.'}
                </p>

                {/* Breakdown counts */}
                <div className="grid grid-cols-3 gap-3 pt-3">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">
                      Overdue
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-rose-400 font-heading">
                      {srs.counts.overdue}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                      Due Today
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-indigo-300 font-heading">
                      {srs.counts.dueToday}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      New Cards
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-200 font-heading">
                      {srs.counts.newCards}
                    </span>
                  </div>
                </div>
              </div>

              {/* Start Review Action */}
              <div className="shrink-0 flex flex-col gap-2.5">
                <Link
                  to={srs.counts.totalDueToday > 0 ? '/study?filter=due' : '/study'}
                  className="px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 inline-flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{srs.counts.totalDueToday > 0 ? 'Start Due Reviews' : 'Review Study Decks'}</span>
                </Link>

                <Link
                  to="/calendar"
                  className="px-5 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-slate-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Review Calendar</span>
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION C: UPCOMING REVIEWS GROUPED BY DATE */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Upcoming Spaced Reviews
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Future review workload predicted by the spaced repetition scheduler.
                </p>
              </div>
              <Link to="/calendar" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                <span>Full Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <Link
                to="/study?filter=due"
                className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Today</span>
                <span className="text-2xl font-black text-indigo-900 my-1 font-heading">
                  {srs.counts.totalDueToday}
                </span>
                <span className="text-[10px] text-indigo-600/80">Reviews due</span>
              </Link>

              <Link
                to="/calendar"
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tomorrow</span>
                <span className="text-2xl font-black text-slate-800 my-1 font-heading">
                  {srs.counts.tomorrow}
                </span>
                <span className="text-[10px] text-slate-400">Cards scheduled</span>
              </Link>

              <Link
                to="/calendar"
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">In 3 Days</span>
                <span className="text-2xl font-black text-slate-800 my-1 font-heading">
                  {srs.counts.in3Days}
                </span>
                <span className="text-[10px] text-slate-400">Cards scheduled</span>
              </Link>

              <Link
                to="/calendar"
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">In 7 Days</span>
                <span className="text-2xl font-black text-slate-800 my-1 font-heading">
                  {srs.counts.in7Days}
                </span>
                <span className="text-[10px] text-slate-400">Cards scheduled</span>
              </Link>

              <Link
                to="/calendar"
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Later</span>
                <span className="text-2xl font-black text-slate-800 my-1 font-heading">
                  {srs.counts.later}
                </span>
                <span className="text-[10px] text-slate-400">Long-term interval</span>
              </Link>
            </div>
          </div>

          {/* SECTION D: CONTINUE LEARNING & RECENT MATERIALS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    My Study Sets & Decks
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jump right back into active recall with your created sets.
                  </p>
                </div>
                <Link to="/materials" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                  <span>All Materials ({materials.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {decks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {decks.slice(0, 4).map((d) => (
                    <div
                      key={d._id || d.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-indigo-300 hover:bg-white transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded uppercase">
                          {d.subject || 'General'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 font-heading mt-1.5 line-clamp-1">
                          {d.title}
                        </h4>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {d.cardCount || d.cards?.length || 0} flashcards
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                        <span className="text-xs font-bold text-emerald-600">
                          {d.dueCount > 0 ? `${d.dueCount} due` : 'Up to date'}
                        </span>
                        <Link
                          to={`/study/${d._id || d.id}`}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <span>Study</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                  <span>No study decks created yet. Use 'Create Study Set' to begin.</span>
                </div>
              )}
            </div>

            {/* SECTION F: RECOMMENDED NEXT STEP (Data-Grounded) */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Recommended Next Step
                  </span>
                  {nextStep.badge && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {nextStep.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-heading leading-snug">
                  {nextStep.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {nextStep.reason}
                </p>
              </div>

              <Link
                to={nextStep.actionLink}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span>{nextStep.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* SECTION E: TOPIC MASTERY (HONEST REPRODUCIBLE CALCULATION) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Topic Mastery Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Performance metrics derived directly from stored practice attempts and recall ratings.
                </p>
              </div>

              <div className="text-xs text-slate-400 italic">
                Rule: Topics require at least 3 attempts before mastery classification.
              </div>
            </div>

            {topicMastery.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topicMastery.map((tm, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900 font-heading truncate">{tm.topic}</span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${tm.status === 'mastered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tm.status === 'proficient'
                                ? 'bg-indigo-100 text-indigo-800'
                                : tm.status === 'insufficient_data'
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                          {tm.level}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-tight">
                        {tm.explanation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400">
                        {tm.totalAttempts} total attempts
                      </span>
                      <Link
                        to={`/practice?topic=${encodeURIComponent(tm.topic)}`}
                        className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Practice</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <span>Complete practice quizzes or flashcard sessions to populate your topic mastery metrics.</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
