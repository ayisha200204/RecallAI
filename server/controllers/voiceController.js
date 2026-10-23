import { Questions, StudyAttempts, ReviewEvents, FlashcardDecks } from '../models/repositories.js';
import { evaluateShortAnswer } from '../services/evaluatorService.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';
import { recordCardReview } from '../services/spacedRepetitionService.js';

export async function getVoiceQuestion(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { topic, materialId, deckId } = req.query;

    let question = null;

    if (deckId) {
      // Pick card from deck for voice active recall
      const deck = await FlashcardDecks.findById(deckId);
      if (deck && deck.cards && deck.cards.length > 0) {
        const randomCard = deck.cards[Math.floor(Math.random() * deck.cards.length)];
        return res.json({
          question: {
            id: randomCard.id,
            deckId: deck._id,
            questionText: randomCard.question,
            referenceAnswer: randomCard.answer,
            topic: randomCard.topic,
            difficulty: randomCard.difficulty,
            isCard: true,
            expectedConceptCount: 3,
          },
        });
      }
    }

    const query = { userId, questionType: 'short_answer' };
    if (materialId) query.materialId = materialId;
    if (topic && topic !== 'all') query.topic = topic;

    let candidates = await Questions.find(query);

    // If no short-answer questions exist yet, fallback to any question or flashcard
    if (candidates.length === 0) {
      candidates = await Questions.find({ userId });
    }

    if (candidates.length === 0) {
      // Check decks
      const decks = await FlashcardDecks.find({ userId });
      for (const d of decks) {
        if (d.cards && d.cards.length > 0) {
          const c = d.cards[0];
          return res.json({
            question: {
              id: c.id,
              deckId: d._id,
              questionText: c.question,
              referenceAnswer: c.answer,
              topic: c.topic,
              difficulty: c.difficulty,
              isCard: true,
              expectedConceptCount: 2,
            },
          });
        }
      }
      return res.status(404).json({
        error: 'No voice study questions available. Please upload a study material first.',
      });
    }

    question = candidates[Math.floor(Math.random() * candidates.length)];

    res.json({
      question: {
        id: question._id || question.id,
        deckId: question.deckId,
        questionText: question.questionText,
        referenceAnswer: question.referenceAnswer || question.explanation || '',
        topic: question.topic,
        difficulty: question.difficulty,
        isCard: false,
        expectedConceptCount: (question.expectedKeyConcepts || []).length || 3,
      },
    });
  } catch (err) {
    console.error('Get voice question error:', err);
    res.status(500).json({ error: 'Failed to retrieve voice question.' });
  }
}

export async function evaluateVoiceResponse(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const {
      questionId,
      deckId,
      transcript,
      confidenceRating = 3,
      timeTakenSeconds = 15,
      confirmedRating = null, // Student may optionally confirm rating directly
    } = req.body;

    if (!questionId || !transcript) {
      return res.status(400).json({ error: 'Question ID and voice transcript are required.' });
    }

    let question = await Questions.findById(questionId);
    let referenceAnswer = '';
    let expectedKeyConcepts = [];
    let topic = 'General';
    let isCard = false;

    if (question) {
      referenceAnswer = question.referenceAnswer || question.explanation || '';
      expectedKeyConcepts = question.expectedKeyConcepts || [];
      topic = question.topic;
    } else {
      // Check if it's a card from a deck
      const decks = await FlashcardDecks.find({ userId });
      for (const d of decks) {
        const found = (d.cards || []).find((c) => String(c.id) === String(questionId));
        if (found) {
          question = found;
          referenceAnswer = found.answer;
          topic = found.topic;
          isCard = true;
          break;
        }
      }
    }

    if (!question && !referenceAnswer) {
      return res.status(404).json({ error: 'Question or card not found.' });
    }

    const evalResult = evaluateShortAnswer({
      submittedAnswer: transcript,
      referenceAnswer: referenceAnswer || 'Conceptual correctness',
      expectedKeyConcepts,
      questionText: question.questionText || question.question,
    });

    // Determine Suggested Rating based on conceptual accuracy & completeness:
    // - Correct and complete: Easy
    // - Mostly correct but incomplete: Good
    // - Partially correct: Hard
    // - Incorrect or irrelevant: Again
    let suggestedRating = 'again';
    let masteryStatus = 'Incorrect or irrelevant';

    if (evalResult.score >= 0.85) {
      suggestedRating = 'easy';
      masteryStatus = 'Correct and complete';
    } else if (evalResult.score >= 0.6) {
      suggestedRating = 'good';
      masteryStatus = 'Mostly correct but incomplete';
    } else if (evalResult.score >= 0.35) {
      suggestedRating = 'hard';
      masteryStatus = 'Partially correct';
    } else {
      suggestedRating = 'again';
      masteryStatus = 'Incorrect or requires review';
    }

    // Follow-up question for conversational tutoring
    let followUpQuestion = null;
    if (!evalResult.isCorrect && evalResult.conceptsMissed?.length > 0) {
      followUpQuestion = `You mentioned key points, but how does this connect to "${evalResult.conceptsMissed[0]}"?`;
    } else if (evalResult.isCorrect && evalResult.conceptsMissed?.length > 0) {
      followUpQuestion = `Spot on! To deepen retention: how would this behave if "${evalResult.conceptsMissed[0]}" were altered?`;
    }

    // If student confirmed rating directly:
    const activeRating = confirmedRating || suggestedRating;

    // Save study attempt
    const attempt = await StudyAttempts.create({
      userId,
      questionId,
      materialId: question.materialId,
      deckId: deckId || question.deckId,
      topic,
      questionType: 'voice_short_answer',
      submittedAnswer: transcript,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      confidenceRating: Number(confidenceRating) || 3,
      timeTakenSeconds: Number(timeTakenSeconds) || 15,
      evaluationFeedback: {
        summary: evalResult.summary,
        guidance: evalResult.guidance,
        conceptsMatched: evalResult.conceptsMatched,
        conceptsMissed: evalResult.conceptsMissed,
        masteryStatus,
        suggestedRating,
      },
      timestamp: new Date().toISOString(),
    });

    // If question has a deckId, also update ReviewState so voice recall advances spaced repetition schedule
    let srsSchedule = null;
    if (deckId || question.deckId) {
      try {
        srsSchedule = await recordCardReview({
          userId,
          cardId: questionId,
          deckId: deckId || question.deckId,
          rating: activeRating,
          studyMode: 'voice',
          responseTimeSeconds: timeTakenSeconds,
          aiEvaluation: {
            score: evalResult.score,
            masteryStatus,
            conceptsMatched: evalResult.conceptsMatched,
          },
        });
      } catch (srsErr) {
        console.warn('Voice SRS sync notice:', srsErr.message);
      }
    }

    syncRevisionTasksForUser(userId).catch(() => {});

    res.json({
      attemptId: attempt._id,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      suggestedRating,
      masteryStatus,
      followUpQuestion,
      feedback: {
        summary: evalResult.summary,
        guidance: evalResult.guidance,
        conceptsMatched: evalResult.conceptsMatched,
        conceptsMissed: evalResult.conceptsMissed,
        referenceAnswer,
      },
      srsSchedule,
    });
  } catch (err) {
    console.error('Evaluate voice error:', err);
    res.status(500).json({ error: 'Failed to evaluate voice response.' });
  }
}
