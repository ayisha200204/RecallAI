import { getDb } from '../config/db.js';
import {
  UserModel,
  StudyMaterialModel,
  FlashcardDeckModel,
  QuestionModel,
  StudyAttemptModel,
  StudySessionModel,
  RevisionTaskModel,
} from './schemas.js';

function generateId() {
  return 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function matchQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, value] of Object.entries(query)) {
    if (key === '_id' || key === 'id') {
      const targetId = String(value);
      if (String(item._id || item.id) !== targetId) return false;
    } else if (value && typeof value === 'object' && value.$in) {
      if (!value.$in.includes(item[key])) return false;
    } else if (value && typeof value === 'object' && value.$ne !== undefined) {
      if (item[key] === value.$ne) return false;
    } else if (String(item[key]) !== String(value)) {
      return false;
    }
  }
  return true;
}

class StoreRepository {
  constructor(collectionName, MongooseModel) {
    this.name = collectionName;
    this.MongooseModel = MongooseModel;
  }

  isMongo() {
    return getDb().isMongoConnected();
  }

  async find(query = {}, sortOptions = null) {
    if (this.isMongo()) {
      let q = this.MongooseModel.find(query);
      if (sortOptions) q = q.sort(sortOptions);
      return await q.lean();
    }
    const store = getDb().store;
    let list = (store[this.name] || []).filter((item) => matchQuery(item, query));
    if (sortOptions) {
      const [field, dir] = Object.entries(sortOptions)[0];
      const mult = dir === -1 || dir === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
        const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (valA < valB) return -1 * mult;
        if (valA > valB) return 1 * mult;
        return 0;
      });
    }
    return JSON.parse(JSON.stringify(list));
  }

  async findOne(query = {}) {
    if (this.isMongo()) {
      return await this.MongooseModel.findOne(query).lean();
    }
    const store = getDb().store;
    const item = (store[this.name] || []).find((doc) => matchQuery(doc, query));
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findById(id) {
    if (this.isMongo()) {
      return await this.MongooseModel.findById(id).lean();
    }
    return this.findOne({ _id: id });
  }

  async create(doc) {
    if (this.isMongo()) {
      const created = await this.MongooseModel.create(doc);
      return created.toObject();
    }
    const store = getDb().store;
    if (!store[this.name]) store[this.name] = [];
    const item = {
      _id: doc._id || generateId(),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
    };
    store[this.name].push(item);
    getDb().save();
    return JSON.parse(JSON.stringify(item));
  }

  async createMany(docs) {
    if (this.isMongo()) {
      return await this.MongooseModel.insertMany(docs);
    }
    const created = [];
    for (const doc of docs) {
      created.push(await this.create(doc));
    }
    return created;
  }

  async findByIdAndUpdate(id, updates) {
    if (this.isMongo()) {
      return await this.MongooseModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    }
    const store = getDb().store;
    const idx = (store[this.name] || []).findIndex((doc) => String(doc._id || doc.id) === String(id));
    if (idx === -1) return null;
    store[this.name][idx] = { ...store[this.name][idx], ...updates, updatedAt: new Date().toISOString() };
    getDb().save();
    return JSON.parse(JSON.stringify(store[this.name][idx]));
  }

  async findByIdAndDelete(id) {
    if (this.isMongo()) {
      return await this.MongooseModel.findByIdAndDelete(id).lean();
    }
    const store = getDb().store;
    const idx = (store[this.name] || []).findIndex((doc) => String(doc._id || doc.id) === String(id));
    if (idx === -1) return null;
    const removed = store[this.name].splice(idx, 1)[0];
    getDb().save();
    return removed;
  }

  async deleteMany(query = {}) {
    if (this.isMongo()) {
      return await this.MongooseModel.deleteMany(query);
    }
    const store = getDb().store;
    const initial = store[this.name]?.length || 0;
    store[this.name] = (store[this.name] || []).filter((doc) => !matchQuery(doc, query));
    getDb().save();
    return { deletedCount: initial - store[this.name].length };
  }

  async countDocuments(query = {}) {
    if (this.isMongo()) {
      return await this.MongooseModel.countDocuments(query);
    }
    return (await this.find(query)).length;
  }
}

export const Users = new StoreRepository('users', UserModel);
export const StudyMaterials = new StoreRepository('materials', StudyMaterialModel);
export const FlashcardDecks = new StoreRepository('decks', FlashcardDeckModel);
export const Questions = new StoreRepository('questions', QuestionModel);
export const StudyAttempts = new StoreRepository('attempts', StudyAttemptModel);
export const StudySessions = new StoreRepository('sessions', StudySessionModel);
export const RevisionTasks = new StoreRepository('tasks', RevisionTaskModel);

