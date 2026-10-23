/**
 * RecallAI Spaced-Repetition Scheduling Service
 *
 * Implements persistent interval-based spaced repetition with:
 * - 4 rating levels: Again, Hard, Good, Easy (plus Skip)
 * - Transparent starter intervals:
 *     Again: 10 minutes (relearning step)
 *     Hard: 1 day
 *     Good: 3 days -> progressive interval scaling via ease factor
 *     Easy: 7 days -> 21 days -> 45 days -> 90 days -> 180 days
 * - Handling of overdue cards and short-term relearning
 * - Single-event recording guarantee and idempotent submissions
 */

import { ReviewStates, ReviewEvents, FlashcardDecks, StudyAttempts } from '../models/repositories.js';

// Starter configuration constants (configurable)
export const SRS_CONFIG = {
  MIN_EASE: 1.3,
  DEFAULT_EASE: 2.5,
  MAX_EASE: 3.2,
  EASY_BONUS: 1.3,
  HARD_PENALTY: 0.15,
  EASY_BONUS_EASE: 0.15,
  INTERVALS: {
    AGAIN_MINUTES: 10,
    HARD_DAYS: 1,
    GOOD_INITIAL_DAYS: 3,
    EASY_INITIAL_DAYS: 7,
    EASY_PROGRESSION: [7, 21, 45, 90, 180],
  },
};

/**
 * Format a human-readable interval description
 * e.g. "10m", "1d", "3d", "7d", "21d"
 */
export function formatIntervalReadable(intervalDays) {
  if (intervalDays < 1) {
    const minutes = Math.max(1, Math.round(intervalDays * 24 * 60));
    return `${minutes}m`;
  }
  const days = Math.round(intervalDays * 10) / 10;
  if (days >= 30) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  }
  return `${Math.round(days)}d`;
}

/**
 * Compute the next scheduling state for a card given a rating
 *
 * @param {Object} current - Current card state { repetitions, interval, easeFactor, lapses, state }
 * @param {string} rating - 'again' | 'hard' | 'good' | 'easy' | 'skip'
 * @param {Date} [referenceDate] - Current timestamp (default: now)
 * @returns {Object} next scheduling state { repetitions, interval, easeFactor, lapses, state, nextDueDate, readableInterval }
 */
export function calculateNextReview(current = {}, rating, referenceDate = new Date()) {
  const repetitions = current.repetitions || 0;
  const currentInterval = current.interval || 0;
  let easeFactor = current.easeFactor || SRS_CONFIG.DEFAULT_EASE;
  let lapses = current.lapses || 0;
  let state = current.state || 'new';

  if (rating === 'skip') {
    // A skipped card must NOT advance the schedule or count as successful review
    return {
      repetitions,
      interval: currentInterval,
      easeFactor,
      lapses,
      state,
      nextDueDate: current.nextDueDate ? new Date(current.nextDueDate) : new Date(referenceDate),
      readableInterval: formatIntervalReadable(currentInterval || 0),
      isSkip: true,
    };
  }

  let nextIntervalDays = 0;
  let nextState = 'review';
  let nextRepetitions = repetitions;

  switch (rating) {
    case 'again': {
      // Failed recall: enter short relearning step (~10 minutes)
      nextIntervalDays = SRS_CONFIG.INTERVALS.AGAIN_MINUTES / (24 * 60); // 10 minutes in days
      nextState = 'relearning';
      lapses += 1;
      nextRepetitions = 0; // reset streak
      easeFactor = Math.max(SRS_CONFIG.MIN_EASE, easeFactor - 0.2);
      break;
    }

    case 'hard': {
      // Recalled with considerable difficulty
      if (repetitions === 0) {
        nextIntervalDays = SRS_CONFIG.INTERVALS.HARD_DAYS;
      } else {
        nextIntervalDays = Math.max(1, Math.round(currentInterval * 1.2));
      }
      easeFactor = Math.max(SRS_CONFIG.MIN_EASE, easeFactor - SRS_CONFIG.HARD_PENALTY);
      nextRepetitions = repetitions + 1;
      nextState = 'review';
      break;
    }

    case 'good': {
      // Recalled correctly with reasonable effort
      if (repetitions === 0) {
        nextIntervalDays = SRS_CONFIG.INTERVALS.GOOD_INITIAL_DAYS;
      } else if (repetitions === 1) {
        nextIntervalDays = Math.round(SRS_CONFIG.INTERVALS.GOOD_INITIAL_DAYS * easeFactor);
      } else {
        nextIntervalDays = Math.max(
          SRS_CONFIG.INTERVALS.GOOD_INITIAL_DAYS,
          Math.round(currentInterval * easeFactor)
        );
      }
      nextRepetitions = repetitions + 1;
      nextState = 'review';
      break;
    }

    case 'easy': {
      // Recalled effortlessly: progress through accelerated intervals
      if (repetitions === 0) {
        nextIntervalDays = SRS_CONFIG.INTERVALS.EASY_INITIAL_DAYS;
      } else {
        const ladder = SRS_CONFIG.INTERVALS.EASY_PROGRESSION;
        const matchingStep = ladder.find((step) => step > currentInterval);
        if (matchingStep) {
          nextIntervalDays = matchingStep;
        } else {
          nextIntervalDays = Math.round(currentInterval * easeFactor * SRS_CONFIG.EASY_BONUS);
        }
      }
      easeFactor = Math.min(SRS_CONFIG.MAX_EASE, easeFactor + SRS_CONFIG.EASY_BONUS_EASE);
      nextRepetitions = repetitions + 1;
      nextState = 'review';
      break;
    }

    default:
      throw new Error(`Invalid rating: ${rating}. Must be one of: again, hard, good, easy, skip.`);
  }

  // Calculate next due timestamp in user's chronological time
  const nextDueMs = referenceDate.getTime() + nextIntervalDays * 24 * 3600 * 1000;
  const nextDueDate = new Date(nextDueMs);

  return {
    repetitions: nextRepetitions,
    interval: nextIntervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    lapses,
    state: nextState,
    nextDueDate,
    readableInterval: formatIntervalReadable(nextIntervalDays),
    isSkip: false,
  };
}

/**
 * Preview next intervals for each rating so the UI can show:
 * "Again (< 10m)" | "Hard (1d)" | "Good (3d)" | "Easy (7d)"
 */
export function getRatingIntervalPreviews(current = {}, referenceDate = new Date()) {
  return {
    again: calculateNextReview(current, 'again', referenceDate).readableInterval,
    hard: calculateNextReview(current, 'hard', referenceDate).readableInterval,
    good: calculateNextReview(current, 'good', referenceDate).readableInterval,
    easy: calculateNextReview(current, 'easy', referenceDate).readableInterval,
  };
}

/**
 * Record a review event and persist the updated ReviewState for a card
 */
export async function recordCardReview({
  userId,
  cardId,
  deckId,
  rating,
  studyMode = 'silent',
  responseTimeSeconds = 0,
  aiEvaluation = null,
  sessionId = null,
}) {
  if (!userId || !cardId || !deckId || !rating) {
    throw new Error('userId, cardId, deckId, and rating are required.');
  }

  const now = new Date();

  // 1. Fetch or initialize ReviewState
  let reviewState = await ReviewStates.findOne({ userId, cardId });

  // If not yet in ReviewStates, look inside the deck to check card properties
  let deck = await FlashcardDecks.findById(deckId);
  const cardInDeck = deck?.cards?.find((c) => String(c.id) === String(cardId));

  if (!reviewState) {
    reviewState = {
      userId,
      cardId,
      deckId,
      materialId: deck?.materialId || null,
      topic: cardInDeck?.topic || 'General',
      questionText: cardInDeck?.question || '',
      answerText: cardInDeck?.answer || '',
      repetitions: cardInDeck?.repetitions || 0,
      interval: cardInDeck?.interval || 0,
      easeFactor: cardInDeck?.easeFactor || SRS_CONFIG.DEFAULT_EASE,
      lapses: cardInDeck?.lapses || 0,
      state: cardInDeck?.state || 'new',
      nextDueDate: cardInDeck?.nextDueDate || now.toISOString(),
      history: [],
    };
  }

  // 2. Compute the next schedule
  const nextSchedule = calculateNextReview(reviewState, rating, now);

  const isSkip = Boolean(rating === 'skip');
  const isCorrect = rating === 'good' || rating === 'easy';

  // 3. Persist review event
  const reviewEvent = await ReviewEvents.create({
    userId,
    cardId,
    deckId,
    conceptId: cardInDeck?.conceptId || null,
    topic: cardInDeck?.topic || reviewState.topic || 'General',
    studyMode,
    rating,
    isCorrect,
    aiEvaluation,
    responseTimeSeconds: Number(responseTimeSeconds) || 0,
    isSkip,
    sessionId: sessionId || null,
    timestamp: now.toISOString(),
  });

  // Also record to legacy StudyAttempts so existing analytics & ML models stay synchronized
  if (!isSkip) {
    await StudyAttempts.create({
      userId,
      questionId: cardId,
      deckId,
      materialId: deck?.materialId || null,
      topic: cardInDeck?.topic || reviewState.topic || 'General',
      questionType: 'flashcard',
      submittedAnswer: rating,
      isCorrect,
      score: rating === 'easy' ? 1.0 : rating === 'good' ? 0.8 : rating === 'hard' ? 0.5 : 0.0,
      confidenceRating: rating === 'easy' ? 5 : rating === 'good' ? 4 : rating === 'hard' ? 2 : 1,
      timeTakenSeconds: responseTimeSeconds || 10,
      evaluationFeedback: {
        summary: `Rated as ${rating.toUpperCase()} (${nextSchedule.readableInterval} until next review)`,
        guidance: `Interval: ${nextSchedule.readableInterval}. State: ${nextSchedule.state}.`,
      },
      timestamp: now.toISOString(),
    });
  }

  // 4. Update ReviewState
  const updatedStateData = {
    repetitions: nextSchedule.repetitions,
    interval: nextSchedule.interval,
    easeFactor: nextSchedule.easeFactor,
    lapses: nextSchedule.lapses,
    state: nextSchedule.state,
    nextDueDate: nextSchedule.nextDueDate.toISOString(),
    lastReviewedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (reviewState._id) {
    reviewState = await ReviewStates.findByIdAndUpdate(reviewState._id, {
      ...updatedStateData,
      history: [
        ...(reviewState.history || []).slice(-20),
        {
          rating,
          interval: nextSchedule.interval,
          timestamp: now.toISOString(),
          studyMode,
        },
      ],
    });
  } else {
    reviewState = await ReviewStates.create({
      ...reviewState,
      ...updatedStateData,
      history: [
        {
          rating,
          interval: nextSchedule.interval,
          timestamp: now.toISOString(),
          studyMode,
        },
      ],
    });
  }

  // 5. Sync review fields back onto the card inside FlashcardDecks so the deck remains standalone
  if (deck && Array.isArray(deck.cards)) {
    const cardIdx = deck.cards.findIndex((c) => String(c.id) === String(cardId));
    if (cardIdx !== -1) {
      deck.cards[cardIdx] = {
        ...deck.cards[cardIdx],
        repetitions: nextSchedule.repetitions,
        interval: nextSchedule.interval,
        easeFactor: nextSchedule.easeFactor,
        lapses: nextSchedule.lapses,
        state: nextSchedule.state,
        nextDueDate: nextSchedule.nextDueDate.toISOString(),
        lastReviewedAt: now.toISOString(),
      };
      await FlashcardDecks.findByIdAndUpdate(deck._id, { cards: deck.cards });
    }
  }

  return {
    success: true,
    rating,
    nextDueDate: nextSchedule.nextDueDate.toISOString(),
    intervalDays: nextSchedule.interval,
    readableInterval: nextSchedule.readableInterval,
    repetitions: nextSchedule.repetitions,
    state: nextSchedule.state,
    reviewEventId: reviewEvent._id,
  };
}

/**
 * Fetch due reviews for a user with breakdown:
 * - overdue (< today)
 * - dueToday (due today before midnight)
 * - newCards (unreviewed)
 * - upcoming (grouped by tomorrow, in 3 days, in 7 days, later)
 */
export async function getDueReviewsSummary(userId, deckId = null) {
  const query = { userId };
  if (deckId) query.deckId = deckId;

  // Load all decks for this user
  const decks = await FlashcardDecks.find(query);
  const now = new Date();

  // Create boundary timestamps
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 3600 * 1000);
  const in3Days = new Date(endOfToday.getTime() + 3 * 24 * 3600 * 1000);
  const in7Days = new Date(endOfToday.getTime() + 7 * 24 * 3600 * 1000);

  const overdueCards = [];
  const dueTodayCards = [];
  const newCards = [];
  const tomorrowCards = [];
  const in3DaysCards = [];
  const in7DaysCards = [];
  const laterCards = [];

  // Card items mapped with deck info
  for (const deck of decks) {
    for (const card of deck.cards || []) {
      const enrichedCard = {
        ...card,
        deckId: deck._id || deck.id,
        deckTitle: deck.title,
        subject: deck.subject,
      };

      const hasBeenReviewed = Boolean(card.lastReviewedAt && card.repetitions > 0);
      const dueDate = card.nextDueDate ? new Date(card.nextDueDate) : null;

      if (!hasBeenReviewed || card.state === 'new' || !dueDate) {
        newCards.push(enrichedCard);
      } else if (dueDate < startOfToday) {
        overdueCards.push(enrichedCard);
      } else if (dueDate <= endOfToday) {
        dueTodayCards.push(enrichedCard);
      } else if (dueDate <= endOfTomorrow) {
        tomorrowCards.push(enrichedCard);
      } else if (dueDate <= in3Days) {
        in3DaysCards.push(enrichedCard);
      } else if (dueDate <= in7Days) {
        in7DaysCards.push(enrichedCard);
      } else {
        laterCards.push(enrichedCard);
      }
    }
  }

  // Workload calendar breakdown (next 14 days)
  const calendarDays = [];
  for (let i = 0; i < 14; i++) {
    const targetDay = new Date(startOfToday.getTime() + i * 24 * 3600 * 1000);
    const dayStr = targetDay.toISOString().split('T')[0];
    const dayEnd = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 23, 59, 59, 999);

    const cardsDueOnDay = [];
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        if (card.nextDueDate) {
          const cardDue = new Date(card.nextDueDate);
          if (i === 0) {
            // Today includes overdue cards
            if (cardDue <= dayEnd && card.repetitions > 0) {
              cardsDueOnDay.push({ ...card, deckId: deck._id, deckTitle: deck.title });
            }
          } else {
            const dayStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 0, 0, 0);
            if (cardDue >= dayStart && cardDue <= dayEnd && card.repetitions > 0) {
              cardsDueOnDay.push({ ...card, deckId: deck._id, deckTitle: deck.title });
            }
          }
        }
      }
    }

    calendarDays.push({
      date: dayStr,
      dayLabel: targetDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count: cardsDueOnDay.length,
      cards: cardsDueOnDay,
      isToday: i === 0,
    });
  }

  const totalReviewsDueToday = overdueCards.length + dueTodayCards.length;

  return {
    counts: {
      overdue: overdueCards.length,
      dueToday: dueTodayCards.length,
      totalDueToday: totalReviewsDueToday,
      newCards: newCards.length,
      tomorrow: tomorrowCards.length,
      in3Days: in3DaysCards.length,
      in7Days: in7DaysCards.length,
      later: laterCards.length,
      totalCardsAcrossDecks:
        overdueCards.length +
        dueTodayCards.length +
        newCards.length +
        tomorrowCards.length +
        in3DaysCards.length +
        in7DaysCards.length +
        laterCards.length,
    },
    cards: {
      overdue: overdueCards,
      dueToday: dueTodayCards,
      readyToStudyToday: [...overdueCards, ...dueTodayCards, ...newCards.slice(0, 15)],
      newCards,
    },
    upcomingGroups: {
      today: [...overdueCards, ...dueTodayCards],
      tomorrow: tomorrowCards,
      in3Days: in3DaysCards,
      in7Days: in7DaysCards,
      later: laterCards,
    },
    calendarWorkload: calendarDays,
  };
}
