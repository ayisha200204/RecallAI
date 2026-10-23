import bcrypt from 'bcryptjs';
import {
  Users,
  StudyMaterials,
  FlashcardDecks,
  Questions,
  StudyAttempts,
  StudySessions,
  RevisionTasks,
  ReviewStates,
  ReviewEvents,
} from '../models/repositories.js';
import { generateToken } from '../middleware/auth.js';

export async function seedDemoData() {
  const demoEmail = 'demo@recallai.com';
  let user = await Users.findOne({ email: demoEmail });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  if (!user) {
    user = await Users.create({
      name: 'Alex Chen',
      email: demoEmail,
      passwordHash,
      studyGoals: {
        primaryGoal: 'General learning',
        targetSubjects: [],
        preferredDurationMinutes: 30,
        dailyTargetQuestions: 15,
      },
      preferences: {
        voiceEnabled: true,
        speechRate: 1.0,
        theme: 'light',
      },
    });
  } else {
    await Users.findByIdAndUpdate(user._id, {
      studyGoals: {
        primaryGoal: 'General learning',
        targetSubjects: [],
        preferredDurationMinutes: 30,
        dailyTargetQuestions: 15,
      },
    });
  }

  // Clear all previous items for a completely fresh workspace
  await StudyMaterials.deleteMany({ userId: user._id });
  await FlashcardDecks.deleteMany({ userId: user._id });
  await Questions.deleteMany({ userId: user._id });
  await StudyAttempts.deleteMany({ userId: user._id });
  await StudySessions.deleteMany({ userId: user._id });
  await RevisionTasks.deleteMany({ userId: user._id });
  await ReviewStates.deleteMany({ userId: user._id });
  await ReviewEvents.deleteMany({ userId: user._id });

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;

  return {
    user: safeUser,
    token,
    materialsCount: 0,
    decksCount: 0,
    questionsCount: 0,
    attemptsCount: 0,
  };
}

export async function handleDemoLogin(req, res) {
  try {
    const demoPayload = await seedDemoData();
    res.json({
      message: 'Logged in as Demo Student (Alex Chen). Clean workspace ready for your notes.',
      token: demoPayload.token,
      user: demoPayload.user,
      isDemo: true,
    });
  } catch (err) {
    console.error('Demo seed error:', err);
    res.status(500).json({ error: 'Failed to initialize demo environment.' });
  }
}
