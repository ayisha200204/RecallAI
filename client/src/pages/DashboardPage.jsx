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
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, materialsRes, tasksRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/materials'),
        api.get('/planner/tasks'),
      ]);

      setAnalytics(analyticsRes.data);
      setMaterials(materialsRes.data.materials || []);
      setTasks(tasksRes.data.tasks || []);
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

  const handleToggleTask = async (taskId) => {
    try {
      await api.patch(`/planner/tasks/${taskId}/toggle`);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, completed: !t.completed } : t))
      );
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const greeting = `${getTimeGreeting()}, ${firstName}.`;

  const summary = analytics?.summary || {
    totalQuestionsAnswered: 0,
    overallAccuracy: 0,
    topicsPracticedCount: 0,
    streak: 0,
    topicsNeedingRevision: 0,
  };

  const activityData = analytics?.activityTrend || [];
  const topicMastery = analytics?.topicMastery || [];
  const recommendations = analytics?.recommendations || [];

  // Top high priority recommendation for the "Continue Learning" banner
  const topRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title={greeting}
          subtitle="Let's make today's study session count."
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
                to="/materials"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Upload Notes
              </Link>
            </div>
          }
        />

        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Continue Learning Hero Card */}
          {topRecommendation ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, type: 'spring', damping: 25 }}
              whileHover={{ y: -3, boxShadow: '0 25px 35px -12px rgba(15, 23, 42, 0.35)' }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-xl"
            >
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Adaptive AI Recommendation • {topRecommendation.urgency === 'high' ? 'High Retention Risk' : 'Recommended Next Step'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-heading text-white">
                    Continue Learning: {topRecommendation.topic}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    {topRecommendation.recommendationReason}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400 font-medium">
                    <span>Current Accuracy: <strong className="text-white font-semibold">{topRecommendation.currentAccuracy}%</strong></span>
                    <span>•</span>
                    <span>Recall Stability: <strong className="text-white font-semibold">{Math.round(topRecommendation.predictedRecallProbability * 100)}%</strong></span>
                    <span>•</span>
                    <span>Est. Time: <strong className="text-white font-semibold">~{topRecommendation.estimatedMinutes} mins</strong></span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <Link
                    to={`/practice?topic=${encodeURIComponent(topRecommendation.topic)}`}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-md transition-all"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Practice Session
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-indigo-950 font-heading">
                  Welcome to RecallAI!
                </h2>
                <p className="text-xs text-indigo-800 mt-1">
                  Upload your first study note or try the preloaded Operating Systems materials to initiate your adaptive learning cycle.
                </p>
              </div>
              <Link
                to="/materials"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs"
              >
                Upload First Material
              </Link>
            </div>
          )}

          {/* Quick Actions Area */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/materials"
                  className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between group h-full block"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-heading">
                      Upload Notes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      PDF or pasted notes
                    </span>
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/practice"
                  className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between group h-full block"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-heading">
                      Practice Quiz
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Active recall testing
                    </span>
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/voice-study"
                  className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between group h-full block"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-105 transition-transform">
                    <Mic className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-heading">
                      Voice Study
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Verbal recall tutor
                    </span>
                  </div>
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/planner"
                  className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between group h-full block"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-3 group-hover:scale-105 transition-transform">
                    <CalendarCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block font-heading">
                      Revision Planner
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Targeted spaced tasks
                    </span>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Key Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Questions Answered</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-1 block">
                {summary.totalQuestionsAnswered}
              </span>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-600">{summary.overallAccuracy}%</span>
                <span>overall accuracy</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Topics Practised</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading mt-1 block">
                {summary.topicsPracticedCount}
              </span>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span>Active subject domains</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Current Study Streak</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  {summary.streak}
                </span>
                <span className="text-xs text-slate-500">days</span>
                <Flame className={`w-5 h-5 ${summary.streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 block">Calculated from actual study activity</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Topics Needing Revision</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-heading mt-1 block">
                {summary.topicsNeedingRevision}
              </span>
              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block mt-2 font-medium">
                Prioritized in Revision Planner
              </span>
            </div>
          </div>

          {/* Charts & Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 7-Day Activity Trend */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    7-Day Learning Activity
                  </h3>
                  <span className="text-xs text-slate-500">
                    Questions attempted & accuracy trends
                  </span>
                </div>
                <Badge variant="indigo">Daily History</Badge>
              </div>

              {activityData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="attempts"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAttempts)"
                        name="Questions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No learning activity recorded yet.
                </div>
              )}
            </div>

            {/* Topic Mastery Distribution */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Topic Mastery Estimates
                    </h3>
                    <span className="text-xs text-slate-500">
                      Calculated from quiz scores & confidence
                    </span>
                  </div>
                  <Link to="/progress" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    View Details
                  </Link>
                </div>

                <div className="space-y-3.5 mt-2">
                  {topicMastery.slice(0, 4).map((tm) => (
                    <div key={tm.topic} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                          {tm.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              tm.level === 'Mastered'
                                ? 'bg-emerald-50 text-emerald-700'
                                : tm.level === 'Intermediate'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {tm.level}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px] font-medium">
                            {tm.accuracy}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tm.accuracy >= 75
                              ? 'bg-emerald-500'
                              : tm.accuracy >= 55
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(5, tm.accuracy)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {topicMastery.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">
                      Complete practice quizzes to establish topic mastery baselines.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                * Mastery levels are approximate indicators, not definitive proof of understanding.
              </div>
            </div>
          </div>

          {/* Revision Tasks & Personalised Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upcoming Revision Tasks */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Upcoming Revision Tasks
                  </h3>
                  <span className="text-xs text-slate-500">
                    Spaced practice prioritized by forgetting risk
                  </span>
                </div>
                <Link to="/planner" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Open Planner
                </Link>
              </div>

              <div className="space-y-2.5">
                {tasks.slice(0, 4).map((task) => (
                  <div
                    key={task._id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      task.completed
                        ? 'bg-slate-50/70 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task._id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                          task.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-400 bg-white'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-bold text-slate-900 block font-heading truncate ${
                            task.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.topic}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {task.recommendedActivity}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Badge variant={task.priority}>{task.priority}</Badge>
                      <Link
                        to={`/practice?topic=${encodeURIComponent(task.topic)}`}
                        className="text-xs text-indigo-600 hover:text-indigo-700 p-1 font-semibold"
                        title="Practice Now"
                      >
                        <Play className="w-3.5 h-3.5 fill-indigo-600" />
                      </Link>
                    </div>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No pending revision tasks. High retention stability!
                  </p>
                )}
              </div>
            </div>

            {/* Recent Study Materials */}
            <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    My Study Materials
                  </h3>
                  <span className="text-xs text-slate-500">
                    Uploaded notes and generated question packs
                  </span>
                </div>
                <Link to="/materials" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Manage Materials
                </Link>
              </div>

              <div className="space-y-3">
                {materials.slice(0, 3).map((mat) => (
                  <div
                    key={mat._id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate font-heading">
                          {mat.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{mat.subject}</span>
                          <span>•</span>
                          <span>{mat.flashcardsCount || 5} cards</span>
                          <span>•</span>
                          <span>{mat.questionsCount || 10} questions</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/practice?materialId=${mat._id}`}
                      className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                    >
                      Practice
                    </Link>
                  </div>
                ))}

                {materials.length === 0 && (
                  <EmptyState
                    title="No materials uploaded"
                    description="Upload your lecture notes or PDF textbooks to generate active recall materials."
                    action={
                      <Link
                        to="/materials"
                        className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        Upload Note
                      </Link>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
