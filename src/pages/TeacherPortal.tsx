import { BookOpen, Users, Calendar, ArrowRight, Award, ClipboardList, Star, Save, CheckCircle, ChevronRight, History, FileText, CheckSquare, MessageSquare, X, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import type { WeeklyPlan } from '../data/mockData';
import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export const TeacherPortal = () => {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDean = (user as any)?.is_dean || false;
  const isRoomTeacher = (user as any)?.is_room_teacher || false;

  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'communication' | 'review'>('overview');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'plans', 'communication', 'review'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    setActiveTab(tab as any);
  };
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [teacherNote, setTeacherNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const commFields = [
    { id: 'discipline', label: 'Discipline', description: 'Behavior and following rules' },
    { id: 'hygiene', label: 'Hygiene', description: 'Personal cleanliness and uniform' },
    { id: 'participation', label: 'Participation', description: 'In-class activity and engagement' },
    { id: 'homework', label: 'Homework', description: 'Completion and quality of assignments' }
  ];

  const ratingLabels: Record<number, string> = {
    3: 'Excellent',
    2: 'Good',
    1: 'Fair',
    0: 'Needs Improvement'
  };

  // Smart Lesson Planning State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<WeeklyPlan>>({
    date: new Date().toISOString().split('T')[0],
    content: '',
    objectives: '',
    teacherActivity: '',
    time: '',
    studentActivity: '',
    teachingMethod: '',
    teachingAids: '',
    evaluation: '',
    remark: '',
    status: 'Pending'
  });

  const [assignedSections, setAssignedSections] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getToken = () => localStorage.getItem('abdi_adama_token') || '';

  const fetchData = async () => {
    try {
      // 1. Fetch assigned sections
      const sRes = await fetch(`${API}/api/academic/teacher/sections`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (sRes.ok) setAssignedSections(await sRes.json());

      // 2. Fetch weekly plans
      const pRes = await fetch(`${API}/api/operational/weekly-plans`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (pRes.ok) setPlans(await pRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/operational/weekly-plans`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify(newPlan)
      });
      if (res.ok) {
        setIsPlanModalOpen(false);
        fetchData(); // Refresh plans
      }
    } catch (err) { console.error(err); }
  };

  const fetchStudentsForClass = async (sectionId: string) => {
    try {
      const res = await fetch(`${API}/api/academic/sections/${sectionId}/students`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setStudents(await res.json());
    } catch (err) { console.error(err); }
  };

  const pendingAssignments = 0; // TODO: fetch from /api/exams when exam module is live

  const handleRating = (fieldId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [fieldId]: rating }));
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 3: return 'bg-emerald-500 text-white';
      case 2: return 'bg-blue-500 text-white';
      case 1: return 'bg-amber-500 text-white';
      case 0: return 'bg-rose-500 text-white';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 gap-3 p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl w-auto sm:w-fit border border-slate-200/50 dark:border-slate-700/50">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'plans', label: 'Weekly Plans' },
          ...(isRoomTeacher ? [{ id: 'communication', label: 'Comm. Book' }] : []),
          ...(isDean ? [{ id: 'review', label: 'Review' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-4xl my-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">Create Weekly Plan</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Smart Lesson Planning System</p>
                </div>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddPlan} className="p-5 sm:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input
                    required
                    type="date"
                    value={newPlan.date}
                    onChange={e => setNewPlan({...newPlan, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content / Topic</label>
                  <input
                    required
                    placeholder="e.g. Mathematics: Quadratic Equations"
                    value={newPlan.content}
                    onChange={e => setNewPlan({...newPlan, content: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time (Duration)</label>
                  <input
                    required
                    placeholder="e.g. 45 mins"
                    value={newPlan.time}
                    onChange={e => setNewPlan({...newPlan, time: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Objectives</label>
                  <textarea
                    required
                    placeholder="What should students achieve?"
                    value={newPlan.objectives}
                    onChange={e => setNewPlan({...newPlan, objectives: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teacher Activity</label>
                  <textarea
                    required
                    placeholder="What will you do?"
                    value={newPlan.teacherActivity}
                    onChange={e => setNewPlan({...newPlan, teacherActivity: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Activity</label>
                  <textarea
                    required
                    placeholder="What will students do?"
                    value={newPlan.studentActivity}
                    onChange={e => setNewPlan({...newPlan, studentActivity: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-medium h-20 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teaching Method</label>
                  <input
                    required
                    placeholder="e.g. Interactive Lecture"
                    value={newPlan.teachingMethod}
                    onChange={e => setNewPlan({...newPlan, teachingMethod: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teaching Aids</label>
                  <input
                    required
                    placeholder="e.g. Textbook, Whiteboard"
                    value={newPlan.teachingAids}
                    onChange={e => setNewPlan({...newPlan, teachingAids: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evaluation</label>
                  <input
                    required
                    placeholder="e.g. Short Quiz"
                    value={newPlan.evaluation}
                    onChange={e => setNewPlan({...newPlan, evaluation: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
                <div className="space-y-1 lg:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remark (Optional)</label>
                  <input
                    placeholder="Any additional notes..."
                    value={newPlan.remark}
                    onChange={e => setNewPlan({...newPlan, remark: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 outline-none text-sm font-bold"
                  />
                </div>
              </div>

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 dark:shadow-none uppercase tracking-widest text-xs order-1 sm:order-2"
                >
                  Submit Plan for Approval
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-8 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 sm:py-0 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs order-2 sm:order-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'overview' ? (
        <>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4 block">Teacher Dashboard</span>
              <h2 className="text-4xl font-black mb-2 tracking-tight">Welcome back, Solomon!</h2>
              <p className="text-slate-400 max-w-md font-medium text-lg leading-relaxed">Your next session: <span className="text-white">Grade 10A Mathematics</span> starts in 15 minutes.</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/attendance"
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  Take Attendance
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/schedule"
                  className="bg-white/5 text-white border border-white/10 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                >
                  Schedule
                </Link>
                <Link
                  to="/grades"
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                >
                  <Award size={16} />
                  Grades
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <BookOpen size={240} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none group hover:-translate-y-2 transition-all duration-500">
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Students</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">87</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Across 2 classes</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none group hover:-translate-y-2 transition-all duration-500">
              <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar size={28} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Classes Today</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">4</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Next: 10:00 AM</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none group hover:-translate-y-2 transition-all duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardList size={28} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Assignments</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-white">{pendingAssignments}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Pending submissions</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Assigned Roster</h3>
              <button className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline">View All Classes</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedSections.map((cls) => (
                <div key={cls.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none flex items-center justify-between group hover:border-blue-500/50 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] text-slate-600 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <Users size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Grade {cls.grade_level} - {cls.section_name}</h4>
                    </div>
                  </div>
                  <Link
                    to="/attendance"
                    className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl transition-all group-hover:translate-x-1"
                  >
                    <ArrowRight size={24} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : activeTab === 'plans' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Smart Lesson Planning</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Automated curriculum alignment and activity tracking.</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                <Plus size={18} />
                Create New Plan
              </button>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-8 relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none sm:hidden"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none sm:hidden"></div>
              <table className="w-full text-left border-collapse min-w-[1500px]">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Content</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Objectives</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Teacher Act.</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Time</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Student Act.</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Method</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Aids</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Evaluation</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Remark</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {plans.filter(p => p.teacherId === user?.id || p.teacherId === 'T1').map(plan => (
                    <tr key={plan.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{plan.date}</p>
                      </td>
                      <td className="px-4 py-5">
                        <p className="text-xs text-blue-600 font-medium">{plan.content}</p>
                      </td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.objectives}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.teacherActivity}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 font-bold">{plan.time}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.studentActivity}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.teachingMethod}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.teachingAids}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2">{plan.evaluation}</p></td>
                      <td className="px-4 py-5"><p className="text-xs text-slate-600 dark:text-slate-400 max-w-[150px] line-clamp-2 italic">{plan.remark}</p></td>
                      <td className="px-6 py-5 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          plan.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                          plan.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'review' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Departmental Plan Review</h3>
              <p className="text-slate-500 text-sm font-medium">Review and approve lesson plans from your department staff.</p>
            </div>
            <div className="bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg shadow-blue-200">
              Science Department Dean
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {plans.filter(p => p.teacherId !== user?.id && p.teacherId !== 'T1').map(plan => (
              <div key={plan.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 font-bold">
                      {plan.teacherId === 'T2' ? 'WS' : 'TK'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{plan.teacherId === 'T2' ? 'W/ro Selam' : 'Ato Kebede'}</h4>
                      <p className="text-xs text-slate-500">Submitted: Monday, 8:00 AM</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${plan.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {plan.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Date & Content</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{plan.date}: {plan.content}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Specific Objectives</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{plan.objectives}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Evaluation</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{plan.evaluation}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                  <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2">
                    <CheckSquare size={14} />
                    Approve Plan
                  </button>
                  <button className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700">
                    <MessageSquare size={14} />
                    Add Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`${selectedStudent ? 'hidden lg:block' : 'block'} lg:col-span-4 space-y-6`}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Select Class</h3>
              <div className="space-y-2">
                {assignedSections.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClass(cls.id);
                      fetchStudentsForClass(cls.id);
                      setSelectedStudent(null);
                    }}
                    className={`w-full p-4 flex items-center justify-between rounded-xl transition-all ${selectedClass === cls.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                  >
                    <span className="font-bold">Grade {cls.grade_level} - {cls.section_name}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            </div>

            {selectedClass && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Students</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {students.map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setRatings({});
                        setTeacherNote('');
                      }}
                      className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${selectedStudent?.id === student.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs">
                        {student.name[0]}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{student.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`${selectedStudent ? 'block' : 'hidden lg:block'} lg:col-span-8`}>
            {selectedStudent ? (
              <div className="lg:hidden mb-6">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex items-center gap-2 text-blue-600 font-bold"
                >
                  <ArrowRight size={18} className="rotate-180" />
                  Back to Students
                </button>
              </div>
            ) : null}
            {selectedStudent ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 font-black text-2xl">
                      {selectedStudent.name[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                      <p className="text-slate-500 font-bold">Weekly Performance Rating (May 24-30)</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    <Save size={18} />
                    Submit Week Rating
                  </button>
                </div>

                {isSaved && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-800 animate-in fade-in zoom-in-95">
                    <CheckCircle size={20} />
                    <span className="font-bold text-sm">Communication book updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {commFields.map(field => (
                    <div key={field.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{field.label}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{field.description}</p>
                        </div>
                        {ratings[field.id] !== undefined && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRatingColor(ratings[field.id])}`}>
                            {ratingLabels[ratings[field.id]]}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(rating => (
                          <button
                            key={rating}
                            onClick={() => handleRating(field.id, rating)}
                            className={`py-2 rounded-lg text-[10px] font-black transition-all ${ratings[field.id] === rating ? getRatingColor(rating) : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                          >
                            {rating + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Teacher's Remark (Optional)</label>
                  <textarea
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                    placeholder="Write a brief observation about the student's week..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all outline-none text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex gap-4">
                  <History className="text-amber-600 flex-shrink-0" size={24} />
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">History Tracking</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-500/80 mt-1 leading-relaxed">
                      Ratings submitted here are archived weekly. Parents can view past performance trends in their portal to track long-term behavioral and academic readiness.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Star className="text-slate-300 dark:text-slate-700 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Communication Book</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">Select a student from the left panel to begin the weekly performance evaluation.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
