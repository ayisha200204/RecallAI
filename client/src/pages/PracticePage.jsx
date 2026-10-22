import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import ConfidenceSelector from '../components/common/ConfidenceSelector';
import api from '../services/api';

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') || 'all';
  const initialMaterialId = searchParams.get('materialId') || '';

  // Filter state
  const [topicFilter, setTopicFilter] = useState(initialTopic);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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
  const [attemptsHistory, setAttemptsHistory] = useState([]); // [{ question, submittedAnswer, isCorrect, score, feedback }]

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
  };

  const currentQuestion = questions[currentIndex];

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || isAnswerSubmitted) return;

    const answer =
      currentQuestion.questionType === 'mcq' ? selectedOption : shortAnswerInput;

    if (!answer || answer.trim().length === 0) {
      alert('Please select an option or write your explanation.');
      return;
    }

    setSubmittingAttempt(true);
    try {
      const res = await api.post('/practice/attempt', {
        questionId: currentQuestion._id || currentQuestion.id,
        submittedAnswer: answer,
        confidenceRating: confidence,
        timeTakenSeconds: 20,
      });

      setEvaluationResult(res.data);
      setIsAnswerSubmitted(true);

      // Record in session attempts history
      setAttemptsHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          submittedAnswer: answer,
          isCorrect: res.data.isCorrect,
          score: res.data.score,
          correctAnswer: res.data.correctAnswer,
          explanation: res.data.explanation,
          feedback: res.data.feedback,
          confidence,
        },
      ]);
    } catch (err) {
      console.error('Submit attempt error:', err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      resetQuestionState();
      setCurrentIndex((i) => i + 1);
    } else {
      // Completed practice session
      setIsCompleted(true);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });

      const correctCount = attemptsHistory.filter((a) => a.isCorrect).length;
      api.post('/practice/session', {
        sessionType: 'practice',
        title: `Practice Quiz: ${topicFilter === 'all' ? 'All Topics' : topicFilter}`,
        questionsAttempted: attemptsHistory.length,
        correctCount,
        topicsCovered: Array.from(new Set(attemptsHistory.map((a) => a.question.topic))),
      }).catch(() => {});
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
  const accuracyPercentage = attemptsHistory.length > 0 ? Math.round((correctAttemptsCount / attemptsHistory.length) * 100) : 0;

  // Group missed questions
  const missedQuestions = attemptsHistory.filter((a) => !a.isCorrect);

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Practice Mode"
          subtitle="Test active recall, receive immediate semantic evaluation, and reinforce weak topics."
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Filter Bar */}
          {!isCompleted && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Filters:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Topic filter */}
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Topics</option>
                  <option value="Processes and Threads">Processes and Threads</option>
                  <option value="CPU Scheduling">CPU Scheduling</option>
                  <option value="Deadlocks">Deadlocks</option>
                  <option value="Memory Management">Memory Management</option>
                  <option value="Virtual Memory">Virtual Memory</option>
                </select>

                {/* Difficulty filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                {/* Question type filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>
            </div>
          )}

          {!isCompleted ? (
            loading ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-500 text-sm">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3" />
                <span>Preparing adaptive questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
                <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 font-heading">
                  No questions match these filters
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Try selecting 'All Topics' or upload new notes in Study Materials.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter('all');
                    setDifficultyFilter('all');
                    setTypeFilter('all');
                  }}
                  className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              /* Active Question Card */
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
                      <span className="text-slate-500 font-normal">
                        {currentQuestion.questionType === 'mcq' ? 'Multiple Choice' : 'Conceptual Short Answer'}
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

                {/* Question Box */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
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
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* MCQ Options */}
                  {currentQuestion.questionType === 'mcq' && (
                    <div className="space-y-2.5">
                      {(currentQuestion.options || []).map((option, idx) => {
                        const isSelected = selectedOption === option;
                        const isRevealed = isAnswerSubmitted;
                        const isOptionCorrect = evaluationResult?.correctAnswer === option;

                        let styleClasses = 'border-slate-200 hover:border-slate-300 bg-slate-50/50';

                        if (isRevealed) {
                          if (isOptionCorrect) {
                            styleClasses = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold';
                          } else if (isSelected && !evaluationResult?.isCorrect) {
                            styleClasses = 'border-rose-400 bg-rose-50/60 text-rose-950';
                          } else {
                            styleClasses = 'border-slate-200 opacity-60';
                          }
                        } else if (isSelected) {
                          styleClasses = 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs';
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => !isAnswerSubmitted && setSelectedOption(option)}
                            className={`p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${styleClasses}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span>{option}</span>
                            </div>

                            {isRevealed && isOptionCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                            {isRevealed && isSelected && !evaluationResult?.isCorrect && (
                              <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Input */}
                  {currentQuestion.questionType === 'short_answer' && (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        disabled={isAnswerSubmitted}
                        value={shortAnswerInput}
                        onChange={(e) => setShortAnswerInput(e.target.value)}
                        placeholder="Write your explanation in your own words. Explain key mechanisms and concepts..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 leading-relaxed font-body"
                      />
                      <span className="text-[11px] text-slate-400 block">
                        Our semantic evaluator tests conceptual understanding and expected key concepts rather than strict verbatim matching.
                      </span>
                    </div>
                  )}

                  {/* Immediate Feedback Box upon submission */}
                  {isAnswerSubmitted && evaluationResult && (
                    <div
                      className={`p-5 rounded-xl border space-y-3 ${
                        evaluationResult.isCorrect
                          ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
                          : 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {evaluationResult.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <h4 className="text-sm font-bold font-heading">
                          {evaluationResult.isCorrect ? 'Correct! Strong Conceptual Recall.' : 'Needs Reinforcement.'}
                        </h4>
                      </div>

                      <p className="text-xs leading-relaxed">
                        {evaluationResult.feedback?.summary || evaluationResult.explanation}
                      </p>

                      {/* Concept tags matched vs missed for short-answer */}
                      {evaluationResult.feedback?.conceptsMatched && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/40 text-xs">
                          {evaluationResult.feedback.conceptsMatched.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-emerald-800">Concepts Matched:</span>
                              {evaluationResult.feedback.conceptsMatched.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  ✓ {c}
                                </span>
                              ))}
                            </div>
                          )}

                          {evaluationResult.feedback.conceptsMissed?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-amber-800">Missing Concepts:</span>
                              {evaluationResult.feedback.conceptsMissed.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  ✗ {c}
                                </span>
                              ))}
                            </div>
                          )}

                          {evaluationResult.feedback.guidance && (
                            <p className="text-xs text-slate-700 italic pt-1">
                              Guidance: {evaluationResult.feedback.guidance}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence Rating during attempt */}
                  {!isAnswerSubmitted && (
                    <div className="pt-2 border-t border-slate-100">
                      <ConfidenceSelector value={confidence} onChange={setConfidence} />
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-[10px] text-slate-600">Enter</kbd> to submit
                  </span>

                  {!isAnswerSubmitted ? (
                    <button
                      type="button"
                      disabled={submittingAttempt}
                      onClick={handleSubmitAnswer}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {submittingAttempt ? 'Evaluating...' : 'Submit Answer'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{currentIndex === questions.length - 1 ? 'View Performance Summary' : 'Next Question'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            /* Final Performance Summary Screen */
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8">
              <div className="text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                  Practice Session Completed!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Here is how you performed across the tested concepts.
                </p>
              </div>

              {/* High-level stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block">Overall Accuracy</span>
                  <span className="text-2xl font-extrabold text-indigo-600 font-heading">
                    {accuracyPercentage}%
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block">Correct / Total</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-heading">
                    {correctAttemptsCount} / {attemptsHistory.length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block">Avg Confidence</span>
                  <span className="text-2xl font-extrabold text-amber-600 font-heading">
                    {(
                      attemptsHistory.reduce((a, b) => a + b.confidence, 0) /
                      Math.max(1, attemptsHistory.length)
                    ).toFixed(1)} / 5
                  </span>
                </div>
              </div>

              {/* Questions Needing Another Attempt */}
              {missedQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 font-heading">
                      Questions Needing Attention ({missedQuestions.length})
                    </h3>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Scheduled in Revision Planner
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {missedQuestions.map((att, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>{att.question.topic}</span>
                          <span className="text-rose-600">Incorrect</span>
                        </div>
                        <p className="text-slate-900 font-medium">
                          {att.question.questionText}
                        </p>
                        {att.correctAnswer && (
                          <p className="text-slate-600">
                            <strong>Reference:</strong> {att.correctAnswer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Steps */}
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-950 font-heading">
                    Adaptive Recommendation Engine: Next Steps
                  </h4>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Based on this session, your retention probability has been updated. We recommend visiting the{' '}
                  <strong className="font-semibold">Revision Planner</strong> to review{' '}
                  {missedQuestions.length > 0 ? missedQuestions[0].question.topic : 'advanced modules'} using targeted active recall.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchQuestions}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Practice Another Set
                </button>

                <Link
                  to="/planner"
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all inline-flex items-center justify-center gap-2"
                >
                  <span>Open Revision Planner</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
