import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  MessageSquare,
  Loader2,
  Edit3,
} from 'lucide-react';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import Badge from '../components/common/Badge';
import api from '../services/api';

export default function VoiceStudyPage() {
  const [searchParams] = useSearchParams();
  const materialId = searchParams.get('materialId') || '';

  const [question, setQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [topic, setTopic] = useState('Operating Systems');

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState('');
  const recognitionRef = useRef(null);

  // Evaluation & Tutor feedback state
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [ttsPlaying, setTtsPlaying] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setPermissionError('');
      };

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setPermissionError('Microphone permission was denied. Please allow microphone access or use the text editor fallback below.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
      setSpeechSupported(false);
    }
  }, []);

  const fetchVoiceQuestion = async () => {
    setLoadingQuestion(true);
    setTranscript('');
    setEvaluation(null);
    setFollowUp(null);

    try {
      const res = await api.get('/voice/question', {
        params: { materialId: materialId || undefined },
      });
      setQuestion(res.data.question);
      if (res.data.question?.topic) {
        setTopic(res.data.question.topic);
      }
    } catch (err) {
      console.error('Fetch voice question error:', err);
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    fetchVoiceQuestion();
  }, [materialId]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not natively supported in this browser. Please type your explanation below.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setPermissionError('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Recognition start notice:', e.message);
      }
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setTtsPlaying(true);
      utterance.onend = () => setTtsPlaying(false);
      utterance.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReadQuestionAloud = () => {
    if (question?.questionText) {
      speakText(question.questionText);
    }
  };

  const handleSubmitVoiceAnswer = async () => {
    if (!transcript.trim()) {
      alert('Please speak or type your answer before submitting.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    }

    setEvaluating(true);
    try {
      const res = await api.post('/voice/evaluate', {
        questionId: question.id,
        transcript: transcript.trim(),
        confidenceRating: 4,
        timeTakenSeconds: 15,
      });

      setEvaluation(res.data.feedback);
      setFollowUp(res.data.followUpQuestion);

      // Read feedback summary aloud for voice tutor experience
      if (res.data.feedback?.summary) {
        speakText(res.data.feedback.summary);
      }
    } catch (err) {
      console.error('Evaluate voice error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Header
          title="Voice-Based Study Tutor"
          subtitle="A calm, conversational active recall session with conceptual speech feedback."
          actionButton={
            <button
              onClick={fetchVoiceQuestion}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Next Question
            </button>
          }
        />

        <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between space-y-6">
          {/* Permission / Browser Support Notice */}
          {!speechSupported && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Browser Speech Notice:</span>
                Your current browser does not support native speech recognition. You can type your answers directly into the transcript box below for full conceptual evaluation.
              </div>
            </div>
          )}

          {permissionError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{permissionError}</span>
            </div>
          )}

          {/* Current Question Display */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                  {topic}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500">Verbal Active Recall</span>
              </div>

              <button
                type="button"
                onClick={handleReadQuestionAloud}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Read Aloud</span>
              </button>
            </div>

            {loadingQuestion ? (
              <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Selecting active conceptual question...</span>
              </div>
            ) : question ? (
              <p className="text-xl sm:text-2xl font-bold text-slate-900 font-heading leading-snug">
                {question.questionText}
              </p>
            ) : (
              <p className="text-slate-500 text-sm py-4">
                No questions available. Please upload a study material first.
              </p>
            )}
          </div>

          {/* Central Voice Recording & Audio Wave Section */}
          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
            {/* Microphone Button with Pulse */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              )}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 scale-105'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            {/* Audio Wave / Recording Status */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block font-heading mb-1 text-slate-700">
                {isRecording ? 'Listening to your explanation...' : 'Click microphone to speak your answer'}
              </span>

              {isRecording ? (
                <div className="flex items-center justify-center gap-1.5 h-6 mt-2">
                  <div className="w-1 bg-rose-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 bg-rose-500 rounded-full animate-bounce h-5" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 bg-rose-500 rounded-full animate-bounce h-6" style={{ animationDelay: '300ms' }} />
                  <div className="w-1 bg-rose-500 rounded-full animate-bounce h-4" style={{ animationDelay: '450ms' }} />
                  <div className="w-1 bg-rose-500 rounded-full animate-bounce h-2" style={{ animationDelay: '600ms' }} />
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Explain the concept out loud just as you would to a professor or study partner.
                </p>
              )}
            </div>

            {/* Transcribed Answer Review & Text Editor */}
            <div className="w-full text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Speech Transcript (Review or correct before submitting):
                </span>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => setTranscript('')}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Spoken words will appear here in real-time. You can also type directly..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 leading-relaxed font-body"
              />
            </div>

            {/* Submit & Retry Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Retry Recording
                </button>
              )}

              <button
                type="button"
                disabled={evaluating || !transcript.trim()}
                onClick={handleSubmitVoiceAnswer}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating conceptual understanding...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit for Evaluation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback & Tutor Guidance Panel */}
          {evaluation && (
            <div
              className={`p-6 rounded-2xl border space-y-4 ${
                evaluation.isCorrect
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-bold font-heading">
                    AI Tutor Conceptual Feedback
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => speakText(evaluation.summary)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white/60 transition-colors"
                  title="Listen to feedback"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed">
                {evaluation.summary}
              </p>

              {/* Matched vs Missed Concepts */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/50 text-xs">
                {evaluation.conceptsMatched?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-emerald-800">Concepts Correctly Identified:</span>
                    {evaluation.conceptsMatched.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}

                {evaluation.conceptsMissed?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-amber-800">Key Elements to Include:</span>
                    {evaluation.conceptsMissed.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                        ✗ {c}
                      </span>
                    ))}
                  </div>
                )}

                {evaluation.guidance && (
                  <p className="text-xs text-slate-700 italic pt-1">
                    Guidance: {evaluation.guidance}
                  </p>
                )}
              </div>

              {/* Conversational Follow-Up Question */}
              {followUp && (
                <div className="p-4 rounded-xl bg-white/80 border border-indigo-200/80 space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Follow-Up Question from Tutor:</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed">
                    "{followUp}"
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('');
                      setEvaluation(null);
                      speakText(followUp);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
                  >
                    <span>Answer Follow-Up Question</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
