import { StudyAttempts, RevisionTasks, StudyMaterials } from '../models/repositories.js';
import { predictStudentPerformance } from './mlService.js';

export async function generatePersonalizedRecommendations(userId) {
  // Fetch historical attempts for this student
  const attempts = await StudyAttempts.find({ userId });
  const materials = await StudyMaterials.find({ userId });

  // Group attempts by topic
  const topicStats = {};
  for (const att of attempts) {
    const t = att.topic || 'General';
    if (!topicStats[t]) {
      topicStats[t] = {
        topic: t,
        materialId: att.materialId,
        total: 0,
        correct: 0,
        confidences: [],
        lastAttemptDate: new Date(att.timestamp),
        recentAttempts: [],
      };
    }
    const stat = topicStats[t];
    stat.total++;
    if (att.isCorrect) stat.correct++;
    if (att.confidenceRating) stat.confidences.push(att.confidenceRating);
    const attDate = new Date(att.timestamp);
    if (attDate > stat.lastAttemptDate) stat.lastAttemptDate = attDate;
    stat.recentAttempts.push(att);
  }

  // If user has materials with topics not yet attempted, initialize them
  for (const m of materials) {
    for (const t of m.topics || []) {
      if (!topicStats[t]) {
        topicStats[t] = {
          topic: t,
          materialId: m._id,
          total: 0,
          correct: 0,
          confidences: [3],
          lastAttemptDate: new Date(Date.now() - 72 * 3600 * 1000), // unattempted: treated as aged
          recentAttempts: [],
        };
      }
    }
  }

  const recommendations = [];
  const now = Date.now();

  for (const [topic, stat] of Object.entries(topicStats)) {
    const recentAccuracy = stat.total > 0 ? stat.correct / stat.total : 0.5;
    const hoursSinceLast = Math.max(0.1, (now - stat.lastAttemptDate.getTime()) / (1000 * 3600));
    const avgConfidence = stat.confidences.length > 0
      ? stat.confidences.reduce((a, b) => a + b, 0) / stat.confidences.length
      : 3.0;

    const lastAttempt = stat.recentAttempts[stat.recentAttempts.length - 1];
    const previousCorrect = lastAttempt ? (lastAttempt.isCorrect ? 1 : 0) : 1;

    // Call ML prediction model
    const prediction = await predictStudentPerformance({
      recent_accuracy: Math.round(recentAccuracy * 100) / 100,
      previous_correct: previousCorrect,
      confidence_rating: Math.round(avgConfidence * 10) / 10,
      hours_since_last_attempt: Math.round(hoursSinceLast * 10) / 10,
      attempts_count: Math.max(1, stat.total),
      difficulty: 0.6,
    });

    let recommendedActivity = 'Review flashcards';
    let activityType = 'flashcard';
    let priority = 'medium';

    if (prediction.success_probability < 0.45) {
      priority = 'high';
      activityType = 'flashcard';
      recommendedActivity = `Revisit core concepts and review flashcards for ${topic}`;
    } else if (prediction.success_probability < 0.70) {
      priority = 'medium';
      activityType = 'quiz';
      recommendedActivity = `Practice 3 active recall questions on ${topic}`;
    } else {
      priority = 'low';
      activityType = 'voice';
      recommendedActivity = `Verbal synthesis or advanced test on ${topic}`;
    }

    const rec = {
      topic,
      materialId: stat.materialId,
      currentAccuracy: Math.round(recentAccuracy * 100),
      totalAttempts: stat.total,
      hoursSinceLastReview: Math.round(hoursSinceLast),
      predictedRecallProbability: prediction.success_probability,
      urgency: prediction.urgency,
      priority,
      recommendedActivity,
      activityType,
      recommendationReason: prediction.recommendation,
      mlContributions: prediction.feature_contributions,
      estimatedMinutes: priority === 'high' ? 15 : priority === 'medium' ? 10 : 8,
    };

    recommendations.push(rec);
  }

  // Sort by priority (high first, then lowest predicted probability)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.predictedRecallProbability - b.predictedRecallProbability;
  });

  return recommendations;
}

export async function syncRevisionTasksForUser(userId) {
  const recommendations = await generatePersonalizedRecommendations(userId);
  const existingTasks = await RevisionTasks.find({ userId, completed: false });
  const existingTopics = new Set(existingTasks.map((t) => t.topic));

  const tasksToCreate = [];
  const now = new Date();

  recommendations.slice(0, 4).forEach((rec, idx) => {
    if (!existingTopics.has(rec.topic)) {
      const dueDate = new Date(now.getTime() + (idx + 1) * 24 * 3600 * 1000);
      tasksToCreate.push({
        userId,
        topic: rec.topic,
        materialId: rec.materialId,
        recommendedActivity: rec.recommendedActivity,
        activityType: rec.activityType,
        priority: rec.priority,
        estimatedTimeMinutes: rec.estimatedMinutes,
        dueDate,
        completed: false,
        mlRiskScore: 1 - rec.predictedRecallProbability,
        recommendationReason: rec.recommendationReason,
      });
    }
  });

  if (tasksToCreate.length > 0) {
    await RevisionTasks.createMany(tasksToCreate);
  }

  return await RevisionTasks.find({ userId }, { dueDate: 1 });
}
