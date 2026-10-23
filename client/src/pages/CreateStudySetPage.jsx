import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Loader2,
  X,
  Plus,
  Trash2,
  Edit3,
  Video,
  Image as ImageIcon,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import api from '../services/api';

function YoutubeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function CreateStudySetPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Stepper state: 1 = Input & Extract, 2 = Preview & Edit Extracted Text, 3 = Review & Save Generated Set
  const [step, setStep] = useState(1);

  // Input tab: 'text' | 'image' | 'pdf' | 'youtube'
  const [inputTab, setInputTab] = useState('text');

  // Input Data
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Extraction State
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [extractedMetadata, setExtractedMetadata] = useState(null);
  const [error, setError] = useState('');

  // Generation Settings
  const [cardCount, setCardCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  // Generated Items for Review & Editing (Steps 7 & 8)
  const [generatedFlashcards, setGeneratedFlashcards] = useState([]);
  const [generatedMcqs, setGeneratedMcqs] = useState([]);
  const [generatedTrueFalse, setGeneratedTrueFalse] = useState([]);
  const [generatedShortAnswers, setGeneratedShortAnswers] = useState([]);

  // Saving State
  const [saving, setSaving] = useState(false);

  // Drag & drop
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
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
    const mime = file.type;
    const name = file.name.toLowerCase();

    if (inputTab === 'image' && !mime.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP) for OCR extraction.');
      return;
    }
    if (inputTab === 'pdf' && !mime.includes('pdf') && !name.endsWith('.pdf') && !name.endsWith('.txt')) {
      setError('Please select a PDF or TXT document.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  // Step 1 -> 2: Extract Content
  const handleExtract = async (e) => {
    e.preventDefault();
    setError('');

    if (inputTab === 'text') {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setError('Please paste study notes with at least 20 characters.');
        return;
      }
      setExtractedText(pastedText.trim());
      setStep(2);
      return;
    }

    if (inputTab === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('Please enter a valid YouTube video URL or ID.');
        return;
      }
      setExtracting(true);
      try {
        const res = await api.post('/materials/extract', {
          youtubeUrl: youtubeUrl.trim(),
          subject: subject.trim(),
        });
        setExtractedText(res.data.extractedText);
        setExtractedMetadata(res.data.metadata);
        if (!title && res.data.metadata?.title) {
          setTitle(res.data.metadata.title);
        }
        setStep(2);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to extract YouTube transcript.');
      } finally {
        setExtracting(false);
      }
      return;
    }

    // File / Image upload
    if (!selectedFile) {
      setError('Please select or drag a file to extract content.');
      return;
    }

    setExtracting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subject', subject.trim());

    try {
      const res = await api.post('/materials/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExtractedText(res.data.extractedText);
      setExtractedMetadata(res.data.metadata);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extract text from document/image.');
    } finally {
      setExtracting(false);
    }
  };

  // Step 2 -> 3: Generate Items in Preview Mode
  const handleGenerate = async () => {
    if (!extractedText.trim() || extractedText.trim().length < 20) {
      setError('Extracted content must contain at least 20 characters.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const res = await api.post('/generator/generate', {
        text: extractedText,
        subject: subject.trim() || 'General Studies',
        title: title.trim() || 'Adaptive Study Set',
        // Always generate all types so Practice Quiz gets questions too
        requestedTypes: ['flashcards', 'mcqs', 'true_false', 'short_answer'],
        counts: {
          flashcards: cardCount,
          mcqs: 4,
          true_false: 4,
          short_answer: 3,
        },
        saveToDb: false,
      });

      setGeneratedFlashcards(res.data.flashcards || []);
      setGeneratedMcqs(res.data.mcqs || []);
      setGeneratedTrueFalse(res.data.trueFalse || []);
      setGeneratedShortAnswers(res.data.shortAnswers || []);

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate study items.');
    } finally {
      setGenerating(false);
    }
  };

  // Step 3: Save Study Set to Database (Step 9 of unified workflow)
  const handleSaveSet = async (studyImmediately = false) => {
    if (!title.trim()) {
      setError('Please enter a title for this study set.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Optionally save base material record
      let materialId = null;
      try {
        const matRes = await api.post('/materials', {
          title: title.trim(),
          subject: subject.trim(),
          pastedText: extractedText,
        });
        materialId = matRes.data.material?._id;
      } catch (e) {
        console.warn('Material save notice:', e.message);
      }

      // 2. Save study set with confirmed cards & questions
      const res = await api.post('/generator/save-set', {
        title: title.trim(),
        subject: subject.trim(),
        materialId,
        flashcards: generatedFlashcards,
        mcqs: generatedMcqs,
        trueFalse: generatedTrueFalse,
        shortAnswers: generatedShortAnswers,
      });

      const savedDeck = res.data.deck;

      if (studyImmediately && savedDeck) {
        navigate(`/study/${savedDeck._id || savedDeck.id}`);
      } else {
        navigate('/materials');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save study set.');
    } finally {
      setSaving(false);
    }
  };

  // Card modifications in review mode
  const handleUpdateCard = (idx, field, value) => {
    setGeneratedFlashcards((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleDeleteCard = (idx) => {
    setGeneratedFlashcards((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddManualCard = () => {
    setGeneratedFlashcards((prev) => [
      ...prev,
      {
        id: `fc_manual_${Date.now()}`,
        question: 'New Question',
        answer: 'Expected Answer',
        explanation: '',
        topic: subject,
        difficulty: 'medium',
      },
    ]);
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Create Adaptive Study Set"
          subtitle="Transform lecture notes, PDFs, textbook screenshots, or YouTube lectures into active recall sets."
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 space-y-6">
          {/* Multi-step progress indicator */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                1
              </span>
              <span>Input & Extract</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                2
              </span>
              <span>Preview & Edit Text</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                3
              </span>
              <span>Review & Save Questions</span>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: INPUT & EXTRACTION */}
          {step === 1 && (
            <form onSubmit={handleExtract} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 text-xs block mb-1.5">Study Set Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Web Development: CSS & Layouts"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 text-xs block mb-1.5">Subject / Academic Area *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Web Development, History, Biology"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* 4 Input Method Tabs */}
              <div>
                <label className="font-semibold text-slate-700 text-xs block mb-2">Select Study Material Source</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setInputTab('text');
                      setSelectedFile(null);
                      setError('');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputTab === 'text' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Paste Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputTab('pdf');
                      setSelectedFile(null);
                      setError('');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputTab === 'pdf' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>PDF Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputTab('image');
                      setSelectedFile(null);
                      setError('');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputTab === 'image' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Screenshot / OCR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputTab('youtube');
                      setSelectedFile(null);
                      setError('');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputTab === 'youtube' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <YoutubeIcon className="w-4 h-4 text-rose-600" />
                    <span>YouTube Lecture</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Paste Text */}
              {inputTab === 'text' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Paste Lecture Notes, Definitions, or Textbook Excerpt
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="e.g. A process is a program in execution requiring PCB and address space...&#10;Threads are lightweight execution pathways within the process..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-body leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 2: PDF Upload */}
              {inputTab === 'pdf' && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                    dragActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                    accept=".pdf,.txt,.md"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 font-heading">
                    {selectedFile ? selectedFile.name : 'Click to select or drag PDF notes'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports accessible PDF lecture notes and text documents up to 15MB
                  </p>
                </div>
              )}

              {/* Tab 3: Screenshot / Image OCR */}
              {inputTab === 'image' && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                    dragActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 font-heading">
                    {selectedFile ? selectedFile.name : 'Upload notes screenshot or photo'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Optical Character Recognition (OCR) will extract readable text and formulas
                  </p>
                </div>
              )}

              {/* Tab 4: YouTube Input */}
              {inputTab === 'youtube' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-600 block">
                    YouTube Lecture Video Link
                  </label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-slate-400">
                    Official closed captions will be extracted and indexed for generating questions.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={extracting}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Content...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract Content</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PREVIEW & EDIT EXTRACTED TEXT (Requirement: Step 3) */}
          {step === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Preview & Correct Extracted Material
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and edit the extracted text before configuring question generation.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {extractedText.length} characters
                </span>
              </div>

              {extractedMetadata?.isScanned && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Document note: {extractedMetadata.ocrNote}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 text-xs block mb-1.5">
                  Extracted Content (Editable)
                </label>
                <textarea
                  rows={10}
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-body leading-relaxed"
                />
              </div>

              {/* Output Configuration — Flashcards only */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block font-heading">
                  Configure Flashcard Generation
                </span>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Flashcard Target Count: <span className="text-indigo-700 font-bold">{cardCount}</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>3</span><span>15</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  MCQ, True/False, and Short Answer questions are also generated automatically and available in the <strong>Practice Quiz</strong> section.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={handleGenerate}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Curriculum...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate & Review Items</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW, EDIT & SAVE GENERATED QUESTIONS (Steps 7 & 8) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Review & Edit Generated Questions
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify AI-generated cards, edit wording, or add manual cards before committing to your library.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAddManualCard}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Flashcard</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSet(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-bold cursor-pointer"
                  >
                    Save & Return
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSet(true)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Save & Study</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Editable Flashcards List */}
              {generatedFlashcards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                      Generated Flashcards ({generatedFlashcards.length})
                    </span>
                    <span className="text-xs text-slate-400">Edits are preserved</span>
                  </div>

                  {generatedFlashcards.map((card, idx) => (
                    <div key={card.id || idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                          Card #{idx + 1} • {card.topic}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteCard(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="font-semibold text-slate-600 block mb-1">Question / Prompt:</label>
                          <input
                            type="text"
                            value={card.question}
                            onChange={(e) => handleUpdateCard(idx, 'question', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-600 block mb-1">Expected Answer:</label>
                          <textarea
                            rows={2}
                            value={card.answer}
                            onChange={(e) => handleUpdateCard(idx, 'answer', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-body"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Text</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSet(false)}
                    className="px-5 py-2.5 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-bold cursor-pointer"
                  >
                    Save Set
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSet(true)}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Save & Study Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
