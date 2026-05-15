import { Calendar, BookOpen, Award, User, History, Megaphone, HeartPulse, ChevronRight, TrendingUp, Loader2, Search, ShieldCheck, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/apiClient';
import { toast } from '../components/Toast';
import { useUser } from '../context/UserContext';
import { onSSEEvent, connectSSE } from '../utils/sseClient';

export const ParentPortal = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view'); // 'children' or null
  
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activePortalTab, setActivePortalTab] = useState<'academic' | 'communication'>('academic');
  const [selectedSemester, setSelectedSemester] = useState('2');
  const [courseSearch, setCourseSearch] = useState('');

  // ─── Real data state ───────────────────────────────────────────────────────
  const [children, setChildren] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Child-specific live data
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [commLogs, setCommLogs] = useState<any[]>([]);
  const [, _setChildDataLoading] = useState(false);

  // ─── Fetch global dashboard (children + announcements) ─────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      setDataLoading(true);
      try {
        const res = await apiFetch('/api/parent/dashboard');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          toast.error(errorData.message || errorData.error || 'Failed to load parent dashboard.');
          return;
        }

        const data = await res.json();
        const payload = data.data || data;

        const mappedChildren = (payload.children || []).map((c: any) => ({
          id:          c.identity_id || c.id,
          name:        c.fullName || c.full_name || 'Unnamed Student',
          grade:       c.grade || '—',
          school_id:   c.school_id || '—',
          attendance:  c.attendance || '0%', 
          performance: c.performance || 'Pending', 
          course_count: c.course_count || 0,
          courses:     c.courses || []
        }));

        const mappedNotices = (payload.announcements || []).map((n: any) => ({
          ...n,
          time: n.timestamp ? new Date(n.timestamp).toLocaleDateString() : '—',
        }));

        setChildren(mappedChildren);
        setNotices(mappedNotices);
      } catch (err: any) {
        console.error('[ParentPortal] Dashboard fetch error:', err);
        toast.error('Network error — could not reach the parent portal server.');
      } finally {
        setDataLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // ── Real-time SSE ──────────────────────────────────────────────────────────
  useEffect(() => {
    connectSSE();
    const unsub = onSSEEvent('LOGISTICS_NOTICE', (payload: any) => {
      const newNotice = {
        ...payload,
        time: payload.timestamp ? new Date(payload.timestamp).toLocaleDateString() : '—',
      };
      setNotices(prev => [newNotice, ...prev]);
      toast.success(`🚌 New logistics notice: ${payload.title || 'Logistics Update'}`);
    });
    return unsub;
  }, []);

  // ─── Fetch child-specific data ─────────────────────────────────────────────
  const fetchChildDetails = async (studentId: string) => {
    _setChildDataLoading(true);
    try {
      const gradesRes = await apiFetch(`/api/student/grades?semester=${selectedSemester}&student_id=${studentId}`);
      const gradesData = await gradesRes.json();
      
      const historyRes = await apiFetch(`/api/student/history?year=2024/2025&student_id=${studentId}`);
      const historyDataRaw = await historyRes.json();

      const commRes = await apiFetch(`/api/parent/child/${studentId}/communication`);
      const commData = await commRes.json();

      if (gradesRes.ok) {
        const gradesPayload = gradesData.data || gradesData;
        const courses = (gradesPayload.courses || []).map((c: any) => ({
          name: c.name || 'Unknown Course',
          teacher: c.teacher || 'Unknown Teacher',
          grades: {
            quiz1: c.quiz_1 !== undefined ? c.quiz_1 : '—',
            quiz2: c.quiz_2 !== undefined ? c.quiz_2 : '—',
            mid: c.mid_30 !== undefined ? c.mid_30 : '—',
            test: c.test_1 !== undefined ? c.test_1 : '—',
            assignment: c.assignment_10 !== undefined ? c.assignment_10 : '—',
            final: c.final_50 !== undefined ? c.final_50 : '—',
            total: c.total !== undefined ? `${c.total}%` : '—'
          }
        }));

        setSelectedChild((prev: any) => ({
          ...prev,
          courses
        }));
      }

      const historyPayload = historyDataRaw.data || historyDataRaw;
      const commPayload = commData.data || commData;

      const historyList = Array.isArray(historyPayload) ? historyPayload : (historyPayload.history || []);
      setHistoryData(historyList);
      setCommLogs(commPayload || []);
    } catch (err: any) {
      console.error('[ParentPortal] Child details fetch error:', err);
      toast.error('Failed to sync child academic data.');
    } finally {
      _setChildDataLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChild?.id) {
      fetchChildDetails(selectedChild.id);
    }
  }, [selectedChild?.id, selectedSemester]);

  // ─── Main Rendering Logic ──────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Portal...</p>
        </div>
      </div>
    );
  }

  const showDashboardContext = viewMode !== 'children' && !showHistory && !selectedChild;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      
      {/* 1. Global Dashboard Context - HIDDEN when view=children OR showHistory is active */}
      {showDashboardContext && (
        <>
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-16 text-white shadow-2xl relative overflow-hidden border border-slate-700/30">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em]">
                  {t('parentPortal.title')}
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
                  {t('parentPortal.greeting', { name: user?.name || 'Parent' })}
                </h2>
                <p className="text-slate-300 text-lg max-w-lg leading-relaxed font-medium">
                  {t('parentPortal.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-8 bg-white/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-6 transition-transform hover:rotate-0 duration-500">
                  <User size={40} />
                </div>
                <div>
                  <p className="text-lg font-black text-white">Family Access</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <p className="text-xs text-blue-300 font-bold uppercase tracking-widest">{t('parentPortal.verified')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] -ml-48 -mb-48" />
          </div>
        </>
      )}

      {/* 2. Main Content Area - Either Academic Profile or Children List */}
      <div className="space-y-8">
        {selectedChild ? (
          /* ACADEMIC PROFILE VIEW (DRILL DOWN) */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedChild(null);
                  setShowHistory(false);
                }}
                className="text-blue-600 hover:underline flex items-center gap-2 font-black text-xs uppercase tracking-widest"
              >
                ← {t('parentPortal.backToChildren')}
              </button>

              <div className="flex gap-4 items-center">
                {activePortalTab === 'academic' && (
                  <>
                    <Link
                      to={`/official-exam?student_id=${selectedChild.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors font-bold text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-800 shadow-sm"
                    >
                      <ShieldCheck size={14} />
                      Official Exams
                    </Link>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700"
                    >
                      <History size={14} />
                      {showHistory ? t('parentPortal.activeCourses') : t('parentPortal.academicHistory')}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
              <div className="flex gap-6 border-b border-slate-100 dark:border-slate-800 mb-10 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActivePortalTab('academic')}
                  className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                    activePortalTab === 'academic' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t('parentPortal.academicProfile')}
                  {activePortalTab === 'academic' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                  onClick={() => setActivePortalTab('communication')}
                  className={`pb-4 px-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                    activePortalTab === 'communication' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t('parentPortal.communicationBook')}
                  {activePortalTab === 'communication' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-10 text-center sm:text-left">
                <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-200 dark:shadow-none">
                  {selectedChild.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedChild.name}</h2>
                  <p className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg w-fit mt-2 uppercase tracking-widest">{selectedChild.grade}</p>
                </div>
              </div>

              {activePortalTab === 'academic' ? (
                !showHistory ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3 text-slate-400 mb-4">
                          <Calendar size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('parentPortal.attendance')}</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-600">{selectedChild.attendance || '—'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3 text-slate-400 mb-4">
                          <BookOpen size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('parentPortal.activeCourses')}</span>
                        </div>
                        <p className="text-3xl font-black text-blue-600 mb-3">{selectedChild.courses?.length || 0}</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedChild.courses?.slice(0, 2).map((c: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-[9px] font-bold text-blue-600 rounded-md truncate max-w-[80px]">{c}</span>
                          ))}
                          {selectedChild.courses?.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded-md">+{selectedChild.courses.length - 2}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-3 text-slate-400 mb-4">
                          <Award size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{t('parentPortal.academicRank')}</span>
                        </div>
                        <p className="text-3xl font-black text-indigo-600">{selectedChild.performance || '—'}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academic Progress</h3>
                        
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Search & Select Unified UX */}
                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shadow-inner">
                            <Search size={16} className="text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Search course..."
                              value={courseSearch}
                              onChange={(e) => setCourseSearch(e.target.value)}
                              className="bg-transparent text-sm font-bold w-full focus:outline-none dark:text-white"
                            />
                          </div>

                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</span>
                            <select 
                              value={courseSearch}
                              onChange={(e) => setCourseSearch(e.target.value)}
                              className="bg-transparent text-sm font-bold text-blue-600 focus:outline-none cursor-pointer max-w-[150px]"
                            >
                              <option value="">All Courses</option>
                              {selectedChild.courses?.map((courseName: string) => (
                                <option key={courseName} value={courseName}>{courseName}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semester</span>
                            <select 
                              value={selectedSemester}
                              onChange={(e) => setSelectedSemester(e.target.value)}
                              className="bg-transparent text-sm font-bold text-blue-600 focus:outline-none cursor-pointer"
                            >
                              <option value="1">First Semester</option>
                              <option value="2">Second Semester</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
                        <table className="w-full text-left text-sm min-w-[900px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-8 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Subject</th>
                              <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Instructor</th>
                              <th className="px-4 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Q1</th>
                              <th className="px-4 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Q2</th>
                              <th className="px-6 py-5 font-black text-blue-600 uppercase text-[10px] tracking-widest text-center bg-blue-50/30 dark:bg-blue-900/10">Mid</th>
                              <th className="px-4 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Test</th>
                              <th className="px-4 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Assign.</th>
                              <th className="px-6 py-5 font-black text-indigo-600 uppercase text-[10px] tracking-widest text-center bg-indigo-50/30 dark:bg-indigo-900/10">Final</th>
                              <th className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest text-right">Weighted Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedChild.courses?.length > 0 ? selectedChild.courses
                              .filter((c: any) => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                              .map((course: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group transition-all">
                                <td className="px-8 py-5">
                                   <div className="font-black text-slate-800 dark:text-slate-100 text-base">{course.name}</div>
                                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Subject</div>
                                </td>
                                <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-bold">{course.teacher}</td>
                                <td className="px-4 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{course.grades.quiz1}</td>
                                <td className="px-4 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{course.grades.quiz2}</td>
                                <td className="px-6 py-5 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/10 dark:bg-blue-900/5">{course.grades.mid}</td>
                                <td className="px-4 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{course.grades.test}</td>
                                <td className="px-4 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{course.grades.assignment}</td>
                                <td className="px-6 py-5 text-center font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/10 dark:bg-indigo-900/5">
                                  {course.grades.final}
                                </td>
                                <td className="px-8 py-5 text-right">
                                   <span className="inline-block px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs shadow-lg shadow-slate-200 dark:shadow-none">
                                      {course.grades.total}
                                   </span>
                                </td>
                              </tr>
                            )) : (
                              <tr><td colSpan={9} className="py-20 text-center text-slate-400 italic font-medium">No results found for your search criteria.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ACADEMIC HISTORY VIEW (TIMELINE) */
                  <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700 pb-20">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academic History</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Review previous courses, semesters, and overall GPA trends.</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3 shadow-sm">
                        <TrendingUp className="text-emerald-600" size={24} />
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cumulative GPA</p>
                          <p className="text-xl font-black text-emerald-900 dark:text-indigo-100">
                            {(historyData.reduce((acc, h) => acc + parseFloat(h.average || 0), 0) / (historyData.length || 1) / 25).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12">
                      {historyData.length > 0 ? historyData.map((session, sIdx) => (
                        <div key={sIdx} className="relative">
                          {sIdx !== historyData.length - 1 && (
                            <div className="absolute left-[31px] top-20 bottom-0 w-1 bg-gradient-to-b from-blue-100 to-transparent dark:from-slate-800 -z-10" />
                          )}

                          <div className="flex items-start gap-8">
                            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shrink-0 outline outline-4 outline-white dark:outline-slate-950">
                              <Calendar size={28} />
                            </div>

                            <div className="flex-1 space-y-6">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{session.year}</h2>
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">{session.semester}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                  <Award size={18} className="text-amber-500" />
                                  Average: {session.average}%
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(session.courses || []).map((course: any, cIdx: number) => (
                                  <div key={cIdx} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Award size={20} />
                                      </div>
                                      <span className={`text-lg font-black ${
                                        course.score >= 90 ? 'text-emerald-500' : 'text-blue-500'
                                      }`}>
                                        {course.score >= 90 ? 'A+' : course.score >= 80 ? 'A' : course.score >= 70 ? 'B' : 'C'}
                                      </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight">{course.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Score: {course.score}%</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                          <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <History className="text-slate-300" size={40} />
                          </div>
                          <p className="text-slate-500 font-bold">No historical transcripts available for this student.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* COMMUNICATION BOOK SECTION */
                <CommunicationBook logs={commLogs} child={selectedChild} t={t} />
              )}
            </div>
          </div>
        ) : (
          /* CHILDREN LIST VIEW (DASHBOARD CONTENT) */
          <>
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                   <Award size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('parentPortal.myChildren')}</h3>
              </div>
              <div className="px-5 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {children.length} Students Linked
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {children.map((child, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedChild(child);
                    setActivePortalTab('academic');
                  }}
                  className="group relative cursor-pointer"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-20 transition duration-500" />
                  <div className="relative bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                    
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700" />

                    <div className="flex items-center justify-between mb-12 relative z-10">
                      <div className="flex items-center gap-8">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-4xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">{child.name}</h4>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{child.school_id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <ChevronRight size={28} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Calendar size={14} className="text-emerald-500" />
                           {t('parentPortal.attendance')}
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{child.attendance}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Award size={14} className="text-blue-500" />
                           {t('parentPortal.academicRank')}
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{child.performance}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <BookOpen size={14} className="text-indigo-500" />
                           {t('parentPortal.activeCourses')}
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{child.course_count}</p>
                      </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-blue-600 transition-all duration-500">
                      VIEW FULL PROFILE <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Global Dashboard Bottom Content - HIDDEN when view=children OR history active */}
      {showDashboardContext && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-20">
          
          {/* Announcements Section */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200 dark:shadow-none">
                 <Megaphone size={20} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">School Announcements</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {notices.length > 0 ? notices.map(notice => (
                <div 
                  key={notice.id} 
                  onClick={() => {
                    if (notice.category === 'Clinic') {
                      navigate(`/clinic-chat?student_id=${notice.targetId}`);
                    }
                  }}
                  className={`group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden ${notice.category === 'Clinic' ? 'cursor-pointer' : ''}`}
                >
                  <div className={`absolute top-0 left-0 w-2 h-full opacity-0 group-hover:opacity-100 transition-opacity ${notice.category === 'Clinic' ? 'bg-rose-500' : 'bg-blue-600'}`} />
                  <div className="flex items-center justify-between mb-8">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      notice.category === 'Logistics'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                      : notice.category === 'Clinic' || notice.priority === 'High'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                    }`}>
                      {notice.category || notice.priority}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{notice.time}</span>
                  </div>
                  <h4 className={`text-xl font-black text-slate-900 dark:text-white mb-4 leading-tight transition-colors ${notice.category === 'Clinic' ? 'group-hover:text-rose-500' : 'group-hover:text-blue-600'}`}>{notice.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{notice.content}</p>
                </div>
              )) : (
                <div className="col-span-2 p-16 text-center bg-slate-50 dark:bg-slate-800/40 rounded-[3rem] border border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold italic uppercase tracking-widest text-xs">No active notices at this time.</p>
                </div>
              )}
            </div>
          </div>

          {/* Clinic Support Sidebar */}
          <div className="lg:col-span-4">
            <div
              className="h-full bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer border border-white/5"
              onClick={() => navigate('/clinic-chat')}
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-blue-900/50 group-hover:scale-110 transition-transform duration-500">
                    <HeartPulse size={40} />
                  </div>
                  <h3 className="text-4xl font-black mb-6 leading-none tracking-tighter">Medical<br />Clinic Support</h3>
                  <p className="text-slate-400 text-base font-medium leading-relaxed">
                    Direct, secure, and encrypted communication with our on-campus medical staff for any health concerns.
                  </p>
                </div>
                <div className="mt-16">
                  <button className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40 active:scale-95">
                     {t('parentPortal.openMedicalChat')}
                  </button>
                </div>
              </div>
              <HeartPulse size={300} className="absolute -bottom-32 -right-32 text-white/5 rotate-12 opacity-50 group-hover:scale-110 group-hover:rotate-0 transition-all duration-1000" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CommunicationBook Component
 * Displays teacher feedback, student ratings, and interaction logs.
 */
const CommunicationBook = ({ logs, child }: { logs: any[], child: any, t?: any }) => {
  const getRatingLabel = (score: number) => {
    if (score >= 5) return 'Outstanding';
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Very Good';
    if (score >= 2) return 'Average';
    return 'Needs Improvement';
  };

  const getRatingColor = (score: number) => {
    if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 3) return 'text-blue-600 dark:text-blue-400';
    if (score >= 2) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // We only show the current week's log as per requirement
  const currentLog = logs[0];

  if (!currentLog) {
    return (
      <div className="py-32 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
           <BookOpen size={48} className="text-slate-300" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">No Current Update</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-md mx-auto italic">
          The communication book is cleared every Thursday. The school will post new updates this Friday.
        </p>
      </div>
    );
  }

  const ratings = currentLog.ratings || {};
  const categories = [
    { key: 'Uniform', label: 'Uniform', desc: 'Compliance with school dress code' },
    { key: 'Materials', label: 'Materials', desc: 'Readiness of school tools and books' },
    { key: 'Homework', label: 'Homework', desc: 'Completion and accuracy of home assignments' },
    { key: 'Participation', label: 'Participation', desc: 'Active engagement in classroom lessons' },
    { key: 'Conduct', label: 'Conduct', desc: 'General behavior and ethical standing' },
    { key: 'Social', label: 'Social', desc: 'Interaction and cooperation with other students' },
    { key: 'Punctuality', label: 'Punctuality', desc: 'Arriving at and leaving school on time' },
    { key: 'Note-taking', label: 'Note-taking', desc: 'Quality of notebook handling and writing' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-24">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <User size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{child?.name}</h2>
                  <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Grade {child?.grade} Student</p>
               </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Communication Book</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
              Your central hub for tracking educational milestones, health updates, and school announcements.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 text-center min-w-[200px]">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Week Ending</p>
             <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
               {currentLog.week_ending ? new Date(currentLog.week_ending).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '---'}
             </p>
          </div>
        </div>
      </div>

      {/* Ratings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const score = ratings[cat.key] || 0;
          return (
            <div key={cat.key} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300 shadow-sm hover:shadow-xl">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-colors ${
                  score >= 4 ? 'bg-emerald-50 text-emerald-600' : score >= 3 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                }`}>
                  {score}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{cat.label}</h4>
                  <p className="text-[11px] font-medium text-slate-400 leading-tight">{cat.desc}</p>
                </div>
              </div>
              <div className={`text-sm font-black uppercase tracking-widest ${getRatingColor(score)}`}>
                {getRatingLabel(score)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights Section */}
      <div className="grid lg:grid-cols-2 gap-8">
         {/* Teacher's Observation */}
         <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
            <div className="absolute top-6 right-8 text-indigo-100 dark:text-indigo-900/30 transition-transform group-hover:scale-110">
               <Megaphone size={80} />
            </div>
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                     <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Teacher's Observation</h3>
               </div>
               <p className="text-xl text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">
                 "{currentLog.teacher_note || 'No observation recorded for this week.'}"
               </p>
            </div>
         </div>

         {/* Progress Insight */}
         <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-600/20 relative group overflow-hidden">
            <div className="absolute -bottom-10 -right-10 text-white/10 transition-transform group-hover:rotate-12">
               <TrendingUp size={200} />
            </div>
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                     <Zap size={20} />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest">Progress Insight</h3>
               </div>
               <p className="text-xl font-medium leading-relaxed text-indigo-50">
                 {currentLog.progress_insight || 'Consistently strong performance in the classroom. Keep up the great work!'}
               </p>
            </div>
         </div>
      </div>

    </div>
  );
};
