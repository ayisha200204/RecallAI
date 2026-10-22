import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  studyGoals: {
    primaryGoal: { type: String, default: 'General learning' }, // 'University exams', 'Competitive exams', 'Technical interview preparation', 'General learning'
    targetSubjects: [String],
    examDate: { type: Date },
    preferredDurationMinutes: { type: Number, default: 30 },
    dailyTargetQuestions: { type: Number, default: 15 },
  },
  preferences: {
    voiceEnabled: { type: Boolean, default: true },
    speechRate: { type: Number, default: 1.0 },
    theme: { type: String, default: 'light' },
  },
  createdAt: { type: Date, default: Date.now },
});

const StudyMaterialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  extractedText: { type: String, required: true },
  fileMetadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    pageCount: Number,
    isScanned: { type: Boolean, default: false },
    ocrNote: String,
  },
  processingStatus: { type: String, enum: ['ready', 'processing', 'error'], default: 'ready' },
  topics: [String],
  createdAt: { type: Date, default: Date.now },
});

const FlashcardDeckSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial' },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  cards: [
    {
      id: { type: String, required: true },
      question: { type: String, required: true },
      answer: { type: String, required: true },
      topic: { type: String, required: true },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
      sourceReference: String,
    },
  ],
  topicMetadata: [
    {
      name: String,
      cardCount: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const QuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial' },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardDeck' },
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ['mcq', 'short_answer', 'flashcard'], required: true },
  options: [String], // For MCQs
  correctAnswer: String, // For MCQs
  referenceAnswer: String, // For short answer
  expectedKeyConcepts: [String], // Key terms/concepts expected
  explanation: String,
  topic: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
});

const StudyAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  questionId: { type: String, required: true },
  materialId: { type: String },
  deckId: { type: String },
  topic: { type: String, required: true },
  questionType: { type: String, required: true },
  submittedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  score: { type: Number, default: 0 }, // 0 to 1
  confidenceRating: { type: Number, min: 1, max: 5, default: 3 },
  timeTakenSeconds: { type: Number, default: 0 },
  evaluationFeedback: {
    summary: String,
    conceptsMatched: [String],
    conceptsMissed: [String],
    guidance: String,
  },
  timestamp: { type: Date, default: Date.now },
});

const StudySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionType: { type: String, enum: ['flashcard', 'practice', 'voice'], required: true },
  materialId: { type: String },
  deckId: { type: String },
  title: { type: String, required: true },
  questionsAttempted: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  averageConfidence: { type: Number, default: 0 },
  topicsCovered: [String],
  sessionSummary: {
    accuracy: Number,
    strongTopics: [String],
    weakTopics: [String],
    durationSeconds: Number,
  },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now },
});

const RevisionTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true },
  subject: { type: String, default: 'General' },
  materialId: { type: String },
  recommendedActivity: { type: String, required: true }, // e.g. "Review 5 Flashcards", "Complete 3-question MCQ quiz", "Voice Active Recall"
  activityType: { type: String, enum: ['flashcard', 'quiz', 'voice', 'review'], default: 'quiz' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  estimatedTimeMinutes: { type: Number, default: 10 },
  dueDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  mlRiskScore: { type: Number }, // predicted likelihood of forgetting
  recommendationReason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const StudyMaterialModel = mongoose.models.StudyMaterial || mongoose.model('StudyMaterial', StudyMaterialSchema);
export const FlashcardDeckModel = mongoose.models.FlashcardDeck || mongoose.model('FlashcardDeck', FlashcardDeckSchema);
export const QuestionModel = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const StudyAttemptModel = mongoose.models.StudyAttempt || mongoose.model('StudyAttempt', StudyAttemptSchema);
export const StudySessionModel = mongoose.models.StudySession || mongoose.model('StudySession', StudySessionSchema);
export const RevisionTaskModel = mongoose.models.RevisionTask || mongoose.model('RevisionTask', RevisionTaskSchema);
