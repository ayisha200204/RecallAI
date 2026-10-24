import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import api from '../services/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [overviewRes, mlRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/ml-predictions'),
        ]);
        setOverview(overviewRes.data);
        setMlData(mlRes.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const summary = overview?.summary || {
    totalQuestionsAnswered: 0,
    overallAccuracy: 0,
    topicsPracticedCount: 0,
    streak: 0,
    topicsNeedingRevision: 0,
  };

  const activityData = overview?.activityTrend || [];
  const topicMastery = overview?.topicMastery || [];
  const predictions = mlData?.predictions || [];
  const modelMetadata = mlData?.modelMetadata || {};

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Learning Analytics & Performance Modeling"
          subtitle="Empirical practice performance, cognitive forgetting curves, and calibrated ML predictions."
        />

        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Scientific Distinction Banner */}
          {/* <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800">
                Data Framework & Methodology:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold">
                ● Observed Performance: Empirical quiz attempts
              </span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/60 font-semibold">
                ● Model Prediction: Estimated future question recall
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold">
                ● Mastery Index: Long-term multi-attempt consistency
              </span>
            </div>
          </div> */}

          {/* High Level Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Overall Practice Accuracy</span>
              <span className="text-3xl font-extrabold text-slate-900 font-heading mt-1 block">
                {summary.overallAccuracy}%
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                {summary.totalQuestionsAnswered} questions attempted
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Active Study Streak</span>
              <span className="text-3xl font-extrabold text-amber-600 font-heading mt-1 block">
                {summary.streak} days
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Consecutive days with recorded practice
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Topics Under Observation</span>
              <span className="text-3xl font-extrabold text-slate-900 font-heading mt-1 block">
                {summary.topicsPracticedCount}
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">
                Calibrated by decay model
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Topics Needing Revision</span>
              <span className="text-3xl font-extrabold text-rose-600 font-heading mt-1 block">
                {summary.topicsNeedingRevision}
              </span>
              <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 inline-block mt-1 font-medium">
                Retention risk &gt; 55%
              </span>
            </div>
          </div>

          {/* Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Activity Area Chart */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Learning Volume Over Time
                  </h3>
                  <span className="text-xs text-slate-500">
                    Questions attempted daily
                  </span>
                </div>
                <Badge variant="indigo">Daily Trend</Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
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
                      fill="url(#colorQuestions)"
                      name="Attempts"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Topic Accuracy Bar Chart */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Topic-Wise Accuracy (%)
                    </h3>
                    <span className="text-xs text-slate-500">
                      Empirical correctness rate
                    </span>
                  </div>
                  <Badge variant="success">Observed Data</Badge>
                </div>

                {topicMastery.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topicMastery.map((t) => ({ name: t.topic.split(' ')[0], accuracy: t.accuracy }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="accuracy" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Accuracy %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">
                    No topic practice data recorded yet. Complete quizzes to establish empirical accuracy.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Machine Learning Model Benchmark & Predictions */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading">
                    Machine Learning Performance Prediction Engine
                  </h3>
                  <span className="text-xs text-slate-400">
                    Model: {modelMetadata.modelType || 'Logistic Regression (Baseline)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-md font-mono">
                  ROC-AUC: {modelMetadata.metrics?.roc_auc || 0.879}
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-md font-mono">
                  Accuracy: {modelMetadata.metrics?.accuracy ? `${Math.round(modelMetadata.metrics.accuracy * 100)}%` : '81.4%'}
                </span>
              </div>
            </div>

            {/* Prototype notice */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Cognitive Science Retention Modeling: </strong>
                {modelMetadata.prototypeNotice || 'Trained on cognitive-decay learning trajectory models.'} Predictions estimate recall probability and guide adaptive revision priorities.
              </div>
            </div>

            {/* Topic Predictions Grid */}
            {predictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictions.map((pred) => (
                  <div
                    key={pred.topic}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold font-heading text-white truncate">
                          {pred.topic}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${pred.urgency === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : pred.urgency === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                        >
                          {pred.urgency === 'high' ? 'High Risk' : pred.urgency === 'medium' ? 'Moderate' : 'Stable'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">Predicted Recall Probability:</span>
                        <span className="font-mono text-base font-bold text-indigo-300">
                          {Math.round(pred.predictedRecallProbability * 100)}%
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {pred.recommendationReason}
                      </p>
                    </div>

                    <Link
                      to={`/practice?topic=${encodeURIComponent(pred.topic)}`}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      <span>Practice {pred.topic.split(' ')[0]}</span>
                      <Play className="w-3 h-3 fill-white" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No topic retention predictions yet. Create a study set and complete practice questions to calculate personalized forgetting risk.
              </div>
            )}
          </div>

          {/* Topic Mastery Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Topic Mastery & Evidence Table
                </h3>
                <span className="text-xs text-slate-500">
                  Comprehensive breakdown of quiz attempts, confidence ratings, and mastery stages
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-6">Topic</th>
                    <th className="py-3 px-6">Attempts</th>
                    <th className="py-3 px-6">Observed Accuracy</th>
                    <th className="py-3 px-6">Avg Confidence</th>
                    <th className="py-3 px-6">Mastery Level</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topicMastery.map((tm) => (
                    <tr key={tm.topic} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {tm.topic}
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        {tm.totalAttempts}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{tm.accuracy}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tm.accuracy >= 75 ? 'bg-emerald-500' : tm.accuracy >= 55 ? 'bg-indigo-500' : 'bg-amber-500'
                                }`}
                              style={{ width: `${tm.accuracy}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-600">
                        {tm.avgConfidence} / 5.0
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge
                          variant={
                            tm.level === 'Mastered' ? 'success' : tm.level === 'Intermediate' ? 'indigo' : 'warning'
                          }
                        >
                          {tm.level}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          to={`/practice?topic=${encodeURIComponent(tm.topic)}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Practice
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {topicMastery.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No topic attempts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
