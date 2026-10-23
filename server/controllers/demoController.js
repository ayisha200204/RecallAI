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
import { generateStudyMaterials } from '../services/aiService.js';
import { syncRevisionTasksForUser } from '../services/recommendationEngine.js';

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
        primaryGoal: 'University exams',
        targetSubjects: ['Operating Systems', 'Computer Networks'],
        examDate: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString(),
        preferredDurationMinutes: 30,
        dailyTargetQuestions: 15,
      },
      preferences: {
        voiceEnabled: true,
        speechRate: 1.0,
        theme: 'light',
      },
    });
  }

  // Clear existing items for clean demo seed
  await StudyMaterials.deleteMany({ userId: user._id });
  await FlashcardDecks.deleteMany({ userId: user._id });
  await Questions.deleteMany({ userId: user._id });
  await StudyAttempts.deleteMany({ userId: user._id });
  await StudySessions.deleteMany({ userId: user._id });
  await RevisionTasks.deleteMany({ userId: user._id });
  await ReviewStates.deleteMany({ userId: user._id });
  await ReviewEvents.deleteMany({ userId: user._id });

  const osText = `Operating System Architecture and Concurrency
Processes and Threads: A process is a program in execution requiring PCB, memory space, and OS bookkeeping. Threads represent lightweight execution pathways within the same address space.
CPU Scheduling: Objective is maximizing throughput and minimizing average turnaround time. Shortest Job First is provably optimal for average waiting time; Round Robin prevents CPU starvation using time quanta.
Deadlocks: A permanent stall condition requiring Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait. Dijkstra's Banker's algorithm assesses safety vectors.
Memory Management: The MMU transforms logical addresses to physical frames. Paging mitigates external fragmentation while the TLB speeds translation lookups.`;

  const material = await StudyMaterials.create({
    userId: user._id,
    title: 'Operating Systems — Concurrency, Scheduling & Memory',
    subject: 'Operating Systems',
    extractedText: osText,
    fileMetadata: {
      fileName: 'OS_Concepts_Official_Notes.pdf',
      fileSize: 184500,
      fileType: 'application/pdf',
      pageCount: 12,
      isScanned: false,
    },
    topics: ['Processes and Threads', 'CPU Scheduling', 'Deadlocks', 'Memory Management', 'Virtual Memory'],
  });

  const ytMaterial = await StudyMaterials.create({
    userId: user._id,
    title: 'Operating Systems: Crash Course Computer Science #18',
    subject: 'Operating Systems',
    extractedText: `Welcome to Crash Course Computer Science. Today we talk about Operating Systems!
The operating system is the master program that manages hardware resources, processes, and memory.
Early computers ran one program at a time from punched cards. Modern operating systems introduce multiprogramming and process isolation.
Process Scheduling: Multitasking allows multiple programs to share the CPU by switching between them rapidly with time slices.
Memory Protection: The OS isolates virtual memory spaces so a crashing program cannot corrupt other applications.
Device Drivers: The OS abstracts hardware inputs and outputs so software can interact with standard system calls.`,
    fileMetadata: {
      fileName: 'CrashCourse_Operating_Systems.youtube',
      fileSize: 24500,
      fileType: 'youtube',
      pageCount: 12,
      youtubeUrl: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
      videoId: '26QPDBe-NB8',
      authorName: 'CrashCourse',
      thumbnailUrl: 'https://i.ytimg.com/vi/26QPDBe-NB8/hqdefault.jpg',
      durationSeconds: 740,
      isScanned: false,
    },
    topics: ['Processes and Threads', 'CPU Scheduling', 'Memory Management'],
  });

  const generated = await generateStudyMaterials({
    text: osText,
    subject: 'Operating Systems',
    requestedTypes: ['flashcards', 'mcqs', 'true_false', 'short_answer'],
  });

  const nowMs = Date.now();
  const dayMs = 24 * 3600 * 1000;

  // Enrich demo cards with realistic SRS review timelines
  const demoSrsCards = generated.flashcards.map((card, idx) => {
    if (idx === 0) {
      // Overdue review (due 1.2 days ago)
      return {
        ...card,
        repetitions: 3,
        interval: 7,
        easeFactor: 2.5,
        state: 'review',
        lastReviewedAt: new Date(nowMs - 8.2 * dayMs).toISOString(),
        nextDueDate: new Date(nowMs - 1.2 * dayMs).toISOString(),
      };
    } else if (idx === 1) {
      // Due today (due 3 hours ago)
      return {
        ...card,
        repetitions: 2,
        interval: 3,
        easeFactor: 2.4,
        state: 'review',
        lastReviewedAt: new Date(nowMs - 3.1 * dayMs).toISOString(),
        nextDueDate: new Date(nowMs - 3 * 3600 * 1000).toISOString(),
      };
    } else if (idx === 2) {
      // Due later today
      return {
        ...card,
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
        state: 'review',
        lastReviewedAt: new Date(nowMs - 0.7 * dayMs).toISOString(),
        nextDueDate: new Date(nowMs + 4 * 3600 * 1000).toISOString(),
      };
    } else if (idx === 3) {
      // Due in 3 days
      return {
        ...card,
        repetitions: 2,
        interval: 7,
        easeFactor: 2.6,
        state: 'review',
        lastReviewedAt: new Date(nowMs - 4 * dayMs).toISOString(),
        nextDueDate: new Date(nowMs + 3 * dayMs).toISOString(),
      };
    } else {
      // New card
      return {
        ...card,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        state: 'new',
        nextDueDate: new Date().toISOString(),
      };
    }
  });

  const deck = await FlashcardDecks.create({
    userId: user._id,
    materialId: material._id,
    title: 'OS Essentials — Core Mastery Deck',
    subject: 'Operating Systems',
    cards: demoSrsCards,
    topicMetadata: generated.topics.map((t) => ({ name: t, cardCount: 1 })),
  });

  // Seed ReviewStates for each card
  for (const c of demoSrsCards) {
    await ReviewStates.create({
      userId: user._id,
      cardId: c.id,
      deckId: deck._id,
      materialId: material._id,
      topic: c.topic,
      questionText: c.question,
      answerText: c.answer,
      repetitions: c.repetitions,
      interval: c.interval,
      easeFactor: c.easeFactor,
      nextDueDate: c.nextDueDate,
      lastReviewedAt: c.lastReviewedAt || null,
      lapses: idx => (idx === 1 ? 1 : 0),
      state: c.state,
      history: c.repetitions > 0 ? [{ rating: 'good', interval: c.interval, timestamp: c.lastReviewedAt }] : [],
    });
  }

  // Save questions (MCQs, True/False, Short Answer)
  const questionsToSave = [
    ...generated.mcqs.map((q) => ({
      userId: user._id,
      materialId: material._id,
      deckId: deck._id,
      questionText: q.question,
      questionType: 'mcq',
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
    })),
    ...generated.trueFalse.map((tf) => ({
      userId: user._id,
      materialId: material._id,
      deckId: deck._id,
      questionText: tf.question,
      questionType: 'true_false',
      options: ['True', 'False'],
      correctAnswer: tf.correctAnswer,
      explanation: tf.explanation,
      topic: tf.topic,
      difficulty: tf.difficulty,
    })),
    ...generated.shortAnswers.map((sa) => ({
      userId: user._id,
      materialId: material._id,
      deckId: deck._id,
      questionText: sa.question,
      questionType: 'short_answer',
      referenceAnswer: sa.referenceAnswer,
      expectedKeyConcepts: sa.expectedKeyConcepts,
      topic: sa.topic,
      difficulty: sa.difficulty,
    })),
  ];

  const savedQuestions = await Questions.createMany(questionsToSave);

  // Generate realistic student learning trajectory over the last 3 days
  const now = Date.now();
  const day = 24 * 3600 * 1000;

  const demoAttempts = [
    // Processes & Threads: High mastery (3 correct)
    {
      userId: user._id,
      questionId: savedQuestions[0]?._id || 'q_1',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Processes and Threads',
      questionType: 'mcq',
      submittedAnswer: 'Heap memory and global variables',
      isCorrect: true,
      score: 1.0,
      confidenceRating: 5,
      timeTakenSeconds: 12,
      timestamp: new Date(now - 2.8 * day).toISOString(),
    },
    {
      userId: user._id,
      questionId: savedQuestions[1]?._id || 'q_2',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Processes and Threads',
      questionType: 'flashcard',
      submittedAnswer: 'understood',
      isCorrect: true,
      score: 1.0,
      confidenceRating: 5,
      timeTakenSeconds: 8,
      timestamp: new Date(now - 1.9 * day).toISOString(),
    },
    {
      userId: user._id,
      questionId: savedQuestions[5]?._id || 'q_5',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Processes and Threads',
      questionType: 'voice_short_answer',
      submittedAnswer: 'A process switch saves the state in PCB and restores registers and program counter.',
      isCorrect: true,
      score: 0.9,
      confidenceRating: 4,
      timeTakenSeconds: 22,
      timestamp: new Date(now - 0.4 * day).toISOString(),
    },
    // CPU Scheduling: Moderate stability (2 attempts: 1 correct, 1 partial)
    {
      userId: user._id,
      questionId: savedQuestions[1]?._id || 'q_3',
      materialId: material._id,
      deckId: deck._id,
      topic: 'CPU Scheduling',
      questionType: 'mcq',
      submittedAnswer: 'Shortest Job First (SJF)',
      isCorrect: true,
      score: 1.0,
      confidenceRating: 4,
      timeTakenSeconds: 18,
      timestamp: new Date(now - 2.1 * day).toISOString(),
    },
    {
      userId: user._id,
      questionId: savedQuestions[6]?._id || 'q_6',
      materialId: material._id,
      deckId: deck._id,
      topic: 'CPU Scheduling',
      questionType: 'short_answer',
      submittedAnswer: 'Round Robin switches processes after some time.',
      isCorrect: false,
      score: 0.45,
      confidenceRating: 3,
      timeTakenSeconds: 25,
      timestamp: new Date(now - 0.9 * day).toISOString(),
    },
    // Deadlocks: Weak topic! (2 incorrect attempts, low confidence)
    {
      userId: user._id,
      questionId: savedQuestions[2]?._id || 'q_4',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Deadlocks',
      questionType: 'mcq',
      submittedAnswer: 'Peterson\'s Algorithm',
      isCorrect: false,
      score: 0.0,
      confidenceRating: 2,
      timeTakenSeconds: 28,
      timestamp: new Date(now - 1.5 * day).toISOString(),
    },
    {
      userId: user._id,
      questionId: savedQuestions[7]?._id || 'q_7',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Deadlocks',
      questionType: 'short_answer',
      submittedAnswer: 'Avoid circular wait by locking mutexes in reverse order.',
      isCorrect: false,
      score: 0.3,
      confidenceRating: 1,
      timeTakenSeconds: 30,
      timestamp: new Date(now - 0.3 * day).toISOString(),
    },
    // Memory Management: Recent practice
    {
      userId: user._id,
      questionId: savedQuestions[3]?._id || 'q_8',
      materialId: material._id,
      deckId: deck._id,
      topic: 'Memory Management',
      questionType: 'mcq',
      submittedAnswer: 'High-speed hardware cache for virtual-to-physical address translations',
      isCorrect: true,
      score: 1.0,
      confidenceRating: 4,
      timeTakenSeconds: 14,
      timestamp: new Date(now - 0.2 * day).toISOString(),
    },
  ];

  await StudyAttempts.createMany(demoAttempts);

  // Seed study sessions
  await StudySessions.createMany([
    {
      userId: user._id,
      sessionType: 'practice',
      title: 'Operating Systems — Diagnostic Quiz',
      questionsAttempted: 5,
      correctCount: 3,
      averageConfidence: 3.6,
      topicsCovered: ['Processes and Threads', 'CPU Scheduling', 'Deadlocks'],
      sessionSummary: { accuracy: 60, strongTopics: ['Processes and Threads'], weakTopics: ['Deadlocks'], durationSeconds: 240 },
      startedAt: new Date(now - 1.5 * day).toISOString(),
      completedAt: new Date(now - 1.45 * day).toISOString(),
    },
    {
      userId: user._id,
      sessionType: 'flashcard',
      title: 'OS Essentials — Spaced Repetition Review',
      questionsAttempted: 4,
      correctCount: 4,
      averageConfidence: 4.5,
      topicsCovered: ['Processes and Threads', 'Memory Management'],
      sessionSummary: { accuracy: 100, strongTopics: ['Memory Management'], weakTopics: [], durationSeconds: 120 },
      startedAt: new Date(now - 0.25 * day).toISOString(),
      completedAt: new Date(now - 0.23 * day).toISOString(),
    },
  ]);

  // Synchronize revision tasks using the ML recommendation engine
  await syncRevisionTasksForUser(user._id);

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;

  return {
    user: safeUser,
    token,
    material,
    deck,
    questionsCount: savedQuestions.length,
    attemptsCount: demoAttempts.length,
  };
}

export async function handleDemoLogin(req, res) {
  try {
    const demoPayload = await seedDemoData();
    res.json({
      message: 'Logged in as Demo Student (Alex Chen). Sample Operating Systems curriculum active.',
      token: demoPayload.token,
      user: demoPayload.user,
      isDemo: true,
    });
  } catch (err) {
    console.error('Demo seed error:', err);
    res.status(500).json({ error: 'Failed to initialize demo environment.' });
  }
}
