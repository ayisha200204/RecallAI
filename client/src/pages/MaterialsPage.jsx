import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  Trash2,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  X,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

function YoutubeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function MaterialsPage() {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [decks, setDecks] = useState([]);          // existing flashcard decks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // View modal state
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchMaterials = async () => {
    try {
      const [matRes, deckRes] = await Promise.all([
        api.get('/materials'),
        api.get('/decks'),
      ]);
      setMaterials(matRes.data.materials || []);
      setDecks(deckRes.data.decks || []);
    } catch (err) {
      console.error('Fetch materials error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Find an existing deck for a given materialId
  const findExistingDeck = (materialId) =>
    decks.find((d) => d.materialId && String(d.materialId) === String(materialId));

  const handleDelete = async (id) => {
    try {
      await api.delete(`/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => (m._id || m.id) !== id));
      setDeleteConfirmId(null);
      if (activeMaterial && (activeMaterial._id || activeMaterial.id) === id) {
        setActiveMaterial(null);
      }
    } catch (err) {
      console.error('Delete material error:', err);
    }
  };

  const handleGenerate = async (types) => {
    if (!activeMaterial) return;
    const matId = activeMaterial._id || activeMaterial.id;

    // If a deck already exists for this material and user wants flashcards, go directly
    if (types.includes('flashcards')) {
      const existing = findExistingDeck(matId);
      if (existing) {
        navigate(`/study/${existing._id || existing.id}`);
        setActiveMaterial(null);
        return;
      }
    }

    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/generator/generate', {
        materialId: matId,
        requestedTypes: types,
        saveToDb: true,   // ← critical: creates the deck/questions in the database
      });

      setSuccessMsg(res.data.summary || 'Study content generated successfully!');
      await fetchMaterials(); // refresh decks list too

      if (types.includes('flashcards') && res.data.deck) {
        navigate(`/study/${res.data.deck._id || res.data.deck.id}`);
      } else if (types.includes('mcqs') || types.includes('short_answer')) {
        navigate(`/practice?materialId=${matId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate study content.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="My Study Materials"
          subtitle="View and review your saved study materials, lecture summaries, and active recall resources."
          actionButton={
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Study Set</span>
            </button>
          }
        />

        <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Study Set Creator</span>
              </div>
              <h3 className="text-base font-bold text-white font-heading">
                Turn Lecture Notes, PDFs, Screenshots & YouTube into Flashcards
              </h3>
              <p className="text-xs text-indigo-200 max-w-2xl">
                Upload PDFs, extract text from screenshot images via OCR, import YouTube transcripts, or paste notes with preview & question customization.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition-colors shadow-sm shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Create New Set</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Saved Materials Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Saved Study Materials ({materials.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Select any material to inspect text content or generate additional practice sets
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Loading study materials...</span>
              </div>
            ) : materials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {materials.map((mat, idx) => {
                  const isYouTube = mat.fileMetadata?.fileType === 'youtube';

                  return (
                    <motion.div
                      key={mat._id || mat.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.4), type: 'spring', stiffness: 260, damping: 24 }}
                      whileHover={{
                        y: -4,
                        boxShadow: '0 16px 24px -8px rgba(79, 70, 229, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
                      }}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-colors flex flex-col justify-between group"
                    >
                      <div>
                        {/* Card Header Tags */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                            {mat.subject || 'General Studies'}
                          </span>

                          {isYouTube ? (
                            <a
                              href={mat.fileMetadata.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition-colors"
                            >
                              <YoutubeIcon className="w-3 h-3 text-rose-600" />
                              <span>YouTube</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-rose-500" />
                            </a>
                          ) : mat.fileMetadata?.isScanned ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Scanned PDF
                            </span>
                          ) : null}
                        </div>

                        {/* YouTube Thumbnail Preview */}
                        {isYouTube && mat.fileMetadata?.thumbnailUrl && (
                          <div className="relative mb-3 rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-200 group">
                            <img
                              src={mat.fileMetadata.thumbnailUrl}
                              alt={mat.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md">
                                <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                              </div>
                            </div>
                            {mat.fileMetadata?.durationSeconds > 0 && (
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded">
                                {Math.floor(mat.fileMetadata.durationSeconds / 60)}m {mat.fileMetadata.durationSeconds % 60}s
                              </span>
                            )}
                          </div>
                        )}

                        <h4 className="text-sm font-bold text-slate-900 font-heading mb-1.5 line-clamp-1">
                          {mat.title}
                        </h4>

                        {isYouTube && mat.fileMetadata?.authorName && (
                          <span className="text-[11px] text-slate-400 block mb-2">
                            Channel: {mat.fileMetadata.authorName}
                          </span>
                        )}

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {mat.extractedText}
                        </p>

                        {/* Topics badges */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {(mat.topics || []).slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                            >
                              {topic}
                            </span>
                          ))}
                          {(mat.topics || []).length > 3 && (
                            <span className="text-[10px] font-medium text-slate-400">
                              +{mat.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <span>{mat.fileMetadata?.fileName || 'Document'}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveMaterial(mat)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(mat._id || mat.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
                <EmptyState
                  title="No study materials stored yet"
                  description="Use the Create Study Set wizard to upload lecture PDFs, extract textbook screenshots via OCR, import YouTube lectures, or paste notes."
                  actionText="Create Your First Study Set"
                  onAction={() => navigate('/create')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Material Detail Modal */}
        <AnimatePresence>
          {activeMaterial && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-600">
                        {activeMaterial.subject || 'General Studies'}
                      </span>
                      {activeMaterial.fileMetadata?.fileType === 'youtube' && (
                        <a
                          href={activeMaterial.fileMetadata.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold"
                        >
                          <YoutubeIcon className="w-3 h-3 text-rose-600" />
                          <span>Watch on YouTube</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-heading truncate mt-1">
                      {activeMaterial.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveMaterial(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Topics */}
                <div className="mb-4">
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Extracted Topics:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeMaterial.topics || []).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Full Extracted Text */}
                <div className="mb-6">
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Source Text Preview:
                  </span>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-h-64 overflow-y-auto text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap">
                    {activeMaterial.extractedText}
                  </div>
                </div>

                {/* Generate Action Buttons */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Generate Practice Sets from this Material:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const matId = activeMaterial._id || activeMaterial.id;
                      const existingDeck = findExistingDeck(matId);
                      return (
                        <button
                          onClick={() => handleGenerate(['flashcards'])}
                          disabled={generating}
                          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {generating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Layers className="w-4 h-4" />
                          )}
                          <span>
                            {generating
                              ? 'Generating...'
                              : existingDeck
                              ? 'Study Flashcards →'
                              : 'Flashcards (Active Recall)'}
                          </span>
                        </button>
                      );
                    })()}

                    <button
                      onClick={() => handleGenerate(['mcqs', 'true_false', 'short_answer'])}
                      disabled={generating}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Practice Quiz (MCQs &amp; T/F)</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading mb-2">
                  Delete Study Material?
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  This will remove the material and any associated generated flashcards or quiz items.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
