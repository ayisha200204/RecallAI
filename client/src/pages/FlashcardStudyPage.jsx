import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Bookmark,
  Sparkles,
  Trophy,
  ArrowRight,
  Volume2,
  VolumeX,
  BookOpen,
  Keyboard,
  Layers,
  Play,
  Pause,
  Clock,
  Settings,
  Mic,
  MicOff,
  Edit3,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X,
  FastForward,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import api from '../services/api';

/**
 * 3D Motion Flashcard Component
 */
function MotionCard({
  card,
  isFlipped,
  onFlip,
  onReadAloud,
  ttsPlaying,
}) {
  return (
    <div className="perspective-1000 my-auto py-2 select-none relative w-full">
      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative w-full"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', damping: 22, stiffness: 140 }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={onFlip}
          className="relative w-full min-h-[360px] sm:min-h-[400px] cursor-pointer"
        >
          {/* FRONT FACE (Question) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: isFlipped ? 'none' : 'auto',
            }}
            className="w-full min-h-[360px] sm:min-h-[400px] rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 shadow-xl shadow-slate-200/50 flex flex-col justify-between transition-colors hover:border-indigo-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/80">
                {card?.topic || 'Question'}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReadAloud(card?.question);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  ttsPlaying ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                }`}
                title="Read question aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto py-6">
              <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wide">
                Prompt / Question
              </span>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug font-heading">
                {card?.question}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Press Space or click to reveal answer</span>
              </span>
              {card?.difficulty && (
                <span className="capitalize font-semibold text-slate-500">
                  {card.difficulty} difficulty
                </span>
              )}
            </div>
          </div>

          {/* BACK FACE (Answer) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              pointerEvents: !isFlipped ? 'none' : 'auto',
            }}
            className="absolute inset-0 w-full min-h-[360px] sm:min-h-[400px] rounded-3xl border-2 border-indigo-500/20 bg-gradient-to-br from-white via-indigo-50/20 to-white p-8 sm:p-12 shadow-xl shadow-indigo-100/50 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Answer & Explanation
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReadAloud(`${card?.answer}. ${card?.explanation || ''}`);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  ttsPlaying ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                }`}
                title="Read answer aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto py-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wide">
                  Expected Answer
                </span>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed font-heading">
                  {card?.answer}
                </p>
              </div>

              {card?.explanation && card.explanation !== card.answer && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-xs sm:text-sm text-indigo-950 leading-relaxed">
                  <span className="font-bold block text-indigo-900 mb-0.5">Explanation:</span>
                  {card.explanation}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
              <span className="text-indigo-600 font-semibold">
                Select your recall rating below to continue
              </span>
              <span className="text-slate-400">
                {card?.sourceReference || 'RecallAI Adaptive Deck'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function FlashcardStudyPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'silent'; // 'silent', 'auto', 'voice'
  const filterParam = searchParams.get('filter') || 'all'; // 'all', 'due', 'new'

  // Deck & Session Data
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [originalCards, setOriginalCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cardResponses, setCardResponses] = useState({}); // { cardId: { rating, timestamp } }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Mode: 'silent' | 'auto' | 'voice'
  const [studyMode, setStudyMode] = useState(initialMode);
  const [activeFilter, setActiveFilter] = useState(filterParam);

  // Automatic Play Mode Settings & State
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayState, setAutoPlayState] = useState('paused'); // 'playing', 'paused', 'waiting_rating'
  const [autoTimer, setAutoTimer] = useState(10); // current timer in seconds
  const [autoTimerMax, setAutoTimerMax] = useState(10);
  const [autoSettings, setAutoSettings] = useState({
    thinkingTimeSeconds: 10,
    answerTimeSeconds: 8,
    ratingTimeoutSeconds: 15,
    speakQuestions: false,
    speakAnswers: false,
    autoAdvanceAfterRating: true,
    ratingTimeoutEnabled: true,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Voice Mode State
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceEvaluation, setVoiceEvaluation] = useState(null);
  const [voiceEvaluating, setVoiceEvaluating] = useState(false);
  const [suggestedRating, setSuggestedRating] = useState('good');
  const speechRecognitionRef = useRef(null);

  // TTS State
  const [ttsPlaying, setTtsPlaying] = useState(false);

  // Card Management Modal
  const [editingCard, setEditingCard] = useState(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardFormData, setCardFormData] = useState({ question: '', answer: '', explanation: '', topic: '' });

  // Refs for timers to avoid memory leaks
  const timerIntervalRef = useRef(null);
  const isAutoPlayingRef = useRef(isAutoPlaying);
  isAutoPlayingRef.current = isAutoPlaying;

  const currentCard = cards[currentIndex] || null;

  // 1. Fetch Deck Cards & SRS States
  const fetchDeck = useCallback(async () => {
    setLoading(true);
    try {
      let targetDeckId = deckId;

      if (!targetDeckId) {
        // Find default or first deck
        const resDecks = await api.get('/decks');
        const first = (resDecks.data.decks || [])[0];
        if (!first) {
          navigate('/materials');
          return;
        }
        targetDeckId = first._id || first.id;
      }

      const res = await api.get(`/study/deck/${targetDeckId}/session?filter=${activeFilter}`);
      const deckData = res.data;

      setDeck({
        _id: targetDeckId,
        title: deckData.deckTitle,
        subject: deckData.subject,
        cards: deckData.cards,
      });

      const loadedCards = deckData.cards || [];
      setOriginalCards(loadedCards);
      setCards(loadedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setCardResponses({});
    } catch (err) {
      console.error('Fetch deck session error:', err);
    } finally {
      setLoading(false);
    }
  }, [deckId, activeFilter, navigate]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  // Read aloud helper
  const speakText = useCallback((text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onstart = () => setTtsPlaying(true);
      utterance.onend = () => setTtsPlaying(false);
      utterance.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Stop TTS
  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
    }
  }, []);

  // 2. Initialize Voice Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsVoiceRecording(true);
      recognition.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + ' ';
        }
        setVoiceTranscript(text.trim());
      };
      recognition.onerror = () => setIsVoiceRecording(false);
      recognition.onend = () => setIsVoiceRecording(false);

      speechRecognitionRef.current = recognition;
    }
  }, []);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopSpeech();
    };
  }, [stopSpeech]);

  // Flip card
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Advance to next card or finish session
  const advanceToNext = useCallback(() => {
    setIsFlipped(false);
    setVoiceTranscript('');
    setVoiceEvaluation(null);
    setSuggestedRating('good');

    if (currentIndex < cards.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    } else {
      setIsCompleted(true);
      setIsAutoPlaying(false);
      setAutoPlayState('completed');
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });

      // Save overall session summary
      const understoodCount = Object.values(cardResponses).filter(
        (r) => r.rating === 'good' || r.rating === 'easy'
      ).length;

      api.post('/practice/session', {
        sessionType: 'flashcard',
        deckId: deck?._id || deck?.id,
        title: `${deck?.title || 'Flashcards'} Study Session`,
        questionsAttempted: cards.length,
        correctCount: understoodCount,
        durationSeconds: 120,
        topicsCovered: Array.from(new Set(cards.map((c) => c.topic))),
      }).catch(() => {});
    }
  }, [currentIndex, cards, cardResponses, deck]);

  // 3. Record Rating Submission (Mode A & general)
  const handleRating = async (rating) => {
    if (!currentCard || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Send review to backend SRS service
      await api.post('/study/review', {
        cardId: currentCard.id,
        deckId: deck?._id || deck?.id,
        rating,
        studyMode,
        responseTimeSeconds: autoSettings.thinkingTimeSeconds - autoTimer,
      });

      // 2. Save locally
      setCardResponses((prev) => ({
        ...prev,
        [currentCard.id]: { rating, timestamp: new Date().toISOString() },
      }));

      // 3. Advance to next card
      advanceToNext();
    } catch (err) {
      console.error('Submit rating error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Skip Card
  const handleSkip = async () => {
    if (!currentCard || isSubmitting) return;
    if (confirm('Skip this card? Skipped cards do not advance your review schedule.')) {
      try {
        await api.post('/study/review', {
          cardId: currentCard.id,
          deckId: deck?._id || deck?.id,
          rating: 'skip',
          studyMode,
        });
      } catch (e) {
        console.warn('Skip notice:', e.message);
      }
      advanceToNext();
    }
  };

  // 5. Automatic Play Engine
  useEffect(() => {
    if (studyMode !== 'auto' || !isAutoPlaying || isCompleted) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (!isFlipped) {
      // Step 1: Question Thinking Timer
      setAutoPlayState('thinking');
      setAutoTimer(autoSettings.thinkingTimeSeconds);
      setAutoTimerMax(autoSettings.thinkingTimeSeconds);

      if (autoSettings.speakQuestions && currentCard) {
        speakText(currentCard.question);
      }

      timerIntervalRef.current = setInterval(() => {
        setAutoTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            // Time to reveal answer!
            setIsFlipped(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Step 2: Answer is revealed.
      if (autoSettings.speakAnswers && currentCard) {
        speakText(`${currentCard.answer}. ${currentCard.explanation || ''}`);
      }

      if (autoSettings.ratingTimeoutEnabled) {
        // Start rating countdown
        setAutoPlayState('waiting_rating');
        setAutoTimer(autoSettings.ratingTimeoutSeconds);
        setAutoTimerMax(autoSettings.ratingTimeoutSeconds);

        timerIntervalRef.current = setInterval(() => {
          setAutoTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              // CRITICAL SECTION 6.C RULE:
              // When rating timer expires without user action, PAUSE immediately!
              // Keep answer & rating buttons visible, show clear prompt, do NOT auto-rate, do NOT skip, do NOT advance!
              setIsAutoPlaying(false);
              setAutoPlayState('paused_waiting_rating');
              stopSpeech();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setAutoPlayState('waiting_rating');
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [
    studyMode,
    isAutoPlaying,
    isFlipped,
    currentIndex,
    isCompleted,
    autoSettings,
    currentCard,
    speakText,
    stopSpeech,
  ]);

  // Toggle Auto Play (Play / Pause / Resume)
  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setAutoPlayState('paused');
      stopSpeech();
    } else {
      setIsAutoPlaying(true);
      setAutoPlayState('playing');
    }
  };

  // Safe Shuffle: Randomises remaining unstudied cards without duplicating or omitting, preserving current card
  const handleShuffle = () => {
    if (cards.length <= 1) return;
    const current = cards[currentIndex];
    const remaining = cards.filter((_, idx) => idx !== currentIndex);
    const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());
    setCards([current, ...shuffledRemaining]);
    setCurrentIndex(0);
  };

  // Restart Deck
  const handleRestart = () => {
    setCards([...originalCards]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    setCardResponses({});
    setIsAutoPlaying(false);
    setAutoPlayState('paused');
    stopSpeech();
  };

  // Keyboard Shortcuts (Space to flip, 1/2/3/4 for ratings, Arrows for prev/next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isCompleted || isVoiceRecording || showSettingsModal || editingCard || isAddingCard) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'Digit1') {
        e.preventDefault();
        if (isFlipped) handleRating('again');
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        if (isFlipped) handleRating('hard');
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        if (isFlipped) handleRating('good');
      } else if (e.code === 'Digit4') {
        e.preventDefault();
        if (isFlipped) handleRating('easy');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setIsFlipped(false);
          setDirection(-1);
          setCurrentIndex((i) => i - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, isVoiceRecording, isFlipped, currentIndex, showSettingsModal, editingCard, isAddingCard, handleFlip]);

  // Voice Mode Evaluation
  const handleEvaluateVoice = async () => {
    if (!voiceTranscript.trim() || !currentCard) return;
    if (isVoiceRecording) speechRecognitionRef.current?.stop();

    setVoiceEvaluating(true);
    try {
      const res = await api.post('/voice/evaluate', {
        questionId: currentCard.id,
        deckId: deck?._id || deck?.id,
        transcript: voiceTranscript,
      });

      setVoiceEvaluation(res.data.feedback);
      setSuggestedRating(res.data.suggestedRating || 'good');

      if (res.data.feedback?.summary) {
        speakText(res.data.feedback.summary);
      }
    } catch (err) {
      console.error('Voice evaluation error:', err);
    } finally {
      setVoiceEvaluating(false);
    }
  };

  // Save Card Edits
  const handleSaveCardEdit = async (e) => {
    e.preventDefault();
    if (!editingCard || !cardFormData.question.trim() || !cardFormData.answer.trim()) return;

    try {
      const res = await api.put(`/decks/${deck._id}/cards/${editingCard.id}`, cardFormData);
      const updatedCard = res.data.card;

      setCards((prev) => prev.map((c) => (c.id === editingCard.id ? { ...c, ...updatedCard } : c)));
      setEditingCard(null);
    } catch (err) {
      console.error('Save card edit error:', err);
    }
  };

  // Add New Card
  const handleAddNewCard = async (e) => {
    e.preventDefault();
    if (!cardFormData.question.trim() || !cardFormData.answer.trim()) return;

    try {
      const res = await api.post(`/decks/${deck._id}/cards`, cardFormData);
      const newCard = res.data.card;

      setCards((prev) => [...prev, newCard]);
      setIsAddingCard(false);
      setCardFormData({ question: '', answer: '', explanation: '', topic: '' });
    } catch (err) {
      console.error('Add card error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#FAF9F6]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2.5 text-slate-500 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading Adaptive Study Session...</span>
          </div>
        </main>
      </div>
    );
  }

  const previews = currentCard?.intervalPreviews || {
    again: '< 10m',
    hard: '1d',
    good: '3d',
    easy: '7d',
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title={deck?.title || 'Adaptive Flashcards'}
          subtitle={`Topic: ${currentCard?.topic || 'Operating Systems'} • Spaced Repetition Session`}
          actionButton={
            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
                title="Shuffle remaining cards safely without affecting current question"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={() => {
                  setCardFormData({
                    question: '',
                    answer: '',
                    explanation: '',
                    topic: currentCard?.topic || deck?.subject || 'General',
                  });
                  setIsAddingCard(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
            </div>
          }
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between space-y-6">
          {/* Top Control Bar: Study Mode & Filter Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            {/* Study Mode Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => {
                  setStudyMode('silent');
                  setIsAutoPlaying(false);
                  stopSpeech();
                }}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studyMode === 'silent'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Silent Recall
              </button>

              <button
                onClick={() => {
                  setStudyMode('auto');
                  setIsAutoPlaying(true);
                  setAutoPlayState('playing');
                }}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studyMode === 'auto'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FastForward className="w-3.5 h-3.5 text-indigo-600" />
                <span>Auto Play</span>
              </button>

              <button
                onClick={() => {
                  setStudyMode('voice');
                  setIsAutoPlaying(false);
                  stopSpeech();
                }}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studyMode === 'voice'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-indigo-600" />
                <span>Voice Recall</span>
              </button>
            </div>

            {/* Scope Filter: All | Due Today | New */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Scope:</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Complete Deck ({originalCards.length})</option>
                <option value="due">Due Cards Only</option>
                <option value="new">New Cards Only</option>
              </select>

              {studyMode === 'auto' && (
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                  title="Auto Play Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {!isCompleted ? (
            <>
              {/* Progress & Card Meta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentCard?.difficulty || 'medium'}>
                      {currentCard?.difficulty || 'Medium'}
                    </Badge>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-700 font-medium">{currentCard?.topic}</span>
                    {currentCard?.state && (
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {currentCard.state}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCardFormData({
                          question: currentCard.question,
                          answer: currentCard.answer,
                          explanation: currentCard.explanation || '',
                          topic: currentCard.topic,
                          difficulty: currentCard.difficulty,
                        });
                        setEditingCard(currentCard);
                      }}
                      className="text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Card</span>
                    </button>
                    <span>
                      Card {currentIndex + 1} of {cards.length}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / Math.max(1, cards.length)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Automatic Play Countdown & Status Bar */}
              {studyMode === 'auto' && (
                <div className="bg-indigo-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleAutoPlay}
                      className="w-10 h-10 rounded-xl bg-white text-indigo-900 flex items-center justify-center hover:bg-indigo-50 shadow-sm cursor-pointer"
                    >
                      {isAutoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block text-indigo-200">
                        {autoPlayState === 'thinking'
                          ? 'Question Thinking Timer'
                          : autoPlayState === 'waiting_rating'
                          ? 'Waiting for Rating'
                          : autoPlayState === 'paused_waiting_rating'
                          ? 'Session Paused: Rate to Continue'
                          : 'Paused'}
                      </span>
                      <span className="text-sm font-extrabold font-heading">
                        {autoPlayState === 'paused_waiting_rating'
                          ? 'Please rate this card to advance'
                          : `${autoTimer}s remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Bar */}
                  <div className="w-full sm:w-48 h-2 bg-indigo-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 transition-all duration-1000"
                      style={{ width: `${(autoTimer / Math.max(1, autoTimerMax)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Critical Alert Banner for Expired Rating in Auto Mode */}
              {studyMode === 'auto' && autoPlayState === 'paused_waiting_rating' && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs font-bold">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Rating required: The automatic session is paused. Select a rating below to continue playback.</span>
                  </div>
                </div>
              )}

              {/* 3D Motion Card */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentCard?.id || currentIndex}
                  custom={direction}
                  variants={{
                    enter: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  <MotionCard
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={handleFlip}
                    onReadAloud={speakText}
                    ttsPlaying={ttsPlaying}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Study Interaction Section based on Mode */}
              {studyMode === 'voice' ? (
                /* Mode B: Voice Recall Workspace */
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-600" />
                      Voice Active Recall
                    </span>
                    <button
                      onClick={() => speakText(currentCard?.question)}
                      className="text-xs font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Listen to Question
                    </button>
                  </div>

                  {/* Microphone & Recording */}
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (isVoiceRecording) {
                          speechRecognitionRef.current?.stop();
                        } else {
                          try {
                            speechRecognitionRef.current?.start();
                          } catch (e) {
                            console.warn('Speech start:', e.message);
                          }
                        }
                      }}
                      className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                        isVoiceRecording
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isVoiceRecording ? 'Stop Recording' : 'Speak Answer'}</span>
                    </button>

                    <span className="text-xs text-slate-500">
                      {isVoiceRecording ? 'Listening to your explanation...' : 'Or type your answer below'}
                    </span>
                  </div>

                  {/* Transcript Editor */}
                  <textarea
                    rows={3}
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    placeholder="Spoken words appear here. You can edit or type your explanation directly..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={voiceEvaluating || !voiceTranscript.trim()}
                      onClick={handleEvaluateVoice}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{voiceEvaluating ? 'Evaluating...' : 'Evaluate Conceptual Recall'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFlip}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
                    >
                      {isFlipped ? 'Hide Expected Answer' : 'Reveal Expected Answer'}
                    </button>
                  </div>

                  {/* AI Evaluation & Rating Confirmation */}
                  {voiceEvaluation && (
                    <div className="mt-4 p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-900 font-heading">
                          Conceptual Assessment: {voiceEvaluation.masteryStatus || 'Evaluated'}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          Suggested: <strong className="uppercase">{suggestedRating}</strong>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        {voiceEvaluation.summary}
                      </p>

                      {voiceEvaluation.conceptsMatched?.length > 0 && (
                        <div className="text-xs text-emerald-800 flex flex-wrap gap-1 items-center">
                          <span className="font-bold">Concepts Captured:</span>
                          {voiceEvaluation.conceptsMatched.map((c, i) => (
                            <span key={i} className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Confirm or Change Suggested Rating */}
                      <div className="pt-3 border-t border-indigo-200/80">
                        <span className="text-xs font-semibold text-indigo-900 block mb-2">
                          Confirm or adjust your recall rating for the scheduler:
                        </span>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => handleRating('again')}
                            className="py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                          >
                            Again
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRating('hard')}
                            className="py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                          >
                            Hard
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRating('good')}
                            className="py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                          >
                            Good
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRating('easy')}
                            className="py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                          >
                            Easy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode A & C: Spaced Repetition 4-Rating System */
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  {!isFlipped ? (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleSkip}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Skip Card
                      </button>

                      <button
                        type="button"
                        onClick={handleFlip}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Reveal Answer</span>
                        <span className="text-[11px] opacity-80">(Space)</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentIndex > 0) {
                              setIsFlipped(false);
                              setDirection(-1);
                              setCurrentIndex((i) => i - 1);
                            }
                          }}
                          disabled={currentIndex === 0}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                          title="Previous Card"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          title="Skip Card"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          Rate your recall difficulty:
                        </span>
                        <button
                          type="button"
                          onClick={handleSkip}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Skip
                        </button>
                      </div>

                      {/* 4 Standard Spaced Repetition Ratings */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* 1. AGAIN */}
                        <button
                          type="button"
                          onClick={() => handleRating('again')}
                          className="p-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-950 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
                        >
                          <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700">
                            Again (1)
                          </span>
                          <span className="text-[11px] font-semibold text-rose-600/90">
                            {previews.again}
                          </span>
                          <span className="text-[10px] text-rose-800/60 hidden sm:block">
                            Forgot answer
                          </span>
                        </button>

                        {/* 2. HARD */}
                        <button
                          type="button"
                          onClick={() => handleRating('hard')}
                          className="p-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-amber-950 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
                        >
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                            Hard (2)
                          </span>
                          <span className="text-[11px] font-semibold text-amber-600/90">
                            {previews.hard}
                          </span>
                          <span className="text-[10px] text-amber-800/60 hidden sm:block">
                            Recalled with effort
                          </span>
                        </button>

                        {/* 3. GOOD */}
                        <button
                          type="button"
                          onClick={() => handleRating('good')}
                          className="p-3.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-950 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
                        >
                          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                            Good (3)
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-600/90">
                            {previews.good}
                          </span>
                          <span className="text-[10px] text-indigo-800/60 hidden sm:block">
                            Standard recall
                          </span>
                        </button>

                        {/* 4. EASY */}
                        <button
                          type="button"
                          onClick={() => handleRating('easy')}
                          className="p-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
                        >
                          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                            Easy (4)
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600/90">
                            {previews.easy}
                          </span>
                          <span className="text-[10px] text-emerald-800/60 hidden sm:block">
                            Effortless memory
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Session Completed Screen */
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl text-center max-w-lg mx-auto my-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                  Active Recall Complete
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  Session Completed!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                  Great job reviewing {cards.length} cards in {deck?.title || 'this study set'}.
                </p>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Understood</span>
                  <span className="text-lg font-bold text-emerald-600 font-heading">
                    {Object.values(cardResponses).filter((r) => r.rating === 'good' || r.rating === 'easy').length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Need Review</span>
                  <span className="text-lg font-bold text-amber-600 font-heading">
                    {Object.values(cardResponses).filter((r) => r.rating === 'again' || r.rating === 'hard').length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Scheduler</span>
                  <span className="text-lg font-bold text-indigo-600 font-heading">
                    Updated
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Review dates for all completed cards have been recalculated and saved to the Spaced Repetition calendar.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Restart Deck
                </button>

                <Link
                  to={`/practice?topic=${encodeURIComponent(currentCard?.topic || 'all')}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <span>Take Practice Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Automatic Play Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base font-heading">
                    Automatic Play Settings
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Question Thinking Duration: {autoSettings.thinkingTimeSeconds}s
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    value={autoSettings.thinkingTimeSeconds}
                    onChange={(e) =>
                      setAutoSettings((prev) => ({
                        ...prev,
                        thinkingTimeSeconds: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Rating Time Limit: {autoSettings.ratingTimeoutSeconds}s
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={autoSettings.ratingTimeoutSeconds}
                    onChange={(e) =>
                      setAutoSettings((prev) => ({
                        ...prev,
                        ratingTimeoutSeconds: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    If expired without rating, playback pauses automatically.
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSettings.speakQuestions}
                      onChange={(e) =>
                        setAutoSettings((prev) => ({ ...prev, speakQuestions: e.target.checked }))
                      }
                      className="rounded text-indigo-600 accent-indigo-600"
                    />
                    <span className="font-medium text-slate-700">Read questions aloud (Text-to-speech)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSettings.speakAnswers}
                      onChange={(e) =>
                        setAutoSettings((prev) => ({ ...prev, speakAnswers: e.target.checked }))
                      }
                      className="rounded text-indigo-600 accent-indigo-600"
                    />
                    <span className="font-medium text-slate-700">Read answers aloud (Text-to-speech)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save & Return
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit / Add Card Modal */}
        {(editingCard || isAddingCard) && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={editingCard ? handleSaveCardEdit : handleAddNewCard}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base font-heading">
                  {editingCard ? 'Edit Flashcard' : 'Add New Flashcard'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCard(null);
                    setIsAddingCard(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Question / Prompt *</label>
                  <textarea
                    rows={2}
                    required
                    value={cardFormData.question}
                    onChange={(e) => setCardFormData((prev) => ({ ...prev, question: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-body"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected Answer *</label>
                  <textarea
                    rows={3}
                    required
                    value={cardFormData.answer}
                    onChange={(e) => setCardFormData((prev) => ({ ...prev, answer: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-body"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Explanation (Optional)</label>
                  <textarea
                    rows={2}
                    value={cardFormData.explanation}
                    onChange={(e) => setCardFormData((prev) => ({ ...prev, explanation: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-body"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Topic</label>
                    <input
                      type="text"
                      value={cardFormData.topic}
                      onChange={(e) => setCardFormData((prev) => ({ ...prev, topic: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                    <select
                      value={cardFormData.difficulty || 'medium'}
                      onChange={(e) => setCardFormData((prev) => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {editingCard && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete this flashcard from the deck?')) {
                        await api.delete(`/decks/${deck._id}/cards/${editingCard.id}`);
                        setCards((prev) => prev.filter((c) => c.id !== editingCard.id));
                        setEditingCard(null);
                      }
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Card</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard(null);
                      setIsAddingCard(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {editingCard ? 'Save Changes' : 'Add to Deck'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
