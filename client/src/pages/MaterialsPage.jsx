import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,

  FileCheck,
  AlertCircle,
  Trash2,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Mic,
  Clock,
  ChevronRight,
  Loader2,
  X,
  Eye,
  Plus,
  ExternalLink,
  PlaySquare,
  Video,
} from 'lucide-react';

function YoutubeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/common/Sidebar';

import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import api from '../services/api';

export default function MaterialsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'paste', or 'youtube'

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Operating Systems');
  const [pastedText, setPastedText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // View modal state
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/materials');
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error('Fetch materials error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
      setError('Please upload a PDF or plain text (.txt, .md) file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // YouTube Tab handling
    if (activeTab === 'youtube') {
      if (!youtubeUrl || !youtubeUrl.trim()) {
        setError('Please enter a valid YouTube video URL or 11-character video ID.');
        return;
      }

      setUploading(true);
      setUploadProgress(30);

      try {
        const progressTimer = setInterval(() => {
          setUploadProgress((p) => (p < 85 ? p + 20 : p));
        }, 200);

        const res = await api.post('/materials/youtube', {
          youtubeUrl: youtubeUrl.trim(),
          subject: subject.trim() || 'Operating Systems',
          title: title.trim() || undefined,
        });

        clearInterval(progressTimer);
        setUploadProgress(100);
        setSuccessMsg(`YouTube transcript extracted successfully: "${res.data.material.title}"`);

        setYoutubeUrl('');
        setTitle('');
        fetchMaterials();
        setActiveMaterial(res.data.material);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch YouTube transcript. Ensure closed captions are available.');
      } finally {
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 500);
      }
      return;
    }

    // PDF / Paste Tab handling
    if (activeTab === 'upload' && !selectedFile) {
      setError('Please select or drag a PDF note file to upload.');
      return;
    }
    if (activeTab === 'paste' && (!pastedText || pastedText.trim().length < 20)) {
      setError('Pasted notes must contain at least 20 characters.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('title', title.trim() || 'Untitled Material');
    formData.append('subject', subject.trim() || 'General Studies');

    if (activeTab === 'upload' && selectedFile) {
      formData.append('file', selectedFile);
    } else {
      formData.append('pastedText', pastedText);
    }

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 25 : p));
      }, 150);

      const res = await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setSuccessMsg('Study material processed and indexed successfully.');

      setSelectedFile(null);
      setPastedText('');
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchMaterials();
      setActiveMaterial(res.data.material);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload study material.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

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
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/generator/generate', {
        materialId: activeMaterial._id || activeMaterial.id,
        requestedTypes: types,
      });

      setSuccessMsg(res.data.summary || 'Study questions generated successfully!');
      fetchMaterials();

      if (types.includes('flashcards') && res.data.deck) {
        navigate(`/study/${res.data.deck._id || res.data.deck.id}`);
      } else if (types.includes('mcqs') || types.includes('short_answer')) {
        navigate(`/practice?materialId=${activeMaterial._id || activeMaterial.id}`);
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
          title="Study Materials"
          subtitle="Upload lecture PDFs, connect YouTube transcripts, or paste notes to generate active recall decks."
        />

        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
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

          {/* Upload & Input Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Add New Study Material
                </h2>
                <p className="text-xs text-slate-500">
                  Select a digital PDF, connect a YouTube lecture transcript, or paste notes directly.
                </p>
              </div>

              {/* Tabs: Upload vs YouTube vs Paste */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Upload PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('youtube')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'youtube' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  <YoutubeIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>YouTube Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Material Title {activeTab === 'youtube' && <span className="text-slate-400 font-normal">(Optional, auto-extracted from YouTube)</span>}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      activeTab === 'youtube'
                        ? 'Leave blank to use YouTube video title'
                        : 'e.g. Operating Systems — Memory Management'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject / Domain
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Operating Systems, Computer Science"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Tab 1: Upload PDF */}
              {activeTab === 'upload' && (
                <div>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <FileCheck className="w-10 h-10 text-emerald-600 mb-2" />
                        <span className="text-sm font-bold text-slate-900 font-heading">
                          {selectedFile.name}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                        <span className="text-sm font-semibold text-slate-800">
                          Click to browse or drag and drop your study PDF
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                          PDF, TXT, or MD documents up to 10MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: YouTube Video Transcript */}
              {activeTab === 'youtube' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      YouTube Video URL or Video ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <YoutubeIcon className="w-4 h-4 text-rose-600" />
                      </div>
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=26QPDBe-NB8 or https://youtu.be/..."
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Preset sample lectures for quick test */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-500 font-medium">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeUrl('https://www.youtube.com/watch?v=26QPDBe-NB8');
                        setSubject('Operating Systems');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200/60 transition-colors cursor-pointer"
                    >
                      CrashCourse: Operating Systems
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeUrl('https://www.youtube.com/watch?v=7s334EkBvO8');
                        setSubject('Computer Science');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
                    >
                      CrashCourse: Memory & Storage
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      RecallAI automatically fetches the official video transcript and caption cues, structures the text, identifies core academic concepts, and enables instant creation of flashcards, MCQs, and voice practice sessions.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Direct Text Paste */}
              {activeTab === 'paste' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Paste Lecture Notes, Transcripts, or Syllabus Content
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste textbook sections, lecture summaries, or definitions here..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 leading-relaxed"
                  />
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>
                      {activeTab === 'youtube'
                        ? 'Fetching YouTube transcript and indexing academic concepts...'
                        : 'Extracting text and identifying conceptual topics...'}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{activeTab === 'youtube' ? 'Extracting YouTube Transcript...' : 'Processing Material...'}</span>
                    </>
                  ) : (
                    <>
                      {activeTab === 'youtube' ? (
                        <>
                          <YoutubeIcon className="w-4 h-4" />
                          <span>Fetch Transcript & Index</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Save and Process Note</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Saved Materials List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Saved Study Materials ({materials.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Click on any material to view content or generate flashcards & questions
                </span>
              </div>
            </div>

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
                      y: -6,
                      scale: 1.015,
                      boxShadow: '0 20px 30px -10px rgba(79, 70, 229, 0.16), 0 8px 12px -4px rgba(0, 0, 0, 0.05)',
                      transition: { type: 'spring', stiffness: 400, damping: 25 },
                    }}
                    whileTap={{ scale: 0.985 }}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-colors flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Card Header Tags */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                          {mat.subject}
                        </span>

                        {isYouTube ? (
                          <a
                            href={mat.fileMetadata.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition-colors"
                          >
                            <YoutubeIcon className="w-3 h-3 text-rose-600" />
                            <span>YouTube Video</span>
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
                        <span>{mat.flashcardsCount || 5} cards</span>
                        <span>•</span>
                        <span>{mat.questionsCount || 10} Qs</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setActiveMaterial(mat)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Open
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setDeleteConfirmId(mat._id || mat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}


              {materials.length === 0 && !loading && (
                <div className="col-span-full">
                  <EmptyState
                    title="No study materials yet"
                    description="Upload your lecture notes or connect a YouTube transcript above to start generating adaptive flashcards and quiz questions."
                  />
                </div>
              )}
            </div>
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
                        {activeMaterial.subject}
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

                {/* Extracted Text Snippet */}
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    {activeMaterial.fileMetadata?.fileType === 'youtube'
                      ? 'Extracted YouTube Video Transcript'
                      : 'Extracted Note Content'}
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-h-48 overflow-y-auto text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                    {activeMaterial.extractedText}
                  </div>
                </div>

                {/* Generate Actions */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-3">
                    Generate Study Materials from this {activeMaterial.fileMetadata?.fileType === 'youtube' ? 'YouTube Lecture' : 'Note'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => handleGenerate(['flashcards'])}
                      className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-950 text-left transition-colors cursor-pointer group"
                    >
                      <Layers className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold block font-heading">Flashcard Deck</span>
                      <span className="text-[11px] text-indigo-700 block mt-0.5">
                        Spaced flip cards with confidence ratings
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => handleGenerate(['mcqs', 'short_answer'])}
                      className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-950 text-left transition-colors cursor-pointer group"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold block font-heading">Practice Quiz</span>
                      <span className="text-[11px] text-emerald-700 block mt-0.5">
                        MCQs & short-answer active recall
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => {
                        setActiveMaterial(null);
                        navigate(`/voice-study?materialId=${activeMaterial._id || activeMaterial.id}`);
                      }}
                      className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-50 text-purple-950 text-left transition-colors cursor-pointer group"
                    >
                      <Mic className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold block font-heading">Voice Study</span>
                      <span className="text-[11px] text-purple-700 block mt-0.5">
                        Verbal conceptual question tutor
                      </span>
                    </button>
                  </div>

                  {generating && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing content and generating active recall questions...</span>
                    </div>
                  )}
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
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading mb-2">
                  Delete Study Material?
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  This will delete the material along with associated generated flashcard decks, quiz questions, and study attempts.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Confirm Delete
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
