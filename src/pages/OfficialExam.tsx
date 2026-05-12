
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Clock, AlertTriangle, CheckCircle,
  Loader2, BookOpen, XCircle, Maximize
} from 'lucide-react';
import { apiFetch } from '../utils/apiClient';
import { toast } from '../components/Toast';
import { useExam } from '../context/ExamContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExamItem {
  id: string;
  title: string;
  subject_name: string;
  subject_code: string;
  start_window: string;
  duration_minutes: number;
  examiner_name: string;
  my_status: 'active' | 'submitted' | 'terminated' | null;
  server_time: string;
}

interface ActiveSession {
  result_id: string;
  exam_id: string;
  title: string;
  duration_minutes: number;
  server_time: string;
  start_time: string;
}

type ExamView = 'list' | 'active' | 'submitted' | 'terminated';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (sec: number) => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const canStart = (startWindow: string, serverTime: string): boolean => {
  return new Date(serverTime) >= new Date(startWindow);
};

// ─── Component ────────────────────────────────────────────────────────────────
export const OfficialExam = () => {
  const navigate = useNavigate();
  const { activateExamLockdown, releaseExamLockdown } = useExam();

  // ── Exam list state ────────────────────────────────────────────────────────
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [serverTime, setServerTime] = useState<string>('');
  const [listLoading, setListLoading] = useState(true);

  // ── Active session state ───────────────────────────────────────────────────
  const [view, setView] = useState<ExamView>('list');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [answers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);          // seconds
  const [terminateReason, setTerminateReason] = useState('');

  // ── Action state ───────────────────────────────────────────────────────────
  const [starting, setStarting] = useState<string | null>(null); // exam id
  const [submitting, setSubmitting] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<ActiveSession | null>(null); // stable ref for event listeners
  sessionRef.current = session;

  // ── Fetch exam list ────────────────────────────────────────────────────────
  const fetchExams = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await apiFetch('/api/exams');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to fetch exams.');
        return;
      }
      setExams(data.data?.exams || []);
      setServerTime(data.data?.server_time || new Date().toISOString());
    } catch {
      toast.error('Network error — could not reach exam server.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  // ── Timer logic ────────────────────────────────────────────────────────────
  const startTimer = useCallback((durationMinutes: number, startTime: string, remoteServerTime: string) => {
    // Calculate time elapsed since exam start using server time delta
    const serverNow   = new Date(remoteServerTime).getTime();
    const examStart   = new Date(startTime).getTime();
    const elapsed     = Math.max(0, Math.floor((serverNow - examStart) / 1000));
    const totalSecs   = durationMinutes * 60;
    const remaining   = Math.max(0, totalSecs - elapsed);

    setTimeLeft(remaining);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit when timer hits zero
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── Anti-cheat: tab visibility ─────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden && sessionRef.current) {
        handleTerminate('tab_switch_detected');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (view === 'active') e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [view]); // eslint-disable-line

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      releaseExamLockdown();
      exitFullscreen();
    };
  }, []); // eslint-disable-line

  // ── Fullscreen helpers ────────────────────────────────────────────────────
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (_) {}
  };

  // ── Start exam ────────────────────────────────────────────────────────────
  const handleStart = async (exam: ExamItem) => {
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
      setView('active');
      activateExamLockdown();
      enterFullscreen();
      startTimer(sess.duration_minutes, sess.start_time, sess.server_time);
    } catch {
      toast.error('Network error — cannot start exam.');
    } finally {
      setStarting(null);
    }
  };

  // ── Auto-submit (timer = 0) ───────────────────────────────────────────────
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
    setView('submitted');
  }, [answers, releaseExamLockdown]);

  // ── Manual submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    stopTimer();
    try {
      const res = await apiFetch(`/api/exams/${session.exam_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: session.result_id, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Failed to submit exam.');
        startTimer(session.duration_minutes, session.start_time, new Date().toISOString());
        return;
      }
      releaseExamLockdown();
      exitFullscreen();
      setView('submitted');
    } catch {
      toast.error('Network error — submission failed. Please try again.');
      startTimer(session.duration_minutes, session.start_time, new Date().toISOString());
    } finally {
      setSubmitting(false);
    }
  };

  // ── Terminate (anti-cheat or manual stop) ────────────────────────────────
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
    setTerminateReason(reason);
    setView('terminated');
    setTerminating(false);
  }, [terminating, releaseExamLockdown]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Terminated
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'terminated') {
    return (
      <div className="min-h-screen bg-red-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="text-red-400" size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Exam Terminated</h1>
            <p className="text-red-300 mt-3 font-medium">
              {terminateReason === 'tab_switch_detected'
                ? 'Your exam was automatically terminated because you navigated away from the tab.'
                : 'Your exam session has been stopped. No results will be shown.'}
            </p>
            <p className="text-red-400/70 text-sm mt-2">Contact your teacher for further information.</p>
          </div>
          <button
            onClick={() => { setView('list'); setSession(null); fetchExams(); navigate('/dashboard/student'); }}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-bold text-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Submitted
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-400" size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Submitted!</h1>
            <p className="text-emerald-300 mt-3 font-medium">
              Your answers have been recorded. Your teacher will review and release your results.
            </p>
          </div>
          <button
            onClick={() => { setView('list'); setSession(null); fetchExams(); navigate('/dashboard/student'); }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Active Exam (lockdown mode)
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'active' && session) {
    const danger = timeLeft < 300; // red when < 5 min
    const warning = timeLeft < 600 && !danger; // amber when < 10 min

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col select-none">
        {/* ── Lockdown Header ── */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Shield className="text-school-primary" size={22} />
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Official Exam</p>
              <h1 className="text-white font-black text-lg leading-tight">{session.title}</h1>
            </div>
          </div>

          {/* ── Countdown Timer ── */}
          <div className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-black text-2xl tabular-nums transition-all ${
            danger  ? 'bg-red-500/20 text-red-400 animate-pulse' :
            warning ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-800 text-white'
          }`}>
            <Clock size={20} />
            {fmt(timeLeft)}
          </div>

          {/* ── Terminate / Stop button ── */}
          <button
            onClick={() => handleTerminate('student_triggered')}
            disabled={terminating}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/40 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            {terminating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            Stop Exam
          </button>
        </header>

        {/* ── Exam Body (placeholder question area) ── */}
        <div className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 text-center">
            <BookOpen className="text-slate-600 mx-auto mb-4" size={48} />
            <p className="text-slate-400 font-medium">
              Questions will appear here once the teacher publishes them via the Question Bank.
              Your session is <span className="text-emerald-400 font-bold">active and being timed.</span>
            </p>
          </div>

          {/* Anti-cheat warning banner */}
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <p className="text-amber-300 text-sm font-medium">
              <span className="font-black">Anti-cheat active.</span> Switching tabs, right-clicking, or navigating away will automatically terminate your exam with no results shown.
            </p>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/30 transition-all disabled:opacity-60"
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Exam List
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Official Exams</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Secure, timed assessments. Once started, the session cannot be paused.
          </p>
        </div>
        <button
          onClick={fetchExams}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-school-primary transition-colors px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800"
        >
          <Clock size={14} /> Refresh
        </button>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <Shield className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-black mb-1">Secure Exam Environment</p>
          <p className="font-medium opacity-80">
            Exams run in full-screen lockdown mode. Right-click is disabled. Switching tabs will automatically terminate your session with no results shown.
          </p>
        </div>
      </div>

      {/* Exam cards */}
      {listLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-school-primary animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
          <BookOpen className="text-slate-300 dark:text-slate-700 mx-auto mb-4" size={48} />
          <p className="text-slate-400 font-bold italic">No exams scheduled for your section yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => {
            const open = canStart(exam.start_window, serverTime);
            const already = exam.my_status === 'submitted' || exam.my_status === 'terminated';
            const statusLabel = exam.my_status === 'submitted' ? 'Submitted' : exam.my_status === 'terminated' ? 'Terminated' : null;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-school-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="text-school-primary" size={22} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white text-lg">{exam.title}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-0.5">{exam.subject_name} · {exam.subject_code}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {exam.duration_minutes} min
                      </span>
                      <span>·</span>
                      <span>
                        Opens: {new Date(exam.start_window).toLocaleString()}
                      </span>
                      <span>·</span>
                      <span>Examiner: {exam.examiner_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {already ? (
                    <span className={`px-4 py-2 rounded-xl text-sm font-black ${
                      exam.my_status === 'submitted'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {statusLabel}
                    </span>
                  ) : exam.my_status === 'active' ? (
                    <button
                      onClick={() => handleStart(exam)}
                      disabled={!!starting}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-5 py-3 rounded-2xl font-black text-sm shadow-lg shadow-amber-200 dark:shadow-amber-900/30 transition-all"
                    >
                      <Maximize size={15} /> Resume Session
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(exam)}
                      disabled={!open || !!starting}
                      title={!open ? `Opens at ${new Date(exam.start_window).toLocaleString()}` : ''}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all ${
                        open
                          ? 'bg-school-primary hover:bg-school-primary/90 text-white shadow-lg shadow-school-primary/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {starting === exam.id
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Shield size={15} />}
                      {open ? 'Start Exam' : 'Not Open Yet'}
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
