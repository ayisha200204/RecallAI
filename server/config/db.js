import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let isMongoConnected = false;
let memoryStore = {
  users: [],
  materials: [],
  decks: [],
  questions: [],
  attempts: [],
  sessions: [],
  tasks: [],
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load persisted JSON file if available
function loadPersistedStore() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      memoryStore = { ...memoryStore, ...JSON.parse(data) };
      console.log(`[Storage] Loaded persistent database from ${DB_FILE}`);
    } catch (err) {
      console.warn('[Storage] Error reading db.json, starting fresh store', err.message);
    }
  }
}

export function savePersistedStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error writing db.json:', err.message);
  }
}

export async function connectDB() {
  loadPersistedStore();
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recallai';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
    });
    isMongoConnected = true;
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    isMongoConnected = false;
    console.log(`[Database] Local MongoDB not reachable on port 27017 (${err.message}).`);
    console.log(`[Database] Operating in high-fidelity local file persistence mode (persisted to server/data/db.json).`);
  }
}

export function getDb() {
  return {
    isMongoConnected: () => isMongoConnected,
    store: memoryStore,
    save: savePersistedStore,
  };
}
