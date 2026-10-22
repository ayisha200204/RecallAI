import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as matCtrl from '../controllers/materialController.js';
import * as genCtrl from '../controllers/generatorController.js';
import * as deckCtrl from '../controllers/deckController.js';
import * as practiceCtrl from '../controllers/practiceController.js';
import * as voiceCtrl from '../controllers/voiceController.js';
import * as analyticsCtrl from '../controllers/analyticsController.js';
import * as plannerCtrl from '../controllers/plannerController.js';
import * as demoCtrl from '../controllers/demoController.js';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RecallAI REST API',
    timestamp: new Date().toISOString(),
  });
});

// Demo access
router.post('/demo/login', demoCtrl.handleDemoLogin);
router.post('/demo/reset', demoCtrl.handleDemoLogin);

// Auth
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/profile', authenticateToken, authCtrl.getProfile);
router.put('/auth/goals', authenticateToken, authCtrl.updateGoals);

// Study Materials
router.post('/materials', authenticateToken, upload.single('file'), matCtrl.uploadMaterial);
router.post('/materials/youtube', authenticateToken, matCtrl.importYouTubeMaterial);
router.get('/materials', authenticateToken, matCtrl.listMaterials);
router.get('/materials/:id', authenticateToken, matCtrl.getMaterial);
router.delete('/materials/:id', authenticateToken, matCtrl.deleteMaterial);

// AI Generator
router.post('/generator/generate', authenticateToken, genCtrl.generateContent);

// Flashcard Decks
router.get('/decks', authenticateToken, deckCtrl.listDecks);
router.get('/decks/:id', authenticateToken, deckCtrl.getDeck);
router.delete('/decks/:id', authenticateToken, deckCtrl.deleteDeck);

// Practice & Active Recall
router.get('/practice/questions', authenticateToken, practiceCtrl.getPracticeQuestions);
router.post('/practice/attempt', authenticateToken, practiceCtrl.submitQuestionAttempt);
router.post('/practice/session', authenticateToken, practiceCtrl.completePracticeSession);

// Voice-based Learning
router.get('/voice/question', authenticateToken, voiceCtrl.getVoiceQuestion);
router.post('/voice/evaluate', authenticateToken, voiceCtrl.evaluateVoiceResponse);

// Analytics & ML Predictions
router.get('/analytics/overview', authenticateToken, analyticsCtrl.getAnalyticsOverview);
router.get('/analytics/ml-predictions', authenticateToken, analyticsCtrl.getMLPredictions);

// Revision Planner
router.get('/planner/tasks', authenticateToken, plannerCtrl.getRevisionTasks);
router.post('/planner/tasks', authenticateToken, plannerCtrl.createCustomTask);
router.patch('/planner/tasks/:id/toggle', authenticateToken, plannerCtrl.toggleTaskCompletion);
router.patch('/planner/tasks/:id/reschedule', authenticateToken, plannerCtrl.rescheduleTask);

export default router;
