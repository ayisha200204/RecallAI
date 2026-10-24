import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Filter,
  Sparkles,
  BookOpen,
  Volume2,
  AlertCircle,
  Check,
  ChevronRight,
  Layers,
  Clock,
  Eye,
  CheckSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
// import ConfidenceSelector from '../components/common/ConfidenceSelector';
import api from '../services/api';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTopic = searchParams.get('topic') || 'all';
  const initialMaterialId = searchParams.get('materialId') || '';

  // Filter state
  const [topicFilter, setTopicFilter] = useState(initialTopic);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'mcq', 'true_false', 'short_answer'

  // Dynamic topics from the user's own questions
  const [availableTopics, setAvailableTopics] = useState([]);

  // Test Mode Settings: 'immediate' | 'end_of_test'
  const [feedbackMode, setFeedbackMode] = useState('immediate');
  const [timedMode, setTimedMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const timerRef = useRef(null);

  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Current question response state
  const [selectedOption, setSelectedOption] = useState('');
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Overall session results
  const [attemptsHistory, setAttemptsHistory] = useState([]);
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);

  // Fetch distinct topics from user's own questions on mount
  useEffect(() => {
    api.get('/practice/topics')
      .then((res) => setAvailableTopics(res.data.topics || []))
      .catch(() => setAvailableTopics([]));
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setIsCompleted(false);
    setCurrentIndex(0);
    setAttemptsHistory([]);
    resetQuestionState();

    try {
      const res = await api.get('/practice/questions', {
        params: {
          topic: topicFilter,
          difficulty: difficultyFilter,
          questionType: typeFilter,
          materialId: initialMaterialId || undefined,
          limit: 10,
        },
      });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Fetch practice questions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [topicFilter, difficultyFilter, typeFilter]);

  const resetQuestionState = () => {
    setSelectedOption('');
    setShortAnswerInput('');
    setConfidence(3);
    setIsAnswerSubmitted(false);
    setEvaluationResult(null);
    if (timedMode) setTimeRemaining(45);
  };

  // Timer effect
  useEffect(() => {
    if (!timedMode || isCompleted || isAnswerSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto submit current selection or mark empty
          handleSubmitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timedMode, isCompleted, isAnswerSubmitted, currentIndex]);

  const currentQuestion = questions[currentIndex];

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || isAnswerSubmitted) return;

    let answer = '';
    if (currentQuestion.questionType === 'mcq' || currentQuestion.questionType === 'true_false') {
      answer = selectedOption;
    } else {
      answer = shortAnswerInput;
    }

    if (!answer || answer.trim().length === 0) {
      if (!timedMode) {
        alert('Please select an option or write your response.');
        return;
      }
      answer = 'No answer submitted';
    }

    setSubmittingAttempt(true);
    try {
      const res = await api.post('/practice/attempt', {
        questionId: currentQuestion._id || currentQuestion.id,
        submittedAnswer: answer,
        confidenceRating: confidence,
        timeTakenSeconds: timedMode ? 45 - timeRemaining : 20,
      });

      setEvaluationResult(res.data);
      setIsAnswerSubmitted(true);

      const attemptRecord = {
        question: currentQuestion,
        submittedAnswer: answer,
        isCorrect: res.data.isCorrect,
        score: res.data.score,
        correctAnswer: res.data.correctAnswer,
        explanation: res.data.explanation,
        feedback: res.data.feedback,
        confidence,
      };

      setAttemptsHistory((prev) => [...prev, attemptRecord]);

      // If in end-of-test mode, auto advance after brief pause
      if (feedbackMode === 'end_of_test') {
        setTimeout(() => {
          handleNextQuestion(attemptRecord);
        }, 300);
      }
    } catch (err) {
      console.error('Submit attempt error:', err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleNextQuestion = (latestRecord = null) => {
    if (currentIndex < questions.length - 1) {
      resetQuestionState();
      setCurrentIndex((i) => i + 1);
    } else {
      // Completed test
      setIsCompleted(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      const allRecords = latestRecord ? [...attemptsHistory, latestRecord] : attemptsHistory;
      const correctCount = allRecords.filter((a) => a.isCorrect).length;

      api.post('/practice/session', {
        sessionType: 'practice',
        title: `Test: ${topicFilter === 'all' ? 'Adaptive Curriculum' : topicFilter}`,
        questionsAttempted: allRecords.length,
        correctCount,
        durationSeconds: 180,
        topicsCovered: Array.from(new Set(allRecords.map((a) => a.question.topic))),
        resultsBreakdown: allRecords.map((a) => ({
          topic: a.question.topic,
          isCorrect: a.isCorrect,
        })),
      }).catch(() => { });
    }
  };

  const handleReadQuestion = () => {
    if ('speechSynthesis' in window && currentQuestion) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.questionText);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const correctAttemptsCount = attemptsHistory.filter((a) => a.isCorrect).length;
  const accuracyPercentage =
    attemptsHistory.length > 0 ? Math.round((correctAttemptsCount / attemptsHistory.length) * 100) : 0;

  // Strengths and weaknesses calculation
  const topicStats = {};
  attemptsHistory.forEach((att) => {
    const t = att.question?.topic || 'General';
    if (!topicStats[t]) topicStats[t] = { correct: 0, total: 0 };
    topicStats[t].total += 1;
    if (att.isCorrect) topicStats[t].correct += 1;
  });

  const strengths = [];
  const weaknesses = [];
  Object.entries(topicStats).forEach(([t, s]) => {
    const pct = s.total > 0 ? (s.correct / s.total) * 100 : 0;
    if (pct >= 70) strengths.push({ topic: t, accuracy: Math.round(pct) });
    else weaknesses.push({ topic: t, accuracy: Math.round(pct) });
  });

  // Filtered review list
  const reviewList = showOnlyIncorrect
    ? attemptsHistory.filter((a) => !a.isCorrect)
    : attemptsHistory;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Active Recall Test & Practice"
          subtitle="Multiple-choice, True/False, and conceptual short answer questions with persistent performance evaluation."
          actionButton={
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Create New Test Set</span>
            </Link>
          }
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Test Control & Filter Bar */}
          {!isCompleted && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span>Topic:</span>
                </div>
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Topics</option>
                  {availableTopics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Question Types</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              {/* Feedback Mode & Timer Toggles */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFeedbackMode('immediate')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${feedbackMode === 'immediate' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                      }`}
                  >
                    Immediate Feedback
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackMode('end_of_test')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${feedbackMode === 'end_of_test' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                      }`}
                  >
                    End of Test
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setTimedMode(!timedMode)}
                  className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${timedMode ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600'
                    }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timedMode ? `${timeRemaining}s` : 'Timer'}</span>
                </button>
              </div>
            </div>
          )}

          {!isCompleted ? (
            loading ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-500 text-sm">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3" />
                <span>Loading adaptive test questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 font-heading">
                  No practice questions match these filters
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select 'All Topics' or create a new study set using the study material builder.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter('all');
                    setTypeFilter('all');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* Active Test Question Card */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <Badge variant={currentQuestion.difficulty}>
                        {currentQuestion.difficulty}
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span className="text-indigo-700 font-medium">{currentQuestion.topic}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 capitalize">
                        {currentQuestion.questionType.replace('_', ' ')}
                      </span>
                    </div>

                    <span>
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading leading-snug">
                      {currentQuestion.questionText}
                    </h2>
                    <button
                      type="button"
                      onClick={handleReadQuestion}
                      title="Read question aloud"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* MCQ Options */}
                  {currentQuestion.questionType === 'mcq' && (
                    <div className="grid grid-cols-1 gap-3">
                      {(currentQuestion.options || []).map((option, idx) => {
                        const isSelected = selectedOption === option;
                        let optionStyle = 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 text-slate-800';

                        if (isAnswerSubmitted && feedbackMode === 'immediate') {
                          if (evaluationResult?.correctAnswer === option) {
                            optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                          } else if (isSelected && !evaluationResult?.isCorrect) {
                            optionStyle = 'border-rose-400 bg-rose-50 text-rose-950 line-through';
                          }
                        } else if (isSelected) {
                          optionStyle = 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-semibold ring-2 ring-indigo-600/20';
                        }

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isAnswerSubmitted}
                            onClick={() => setSelectedOption(option)}
                            className={`p-4 rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <span>{option}</span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Options */}
                  {currentQuestion.questionType === 'true_false' && (
                    <div className="grid grid-cols-2 gap-4">
                      {['True', 'False'].map((opt) => {
                        const isSelected = selectedOption === opt;
                        let btnStyle = 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800';

                        if (isAnswerSubmitted && feedbackMode === 'immediate') {
                          if (evaluationResult?.correctAnswer === opt) {
                            btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-extrabold';
                          } else if (isSelected && !evaluationResult?.isCorrect) {
                            btnStyle = 'border-rose-400 bg-rose-50 text-rose-950 line-through';
                          }
                        } else if (isSelected) {
                          btnStyle = 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-extrabold ring-2 ring-indigo-600/20';
                        }

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isAnswerSubmitted}
                            onClick={() => setSelectedOption(opt)}
                            className={`py-6 rounded-2xl border text-center font-heading text-lg font-bold transition-all cursor-pointer ${btnStyle}`}
                          >
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Conceptual Short Answer */}
                  {currentQuestion.questionType === 'short_answer' && (
                    <div className="space-y-3">
                      <textarea
                        rows={4}
                        disabled={isAnswerSubmitted}
                        value={shortAnswerInput}
                        onChange={(e) => setShortAnswerInput(e.target.value)}
                        placeholder="Explain the concept in your own words. The evaluator looks for understanding of key principles..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed font-body"
                      />
                    </div>
                  )}

                  {/* Confidence Selector before submission */}
                  {/* {!isAnswerSubmitted && (
                    <div className="pt-2 border-t border-slate-100">
                      <ConfidenceSelector value={confidence} onChange={setConfidence} />
                    </div>
                  )} */}

                  {/* Immediate Feedback Explanation Panel */}
                  {isAnswerSubmitted && feedbackMode === 'immediate' && evaluationResult && (
                    <div
                      className={`p-5 rounded-2xl border space-y-3 ${evaluationResult.isCorrect
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/80 border-amber-200 text-amber-950'
                        }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs font-heading">
                        {evaluationResult.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <span>{evaluationResult.feedback?.summary}</span>
                      </div>

                      {evaluationResult.explanation && (
                        <p className="text-xs leading-relaxed text-slate-800">
                          {evaluationResult.explanation}
                        </p>
                      )}

                      {evaluationResult.feedback?.conceptsMatched?.length > 0 && (
                        <div className="text-[11px] text-emerald-900 flex flex-wrap gap-1 items-center pt-1">
                          <span className="font-semibold">Concepts Identified:</span>
                          {evaluationResult.feedback.conceptsMatched.map((c, i) => (
                            <span key={i} className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold">
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Controls */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                  </span>

                  {!isAnswerSubmitted ? (
                    <button
                      type="button"
                      disabled={submittingAttempt}
                      onClick={handleSubmitAnswer}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {submittingAttempt ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNextQuestion()}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{currentIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            /* COMPREHENSIVE TEST RESULTS SUMMARY (Section 7) */
            <div className="space-y-6">
              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 max-w-xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                    Test Results Summary
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 font-heading">
                    {accuracyPercentage}% Score
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    You answered {correctAttemptsCount} of {attemptsHistory.length} questions correctly.
                  </p>
                </div>

                {/* Strengths & Weaknesses Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-1.5">
                      Strengths Identified
                    </span>
                    {strengths.length > 0 ? (
                      <ul className="text-xs space-y-1 text-emerald-950 font-medium">
                        {strengths.map((s, i) => (
                          <li key={i} className="truncate">✓ {s.topic} ({s.accuracy}%)</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-emerald-700 italic">Continue practicing to build mastery.</span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1.5">
                      Needs Improvement
                    </span>
                    {weaknesses.length > 0 ? (
                      <ul className="text-xs space-y-1 text-amber-950 font-medium">
                        {weaknesses.map((w, i) => (
                          <li key={i} className="truncate">✗ {w.topic} ({w.accuracy}%)</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-amber-700 italic">No weak topics detected! Excellent retention.</span>
                    )}
                  </div>
                </div>

                {/* 1-Click Flashcard Recommendation for Struggling Concepts */}
                {weaknesses.length > 0 && (
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="text-xs">
                      <span className="font-bold text-indigo-900 block">Recommended Flashcard Reinforcement:</span>
                      <span className="text-indigo-700">Practice weak concepts in flashcard active recall.</span>
                    </div>
                    <Link
                      to={`/study?topic=${encodeURIComponent(weaknesses[0].topic)}`}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1.5"
                    >
                      <span>Study {weaknesses[0].topic}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={fetchQuestions}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Retake Test
                  </button>

                  <Link
                    to="/dashboard"
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Return to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Detailed Incorrect Answers Review List (Section 7) */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Detailed Answers Review
                  </h3>

                  <button
                    type="button"
                    onClick={() => setShowOnlyIncorrect(!showOnlyIncorrect)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${showOnlyIncorrect
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {showOnlyIncorrect ? 'Showing Incorrect Only' : 'Show Only Incorrect Answers'}
                  </button>
                </div>

                <div className="space-y-4">
                  {reviewList.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border space-y-3 ${item.isCorrect ? 'border-slate-200 bg-slate-50/50' : 'border-rose-200 bg-rose-50/30'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.question.topic}
                        </span>
                        <span className={`font-extrabold ${item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {item.question.questionText}
                      </p>

                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-400">Your Answer: </span>
                          <span className={item.isCorrect ? 'font-semibold text-emerald-800' : 'font-semibold text-rose-700'}>
                            {item.submittedAnswer}
                          </span>
                        </div>

                        {!item.isCorrect && item.correctAnswer && (
                          <div>
                            <span className="text-slate-400">Correct Answer: </span>
                            <span className="font-bold text-slate-800">
                              {item.correctAnswer}
                            </span>
                          </div>
                        )}

                        {item.explanation && (
                          <p className="text-slate-600 pt-1 text-[11px] leading-relaxed">
                            Explanation: {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
