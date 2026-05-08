import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { ExamTimer } from './components/ExamTimer';
import { QuestionCard } from './components/QuestionCard';
import { QuestionPalette } from './components/QuestionPalette';
import { SubmitOverlay } from './components/SubmitOverlay';
import { useAntiCheat } from './hooks/useAntiCheat';
import { mockExam } from '../../data/examData';
import type { AnswerPayload } from '../../data/examData';

export const ExamSession: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  // --- State ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'submitting' | 'success' | 'error' | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<string>('');
  const [examEndTime, setExamEndTime] = useState<number>(0);
  const [violations, setViolations] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [lastViolationType, setLastViolationType] = useState<string>('');
  const [hasStarted, setHasStarted] = useState(false);
  const [reentryPassword, setReentryPassword] = useState('');
  const [showReentryModal, setShowReentryModal] = useState(false);

  // --- Persistence ---
  const STORAGE_KEY = `exam_session_${examId}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { savedAnswers, savedIndex, savedStartTime, savedEndTime, savedViolations, savedFlagged } = JSON.parse(saved);
      setAnswers(savedAnswers || {});
      setFlaggedQuestions(new Set(savedFlagged || []));
      setCurrentQuestionIndex(savedIndex || 0);
      setExamStartedAt(savedStartTime || new Date().toISOString());
      setExamEndTime(savedEndTime || (Date.now() + mockExam.durationMinutes * 60 * 1000));
      setViolations(savedViolations || []);
    } else {
      const startTime = new Date().toISOString();
      const endTime = Date.now() + mockExam.durationMinutes * 60 * 1000;
      setExamStartedAt(startTime);
      setExamEndTime(endTime);
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (examEndTime > 0) {
      const dataToSave = JSON.stringify({
        savedAnswers: answers,
        savedIndex: currentQuestionIndex,
        savedStartTime: examStartedAt,
        savedEndTime: examEndTime,
        savedViolations: violations,
        savedFlagged: Array.from(flaggedQuestions)
      });
      localStorage.setItem(STORAGE_KEY, dataToSave);
    }
  }, [STORAGE_KEY, answers, currentQuestionIndex, examStartedAt, examEndTime, violations, flaggedQuestions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStarted && submitStatus !== 'success') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, submitStatus]);

  // --- Handlers ---
  const handleViolation = useCallback((type: string) => {
    setViolations(prev => [...prev, type]);
    setLastViolationType(type);
    if (type === 'Visibility Change' || type === 'Window Blur') {
      setShowReentryModal(true);
    } else {
      setShowWarningModal(true);
    }
  }, []);

  const handleSubmit = useCallback(async (auto = false) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('submitting');

    const payload: AnswerPayload = {
      examId: examId || 'unknown',
      studentId: 'current-student-id', // Would come from context
      answers,
      warningCount: violations.length,
      startedAt: examStartedAt,
      submittedAt: new Date().toISOString(),
      autoSubmitted: auto
    };

    console.log('Submitting Payload:', payload);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      localStorage.removeItem(STORAGE_KEY);
      setSubmitStatus('success');

      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (error) {
      console.error('Submission failed:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [examId, answers, violations.length, examStartedAt, STORAGE_KEY, isSubmitting]);

  const { requestFullscreen } = useAntiCheat({
    onViolation: isSubmitting || submitStatus === 'success' || showReentryModal ? () => {} : handleViolation,
    maxWarnings: 3,
    autoSubmit: () => handleSubmit(true)
  });

  const handleSelectOption = (optionId: string) => {
    const questionId = mockExam.questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handlePrev = () => setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  const handleNext = () => setCurrentQuestionIndex(prev => Math.min(mockExam.questions.length - 1, prev + 1));

  const questionIds = useMemo(() => mockExam.questions.map(q => q.id), []);

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{mockExam.title}</h2>
          <div className="bg-slate-800 rounded-xl p-6 text-left mb-8 space-y-4">
            <h3 className="text-slate-300 font-semibold uppercase text-xs tracking-wider">Exam Rules</h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                Do not leave the browser tab or minimize the window.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                The exam will run in full-screen mode.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                Multiple security violations will lead to auto-submission.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400">•</span>
                Duration: {mockExam.durationMinutes} minutes.
              </li>
            </ul>
          </div>
          <button
            onClick={() => {
              setHasStarted(true);
              requestFullscreen();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Secure Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Teacher Re-entry Modal */}
      {showReentryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900 backdrop-blur-xl p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-4 border-rose-500 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">LOCKDOWN ACTIVE</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
              You attempted to leave the exam environment. A teacher must enter their password to resume the session.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Teacher Password"
                className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition-all text-center font-bold tracking-widest"
                value={reentryPassword}
                onChange={(e) => setReentryPassword(e.target.value)}
              />
              <button
                onClick={() => {
                  if (reentryPassword === 'teacher123') { // Mock validation
                    setShowReentryModal(false);
                    setReentryPassword('');
                    requestFullscreen();
                  } else {
                    alert('Invalid Teacher Password');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all"
              >
                UNBLOCK SESSION
              </button>
            </div>
          </div>
        </div>
      )}

      <SubmitOverlay
        status={submitStatus}
        onRetry={() => handleSubmit()}
        onClose={() => navigate('/')}
      />

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Security Warning</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              A security violation was detected: <span className="font-semibold text-slate-900 dark:text-slate-200">{lastViolationType}</span>.
              Multiple violations will result in automatic submission.
            </p>
            <p className="text-sm font-medium text-red-600 mb-6 uppercase tracking-wider">
              Warning {violations.length} of 3
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                requestFullscreen();
              }}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              I Understand & Resume
            </button>
          </div>
        </div>
      )}

      {/* Exam Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {mockExam.title}
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Secure Session</span>
            </div>
          </div>
          <ExamTimer endTime={examEndTime} onTimeUp={() => handleSubmit(true)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Question Area */}
          <div className="lg:col-span-8 space-y-6">
            <QuestionCard
              question={mockExam.questions[currentQuestionIndex]}
              selectedOptionId={answers[mockExam.questions[currentQuestionIndex].id]}
              onSelectOption={handleSelectOption}
              index={currentQuestionIndex}
              isFlagged={flaggedQuestions.has(mockExam.questions[currentQuestionIndex].id)}
              onToggleFlag={() => handleToggleFlag(mockExam.questions[currentQuestionIndex].id)}
            />
          </div>

          {/* Sidebar / Palette */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <QuestionPalette
                totalQuestions={mockExam.questions.length}
                currentIndex={currentQuestionIndex}
                answers={answers}
                flaggedQuestions={flaggedQuestions}
                questionIds={questionIds}
                onSelectIndex={setCurrentQuestionIndex}
              />

              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Your progress is automatically saved. Do not refresh or leave this page until you finish the exam.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === mockExam.questions.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
          >
            <Send size={18} />
            <span>{isSubmitting ? 'Submitting...' : 'Finish Exam'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
