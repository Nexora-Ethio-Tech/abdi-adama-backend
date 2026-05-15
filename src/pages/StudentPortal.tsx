
import { BookOpen, Award, Clock, ArrowRight, Star, Trophy, CheckCircle2, Loader2, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { apiFetch } from '../utils/apiClient';
import { onSSEEvent, connectSSE } from '../utils/sseClient';

interface DashboardData {
  schedule: Array<{
    subject: string;
    teacher: string;
    start_time: string;
    end_time: string;
    room: string;
  }>;
  deadlines: Array<{
    id: string;
    title: string;
    type: string;
    due_date: string;
    subject: string;
  }>;
  teacherOfTheMonth: Array<{
    name: string;
    award_label: string;
  }>;
  announcements: Array<{
    id: string;
    priority: string;
    title: string;
    content: string;
    timestamp: string;
    category: string;
  }>;
  stats: {
    attendance: string;
    rank: string;
    active_courses: string[];
  };
}

interface ProfileData {
  fullName: string;
  section: string;
  grade: string;
}

export const StudentPortal = () => {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [votedTeacher, setVotedTeacher] = useState<string | null>(null);
  const [hideVoting, setHideVoting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, profRes] = await Promise.all([
          apiFetch('/api/student/dashboard'),
          apiFetch('/api/student/profile')
        ]);

        if (dashRes.ok && profRes.ok) {
          const dashData = await dashRes.json();
          const profData = await profRes.json();
          setData(dashData.data);
          setProfile(profData.data);
        }
      } catch (err) {
        console.error('Failed to fetch student dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Real-time SSE: inject driver logistics notices instantly ─────────────────
  useEffect(() => {
    connectSSE(); // no-op if already connected
    const unsub = onSSEEvent('LOGISTICS_NOTICE', (payload: any) => {
      setData(prev => {
        if (!prev) return prev;
        const newNotice = {
          id:        payload.id,
          priority:  payload.priority || 'Normal',
          title:     payload.title,
          content:   payload.content,
          timestamp: payload.timestamp,
          category:  'Logistics',
        };
        return {
          ...prev,
          announcements: [newNotice, ...(prev.announcements || [])],
        };
      });
    });
    return unsub;
  }, []);

  const handleVote = (name: string) => {
    setVotedTeacher(name);
    // In a real app, this would call a POST /api/student/vote
    setTimeout(() => {
      setHideVoting(true);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading your portal...</p>
      </div>
    );
  }

  // Fallback if data is missing
  const schedule = data?.schedule || [];
  const deadlines = data?.deadlines || [];
  const monthlyTeachers = data?.teacherOfTheMonth || [];
  const announcements = data?.announcements || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Teacher of the Week / Month Voting */}
      {monthlyTeachers.length > 0 && !hideVoting && (
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-amber-500/10 relative overflow-hidden mb-8 border border-white/10">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 rotate-12 pointer-events-none">
            <Trophy className="w-20 h-20 md:w-32 md:h-32 lg:w-[140px] lg:h-[140px]" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  <Star size={12} fill="currentColor" /> Monthly Rewards
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">Teacher of the Month</h2>
                <p className="text-sm md:text-base font-medium opacity-80">
                  Help your favorite teacher earn monthly reward points.
                </p>
              </div>

              <div className="flex-1 w-full max-w-xl">
                {!votedTeacher ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {monthlyTeachers.map((teacher, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleVote(teacher.name)}
                        className="p-4 rounded-3xl backdrop-blur-xl transition-all text-left relative group border-2 bg-white/10 border-white/20 hover:bg-white/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm bg-white/20 flex-shrink-0">
                            {teacher.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate">{teacher.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 text-white truncate">{teacher.award_label}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8"
                  >
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                       <CheckCircle2 size={40} className="animate-bounce" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black">Thank You!</h3>
                       <p className="font-bold opacity-80 uppercase tracking-widest text-[10px]">Your vote has been recorded</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Welcome back, {profile?.fullName || user?.name || 'Student'}!</h2>
          <div className="flex items-center gap-3 mb-4">
             <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">{profile?.grade || 'N/A'}</span>
             <span className="text-xs font-bold text-blue-100">{profile?.section || 'N/A'} Section</span>
          </div>
          <p className="opacity-90 text-lg font-medium">
            You have <span className="underline decoration-wavy decoration-emerald-400 font-bold">{deadlines.length} upcoming tasks</span>.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
          <Award size={160} />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg text-orange-600 w-fit mb-4">
            <BookOpen size={24} />
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Courses</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{data?.stats?.active_courses?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg text-emerald-600 w-fit mb-4">
            <Clock size={24} />
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Attendance</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{data?.stats?.attendance || '0%'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg text-amber-600 w-fit mb-4">
            <Trophy size={24} />
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Academic Rank</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{data?.stats?.rank || 'Pending'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 w-fit mb-4">
            <Award size={24} />
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Digital ID</h3>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{user?.digitalId || 'STU-NEW'}</p>
        </div>
      </div>
      
      {/* Announcements */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">School Notices</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {announcements.length > 0 ? announcements.map((notice) => (
            <div key={notice.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    notice.category === 'Logistics' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {notice.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    notice.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {notice.priority}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(notice.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{notice.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {notice.content}
              </p>
            </div>
          )) : (
            <div className="col-span-2 py-12 text-center text-slate-400 italic text-sm">No recent announcements.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Today's Schedule</h3>
          <div className="space-y-4">
            {schedule.length > 0 ? schedule.map((session, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-xs md:text-sm font-bold text-blue-600 w-16 md:w-24 flex-shrink-0">
                  {session.start_time} - {session.end_time}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{session.subject}</p>
                  <p className="text-xs text-slate-500">{session.teacher} • {session.room}</p>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-400 italic text-sm">No classes scheduled for today.</div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Upcoming Tasks</h3>
          <div className="space-y-4">
            {deadlines.length > 0 ? deadlines.map((deadline) => (
              <div
                key={deadline.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  deadline.type === 'Live Exam'
                    ? 'border-rose-100 bg-rose-50/50 hover:bg-rose-50'
                    : 'border-slate-100 dark:border-slate-800'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${deadline.type === 'Live Exam' ? 'text-rose-900' : 'text-slate-800 dark:text-slate-100'}`}>
                    {deadline.title}
                  </p>
                  <p className="text-xs text-slate-500">{deadline.subject} • {deadline.type}</p>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                  deadline.type === 'Live Exam' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {new Date(deadline.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-slate-400 italic text-sm">All caught up! No pending tasks.</div>
            )}

            <Link
              to="/official-exam"
              className="flex items-center justify-center gap-2 p-3 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors border-t border-slate-100 dark:border-slate-800 mt-2"
            >
              View Official Exams <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
