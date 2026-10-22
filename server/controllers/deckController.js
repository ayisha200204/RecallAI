import { FlashcardDecks, StudyAttempts } from '../models/repositories.js';

export async function listDecks(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const decks = await FlashcardDecks.find({ userId }, { createdAt: -1 });
    res.json({ decks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve flashcard decks.' });
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

    // Attach student's recent confidence history for these cards
    const attempts = await StudyAttempts.find({ userId, deckId: id });
    const cardStats = {};
    attempts.forEach((a) => {
      cardStats[a.questionId] = {
        lastConfidence: a.confidenceRating,
        isUnderstood: a.isCorrect,
        lastAttempted: a.timestamp,
      };
    });

    res.json({
      deck,
      cardStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch flashcard deck.' });
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
    res.json({ message: 'Deck deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete deck.' });
  }
}
