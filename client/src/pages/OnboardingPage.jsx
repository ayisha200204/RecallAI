import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Check, Calendar, Clock, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STUDY_GOALS = [
  { id: 'University exams', label: 'University Exams', desc: 'Semester finals, midterms & college curricula', icon: '🎓' },
  { id: 'Competitive exams', label: 'Competitive Exams', desc: 'Standardized aptitude, GRE, GATE, USMLE', icon: '🏆' },
  { id: 'Technical interview preparation', label: 'Tech Interview Prep', desc: 'System design, OS, algorithms & DSA', icon: '💻' },
  { id: 'General learning', label: 'General Learning', desc: 'Deep domain mastery & lifelong self-study', icon: '📚' },
];

const PREFERRED_DURATIONS = [
  { minutes: 15, label: '15 min / day', desc: 'Micro-learning' },
  { minutes: 30, label: '30 min / day', desc: 'Balanced focus' },
  { minutes: 45, label: '45 min / day', desc: 'Deep dive' },
  { minutes: 60, label: '60 min / day', desc: 'Intensive prep' },
];

export default function OnboardingPage() {
  const { user, updateGoals } = useAuth();
  const navigate = useNavigate();

  const [primaryGoal, setPrimaryGoal] = useState(user?.studyGoals?.primaryGoal || 'University exams');
  const [subjectsInput, setSubjectsInput] = useState(
    (user?.studyGoals?.targetSubjects || []).join(', ')
  );
  const [examDate, setExamDate] = useState(
    user?.studyGoals?.examDate ? user.studyGoals.examDate.split('T')[0] : ''
  );
  const [duration, setDuration] = useState(user?.studyGoals?.preferredDurationMinutes || 30);
  const [dailyQuestions, setDailyQuestions] = useState(user?.studyGoals?.dailyTargetQuestions || 15);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const subjects = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateGoals({
        primaryGoal,
        targetSubjects: subjects,
        examDate: examDate ? new Date(examDate).toISOString() : null,
        preferredDurationMinutes: duration,
        dailyTargetQuestions: dailyQuestions,
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Personalizing Your Experience</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Welcome, {user?.name || 'Scholar'}!
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Let's configure your study routine so RecallAI can calibrate your revision plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 space-y-6">
          {/* Step 1: Primary Goal */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              1. What is your primary study objective?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STUDY_GOALS.map((goal) => {
                const isSelected = primaryGoal === goal.id;
                return (
                  <div
                    key={goal.id}
                    onClick={() => setPrimaryGoal(goal.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{goal.icon}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className="text-xs font-bold text-slate-900 block font-heading">
                      {goal.label}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {goal.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Subjects */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              2. Target subjects or modules (comma separated)
            </label>
            <input
              type="text"
              value={subjectsInput}
              onChange={(e) => setSubjectsInput(e.target.value)}
              placeholder="e.g. Mathematics, Science, Literature, History"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Enter your active subjects to personalize your study recommendations.
            </span>
          </div>

          {/* Step 3: Exam Date (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                3. Optional Exam Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Daily Question Target
              </label>
              <select
                value={dailyQuestions}
                onChange={(e) => setDailyQuestions(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value={10}>10 questions / day</option>
                <option value={15}>15 questions / day (Recommended)</option>
                <option value={25}>25 questions / day</option>
                <option value={40}>40 questions / day</option>
              </select>
            </div>
          </div>

          {/* Step 4: Preferred Duration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              4. Preferred Daily Study Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PREFERRED_DURATIONS.map((dur) => {
                const isSelected = duration === dur.minutes;
                return (
                  <button
                    type="button"
                    key={dur.minutes}
                    onClick={() => setDuration(dur.minutes)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white font-semibold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">{dur.label}</span>
                    <span className={`text-[10px] block ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {dur.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>{saving ? 'Configuring Dashboard...' : 'Enter Dashboard & Start Studying'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
