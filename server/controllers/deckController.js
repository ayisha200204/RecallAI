import { FlashcardDecks, StudyAttempts, ReviewStates } from '../models/repositories.js';
import { getRatingIntervalPreviews } from '../services/spacedRepetitionService.js';

export async function listDecks(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const decks = await FlashcardDecks.find({ userId }, { createdAt: -1 });

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const enriched = decks.map((deck) => {
      const cards = deck.cards || [];
      const dueCount = cards.filter(
        (c) => !c.repetitions || c.repetitions === 0 || (c.nextDueDate && new Date(c.nextDueDate) <= endOfToday)
      ).length;
      const masteredCount = cards.filter((c) => (c.repetitions || 0) >= 3 && (c.interval || 0) >= 7).length;

      return {
        ...deck,
        cardCount: cards.length,
        dueCount,
        masteredCount,
      };
    });

    res.json({ decks: enriched });
  } catch (err) {
    console.error('List decks error:', err);
    res.status(500).json({ error: 'Failed to retrieve flashcard decks.' });
  }
}

export async function createDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { title, subject, cards = [], materialId = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required for the study set.' });
    }

    const formattedCards = cards.map((card, idx) => ({
      id: card.id || `card_${Date.now()}_${idx}`,
      question: card.question?.trim() || '',
      answer: card.answer?.trim() || '',
      explanation: card.explanation?.trim() || '',
      topic: card.topic?.trim() || subject || 'General',
      difficulty: card.difficulty || 'medium',
      sourceReference: card.sourceReference || '',
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      state: 'new',
      nextDueDate: new Date().toISOString(),
    }));

    const topics = Array.from(new Set(formattedCards.map((c) => c.topic)));
    const topicMetadata = topics.map((t) => ({
      name: t,
      cardCount: formattedCards.filter((c) => c.topic === t).length,
    }));

    const deck = await FlashcardDecks.create({
      userId,
      materialId,
      title: title.trim(),
      subject: subject?.trim() || 'General Studies',
      cards: formattedCards,
      topicMetadata,
    });

    res.status(201).json({
      message: 'Study set created successfully.',
      deck,
    });
  } catch (err) {
    console.error('Create deck error:', err);
    res.status(500).json({ error: 'Failed to create study deck.' });
  }
}

export async function getDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });

    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized to view this deck.' });
    }

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Enrich each card with SRS interval preview
    const enrichedCards = (deck.cards || []).map((card) => {
      const isDue = Boolean(
        !card.repetitions ||
          card.repetitions === 0 ||
          (card.nextDueDate && new Date(card.nextDueDate) <= endOfToday)
      );
      return {
        ...card,
        isDue,
        intervalPreviews: getRatingIntervalPreviews(card, now),
      };
    });

    // Recent attempts for quick history
    const attempts = await StudyAttempts.find({ userId, deckId: id });
    const cardStats = {};
    attempts.forEach((a) => {
      cardStats[a.questionId] = {
        lastConfidence: a.confidenceRating,
        isUnderstood: a.isCorrect,
        lastAttempted: a.timestamp,
        submittedAnswer: a.submittedAnswer,
      };
    });

    res.json({
      deck: {
        ...deck,
        cards: enrichedCards,
      },
      cardStats,
    });
  } catch (err) {
    console.error('Get deck error:', err);
    res.status(500).json({ error: 'Failed to fetch flashcard deck.' });
  }
}

export async function updateDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { title, subject } = req.body;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const updates = {};
    if (title) updates.title = title.trim();
    if (subject) updates.subject = subject.trim();

    const updated = await FlashcardDecks.findByIdAndUpdate(id, updates);
    res.json({ message: 'Deck updated successfully.', deck: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update deck.' });
  }
}

export async function addCardToDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { question, answer, explanation = '', topic, difficulty = 'medium' } = req.body;

    if (!question || !question.trim() || !answer || !answer.trim()) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const newCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: question.trim(),
      answer: answer.trim(),
      explanation: explanation.trim(),
      topic: topic?.trim() || deck.subject || 'General',
      difficulty,
      sourceReference: 'Manual Entry',
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      state: 'new',
      nextDueDate: new Date().toISOString(),
    };

    const cards = [...(deck.cards || []), newCard];
    await FlashcardDecks.findByIdAndUpdate(id, { cards });

    res.status(201).json({ message: 'Card added successfully.', card: newCard });
  } catch (err) {
    console.error('Add card error:', err);
    res.status(500).json({ error: 'Failed to add card.' });
  }
}

export async function updateCardInDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id, cardId } = req.params;
    const { question, answer, explanation, topic, difficulty } = req.body;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const cards = deck.cards || [];
    const idx = cards.findIndex((c) => String(c.id) === String(cardId));
    if (idx === -1) {
      return res.status(404).json({ error: 'Card not found in deck.' });
    }

    cards[idx] = {
      ...cards[idx],
      ...(question !== undefined && { question: question.trim() }),
      ...(answer !== undefined && { answer: answer.trim() }),
      ...(explanation !== undefined && { explanation: explanation.trim() }),
      ...(topic !== undefined && { topic: topic.trim() }),
      ...(difficulty !== undefined && { difficulty }),
      updatedAt: new Date().toISOString(),
    };

    await FlashcardDecks.findByIdAndUpdate(id, { cards });
    res.json({ message: 'Card updated successfully.', card: cards[idx] });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Failed to update card.' });
  }
}

export async function deleteCardFromDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id, cardId } = req.params;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const cards = (deck.cards || []).filter((c) => String(c.id) !== String(cardId));
    await FlashcardDecks.findByIdAndUpdate(id, { cards });

    // Clean up ReviewState if exists
    await ReviewStates.deleteMany({ userId, cardId });

    res.json({ message: 'Card removed from deck.', remainingCount: cards.length });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card.' });
  }
}

export async function resetDeckProgress(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const now = new Date();
    const resetCards = (deck.cards || []).map((c) => ({
      ...c,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      lapses: 0,
      state: 'new',
      nextDueDate: now.toISOString(),
      lastReviewedAt: null,
    }));

    await FlashcardDecks.findByIdAndUpdate(id, { cards: resetCards });
    await ReviewStates.deleteMany({ userId, deckId: id });

    res.json({ message: 'Deck study progress reset to new state.', deckId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset deck progress.' });
  }
}

export async function deleteDeck(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const deck = await FlashcardDecks.findById(id);
    if (!deck) return res.status(404).json({ error: 'Deck not found.' });
    if (String(deck.userId) !== String(userId)) {
      return res.status(403).json({ error: 'Unauthorized to delete this deck.' });
    }

    await FlashcardDecks.findByIdAndDelete(id);
    await ReviewStates.deleteMany({ deckId: id });
    res.json({ message: 'Deck deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete deck.' });
  }
}
