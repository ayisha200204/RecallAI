import {
  recordCardReview,
  getDueReviewsSummary,
  getRatingIntervalPreviews,
} from '../services/spacedRepetitionService.js';
import { FlashcardDecks } from '../models/repositories.js';

/**
 * Submit a card review rating (Again, Hard, Good, Easy, or Skip)
 */
export async function submitCardReview(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const {
      cardId,
      deckId,
      rating,
      studyMode = 'silent',
      responseTimeSeconds = 0,
      aiEvaluation = null,
      sessionId = null,
    } = req.body;

    if (!cardId || !deckId || !rating) {
      return res.status(400).json({ error: 'cardId, deckId, and rating are required.' });
    }

    const result = await recordCardReview({
      userId,
      cardId,
      deckId,
      rating: rating.toLowerCase(),
      studyMode,
      responseTimeSeconds,
      aiEvaluation,
      sessionId,
    });

    res.json(result);
  } catch (err) {
    console.error('Submit card review error:', err);
    res.status(500).json({ error: err.message || 'Failed to record card review.' });
  }
}

/**
 * Get overall due reviews summary across all user's decks
 */
export async function getDueReviews(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { deckId } = req.query;

    const summary = await getDueReviewsSummary(userId, deckId || null);
    res.json(summary);
  } catch (err) {
    console.error('Get due reviews error:', err);
    res.status(500).json({ error: 'Failed to retrieve due reviews.' });
  }
}

/**
 * Get review calendar breakdown
 */
export async function getReviewCalendar(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const summary = await getDueReviewsSummary(userId);

    res.json({
      calendarWorkload: summary.calendarWorkload,
      counts: summary.counts,
      upcomingGroups: summary.upcomingGroups,
    });
  } catch (err) {
    console.error('Get review calendar error:', err);
    res.status(500).json({ error: 'Failed to retrieve review calendar.' });
  }
}

/**
 * Get due cards specifically for a deck, with rating previews for the study interface
 */
export async function getDeckStudySession(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { filter = 'all' } = req.query; // 'all' | 'due' | 'new'

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let cards = (deck.cards || []).map((card) => {
      const previews = getRatingIntervalPreviews(card, now);
      const isDue = Boolean(
        !card.repetitions ||
        card.repetitions === 0 ||
        (card.nextDueDate && new Date(card.nextDueDate) <= endOfToday)
      );
      return {
        ...card,
        deckId: deck._id,
        isDue,
        intervalPreviews: previews,
      };
    });

    if (filter === 'due') {
      cards = cards.filter((c) => c.isDue);
    } else if (filter === 'new') {
      cards = cards.filter((c) => !c.repetitions || c.repetitions === 0);
    }

    res.json({
      deckTitle: deck.title,
      subject: deck.subject,
      totalDeckCards: deck.cards?.length || 0,
      cards,
      filter,
    });
  } catch (err) {
    console.error('Get deck study session error:', err);
    res.status(500).json({ error: 'Failed to initialize study session.' });
  }
}
