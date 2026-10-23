import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/db.json');

const raw = fs.readFileSync(dbPath, 'utf-8');
const db = JSON.parse(raw);

console.log('--- Cleaning previous OS and ML concepts from db.json ---');
console.log('Original counts:', {
  materials: db.materials?.length,
  decks: db.decks?.length,
  questions: db.questions?.length,
  attempts: db.attempts?.length,
  sessions: db.sessions?.length,
  tasks: db.tasks?.length,
  reviewStates: db.reviewStates?.length,
  reviewEvents: db.reviewEvents?.length,
});

const isOsOrMl = (str = '') => {
  return /operating systems|os essentials|cpu scheduling|deadlock|process management|virtual memory|tlb|banking algorithm|belady|thrashing|coffman|workflow|quizai result|preprocessing transcription/i.test(str);
};

// 1. Filter Materials: remove OS materials and ML screenshot tests
const keptMaterials = [];
const removedMaterialIds = new Set();

for (const m of db.materials || []) {
  if (isOsOrMl(m.title) || isOsOrMl(m.extractedText?.slice(0, 200)) || m.title === 'workflow' || m.title === 'result' || m.title === 'data') {
    removedMaterialIds.add(m._id);
  } else {
    // If it's the Notes file (HTML/CSS/JS), set subject to Web Development
    if (/html|css|javascript|website|browser/i.test(m.extractedText || '')) {
      m.subject = 'Web Development';
      m.topics = ['Web Development', 'HTML & CSS', 'Client-Server Architecture'];
    } else if (/sql|database/i.test(m.extractedText || '')) {
      m.subject = 'Databases';
      m.topics = ['SQL & Relational Databases', 'Queries'];
    }
    keptMaterials.push(m);
  }
}
db.materials = keptMaterials;

// 2. Filter Decks: remove OS and ML decks
const keptDecks = [];
const removedDeckIds = new Set();

for (const d of db.decks || []) {
  if (isOsOrMl(d.title) || isOsOrMl(d.subject) || removedMaterialIds.has(d.materialId) || d.title === 'workflow' || d.title === 'result' || d.title === 'data') {
    removedDeckIds.add(d._id);
  } else {
    if (d.cards && d.cards.some(c => isOsOrMl(c.question) || isOsOrMl(c.answer))) {
      removedDeckIds.add(d._id);
      continue;
    }
    if (/notes/i.test(d.title)) {
      d.subject = 'Web Development';
    } else if (/sql/i.test(d.title)) {
      d.subject = 'Databases';
    }
    keptDecks.push(d);
  }
}
db.decks = keptDecks;

// 3. Filter Questions: remove questions from removed decks or matching OS/ML
const keptQuestions = [];
for (const q of db.questions || []) {
  if (
    removedMaterialIds.has(q.materialId) ||
    removedDeckIds.has(q.deckId) ||
    isOsOrMl(q.questionText) ||
    isOsOrMl(q.topic) ||
    isOsOrMl(q.explanation)
  ) {
    continue;
  }
  keptQuestions.push(q);
}
db.questions = keptQuestions;

// 4. Filter Attempts: remove attempts on OS / ML questions
const keptAttempts = [];
for (const a of db.attempts || []) {
  if (
    removedMaterialIds.has(a.materialId) ||
    removedDeckIds.has(a.deckId) ||
    isOsOrMl(a.topic) ||
    isOsOrMl(a.submittedAnswer)
  ) {
    continue;
  }
  keptAttempts.push(a);
}
db.attempts = keptAttempts;

// 5. Filter Sessions: remove sessions on removed decks or OS topics
const keptSessions = [];
for (const s of db.sessions || []) {
  if (
    removedDeckIds.has(s.deckId) ||
    isOsOrMl(s.title) ||
    (s.topicsCovered && s.topicsCovered.some(t => isOsOrMl(t)))
  ) {
    continue;
  }
  keptSessions.push(s);
}
db.sessions = keptSessions;

// 6. Filter Tasks: remove tasks on OS
const keptTasks = [];
for (const t of db.tasks || []) {
  if (
    removedMaterialIds.has(t.materialId) ||
    isOsOrMl(t.topic) ||
    isOsOrMl(t.subject) ||
    isOsOrMl(t.recommendedActivity)
  ) {
    continue;
  }
  keptTasks.push(t);
}
db.tasks = keptTasks;

// 7. Filter ReviewStates and ReviewEvents
const keptReviewStates = [];
for (const rs of db.reviewStates || []) {
  if (removedDeckIds.has(rs.deckId) || isOsOrMl(rs.topic)) {
    continue;
  }
  keptReviewStates.push(rs);
}
db.reviewStates = keptReviewStates;

const keptReviewEvents = [];
for (const re of db.reviewEvents || []) {
  if (removedDeckIds.has(re.deckId) || isOsOrMl(re.topic)) {
    continue;
  }
  keptReviewEvents.push(re);
}
db.reviewEvents = keptReviewEvents;

// 8. Clean users targetSubjects: remove 'Operating Systems'
for (const u of db.users || []) {
  if (u.studyGoals?.targetSubjects) {
    u.studyGoals.targetSubjects = u.studyGoals.targetSubjects.filter(s => !isOsOrMl(s));
  }
}

console.log('Cleaned counts:', {
  materials: db.materials.length,
  decks: db.decks.length,
  questions: db.questions.length,
  attempts: db.attempts.length,
  sessions: db.sessions.length,
  tasks: db.tasks.length,
  reviewStates: db.reviewStates.length,
  reviewEvents: db.reviewEvents.length,
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
console.log('✔ Cleaned db.json saved successfully!');
