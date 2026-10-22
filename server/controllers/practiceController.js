import { Questions, StudyAttempts, StudySessions, RevisionTasks } from '../models/repositories.js';
import { evaluateShortAnswer } from '../services/evaluatorService.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';

export async function getPracticeQuestions(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { materialId, topic, difficulty, questionType, limit = 10 } = req.query;

    const query = { userId };
    if (materialId) query.materialId = materialId;
    if (topic && topic !== 'all') query.topic = topic;
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    if (questionType && questionType !== 'all') query.questionType = questionType;

    let questions = await Questions.find(query);

    // Shuffle questions
    questions = questions.sort(() => 0.5 - Math.random()).slice(0, Number(limit));

    // For security during quiz taking, do not send reference answer or correct option for ongoing quiz
    const sanitized = questions.map((q) => {
      const { correctAnswer, referenceAnswer, ...safe } = q;
      return safe;
    });

    res.json({ questions: sanitized, total: questions.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve practice questions.' });
  }
}

export async function submitQuestionAttempt(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { questionId, deckId, submittedAnswer, confidenceRating, timeTakenSeconds } = req.body;

    if (!questionId || submittedAnswer === undefined) {
      return res.status(400).json({ error: 'Question ID and submitted answer are required.' });
    }

    const question = await Questions.findById(questionId);

    // Could also be a card from a deck
    let isCorrect = false;
    let score = 0;
    let feedback = {};
    let correctAnswer = '';
    let explanation = '';
    let topic = 'General';
    let questionType = 'quiz';

    if (question) {
      topic = question.topic;
      questionType = question.questionType;
      explanation = question.explanation || '';

      if (question.questionType === 'mcq') {
        correctAnswer = question.correctAnswer;
        isCorrect = submittedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        score = isCorrect ? 1.0 : 0.0;
        feedback = {
          summary: isCorrect ? 'Correct! Well done.' : `Incorrect. The correct answer was: "${question.correctAnswer}".`,
          guidance: explanation,
        };
      } else if (question.questionType === 'short_answer') {
        correctAnswer = question.referenceAnswer;
        const evalResult = evaluateShortAnswer({
          submittedAnswer,
          referenceAnswer: question.referenceAnswer,
          expectedKeyConcepts: question.expectedKeyConcepts || [],
          questionText: question.questionText,
        });

        isCorrect = evalResult.isCorrect;
        score = evalResult.score;
        feedback = {
          summary: evalResult.summary,
          guidance: evalResult.guidance,
          conceptsMatched: evalResult.conceptsMatched,
          conceptsMissed: evalResult.conceptsMissed,
        };
      }
    } else {
      // Flashcard self-assessment attempt
      isCorrect = Boolean(submittedAnswer === 'understood' || submittedAnswer === 'true' || submittedAnswer === true);
      score = isCorrect ? 1.0 : 0.0;
      feedback = {
        summary: isCorrect ? 'Marked as understood.' : 'Marked for review.',
        guidance: 'Spaced repetition schedule updated accordingly.',
      };
    }

    const attempt = await StudyAttempts.create({
      userId,
      questionId,
      deckId: deckId || (question ? question.deckId : null),
      materialId: question ? question.materialId : null,
      topic,
      questionType,
      submittedAnswer: String(submittedAnswer),
      isCorrect,
      score,
      confidenceRating: confidenceRating || 3,
      timeTakenSeconds: timeTakenSeconds || 0,
      evaluationFeedback: feedback,
      timestamp: new Date().toISOString(),
    });

    // Asynchronously trigger revision task update in background
    syncRevisionTasksForUser(userId).catch((e) => console.warn('Task sync notice:', e.message));

    res.json({
      attemptId: attempt._id,
      isCorrect,
      score,
      correctAnswer,
      explanation,
      feedback,
      confidenceRating: attempt.confidenceRating,
    });
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ error: 'Failed to record study attempt.' });
  }
}

export async function completePracticeSession(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { sessionType, title, questionsAttempted, correctCount, averageConfidence, topicsCovered, durationSeconds } =
      req.body;

    const accuracy = questionsAttempted > 0 ? Math.round((correctCount / questionsAttempted) * 100) : 0;

    const session = await StudySessions.create({
      userId,
      sessionType: sessionType || 'practice',
      title: title || 'Practice Session',
      questionsAttempted: Number(questionsAttempted) || 0,
      correctCount: Number(correctCount) || 0,
      averageConfidence: Number(averageConfidence) || 3,
      topicsCovered: topicsCovered || [],
      sessionSummary: {
        accuracy,
        durationSeconds: Number(durationSeconds) || 60,
      },
      startedAt: new Date(Date.now() - (durationSeconds || 60) * 1000).toISOString(),
      completedAt: new Date().toISOString(),
    });

    res.json({
      message: 'Session summary saved successfully.',
      session,
      accuracy,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record session completion.' });
  }
}
