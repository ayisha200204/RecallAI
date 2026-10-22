import { Questions, StudyAttempts } from '../models/repositories.js';
import { evaluateShortAnswer } from '../services/evaluatorService.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';

export async function getVoiceQuestion(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { topic, materialId } = req.query;

    const query = { userId, questionType: 'short_answer' };
    if (materialId) query.materialId = materialId;
    if (topic && topic !== 'all') query.topic = topic;

    let candidates = await Questions.find(query);

    // If no short-answer questions exist yet, fallback to any question
    if (candidates.length === 0) {
      candidates = await Questions.find({ userId });
    }

    if (candidates.length === 0) {
      return res.status(404).json({
        error: 'No voice study questions available. Please upload a study material first.',
      });
    }

    const question = candidates[Math.floor(Math.random() * candidates.length)];

    // Send question without revealing the answer immediately
    res.json({
      question: {
        id: question._id || question.id,
        questionText: question.questionText,
        topic: question.topic,
        difficulty: question.difficulty,
        expectedConceptCount: (question.expectedKeyConcepts || []).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve voice question.' });
  }
}

export async function evaluateVoiceResponse(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { questionId, transcript, confidenceRating = 3, timeTakenSeconds = 15 } = req.body;

    if (!questionId || !transcript) {
      return res.status(400).json({ error: 'Question ID and voice transcript are required.' });
    }

    const question = await Questions.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const evalResult = evaluateShortAnswer({
      submittedAnswer: transcript,
      referenceAnswer: question.referenceAnswer || question.explanation || '',
      expectedKeyConcepts: question.expectedKeyConcepts || [],
      questionText: question.questionText,
    });

    // Generate conversational follow-up if response is partial
    let followUpQuestion = null;
    if (!evalResult.isCorrect && evalResult.conceptsMissed.length > 0) {
      const topMissed = evalResult.conceptsMissed[0];
      followUpQuestion = `You mentioned key details, but how does the mechanism account for "${topMissed}"?`;
    } else if (evalResult.isCorrect && evalResult.conceptsMissed.length > 0) {
      followUpQuestion = `Great answer! To take it a step further: could you explain how this relates to "${evalResult.conceptsMissed[0]}" in practice?`;
    }

    // Save study attempt
    const attempt = await StudyAttempts.create({
      userId,
      questionId,
      materialId: question.materialId,
      deckId: question.deckId,
      topic: question.topic,
      questionType: 'voice_short_answer',
      submittedAnswer: transcript,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      confidenceRating,
      timeTakenSeconds,
      evaluationFeedback: {
        summary: evalResult.summary,
        guidance: evalResult.guidance,
        conceptsMatched: evalResult.conceptsMatched,
        conceptsMissed: evalResult.conceptsMissed,
      },
      timestamp: new Date().toISOString(),
    });

    syncRevisionTasksForUser(userId).catch(() => {});

    res.json({
      attemptId: attempt._id,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      feedback: {
        summary: evalResult.summary,
        guidance: evalResult.guidance,
        conceptsMatched: evalResult.conceptsMatched,
        conceptsMissed: evalResult.conceptsMissed,
        referenceAnswer: question.referenceAnswer || '',
      },
      followUpQuestion,
    });
  } catch (err) {
    console.error('Evaluate voice error:', err);
    res.status(500).json({ error: 'Failed to evaluate voice response.' });
  }
}
