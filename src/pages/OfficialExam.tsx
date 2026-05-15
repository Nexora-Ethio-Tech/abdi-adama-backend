
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Shield, Clock, AlertTriangle, CheckCircle,
  Loader2, BookOpen,
  Award, FileText, ChevronRight,
  Search
} from 'lucide-react';
import { apiFetch } from '../utils/apiClient';
import { toast } from '../components/Toast';
import { useExam } from '../context/ExamContext';
import { useUser } from '../context/UserContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  text: string;
  options: Record<string, string>;
  correct?: string; // Only available for parents/reviewers if needed
}

interface ExamItem {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  start_window: string;
  duration_minutes: number;
  examiner_name: string;
  my_status: 'active' | 'submitted' | 'terminated' | null;
  my_score: number | null;
  my_approval_status: 'pending' | 'approved' | null;
  questions_count: number;
  server_time: string;
}

interface ActiveSession {
  result_id: string;
  exam_id: string;
  title: string;
  duration_minutes: number;
  server_time: string;
  start_time: string;
  questions: Question[];
}

type ExamView = 'list' | 'active' | 'submitted' | 'terminated';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (sec: number) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const canStart = (startWindow: string, serverTime: string): boolean => {
  if (!startWindow || !serverTime) return false;
  try {
    return new Date(serverTime) >= new Date(startWindow);
  } catch {
    return false;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'TBA';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'TBA';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
export const OfficialExam = () => {
  const { role } = useUser();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student_id');
  const { activateExamLockdown, releaseExamLockdown } = useExam();

  // ── State ──────────────────────────────────────────────────────────────────
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [serverTime, setServerTime] = useState<string>('');
  const [listLoading, setListLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [view, setView] = useState<ExamView>('list');
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [starting, setStarting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null);
  sessionRef.current = session;

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchExams = useCallback(async () => {
    setListLoading(true);
    try {
      const url = role === 'parent' && studentId 
        ? `/api/exams?student_id=${studentId}` 
        : '/api/exams';
      const res = await apiFetch(url);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || data.message || 'Failed to fetch exams.');
        return;
      }
      setExams(data.data?.exams || []);
      setServerTime(data.data?.server_time || new Date().toISOString());
    } catch {
      toast.error('Network error — could not reach exam server.');
    } finally {
      setListLoading(false);
    }
  }, [role, studentId]);

  useEffect(() => { 
    if (role === 'parent' && !studentId) return;
    fetchExams(); 
  }, [fetchExams, role, studentId]);

  // ── Timer & Anti-Cheat ─────────────────────────────────────────────────────
  const startTimer = useCallback((durationMinutes: number, startTime: string, remoteServerTime: string) => {
    const serverNow = new Date(remoteServerTime).getTime();
    const examStart = new Date(startTime).getTime();
    const elapsed = Math.max(0, Math.floor((serverNow - examStart) / 1000));
    const totalSecs = durationMinutes * 60;
    const remaining = Math.max(0, totalSecs - elapsed);

    setTimeLeft(remaining);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (_) {}
  };

  // handleTerminate must be declared BEFORE the useEffect that references it
  const handleTerminate = useCallback(async (reason: string = 'student_triggered') => {
    const s = sessionRef.current;
    if (!s || terminating) return;
    setTerminating(true);
    stopTimer();
    try {
      await apiFetch('/api/exams/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: s.result_id, reason }),
      });
    } catch (_) {}
    releaseExamLockdown();
    exitFullscreen();
    setIsExamStarted(false);
    setView('terminated');
    setTerminating(false);
  }, [terminating, releaseExamLockdown]);

  useEffect(() => {
    if (!isExamStarted) return;
    const handleVisibilityChange = () => {
      if (document.hidden && sessionRef.current) handleTerminate('tab_switch_detected');
    };
    const handleContextMenu = (e: MouseEvent) => { if (isExamStarted) e.preventDefault(); };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isExamStarted, handleTerminate]);

  useEffect(() => {
    return () => {
      stopTimer();
      releaseExamLockdown();
    };
  }, []);

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStart = async (exam: ExamItem) => {
    if (role === 'parent') return;
    if (!canStart(exam.start_window, serverTime)) {
      toast.error(`Exam opens at ${new Date(exam.start_window).toLocaleString()}.`);
      return;
    }

    setStarting(exam.id);
    try {
      const res = await apiFetch(`/api/exams/${exam.id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to start exam.');
        return;
      }

      const sess: ActiveSession = data.data;
      setSession(sess);
      setIsExamStarted(true);
      setView('active');
      setCurrentIndex(0);
      setAnswers({});
      activateExamLockdown();
      enterFullscreen();
      startTimer(sess.duration_minutes, sess.start_time, sess.server_time);
    } catch {
      toast.error('Network error — cannot start exam.');
    } finally {
      setStarting(null);
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    stopTimer();
    try {
      await apiFetch(`/api/exams/${s.exam_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: s.result_id, answers }),
      });
    } catch (_) {}
    releaseExamLockdown();
    exitFullscreen();
    setIsExamStarted(false);
    setView('submitted');
  }, [answers, releaseExamLockdown]);

  const handleSubmit = async () => {
    if (!session) return;
    const unanswered = session.questions.length - Object.keys(answers).length;
    if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`)) {
      return;
    }

    setSubmitting(true);
    stopTimer();
    try {
      const res = await apiFetch(`/api/exams/${session.exam_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: session.result_id, answers }),
      });
      if (!res.ok) throw new Error();
      releaseExamLockdown();
      exitFullscreen();
      setIsExamStarted(false);
      setView('submitted');
    } catch {
      toast.error('Submission failed. Please check your connection.');
      startTimer(session.duration_minutes, session.start_time, new Date().toISOString());
    } finally {
      setSubmitting(false);
    }
  };

  // handleTerminate is declared above (before its useEffect dependency)

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  // ── Rendering Logic ────────────────────────────────────────────────────────
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exam.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterSubject || exam.subject_name === filterSubject;
    return matchesSearch && matchesFilter;
  });

  const subjects = Array.from(new Set(exams.map(e => e.subject_name)));

  if (view === 'terminated') {
    return (
      <div className="min-h-screen bg-red-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6 text-white">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <AlertTriangle className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black">EXAM TERMINATED</h1>
          <p className="text-red-300 text-lg font-medium">Your session was stopped due to security violations or manual intervention. All progress has been logged.</p>
          <button onClick={() => { setView('list'); fetchExams(); }} className="w-full bg-white text-red-950 py-5 rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 transition-transform">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (view === 'submitted') {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-400" size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black">Well Done!</h1>
            <p className="text-emerald-300 text-lg font-medium">Your examination has been submitted successfully for grading.</p>
          </div>
          <button onClick={() => { setView('list'); fetchExams(); }} className="w-full bg-emerald-600 py-5 rounded-[2rem] font-black text-xl hover:bg-emerald-500 transition-colors shadow-xl shadow-emerald-900/40">
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (isExamStarted && session) {
    const currentQuestion = session.questions[currentIndex];
    const isLast = currentIndex === session.questions.length - 1;

    return (
      <div className="fixed inset-0 z-[1000] bg-white dark:bg-slate-950 flex flex-col text-slate-900 dark:text-white font-sans overflow-hidden">
        {/* Secure Session Header */}
        <header className="px-8 py-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
          <div className="flex-1">
            <h1 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">{session.title}</h1>
          </div>

          <div className="flex-1 flex justify-center">
            <div className={`flex items-center gap-3 px-8 py-3 rounded-2xl border-2 ${timeLeft < 300 ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
              <Clock size={20} className={timeLeft < 300 ? 'text-rose-500' : 'text-slate-400'} />
              <span className="text-2xl font-black tabular-nums">{fmt(timeLeft)}</span>
            </div>
          </div>

          <div className="flex-1 flex justify-end">
             <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Question {currentIndex + 1} of {session.questions.length}</span>
             </div>
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 relative overflow-y-auto p-6 md:p-12 lg:p-20 flex items-center justify-center bg-slate-50/30 dark:bg-slate-950">
          <div className="max-w-4xl w-full">
            <div className="bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-12">
              {/* Question Text */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  <Shield size={12} /> Secure Assessment
                </div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight text-slate-900 dark:text-white">
                  {currentQuestion.text}
                </h2>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(currentQuestion.options).map(([key, text]) => {
                  const isSelected = answers[currentQuestion.id] === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(currentQuestion.id, key)}
                      className={`group flex items-center gap-6 p-6 rounded-3xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {key}
                      </div>
                      <span className="font-bold text-lg">{text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Footer Controls */}
        <footer className="px-10 py-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          {/* Stop Exam (Bottom-Left) */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to stop? Your progress will be terminated.")) {
                handleTerminate();
              }
            }}
            className="px-8 py-4 border-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Stop Exam
          </button>

          {/* Navigation (Bottom-Right) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Previous
            </button>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
              >
                {submitting ? 'Submitting...' : 'Finish & Submit'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(session.questions.length - 1, prev + 1))}
                className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
              >
                Next Question
              </button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // ── List View (Default) ────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center gap-4">
            Official Exams
            <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-1 rounded-full uppercase tracking-widest font-black">Secure</span>
          </h1>
          <p className="text-slate-500 font-medium">Monitoring academic excellence via high-stakes assessment.</p>
        </div>
        
        {/* Search & Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <select 
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-600 dark:text-slate-400 appearance-none min-w-[150px]"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {listLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest">Validating Credentials...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="text-slate-300" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Empty Archive</h2>
          <p className="text-slate-500 font-medium mt-2">There are currently no official exams scheduled or recorded.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredExams.map(exam => {
            const already = exam.my_status === 'submitted' || exam.my_status === 'terminated';
            const isApproved = exam.my_approval_status === 'approved';
            
            return (
              <div key={exam.id} className="group bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm hover:shadow-2xl hover:border-blue-500/20 transition-all duration-500">
                <div className="flex items-center gap-8 flex-1">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-colors ${
                    already ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  }`}>
                    {already ? <Award size={40} /> : <FileText size={40} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{exam.title}</h2>
                      {exam.my_status === 'active' && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
                    </div>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{exam.subject_name}</p>
                    
                    <div className="flex flex-wrap gap-4 mt-4 text-xs font-black text-slate-400">
                       <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full uppercase tracking-tighter">
                         <Clock size={12}/> {exam.duration_minutes}m
                       </span>
                       <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full uppercase tracking-tighter">
                         <Shield size={12}/> {exam.questions_count} Questions
                       </span>
                       <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full uppercase tracking-tighter">
                         <ChevronRight size={12}/> {formatDate(exam.start_window)}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                   {exam.my_score !== null && isApproved ? (
                     <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-10 py-4 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-emerald-500/20">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                          <Award size={24} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Final Score</p>
                          <p className="text-3xl font-black leading-none">{exam.my_score}%</p>
                        </div>
                     </div>
                   ) : already ? (
                     <div className={`px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] border-2 ${
                       exam.my_status === 'submitted' 
                         ? 'bg-amber-50 border-amber-200 text-amber-700' 
                         : 'bg-red-50 border-red-200 text-red-700'
                     }`}>
                       {exam.my_status === 'submitted' ? (isApproved ? 'Approved' : 'Pending Review') : 'Attempt Terminated'}
                     </div>
                   ) : role === 'parent' ? (
                     <div className="bg-slate-100 dark:bg-slate-800 px-10 py-5 rounded-[2rem] text-slate-400 font-black uppercase tracking-widest text-xs italic">
                       Awaiting Student Attempt
                     </div>
                   ) : (
                     <button
                       onClick={() => handleStart(exam)}
                       disabled={!canStart(exam.start_window, serverTime) || starting === exam.id}
                       className={`w-full md:w-auto px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all ${
                         canStart(exam.start_window, serverTime)
                           ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30 hover:scale-110 active:scale-95'
                           : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                       }`}
                     >
                       {starting === exam.id ? 'Loading...' : 'Start Secure Session'}
                     </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
