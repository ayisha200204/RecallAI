import { StudyAttempts, Questions, StudySessions, RevisionTasks, Users, FlashcardDecks } from '../models/repositories.js';
import { generatePersonalizedRecommendations } from '../services/recommendationEngine.js';
import { getModelMetadata } from '../services/mlService.js';
import { getDueReviewsSummary } from '../services/spacedRepetitionService.js';

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

    // Today's stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttempts = attempts.filter((a) => a.timestamp && a.timestamp.startsWith(todayStr));
    const todayStudySeconds = todayAttempts.reduce((acc, a) => acc + (a.timeTakenSeconds || 10), 0);
    const todayStudyMinutes = Math.round(todayStudySeconds / 60);

    const dailyTarget = user?.studyGoals?.dailyTargetQuestions || 15;
    const dailyGoalProgress = Math.min(100, Math.round((todayAttempts.length / dailyTarget) * 100));

    // Topic stats
    const topicMap = {};
    attempts.forEach((a) => {
      const t = a.topic || 'General';
      if (!topicMap[t]) topicMap[t] = { topic: t, total: 0, correct: 0, confidences: [], lastTimestamp: a.timestamp };
      topicMap[t].total++;
      if (a.isCorrect) topicMap[t].correct++;
      if (a.confidenceRating) topicMap[t].confidences.push(a.confidenceRating);
      if (new Date(a.timestamp) > new Date(topicMap[t].lastTimestamp)) {
        topicMap[t].lastTimestamp = a.timestamp;
      }
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

    // Topics mastery array: strict, reproducible calculation without fake metrics
    const topicMastery = Object.values(topicMap).map((stat) => {
      const accuracy = Math.round((stat.correct / stat.total) * 100);
      const avgConfidence = stat.confidences.length > 0
        ? Math.round((stat.confidences.reduce((a, b) => a + b, 0) / stat.confidences.length) * 10) / 10
        : 3.0;

      // Section 9 rule: If there is insufficient evidence, display "Not enough practice data"
      if (stat.total < 3) {
        return {
          topic: stat.topic,
          totalAttempts: stat.total,
          accuracy,
          avgConfidence,
          level: 'Not enough practice data',
          status: 'insufficient_data',
          needsRevision: true,
          explanation: `Only ${stat.total} attempt(s) recorded. Complete at least 3 practice questions to establish confidence.`,
        };
      }

      let level = 'Needs Practice';
      if (accuracy >= 85 && avgConfidence >= 3.8) level = 'Mastered';
      else if (accuracy >= 70 && avgConfidence >= 3.0) level = 'Proficient';
      else if (accuracy >= 50) level = 'Developing';

      return {
        topic: stat.topic,
        totalAttempts: stat.total,
        accuracy,
        avgConfidence,
        level,
        status: level === 'Mastered' ? 'mastered' : level === 'Proficient' ? 'proficient' : 'needs_work',
        needsRevision: accuracy < 65,
        explanation: `Based on ${stat.total} attempts with ${accuracy}% accuracy and ${avgConfidence}/5 confidence.`,
      };
    });

    const topicsNeedingRevision = topicMastery.filter((t) => t.needsRevision).length;

    // Real SRS reviews summary
    const srsSummary = await getDueReviewsSummary(userId);

    // Recommendations powered by real data
    const recommendations = await generatePersonalizedRecommendations(userId);

    // Concrete next step recommendation
    let nextStepRecommendation = {
      title: 'Review Due Cards',
      actionText: 'Start Review',
      actionLink: '/study',
      reason: 'Regular spaced repetition solidifies long-term memory.',
    };

    if (srsSummary.counts.overdue > 0) {
      nextStepRecommendation = {
        title: `${srsSummary.counts.overdue} Overdue Flashcard${srsSummary.counts.overdue > 1 ? 's' : ''}`,
        actionText: 'Review Overdue Cards',
        actionLink: '/study?filter=due',
        reason: 'Review these first to arrest memory decay along the Ebbinghaus forgetting curve.',
        badge: 'Critical',
      };
    } else if (srsSummary.counts.dueToday > 0) {
      nextStepRecommendation = {
        title: `${srsSummary.counts.dueToday} Cards Due Today`,
        actionText: 'Start Today\'s Review',
        actionLink: '/study?filter=due',
        reason: 'Optimal spaced repetition intervals calculated for maximum retention.',
        badge: 'Recommended',
      };
    } else if (topicsNeedingRevision > 0) {
      const weakTopic = topicMastery.find((t) => t.needsRevision)?.topic || 'Key Concepts';
      nextStepRecommendation = {
        title: `Strengthen Concept: ${weakTopic}`,
        actionText: 'Take Practice Quiz',
        actionLink: `/practice?topic=${encodeURIComponent(weakTopic)}`,
        reason: `Your recent recall accuracy was under 65% in ${weakTopic}.`,
        badge: 'Targeted Practice',
      };
    } else if (srsSummary.counts.newCards > 0) {
      nextStepRecommendation = {
        title: `${srsSummary.counts.newCards} New Cards Waiting`,
        actionText: 'Learn New Cards',
        actionLink: '/study?filter=new',
        reason: 'Your review backlog is clear. Great time to acquire new concepts!',
        badge: 'New Learning',
      };
    } else {
      nextStepRecommendation = {
        title: 'All Caught Up!',
        actionText: 'Explore My Materials',
        actionLink: '/materials',
        reason: 'You have completed all scheduled reviews for today. Add new study sets or take a mock test.',
        badge: 'Completed',
      };
    }

    res.json({
      summary: {
        totalQuestionsAnswered,
        overallAccuracy,
        topicsPracticedCount,
        streak,
        topicsNeedingRevision,
        todayAttemptsCount: todayAttempts.length,
        todayStudyMinutes,
        dailyTarget,
        dailyGoalProgress,
        studyGoals: user?.studyGoals,
      },
      activityTrend: last7Days,
      topicMastery,
      srs: srsSummary,
      nextStepRecommendation,
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
