import React, { useState } from 'react';
import {
  Settings,
  Target,
  Mic,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Save,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function SettingsPage() {
  const { user, updateGoals, demoLogin } = useAuth();

  const [primaryGoal, setPrimaryGoal] = useState(user?.studyGoals?.primaryGoal || 'University exams');
  const [targetSubjects, setTargetSubjects] = useState(
    (user?.studyGoals?.targetSubjects || ['Operating Systems']).join(', ')
  );
  const [examDate, setExamDate] = useState(
    user?.studyGoals?.examDate ? user.studyGoals.examDate.split('T')[0] : ''
  );
  const [duration, setDuration] = useState(user?.studyGoals?.preferredDurationMinutes || 30);
  const [dailyQuestions, setDailyQuestions] = useState(user?.studyGoals?.dailyTargetQuestions || 15);

  const [voiceEnabled, setVoiceEnabled] = useState(user?.preferences?.voiceEnabled !== false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');

    try {
      const subjects = targetSubjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateGoals({
        primaryGoal,
        targetSubjects: subjects,
        examDate: examDate ? new Date(examDate).toISOString() : null,
        preferredDurationMinutes: Number(duration),
        dailyTargetQuestions: Number(dailyQuestions),
      });

      setMsg('Study preferences and adaptive goals saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('This will reload the official Operating Systems demo curriculum and reset sample attempts. Proceed?')) {
      return;
    }
    try {
      await demoLogin();
      setMsg('Demo environment reset successfully with fresh Operating Systems sample data.');
    } catch (err) {
      setError('Failed to reset demo data.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Account & Learning Settings"
          subtitle="Configure your study objectives, exam timeline, and voice tutor preferences."
        />

        <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {msg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Study Objectives & Timeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These inputs personalize the adaptive revision recommendations and task urgency.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Objective
                </label>
                <select
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="University exams">University exams</option>
                  <option value="Competitive exams">Competitive exams</option>
                  <option value="Technical interview preparation">Technical interview preparation</option>
                  <option value="General learning">General learning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Subjects (Comma Separated)
              </label>
              <input
                type="text"
                value={targetSubjects}
                onChange={(e) => setTargetSubjects(e.target.value)}
                placeholder="Operating Systems, Networks, Algorithms"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preferred Daily Study Time (Minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Daily Question Target
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={dailyQuestions}
                  onChange={(e) => setDailyQuestions(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>

          {/* Demo Reset Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Demo & Prototype Environment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reload the pre-configured Operating Systems curriculum and historical learning records.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you wish to test fresh active recall tracking or demo features for reviewers, click below to re-seed the prepared Operating Systems curriculum (Processes & Threads, CPU Scheduling, Deadlocks, Memory Management) and reset the demo student state.
            </p>

            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset & Reload Demo Environment</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
