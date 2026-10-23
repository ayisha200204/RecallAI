import { Questions, StudyAttempts, StudySessions, ReviewEvents } from '../models/repositories.js';
import { evaluateShortAnswer } from '../services/evaluatorService.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';

export async function getPracticeQuestions(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { materialId, deckId, topic, difficulty, questionType, limit = 10 } = req.query;

    const query = { userId };
    if (materialId) query.materialId = materialId;
    if (deckId) query.deckId = deckId;
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
    const { questionId, deckId, submittedAnswer, confidenceRating = 3, timeTakenSeconds = 0 } = req.body;

    if (!questionId || submittedAnswer === undefined) {
      return res.status(400).json({ error: 'Question ID and submitted answer are required.' });
    }

    const question = await Questions.findById(questionId);

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
      } else if (question.questionType === 'true_false') {
        correctAnswer = question.correctAnswer;
        isCorrect = submittedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        score = isCorrect ? 1.0 : 0.0;
        feedback = {
          summary: isCorrect ? 'Correct! Your evaluation is accurate.' : `Incorrect. The correct statement was: ${question.correctAnswer}.`,
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
      confidenceRating: Number(confidenceRating) || 3,
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      evaluationFeedback: feedback,
      timestamp: new Date().toISOString(),
    });

    // Quiz questions contribute to spaced repetition learning evidence:
    // Determine rating based on correctness and confidence
    let impliedRating = 'again';
    if (isCorrect) {
      if (confidenceRating >= 4) impliedRating = 'easy';
      else if (confidenceRating === 3) impliedRating = 'good';
      else impliedRating = 'hard';
    } else {
      impliedRating = 'again';
    }

    await ReviewEvents.create({
      userId,
      questionId,
      deckId: deckId || (question ? question.deckId : null),
      conceptId: question?.conceptId || null,
      topic,
      studyMode: 'quiz',
      rating: impliedRating,
      isCorrect,
      responseTimeSeconds: Number(timeTakenSeconds) || 0,
      isSkip: false,
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
    const {
      sessionType,
      title,
      questionsAttempted,
      correctCount,
      averageConfidence,
      topicsCovered,
      durationSeconds,
      resultsBreakdown = [],
    } = req.body;

    const accuracy = questionsAttempted > 0 ? Math.round((correctCount / questionsAttempted) * 100) : 0;

    // Separate strengths vs weaknesses based on topics in this test
    const topicResults = {};
    resultsBreakdown.forEach((r) => {
      const t = r.topic || 'General';
      if (!topicResults[t]) topicResults[t] = { correct: 0, total: 0 };
      topicResults[t].total += 1;
      if (r.isCorrect) topicResults[t].correct += 1;
    });

    const strongTopics = [];
    const weakTopics = [];
    Object.entries(topicResults).forEach(([t, s]) => {
      const pct = s.total > 0 ? (s.correct / s.total) * 100 : 0;
      if (pct >= 70) strongTopics.push(t);
      else weakTopics.push(t);
    });

    const session = await StudySessions.create({
      userId,
      sessionType: sessionType || 'practice',
      title: title || 'Quiz Test Session',
      questionsAttempted: Number(questionsAttempted) || 0,
      correctCount: Number(correctCount) || 0,
      averageConfidence: Number(averageConfidence) || 3,
      topicsCovered: topicsCovered || [],
      sessionSummary: {
        accuracy,
        durationSeconds: Number(durationSeconds) || 60,
        strongTopics,
        weakTopics,
      },
      startedAt: new Date(Date.now() - (durationSeconds || 60) * 1000).toISOString(),
      completedAt: new Date().toISOString(),
    });

    res.json({
      message: 'Test session summary saved successfully.',
      session,
      accuracy,
      strongTopics,
      weakTopics,
    });
  } catch (err) {
    console.error('Complete practice session error:', err);
    res.status(500).json({ error: 'Failed to record session completion.' });
  }
}
