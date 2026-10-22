import { StudyAttempts, Questions, StudySessions, RevisionTasks, Users } from '../models/repositories.js';
import { generatePersonalizedRecommendations } from '../services/recommendationEngine.js';
import { getModelMetadata } from '../services/mlService.js';

function calculateStreak(attempts) {
  if (!attempts || attempts.length === 0) return 0;

  // Extract distinct calendar days in YYYY-MM-DD
  const days = Array.from(
    new Set(attempts.map((a) => new Date(a.timestamp).toISOString().split('T')[0]))
  ).sort().reverse();

  if (days.length === 0) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Must have studied today or yesterday to maintain active streak
  if (days[0] !== todayStr && days[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  let currentDate = new Date(days[0]);

  for (let i = 1; i < days.length; i++) {
    const prevDate = new Date(days[i]);
    const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

export async function getAnalyticsOverview(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const attempts = await StudyAttempts.find({ userId });
    const sessions = await StudySessions.find({ userId });
    const user = await Users.findById(userId);

    const totalQuestionsAnswered = attempts.length;
    const correctAttempts = attempts.filter((a) => a.isCorrect).length;
    const overallAccuracy = totalQuestionsAnswered > 0 ? Math.round((correctAttempts / totalQuestionsAnswered) * 100) : 0;

    const streak = calculateStreak(attempts);

    // Topic stats
    const topicMap = {};
    attempts.forEach((a) => {
      const t = a.topic || 'General';
      if (!topicMap[t]) topicMap[t] = { topic: t, total: 0, correct: 0, confidences: [] };
      topicMap[t].total++;
      if (a.isCorrect) topicMap[t].correct++;
      if (a.confidenceRating) topicMap[t].confidences.push(a.confidenceRating);
    });

    const topicsPracticedCount = Object.keys(topicMap).length;

    // Daily activity trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      const dayAttempts = attempts.filter((a) => a.timestamp && a.timestamp.startsWith(dateStr));
      const dayCorrect = dayAttempts.filter((a) => a.isCorrect).length;
      last7Days.push({
        date: dateStr,
        day: label,
        attempts: dayAttempts.length,
        correct: dayCorrect,
        accuracy: dayAttempts.length > 0 ? Math.round((dayCorrect / dayAttempts.length) * 100) : 0,
      });
    }

    // Topics mastery array
    const topicMastery = Object.values(topicMap).map((stat) => {
      const accuracy = Math.round((stat.correct / stat.total) * 100);
      const avgConfidence = stat.confidences.length > 0
        ? Math.round((stat.confidences.reduce((a, b) => a + b, 0) / stat.confidences.length) * 10) / 10
        : 3.0;

      let level = 'Beginner';
      if (stat.total >= 4 && accuracy >= 80) level = 'Mastered';
      else if (stat.total >= 2 && accuracy >= 60) level = 'Intermediate';

      return {
        topic: stat.topic,
        totalAttempts: stat.total,
        accuracy,
        avgConfidence,
        level,
        needsRevision: accuracy < 65 || stat.total < 2,
      };
    });

    const topicsNeedingRevision = topicMastery.filter((t) => t.needsRevision).length;

    // Recommendations powered by ML
    const recommendations = await generatePersonalizedRecommendations(userId);

    // Difficult questions (incorrect >= 1)
    const difficultQuestionsRaw = attempts.filter((a) => !a.isCorrect);
    const questionCounts = {};
    difficultQuestionsRaw.forEach((a) => {
      questionCounts[a.questionId] = (questionCounts[a.questionId] || 0) + 1;
    });

    res.json({
      summary: {
        totalQuestionsAnswered,
        overallAccuracy,
        topicsPracticedCount,
        streak,
        topicsNeedingRevision,
        studyGoals: user?.studyGoals,
      },
      activityTrend: last7Days,
      topicMastery,
      recommendations,
      sessionsCount: sessions.length,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to generate learning analytics.' });
  }
}

export async function getMLPredictions(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const recommendations = await generatePersonalizedRecommendations(userId);
    const metadata = getModelMetadata();

    res.json({
      predictions: recommendations,
      modelMetadata: {
        modelType: metadata.model_type,
        datasetSource: metadata.dataset_source,
        prototypeNotice: metadata.prototype_notice,
        metrics: metadata.logistic_regression?.metrics,
        featureImportances: metadata.random_forest?.feature_importances,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve ML predictions.' });
  }
}
