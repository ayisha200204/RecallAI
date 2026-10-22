import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Target,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PlannerPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, completionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'completed', 'high'

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');

  // New task form state
  const [newTaskTopic, setNewTaskTopic] = useState('Deadlocks');
  const [newTaskActivity, setNewTaskActivity] = useState('Review 4 Coffman conditions and Banker\'s algorithm');
  const [newTaskPriority, setNewTaskPriority] = useState('high');
  const [newTaskMinutes, setNewTaskMinutes] = useState(15);
  const [newTaskDate, setNewTaskDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/planner/tasks');
      setTasks(res.data.tasks || []);
      setStats(res.data.stats || { total: 0, completed: 0, pending: 0, completionRate: 0 });
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (taskId) => {
    try {
      const res = await api.patch(`/planner/tasks/${taskId}/toggle`);
      const updated = res.data.task;

      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, completed: updated.completed } : t))
      );

      // Re-evaluate stats locally
      setStats((prev) => {
        const delta = updated.completed ? 1 : -1;
        const newCompleted = prev.completed + delta;
        const newPending = prev.pending - delta;
        return {
          ...prev,
          completed: newCompleted,
          pending: newPending,
          completionRate: prev.total > 0 ? Math.round((newCompleted / prev.total) * 100) : 0,
        };
      });

      if (updated.completed) {
        confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleTaskId || !newDueDate) return;

    try {
      await api.patch(`/planner/tasks/${rescheduleTaskId}/reschedule`, {
        newDueDate: new Date(newDueDate).toISOString(),
      });
      setRescheduleTaskId(null);
      setNewDueDate('');
      fetchTasks();
    } catch (err) {
      console.error('Reschedule task error:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/planner/tasks', {
        topic: newTaskTopic,
        recommendedActivity: newTaskActivity,
        priority: newTaskPriority,
        dueDate: new Date(newTaskDate).toISOString(),
        estimatedTimeMinutes: newTaskMinutes,
      });

      setShowAddModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Create task error:', err);
    }
  };

  // Exam Countdown calculation
  let examCountdownDays = null;
  if (user?.studyGoals?.examDate) {
    const target = new Date(user.studyGoals.examDate);
    const diff = target.getTime() - Date.now();
    examCountdownDays = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    if (filter === 'high') return t.priority === 'high' && !t.completed;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Adaptive Revision Planner"
          subtitle="Dynamic spaced study tasks scheduled based on your forgetting curves and target goals."
          actionButton={
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Revision Task
            </button>
          }
        />

        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Goal & Exam Countdown Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-semibold mb-1">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>Primary Goal: {user?.studyGoals?.primaryGoal || 'University exams'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading">
                {user?.studyGoals?.targetSubjects?.join(', ') || 'Operating Systems'} Revision Routine
              </h2>
              <p className="text-xs text-slate-300">
                Daily target: {user?.studyGoals?.dailyTargetQuestions || 15} questions • {user?.studyGoals?.preferredDurationMinutes || 30} mins
              </p>
            </div>

            {examCountdownDays !== null && (
              <div className="p-4 rounded-xl bg-white/10 border border-white/10 text-center shrink-0 min-w-[140px]">
                <span className="text-[11px] text-indigo-200 block uppercase tracking-wider font-semibold">
                  Exam Countdown
                </span>
                <span className="text-3xl font-extrabold text-white font-mono block my-0.5">
                  {examCountdownDays}
                </span>
                <span className="text-[11px] text-indigo-200 block">days remaining</span>
              </div>
            )}
          </div>

          {/* Completion Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Total Tasks</span>
              <span className="text-2xl font-bold text-slate-900 font-heading mt-0.5 block">{stats.total}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Completed</span>
              <span className="text-2xl font-bold text-emerald-600 font-heading mt-0.5 block">{stats.completed}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Pending</span>
              <span className="text-2xl font-bold text-amber-600 font-heading mt-0.5 block">{stats.pending}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block">Completion Rate</span>
              <span className="text-2xl font-bold text-indigo-600 font-heading mt-0.5 block">{stats.completionRate}%</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex gap-2">
              {[
                { id: 'pending', label: 'Pending Tasks' },
                { id: 'all', label: 'All Tasks' },
                { id: 'high', label: 'High Priority' },
                { id: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isOverdue =
                !task.completed && new Date(task.dueDate).getTime() < Date.now();

              return (
                <div
                  key={task._id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    task.completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task._id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 hover:border-slate-400 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold font-heading truncate ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.topic}
                        </span>
                        <Badge variant={task.priority}>{task.priority}</Badge>
                        {isOverdue && (
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Due Today / Overdue
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {task.recommendedActivity}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{task.estimatedTimeMinutes || 10} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleTaskId(task._id);
                        setNewDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Reschedule
                    </button>

                    <Link
                      to={`/practice?topic=${encodeURIComponent(task.topic)}`}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs transition-colors"
                    >
                      <span>Start Task</span>
                      <Play className="w-3 h-3 fill-white" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && !loading && (
              <EmptyState
                icon={CalendarCheck}
                title="No tasks found"
                description={
                  filter === 'completed'
                    ? 'No completed tasks yet. Finish a task above to see it here.'
                    : 'All caught up! The ML recommendation engine will schedule new revision micro-tasks based on your study history.'
                }
              />
            )}
          </div>
        </div>

        {/* Reschedule Modal */}
        {rescheduleTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Reschedule Revision Task
              </h3>
              <p className="text-xs text-slate-500">
                Choose a new due date for this spaced repetition task.
              </p>

              <form onSubmit={handleReschedule} className="space-y-4">
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleTaskId(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  >
                    Save Due Date
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Custom Task Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Create Custom Revision Task
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskTopic}
                    onChange={(e) => setNewTaskTopic(e.target.value)}
                    placeholder="e.g. Memory Management"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recommended Activity Description
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskActivity}
                    onChange={(e) => setNewTaskActivity(e.target.value)}
                    placeholder="e.g. Review page replacement algorithms and TLB misses"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
