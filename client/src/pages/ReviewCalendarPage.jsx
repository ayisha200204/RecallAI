import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Filter,
  ArrowRight,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

export default function ReviewCalendarPage() {
  const [calendarWorkload, setCalendarWorkload] = useState([]);
  const [counts, setCounts] = useState({
    overdue: 0,
    dueToday: 0,
    totalDueToday: 0,
    newCards: 0,
    tomorrow: 0,
    in3Days: 0,
    in7Days: 0,
    later: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const fetchCalendarData = async () => {
    try {
      const res = await api.get('/study/calendar');
      setCalendarWorkload(res.data.calendarWorkload || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      console.error('Fetch review calendar error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const selectedDay = calendarWorkload[selectedDayIndex] || null;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Review Calendar & Retention Schedule"
          subtitle="Real-time spaced repetition schedule predicting optimal review days along the forgetting curve."
          actionButton={
            counts.totalDueToday > 0 ? (
              <Link
                to="/study?filter=due"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Review Due Cards ({counts.totalDueToday})</span>
              </Link>
            ) : null
          }
        />

        <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full flex-1 space-y-6">
          {/* Top Overdue / Due Today Alert */}
          {counts.overdue > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-heading">
                    {counts.overdue} Overdue Review{counts.overdue > 1 ? 's' : ''} Detected
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    These flashcards have surpassed their target retention window. Review them to reset forgetting.
                  </p>
                </div>
              </div>

              <Link
                to="/study?filter=due"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs shrink-0"
              >
                Review Overdue First
              </Link>
            </div>
          )}

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Overdue
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-heading">
                {counts.overdue || 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Pending review</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Due Today
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 font-heading">
                {counts.dueToday || 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Scheduled today</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tomorrow
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-heading">
                {counts.tomorrow || 0}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Upcoming tomorrow</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Next 7 Days
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-heading">
                {(counts.tomorrow || 0) + (counts.in3Days || 0) + (counts.in7Days || 0)}
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">Total weekly volume</span>
            </div>
          </div>

          {/* 14-Day Timeline Calendar Grid */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  14-Day Workload Projection
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any day to inspect associated flashcards and concepts due on that date.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                Spaced Repetition Scheduler
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Synchronizing spaced repetition calendar...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 pt-2">
                {calendarWorkload.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  const hasDue = day.count > 0;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                          : day.isToday
                            ? 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {day.dayLabel.split(',')[0]}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="my-auto py-1">
                        <span
                          className={`text-xl font-extrabold font-heading ${hasDue
                              ? day.isToday
                                ? 'text-indigo-600'
                                : 'text-slate-800'
                              : 'text-slate-300'
                            }`}
                        >
                          {day.count}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {day.count === 1 ? 'card' : 'cards'}
                        </span>
                      </div>

                      <span className="text-[10px] font-medium text-slate-400">
                        {day.dayLabel.split(' ').slice(1).join(' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Day Inspection Drawer */}
          {selectedDay && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 font-heading">
                      Cards Due: {selectedDay.dayLabel} {selectedDay.isToday && '(Today)'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDay.count} card{selectedDay.count !== 1 ? 's' : ''} scheduled for review on this date.
                  </p>
                </div>

                {selectedDay.count > 0 && (
                  <Link
                    to={selectedDay.isToday ? '/study?filter=due' : `/study?date=${selectedDay.date}`}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Study This Batch</span>
                  </Link>
                )}
              </div>

              {selectedDay.cards?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {selectedDay.cards.map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {card.topic || 'General'}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {card.difficulty || 'medium'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">
                        {card.question}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                        <span>Deck: {card.deckTitle || 'General Studies'}</span>
                        {card.repetitions > 0 && (
                          <span className="font-semibold text-slate-600">
                            Rep #{card.repetitions}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <span className="font-semibold text-slate-700 block">No reviews scheduled for this day</span>
                  <span>Enjoy your day or learn new materials from your library!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
