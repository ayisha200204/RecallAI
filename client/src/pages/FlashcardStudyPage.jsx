import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  BookOpen,
  Keyboard,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import ConfidenceSelector from '../components/common/ConfidenceSelector';
import api from '../services/api';

function MotionFlashcard({
  card,
  isFlipped,
  onFlip,
  onSwipe,
  onReadAloud,
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 180], [-10, 10]);
  const understoodOpacity = useTransform(x, [35, 120], [0, 1]);
  const revisionOpacity = useTransform(x, [-35, -120], [0, 1]);
  const isDraggingRef = useRef(false);

  return (
    <div className="perspective-1000 my-auto py-2 select-none relative w-full">
      <motion.div
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.65}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={(e, info) => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 80);

          if (info.offset.x > 110) {
            onSwipe(true);
          } else if (info.offset.x < -110) {
            onSwipe(false);
          }
        }}
        whileHover={{ scale: 1.012, y: -4 }}
        whileTap={{ scale: 0.988 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative w-full cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {/* Floating Swipe Cue Indicators */}
        <motion.div
          style={{ opacity: understoodOpacity }}
          className="pointer-events-none absolute top-6 right-6 z-40 px-3.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-emerald-500/20 text-emerald-700 font-extrabold text-xs uppercase tracking-wider backdrop-blur-md shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Understood</span>
        </motion.div>

        <motion.div
          style={{ opacity: revisionOpacity }}
          className="pointer-events-none absolute top-6 left-6 z-40 px-3.5 py-1.5 rounded-xl border-2 border-amber-500 bg-amber-500/20 text-amber-700 font-extrabold text-xs uppercase tracking-wider backdrop-blur-md shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4 stroke-[3]" />
          <span>Needs Revision</span>
        </motion.div>

        {/* 3D Rotating Inner Card */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.55, type: 'spring', damping: 22, stiffness: 140 }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={() => {
            if (isDraggingRef.current) return;
            onFlip();
          }}
          className="relative w-full min-h-[360px] sm:min-h-[400px]"
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
            {/* Front Top Meta */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Question (Active Recall)
              </span>

              <button
                type="button"
                onClick={onReadAloud}
                title="Read question aloud"
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Front Content */}
            <div className="my-auto py-6">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 font-heading leading-snug">
                {card?.question}
              </p>
            </div>

            {/* Front Bottom Hint */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                Click or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600 font-mono text-[10px]">Space</kbd> to flip
              </span>

              <span className="hidden sm:inline text-[11px] font-medium text-slate-500">
                Swipe right for understood • Left to revise
              </span>
            </div>
          </div>

          {/* BACK FACE (Answer) */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              pointerEvents: isFlipped ? 'auto' : 'none',
            }}
            className="absolute inset-0 w-full h-full rounded-3xl border border-indigo-200 bg-gradient-to-b from-white via-indigo-50/25 to-indigo-50/50 p-8 sm:p-12 shadow-xl shadow-indigo-100/50 flex flex-col justify-between"
          >
            {/* Back Top Meta */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Reference Answer
              </span>

              <button
                type="button"
                onClick={onReadAloud}
                title="Read answer aloud"
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Back Content */}
            <div className="my-auto py-4 overflow-y-auto max-h-[240px] pr-2">
              <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                {card?.answer}
              </p>
              {card?.sourceReference && (
                <span className="text-xs text-slate-400 block italic mt-3">
                  Source: {card.sourceReference}
                </span>
              )}
            </div>

            {/* Back Bottom Hint */}
            <div className="pt-4 border-t border-indigo-100/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                <RotateCcw className="w-3.5 h-3.5" />
                Click again to flip back
              </span>

              <span className="text-[11px] font-semibold text-slate-700">
                Rate your recall confidence below (1 - 5)
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

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Attempt tracking state per card
  const [cardResponses, setCardResponses] = useState({}); // { cardId: { isUnderstood: bool, confidence: 1-5 } }

  const fetchDeck = async () => {
    try {
      // If deckId is 'default' or undefined, fetch first deck
      let res;
      if (deckId && deckId !== 'default') {
        res = await api.get(`/decks/${deckId}`);
      } else {
        const listRes = await api.get('/decks');
        if (listRes.data.decks?.length > 0) {
          const firstId = listRes.data.decks[0]._id || listRes.data.decks[0].id;
          res = await api.get(`/decks/${firstId}`);
        }
      }

      if (res?.data?.deck) {
        setDeck(res.data.deck);
        setCards(res.data.deck.cards || []);
      }
    } catch (err) {
      console.error('Failed to load flashcard deck:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  const currentCard = cards[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
    } else {
      // Completed session
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      // Save session summary
      const understoodCount = Object.values(cardResponses).filter((r) => r.isUnderstood).length;
      api.post('/practice/session', {
        sessionType: 'flashcard',
        deckId: deck?._id || deck?.id,
        title: `${deck?.title || 'Flashcards'} Study Session`,
        questionsAttempted: cards.length,
        correctCount: understoodCount,
        topicsCovered: Array.from(new Set(cards.map((c) => c.topic))),
      }).catch(() => {});
    }
  }, [currentIndex, cards.length, cardResponses, deck]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    setDirection(1);
    setIsFlipped(false);
    setCurrentIndex(0);
    setCards((prev) => [...prev].sort(() => 0.5 - Math.random()));
  };

  const handleAnswerCard = async (isUnderstood, confidence = 3) => {
    if (!currentCard) return;

    // Save locally
    setCardResponses((prev) => ({
      ...prev,
      [currentCard.id]: { isUnderstood, confidence },
    }));

    // Post study attempt to backend for ML tracking
    try {
      await api.post('/practice/attempt', {
        questionId: currentCard.id,
        deckId: deck?._id || deck?.id,
        submittedAnswer: isUnderstood ? 'understood' : 'needs_revision',
        confidenceRating: confidence,
        timeTakenSeconds: 10,
      });
    } catch (e) {
      console.warn('Attempt submit notice:', e.message);
    }

    // Auto advance
    setDirection(1);
    handleNext();
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isCompleted) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const rating = parseInt(e.code.replace('Digit', ''), 10);
        handleAnswerCard(rating >= 3, rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, isCompleted, currentCard]);

  // Read card aloud via browser SpeechSynthesis
  const handleReadAloud = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window && currentCard) {
      window.speechSynthesis.cancel();
      const text = isFlipped ? currentCard.answer : currentCard.question;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#FAF9F6]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading flashcards...</span>
          </div>
        </main>
      </div>
    );
  }

  const currentResponse = currentCard ? cardResponses[currentCard.id] : null;

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title={deck?.title || 'Flashcard Study'}
          subtitle={`Topic: ${currentCard?.topic || 'Operating Systems'} • Active Recall Session`}
          actionButton={
            <button
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle Deck
            </button>
          }
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between">
          {!isCompleted ? (
            <>
              {/* Progress Bar & Header Meta */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentCard?.difficulty || 'medium'}>
                      {currentCard?.difficulty || 'Medium'}
                    </Badge>
                    <span className="text-slate-400">•</span>
                    <span className="text-indigo-700 font-medium">{currentCard?.topic}</span>
                  </div>
                  <span>
                    Card {currentIndex + 1} of {cards.length}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / Math.max(1, cards.length)) * 100}%` }}
                  />
                </div>
              </div>

              {/* 3D Motion Flip Card with Swipe Gestures and Directional Transition */}
              <div className="my-auto py-2">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentCard?.id || currentIndex}
                    custom={direction}
                    variants={{
                      enter: (dir) => ({
                        x: dir > 0 ? 70 : -70,
                        opacity: 0,
                        scale: 0.94,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          x: { type: 'spring', stiffness: 300, damping: 28 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 },
                        },
                      },
                      exit: (dir) => ({
                        x: dir > 0 ? -70 : 70,
                        opacity: 0,
                        scale: 0.94,
                        transition: {
                          x: { type: 'spring', stiffness: 300, damping: 28 },
                          opacity: { duration: 0.16 },
                          scale: { duration: 0.16 },
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="w-full"
                  >
                    <MotionFlashcard
                      card={currentCard}
                      isFlipped={isFlipped}
                      onFlip={handleFlip}
                      onSwipe={(isUnderstood) => handleAnswerCard(isUnderstood, isUnderstood ? 4 : 2)}
                      onReadAloud={handleReadAloud}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Self-Assessment & Rating Controls */}
              <div className="mt-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleAnswerCard(false, 2)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-amber-600" />
                      <span>Needs Revision (1-2)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnswerCard(true, 4)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Understood (4-5)</span>
                    </button>
                  </div>

                  {/* Card navigation buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Previous Card (Left Arrow)"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
                      title="Next Card (Right Arrow)"
                    >
                      <span>{currentIndex === cards.length - 1 ? 'Finish' : 'Next'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Granular Confidence Selector */}
                <ConfidenceSelector
                  value={currentResponse?.confidence || 3}
                  onChange={(rating) => handleAnswerCard(rating >= 3, rating)}
                />
              </div>
            </>
          ) : (
            /* Session Completed Screen */
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl text-center max-w-lg mx-auto my-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                  Session Completed
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  Active Recall Complete!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                  Great job completing {cards.length} flashcards in this deck.
                </p>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-xs text-slate-400 block">Understood</span>
                  <span className="text-xl font-extrabold text-emerald-600 font-heading">
                    {Object.values(cardResponses).filter((r) => r.isUnderstood).length}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Needs Revision</span>
                  <span className="text-xl font-extrabold text-amber-600 font-heading">
                    {Object.values(cardResponses).filter((r) => !r.isUnderstood).length}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Your responses have been recorded and integrated into the machine learning retention predictor.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompleted(false);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Restart Deck
                </button>

                <Link
                  to={`/practice?topic=${encodeURIComponent(currentCard?.topic || 'all')}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <span>Take Practice Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
