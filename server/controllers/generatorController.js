import { StudyMaterials, FlashcardDecks, Questions } from '../models/repositories.js';
import { generateStudyMaterials } from '../services/aiService.js';

export async function generateContent(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { materialId, text, subject, title, requestedTypes } = req.body;

    let sourceText = text;
    let targetSubject = subject || 'Operating Systems';
    let targetTitle = title || 'Adaptive Study Deck';

    if (materialId) {
      const material = await StudyMaterials.findById(materialId);
      if (!material) return res.status(404).json({ error: 'Source study material not found.' });
      if (String(material.userId) !== String(userId)) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      sourceText = material.extractedText;
      targetSubject = material.subject;
      targetTitle = `${material.title} — Practice Pack`;
    }

    if (!sourceText || sourceText.trim().length < 20) {
      return res.status(400).json({ error: 'Text content must be at least 20 characters long.' });
    }

    const types = requestedTypes && requestedTypes.length > 0 ? requestedTypes : ['flashcards', 'mcqs', 'short_answer'];

    const result = await generateStudyMaterials({
      text: sourceText,
      subject: targetSubject,
      requestedTypes: types,
    });

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

    // Save Questions for MCQs and Short Answers
    const questionsToCreate = [];
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
      message: 'Study materials successfully generated.',
      deck,
      questionsCount: savedQuestions.length,
      topics: result.topics,
      flashcards: result.flashcards,
      mcqs: result.mcqs,
      shortAnswers: result.shortAnswers,
      generationMode: result.generationMode,
    });
  } catch (err) {
    console.error('Generate content error:', err);
    res.status(500).json({ error: 'Failed to generate study materials.' });
  }
}
