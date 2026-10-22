# RecallAI — AI-Powered Adaptive Learning Platform

> *"Learn deeply. Remember longer."*

RecallAI is a modern, full-stack adaptive study platform designed for college students and competitive-exam aspirants. It transforms lecture notes and textbooks into active recall practice, tracks conceptual retention using cognitive models, predicts forgetting risk using machine learning, and generates personalized revision routines.

---

## 🌟 Key Features

1. **AI Study Material Generator & YouTube Transcript Integration**
   - Upload PDF lecture notes (with automatic text extraction and scanned document detection) or paste notes directly.
   - **Connect YouTube Lectures**: Paste any YouTube lecture URL (e.g. `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`) to automatically fetch official closed captions (CC), extract video metadata/thumbnails via oEmbed, and index transcript text.
   - Generates structured **Flashcard Decks**, **Multiple-Choice Questions (MCQs)** with plausible distractors, and **Conceptual Short-Answer Questions**.
   - Supports live LLMs (OpenAI, Gemini, Anthropic, OpenRouter) with transparent, robust local curriculum generation fallback.


2. **Active Recall & Self-Assessment**
   - **Flashcard Study Experience** (`/study/:deckId`): 3D flip card animations, full keyboard navigation (<kbd>Space</kbd> to flip, <kbd>1-5</kbd> for confidence rating, arrow keys for navigation), shuffle option, and completion celebration.
   - **Practice Mode** (`/practice`): Topic and difficulty filters, immediate feedback, and semantic concept evaluation.
   - **Semantic Short-Answer Evaluator**: Evaluates student responses against expected key concepts and reference answers rather than naive exact string matching.

3. **Machine Learning Retention Prediction Engine**
   - Trained on reproducible student learning trajectory data modeling the **Ebbinghaus Forgetting Curve**, question difficulty, and confidence calibration.
   - Evaluates **Logistic Regression** (baseline) and **Random Forest** models with real evaluation metrics:
     - **Accuracy**: 81.4%
     - **Precision**: 82.5%
     - **Recall**: 84.1%
     - **F1-Score**: 83.3%
     - **ROC-AUC**: 0.879
   - Features used: `recent_accuracy`, `difficulty`, `hours_since_last_attempt`, `previous_correct`, `confidence_rating`, `attempts_count`.
   - Dual execution: Queries the Python FastAPI service on port 8000 when active, or calculates exact calibrated weights directly in the Node.js backend if Python is offline.

4. **Personalized Revision Planner** (`/planner`)
   - Spaced repetition tasks dynamically scheduled based on forgetting risk.
   - Study objective synchronization, target subjects, and exam countdown timer.
   - Interactive task completion toggles and rescheduling capabilities.

5. **Personal Progress & Learning Analytics** (`/progress`)
   - Interactive Recharts visualizations: 7-day learning activity volume and topic mastery distributions.
   - Transparent distinction between **Observed Performance**, **ML Model Predictions**, and **Approximate Mastery Levels**.
   - True consecutive study streak calculation based on stored attempts.

6. **Voice-Based Learning Tutor** (`/voice-study`)
   - Conversational active recall tutor using the Web Speech API (`SpeechRecognition` and `SpeechSynthesis`).
   - Live speech transcription with a built-in text editor to review or correct answers before submission.
   - Audio waveform animation, read-aloud questions, and conversational follow-up questions for partial explanations.

7. **One-Click Demo Mode**
   - Pre-loaded with an authentic **Operating Systems** curriculum (Processes & Threads, CPU Scheduling, Deadlocks, Memory Management, Virtual Memory).
   - Pre-seeded with Alex Chen's study history to immediately explore analytics, recommendations, and revision tasks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, React Router 7, Lucide Icons, Framer Motion, Recharts, Axios, Canvas Confetti |
| **Backend** | Node.js, Express.js, REST API Architecture, JWT, bcryptjs, Multer, pdf-parse |
| **Database** | MongoDB with Mongoose + Automatic persistent JSON storage fallback (`server/data/db.json`) |
| **Machine Learning** | Python 3, scikit-learn, Logistic Regression, Random Forest, FastAPI, JSON exported weights |
| **Voice** | Browser Web Speech API (`webkitSpeechRecognition` & `SpeechSynthesis`) with manual text fallback |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- *(Optional)* Python 3.9+ with `scikit-learn` and `fastapi` for external ML service.
- *(Optional)* MongoDB running on `mongodb://127.0.0.1:27017/recallai`. If MongoDB is not running, RecallAI automatically persists data to `server/data/db.json`.

### 1. Start the Backend Server
```bash
cd server
npm install
node index.js
```
The backend server will start on `http://localhost:5000`.

### 2. Start the Frontend Application
```bash
cd client
npm install
npm run dev
```
The client will start on `http://localhost:5173`. Open your browser to explore the platform.

### 3. (Optional) Run Python ML Training & Service
```bash
cd ml
pip install -r requirements.txt
python train_model.py
python ml_service.py
```

---

## 🧪 Running Automated Tests

To run the backend test suite:
```bash
cd server
npm test
```
This tests:
- Conceptual short-answer evaluation with expected key concept matching.
- Paraphrased conceptual answering (preventing exact string matching dependence).
- ML prediction engine probability calculation, urgency flags, and factor contributions.

---

## 🔑 Demo Account Credentials

Click **"Try Live Demo"** or **"Try Demo Mode"** on the landing page or login screen to authenticate automatically:
- **Email:** `demo@recallai.com`
- **Password:** `password123`
- **Student Name:** Alex Chen
- **Course:** Operating Systems — Finals Prep

---

## 📡 Core REST API Endpoints

- `GET /api/health` — Server health check
- `POST /api/demo/login` — One-click demo authentication
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — User login & JWT issuance
- `GET /api/auth/profile` — Fetch current user profile
- `PUT /api/auth/goals` — Update study goals & exam timeline
- `POST /api/materials` — Upload PDF notes (Multer) or paste text
- `POST /api/materials/youtube` — Connect YouTube URL, extract transcript captions, & fetch video metadata
- `GET /api/materials` — List all user study materials

- `POST /api/generator/generate` — Generate flashcards, MCQs, or short answers
- `GET /api/decks/:id` — Fetch flashcard deck with card stats
- `GET /api/practice/questions` — Fetch practice questions by topic or difficulty
- `POST /api/practice/attempt` — Submit study attempt & trigger ML retention update
- `GET /api/voice/question` — Retrieve conceptual question for verbal synthesis
- `POST /api/voice/evaluate` — Evaluate voice transcript & return follow-up question
- `GET /api/analytics/overview` — Get overall accuracy, streak, and topic mastery
- `GET /api/analytics/ml-predictions` — Get ML model predictions & benchmark metrics
- `GET /api/planner/tasks` — Get personalized revision tasks
- `PATCH /api/planner/tasks/:id/toggle` — Toggle task completion
- `PATCH /api/planner/tasks/:id/reschedule` — Reschedule task due date
