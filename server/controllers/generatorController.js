import { StudyMaterials, FlashcardDecks, Questions } from '../models/repositories.js';
import { generateStudyMaterials } from '../services/aiService.js';

/**
 * Generate study material items (Flashcards, MCQs, True/False, Short Answer)
 * Supports:
 * - previewMode (saveToDb: false) so user can preview and edit questions before saving
 * - saveToDb: true to directly commit to database
 */
export async function generateContent(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const {
      materialId,
      text,
      subject,
      title,
      requestedTypes,
      counts = {},
      saveToDb = false,
    } = req.body;

    let sourceText = text;
    let targetSubject = subject || 'General Studies';
    let targetTitle = title || 'Adaptive Study Deck';

    if (materialId) {
      const material = await StudyMaterials.findById(materialId);
      if (!material) return res.status(404).json({ error: 'Source study material not found.' });
      if (String(material.userId) !== String(userId)) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      sourceText = material.extractedText;
      targetSubject = material.subject;
      targetTitle = `${material.title} — Study Set`;
    }

    if (!sourceText || sourceText.trim().length < 15) {
      return res.status(400).json({ error: 'Text content must be at least 15 characters long.' });
    }

    const types =
      requestedTypes && requestedTypes.length > 0
        ? requestedTypes
        : ['flashcards', 'mcqs', 'true_false', 'short_answer'];

    const result = await generateStudyMaterials({
      text: sourceText,
      subject: targetSubject,
      requestedTypes: types,
      counts,
    });

    // If previewMode (saveToDb === false), return directly for student preview and edits
    if (!saveToDb) {
      return res.json({
        message: 'Study materials generated for preview and editing.',
        previewMode: true,
        title: targetTitle,
        subject: targetSubject,
        materialId: materialId || null,
        topics: result.topics,
        flashcards: result.flashcards,
        mcqs: result.mcqs,
        trueFalse: result.trueFalse,
        shortAnswers: result.shortAnswers,
        generationMode: result.generationMode,
      });
    }

    // Save directly if requested
    let deck = null;
    if (result.flashcards.length > 0) {
      deck = await FlashcardDecks.create({
        userId,
        materialId: materialId || null,
        title: targetTitle,
        subject: targetSubject,
        cards: result.flashcards,
        topicMetadata: result.topics.map((t) => ({
          name: t,
          cardCount: result.flashcards.filter((c) => c.topic === t).length,
        })),
      });
    }

    const questionsToCreate = [];

    // Save MCQs
    result.mcqs.forEach((q) => {
      questionsToCreate.push({
        userId,
        materialId: materialId || null,
        deckId: deck ? deck._id : null,
        questionText: q.question,
        questionType: 'mcq',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic,
        difficulty: q.difficulty || 'medium',
      });
    });

    // Save True/False questions
    result.trueFalse.forEach((tf) => {
      questionsToCreate.push({
        userId,
        materialId: materialId || null,
        deckId: deck ? deck._id : null,
        questionText: tf.question,
        questionType: 'true_false',
        options: ['True', 'False'],
        correctAnswer: tf.correctAnswer,
        explanation: tf.explanation,
        topic: tf.topic,
        difficulty: tf.difficulty || 'medium',
      });
    });

    // Save Short Answer
    result.shortAnswers.forEach((sa) => {
      questionsToCreate.push({
        userId,
        materialId: materialId || null,
        deckId: deck ? deck._id : null,
        questionText: sa.question,
        questionType: 'short_answer',
        referenceAnswer: sa.referenceAnswer,
        expectedKeyConcepts: sa.expectedKeyConcepts,
        topic: sa.topic,
        difficulty: sa.difficulty || 'medium',
      });
    });

    let savedQuestions = [];
    if (questionsToCreate.length > 0) {
      savedQuestions = await Questions.createMany(questionsToCreate);
    }

    res.json({
      message: 'Study materials successfully generated and saved.',
      deck,
      questionsCount: savedQuestions.length,
      topics: result.topics,
      flashcards: result.flashcards,
      mcqs: result.mcqs,
      trueFalse: result.trueFalse,
      shortAnswers: result.shortAnswers,
      generationMode: result.generationMode,
    });
  } catch (err) {
    console.error('Generate content error:', err);
    res.status(500).json({ error: 'Failed to generate study materials.' });
  }
}

/**
 * Save confirmed and edited study set (Step 9 of unified workflow)
 */
export async function saveStudySet(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const {
      title,
      subject = 'General Studies',
      materialId = null,
      flashcards = [],
      mcqs = [],
      trueFalse = [],
      shortAnswers = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required for the study set.' });
    }

    const topicsSet = new Set();

    // 1. Save Flashcard Deck if cards present
    let deck = null;
    if (flashcards.length > 0) {
      const formattedCards = flashcards.map((c, i) => {
        const topic = c.topic?.trim() || subject;
        topicsSet.add(topic);
        return {
          id: c.id || `card_${Date.now()}_${i}`,
          question: c.question.trim(),
          answer: c.answer.trim(),
          explanation: c.explanation?.trim() || '',
          topic,
          difficulty: c.difficulty || 'medium',
          sourceReference: c.sourceReference || 'AI Generated & Reviewed',
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          state: 'new',
          nextDueDate: new Date().toISOString(),
        };
      });

      deck = await FlashcardDecks.create({
        userId,
        materialId,
        title: title.trim(),
        subject: subject.trim(),
        cards: formattedCards,
        topicMetadata: Array.from(topicsSet).map((t) => ({
          name: t,
          cardCount: formattedCards.filter((c) => c.topic === t).length,
        })),
      });
    }

    // 2. Save Questions (MCQs, True/False, Short Answer)
    const questionsToCreate = [];

    mcqs.forEach((q) => {
      const topic = q.topic?.trim() || subject;
      topicsSet.add(topic);
      questionsToCreate.push({
        userId,
        materialId,
        deckId: deck ? deck._id : null,
        questionText: q.question.trim(),
        questionType: 'mcq',
        options: q.options || [],
        correctAnswer: q.correctAnswer?.trim() || '',
        explanation: q.explanation?.trim() || '',
        topic,
        difficulty: q.difficulty || 'medium',
      });
    });

    trueFalse.forEach((tf) => {
      const topic = tf.topic?.trim() || subject;
      topicsSet.add(topic);
      questionsToCreate.push({
        userId,
        materialId,
        deckId: deck ? deck._id : null,
        questionText: tf.question.trim(),
        questionType: 'true_false',
        options: ['True', 'False'],
        correctAnswer: tf.correctAnswer === 'True' || tf.correctAnswer === true ? 'True' : 'False',
        explanation: tf.explanation?.trim() || '',
        topic,
        difficulty: tf.difficulty || 'medium',
      });
    });

    shortAnswers.forEach((sa) => {
      const topic = sa.topic?.trim() || subject;
      topicsSet.add(topic);
      questionsToCreate.push({
        userId,
        materialId,
        deckId: deck ? deck._id : null,
        questionText: sa.question.trim(),
        questionType: 'short_answer',
        referenceAnswer: sa.referenceAnswer?.trim() || '',
        expectedKeyConcepts: sa.expectedKeyConcepts || [],
        topic,
        difficulty: sa.difficulty || 'medium',
      });
    });

    let savedQuestions = [];
    if (questionsToCreate.length > 0) {
      savedQuestions = await Questions.createMany(questionsToCreate);
    }

    res.status(201).json({
      message: 'Study set successfully saved to your learning library.',
      deck,
      questionsCount: savedQuestions.length,
      totalCards: flashcards.length,
      topics: Array.from(topicsSet),
    });
  } catch (err) {
    console.error('Save study set error:', err);
    res.status(500).json({ error: 'Failed to save study set.' });
  }
}
