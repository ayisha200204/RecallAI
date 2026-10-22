import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDb } from './config/db.js';
import apiRouter from './routes/api.js';
import { seedDemoData } from './controllers/demoController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Routes
app.use('/api', apiRouter);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

async function startServer() {
  await connectDB();

  // If database has no users, seed the demo student automatically
  try {
    const store = getDb().store;
    if (!store.users || store.users.length === 0) {
      console.log('[RecallAI] No existing student data found. Seeding initial demo curriculum...');
      await seedDemoData();
      console.log('[RecallAI] Demo curriculum (Operating Systems) seeded successfully.');
    }
  } catch (seedErr) {
    console.warn('[RecallAI] Seed notice:', seedErr.message);
  }

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 RecallAI Backend Server is running on port ${PORT}`);
    console.log(`📡 REST API endpoint: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check:      http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

startServer();
