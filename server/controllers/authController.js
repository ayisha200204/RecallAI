import bcrypt from 'bcryptjs';
import { Users, StudyMaterials, FlashcardDecks, Questions, RevisionTasks, StudyAttempts } from '../models/repositories.js';
import { generateToken } from '../middleware/auth.js';
import { generateStudyMaterials } from '../services/aiService.js';

export async function register(req, res) {
  try {
    const { name, email, password, studyGoals } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await Users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await Users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      studyGoals: studyGoals || {
        primaryGoal: 'University exams',
        targetSubjects: ['Operating Systems'],
        preferredDurationMinutes: 30,
        dailyTargetQuestions: 15,
      },
      preferences: {
        voiceEnabled: true,
        speechRate: 1.0,
        theme: 'light',
      },
    });

    // Automatically seed an initial high-quality study material & flashcards for seamless onboarding
    try {
      const sampleText = `Operating Systems Core Fundamentals
Process Management: A process is an executing program with private address space. Threads are lightweight execution units within a process sharing code and heap.
CPU Scheduling: Round Robin uses a fixed time quantum. Shortest Job First minimizes average waiting time.
Deadlocks: Occur when Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait hold simultaneously.
Memory Management: The TLB caches virtual-to-physical translations. Paging eliminates external fragmentation.`;

      const material = await StudyMaterials.create({
        userId: user._id,
        title: 'Operating Systems — Core Architecture & Memory',
        subject: 'Operating Systems',
        extractedText: sampleText,
        fileMetadata: {
          fileName: 'os_core_fundamentals.pdf',
          fileSize: 42800,
          fileType: 'application/pdf',
          pageCount: 4,
          isScanned: false,
        },
        topics: ['Processes and Threads', 'CPU Scheduling', 'Deadlocks', 'Memory Management', 'Virtual Memory'],
      });

      const gen = await generateStudyMaterials({ text: sampleText, subject: 'Operating Systems' });

      const deck = await FlashcardDecks.create({
        userId: user._id,
        materialId: material._id,
        title: 'OS Essentials — Active Recall Deck',
        subject: 'Operating Systems',
        cards: gen.flashcards,
        topicMetadata: gen.topics.map((t) => ({ name: t, cardCount: 1 })),
      });

      const questionsToSave = [
        ...gen.mcqs.map((q) => ({
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
        ...gen.shortAnswers.map((sa) => ({
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

      await Questions.createMany(questionsToSave);

      // Add starter revision task
      await RevisionTasks.create({
        userId: user._id,
        topic: 'Deadlocks',
        subject: 'Operating Systems',
        materialId: material._id,
        recommendedActivity: 'Review 4 Coffman conditions and Banker\'s algorithm',
        activityType: 'flashcard',
        priority: 'high',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
        estimatedTimeMinutes: 10,
        completed: false,
        recommendationReason: 'Deadlocks require high conceptual recall before memory management.',
      });
    } catch (seedErr) {
      console.warn('[Register] Starter material seed notice:', seedErr.message);
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await Users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Logged in successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await Users.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}

export async function updateGoals(req, res) {
  try {
    const { primaryGoal, targetSubjects, examDate, preferredDurationMinutes, dailyTargetQuestions } = req.body;
    const userId = req.user._id || req.user.id;

    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const updatedGoals = {
      ...user.studyGoals,
      ...(primaryGoal && { primaryGoal }),
      ...(targetSubjects && { targetSubjects }),
      ...(examDate !== undefined && { examDate }),
      ...(preferredDurationMinutes && { preferredDurationMinutes: Number(preferredDurationMinutes) }),
      ...(dailyTargetQuestions && { dailyTargetQuestions: Number(dailyTargetQuestions) }),
    };

    const updated = await Users.findByIdAndUpdate(userId, { studyGoals: updatedGoals });
    const { passwordHash: _, ...safeUser } = updated;

    res.json({ message: 'Study goals updated successfully.', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update study goals.' });
  }
}
