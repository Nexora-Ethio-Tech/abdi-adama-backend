import { CheckCircle, XCircle, Clock, ChevronDown, UserCheck, Users, ShieldAlert, ArrowRight, X, Send, Check, Loader2, ArrowLeft } from 'lucide-react';
import { mockTeachers, mockStudents } from '../data/mockData';
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const Attendance = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';
  const isVP = role === 'vice-principal';
  const [selectedGrade, setSelectedGrade] = useState('10A');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [showSubModal, setShowSubModal] = useState(false);
  const [absentTeacher, setAbsentTeacher] = useState<any>(null);
  const [isProxyAnalysisRunning, setIsProxyAnalysisRunning] = useState(false);
  const [proxySuggestions, setProxySuggestions] = useState<string[]>([]);
  const [absentReviewQueue, setAbsentReviewQueue] = useState([
    { id: '1', studentName: 'Ahmed Ali', grade: '10A', reason: 'Not reported', time: '08:15 AM' },
    { id: '2', studentName: 'Sara Mohammed', grade: '9B', reason: 'Family emergency', time: '08:45 AM' },
  ]);

  const students = mockStudents.filter((s: any) => s.grade === selectedGrade);

  const toggleStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status: 'present' | 'absent' | 'late') => {
    const newAttendance = { ...attendance };
    students.forEach((s: any) => {
      newAttendance[s.id] = status;
    });
    setAttendance(newAttendance);
  };

  const gradeStats = [
    { grade: '10A', enrollment: 24, present: 22, percentage: '91.6%' },
    { grade: '9B', enrollment: 30, present: 28, percentage: '93.3%' },
    { grade: '11C', enrollment: 18, present: 15, percentage: '83.3%' },
    { grade: '12A', enrollment: 25, present: 25, percentage: '100%' },
  ];

  const runProxyAnalysis = () => {
    setIsProxyAnalysisRunning(true);
    setProxySuggestions([]);
    window.setTimeout(() => {
      const suggestions = mockTeachers
        .filter((teacher) => !teacher.isInClass)
        .slice(0, 3)
        .map((teacher) => `${teacher.name} (${teacher.subjects.join(', ')})`);
      setProxySuggestions(suggestions);
      setIsProxyAnalysisRunning(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>
      {isVP && absentReviewQueue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 overflow-hidden shadow-xl shadow-rose-50 dark:shadow-none">
          <div className="bg-rose-50 dark:bg-rose-900/20 px-6 py-4 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-lg animate-pulse">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-black text-rose-900 dark:text-rose-100 text-sm uppercase tracking-wider">VP Attendance Review Queue</h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">Unexcused absences requiring escalation</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-black">
              {absentReviewQueue.length} PENDING
            </span>
          </div>
          <div className="divide-y divide-rose-50 dark:divide-rose-900/20">
            {absentReviewQueue.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-rose-600 font-black shadow-sm border border-rose-100 dark:border-rose-900/30">
                    {item.studentName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{item.studentName}</p>
                    <p className="text-xs text-slate-500 font-medium">Grade {item.grade} • Reported at {item.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAbsentReviewQueue(prev => prev.filter(q => q.id !== item.id))}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <Check size={16} />
                    Pass (Excused)
                  </button>
                  <button
                    onClick={() => {
                      alert(`Notifying parents of ${item.studentName}...`);
                      setAbsentReviewQueue(prev => prev.filter(q => q.id !== item.id));
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-100"
                  >
                    <Send size={16} />
                    Notify Parents
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isVP && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 shadow-2xl shadow-blue-500/5 dark:shadow-none overflow-hidden transition-all duration-500">
          <div className="p-8 border-b border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                  <UserCheck size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-blue-900 dark:text-blue-100">Staff Shortage Command Center</h3>
                  <p className="text-sm font-bold text-blue-600/70 dark:text-blue-400/70 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {mockTeachers.filter(t => !t.isInClass).length} ABSENT STAFF
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {mockTeachers.filter(t => t.isInClass).length} PRESENT
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={runProxyAnalysis}
                disabled={isProxyAnalysisRunning}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isProxyAnalysisRunning ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                {isProxyAnalysisRunning ? 'Analyzing...' : 'Auto-Match Proxies'}
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Absent Teachers List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Currently Missing</h4>
                  <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">Action Required</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {mockTeachers.filter(t => !t.isInClass).map((teacher) => (
                    <div key={teacher.id} className="group p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
                            {teacher.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{teacher.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">{teacher.subjects[0]}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded text-[9px] font-black uppercase tracking-wider">Impact: 3 Classes</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="text-[9px] font-bold text-slate-400">10A, 11B, 9C</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => { setAbsentTeacher(teacher); setShowSubModal(true); }}
                          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        >
                          Find Proxy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proxy Suggestions Panel */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Proxy Recommendations</h4>
                  <span className="text-[10px] font-bold text-emerald-500">Live Availability</span>
                </div>

                <div className="min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 text-center bg-slate-50/50 dark:bg-slate-900/20">
                  {isProxyAnalysisRunning ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <Users size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Analyzing Schedule Matrix...</p>
                      <p className="text-xs text-slate-500">Matching subject expertise and free periods.</p>
                    </div>
                  ) : proxySuggestions.length > 0 ? (
                    <div className="w-full space-y-3">
                      {proxySuggestions.map((suggestion) => (
                        <div key={suggestion} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 text-white rounded-lg group-hover:rotate-12 transition-transform">
                              <CheckCircle size={18} />
                            </div>
                            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{suggestion}</p>
                          </div>
                          <button className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest hover:underline">
                            Quick Assign
                          </button>
                        </div>
                      ))}
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
                        Analysis Complete • Subject Match: High
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto">
                        <Clock size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-500">Run analysis to find best fits</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isVP && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Student Attendance</h2>
          </div>
          <div className="flex gap-2">
            <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-bold text-sm">
              Attendance Reports
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-100 dark:shadow-none">
              Save Today's Records
            </button>
          </div>
        </div>
      )}

      {!isVP && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Select Grade/Section</label>
              <div className="relative">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all w-40"
                >
                  <option value="10A">Grade 10A</option>
                  <option value="9B">Grade 9B</option>
                  <option value="11C">Grade 11C</option>
                  <option value="12A">Grade 12A</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Attendance Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Total Students</label>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{students.length} Enrolled</p>
            </div>
          </div>

          {(role === 'teacher') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => markAll('present')}
                className="text-[10px] font-bold text-emerald-600 border border-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase tracking-wider"
              >
                Mark All Present
              </button>
              <button
                onClick={() => markAll('absent')}
                className="text-[10px] font-bold text-rose-600 border border-rose-100 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors uppercase tracking-wider"
              >
                Mark All Absent
              </button>
            </div>
          )}
        </div>
      )}

      {!isVP && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            {isAdmin ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade/Section</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Enrollment</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Present Today</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {gradeStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                            {stat.grade}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Grade {stat.grade}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">{stat.enrollment} Students</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">{stat.present} Students</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{stat.percentage}</span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: stat.percentage }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Identity</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Last 30 Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {students.map((student: any) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                            {student.name[0]}
                          </div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleStatus(student.id, 'present')}
                            className={`p-2 rounded-lg border transition-all ${
                              attendance[student.id] === 'present'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                            }`}
                            title="Present"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            onClick={() => toggleStatus(student.id, 'absent')}
                            className={`p-2 rounded-lg border transition-all ${
                              attendance[student.id] === 'absent'
                                ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-500'
                            }`}
                            title="Absent"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => toggleStatus(student.id, 'late')}
                            className={`p-2 rounded-lg border transition-all ${
                              attendance[student.id] === 'late'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-500 hover:text-amber-500'
                            }`}
                            title="Late"
                          >
                            <Clock size={20} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">96%</span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}



      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Staff Substitution</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">Rapid Proxy Teacher Assignment</p>
                </div>
              </div>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="p-5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-700 dark:text-rose-400 font-black text-2xl shadow-inner">
                    {absentTeacher?.name[0]}
                  </div>
                  <div>
                    <p className="text-base font-black text-rose-900 dark:text-rose-100">{absentTeacher?.name}</p>
                    <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-widest mt-1">Reported Absent Today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Live Impact</p>
                  <p className="text-lg font-black text-rose-900 dark:text-rose-100">{absentTeacher?.classes} Classes</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  Eligible Substitutes
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {mockTeachers.filter(t => !t.isInClass && t.id !== absentTeacher?.id).map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                          {teacher.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{teacher.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{teacher.subjects.join(', ')}</p>
                        </div>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all">
                        Assign Proxy
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Automated SMS & App notifications will be sent to parents and the assigned teacher.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
