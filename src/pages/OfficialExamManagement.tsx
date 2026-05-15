
import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Calendar, Clock, CheckCircle2,
  Trash2, Edit3, Eye, ArrowLeft, Users, TrendingUp, Filter, MoreVertical,
  ChevronRight, Save, X, Lock, Unlock, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Exam {
  id: string;
  title: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  start_window: string;
  duration_minutes: number;
  examiner_id: string;
  examiner_name?: string;
  section_id: string | null;
  is_published: boolean;
  created_at: string;
}

interface ExamResult {
  id: string;
  exam_id: string;
  exam_title: string;
  student_id: string;
  student_name: string;
  school_id: string;
  status: 'active' | 'submitted' | 'terminated';
  score: number | null;
  approval_status: 'pending' | 'approved';
  start_time: string;
  end_time: string;
  duration_taken_minutes: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export const OfficialExamManagement: React.FC = () => {
  const token = sessionStorage.getItem('abdi_adama_token') ?? '';
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'results'>('list');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    start_window: '',
    duration_minutes: 60,
    section_id: ''
  });

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams/management', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setExams(data.data);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSubjects(data.data);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchResults = async (examId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/teacher?exam_id=${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch (err) {
      console.error('Failed to fetch results', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (exam?: Exam) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        title: exam.title,
        subject_id: exam.subject_id,
        start_window: new Date(exam.start_window).toISOString().slice(0, 16),
        duration_minutes: exam.duration_minutes,
        section_id: exam.section_id || ''
      });
    } else {
      setEditingExam(null);
      setFormData({
        title: '',
        subject_id: '',
        start_window: '',
        duration_minutes: 60,
        section_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingExam ? `/api/exams/${editingExam.id}` : '/api/exams';
    const method = editingExam ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchExams();
      }
    } catch (err) {
      console.error('Failed to save exam', err);
    }
  };

  const togglePublish = async (exam: Exam) => {
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_published: !exam.is_published })
      });
      const data = await res.json();
      if (data.success) fetchExams();
    } catch (err) {
      console.error('Failed to toggle publish', err);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? All results will be lost.')) return;
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchExams();
    } catch (err) {
      console.error('Failed to delete exam', err);
    }
  };

  const handleApprove = async (resultId: string, score: number) => {
    try {
      const res = await fetch(`/api/exams/results/${resultId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ score })
      });
      const data = await res.json();
      if (data.success) {
        if (selectedExam) fetchResults(selectedExam.id);
      }
    } catch (err) {
      console.error('Failed to approve result', err);
    }
  };

  const openResults = (exam: Exam) => {
    setSelectedExam(exam);
    fetchResults(exam.id);
    setView('results');
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-12 space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.15),_transparent_40%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
              <FileText size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Examination Bureau</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic">
              Official <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Examinations</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Design, schedule, and oversee high-stakes assessments. Ensure academic integrity and finalize grades with executive oversight.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus size={18} /> New Examination
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Exams', value: exams.length, icon: FileText, color: 'indigo' },
                { label: 'Published', value: exams.filter(e => e.is_published).length, icon: Send, color: 'emerald' },
                { label: 'Avg. Participation', value: '94%', icon: Users, color: 'blue' },
                { label: 'Avg. Score', value: '78.5', icon: TrendingUp, color: 'purple' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className={`p-3 w-fit rounded-2xl bg-${stat.color}-100 dark:bg-${stat.color}-900/20 text-${stat.color}-600 mb-4`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search examinations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 ring-indigo-500/20 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            {/* Exams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all hover:scale-[1.02]">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        {exam.subject_code || 'EXAM'}
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        exam.is_published 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {exam.is_published ? <Send size={10} /> : <Clock size={10} />}
                        {exam.is_published ? 'Published' : 'Draft'}
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {exam.title}
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Calendar size={14} className="text-indigo-500" />
                        {new Date(exam.start_window).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock size={14} className="text-indigo-500" />
                        {exam.duration_minutes} Minutes Duration
                      </div>
                    </div>

                    <div className="pt-4 flex items-center gap-2">
                      <button 
                        onClick={() => openResults(exam)}
                        className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Eye size={14} /> Results
                      </button>
                      <button 
                        onClick={() => handleOpenModal(exam)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exam.id)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button 
                      onClick={() => togglePublish(exam)}
                      className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        exam.is_published ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {exam.is_published ? <Lock size={12} /> : <Unlock size={12} />}
                      {exam.is_published ? 'Unpublish Exam' : 'Publish to Students'}
                    </button>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>

            {filteredExams.length === 0 && !loading && (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">No Examinations Found</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm font-medium">Try adjusting your search or create a new examination to get started.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white italic">
                    {selectedExam?.title} <span className="text-indigo-600">Results</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">
                    {results.length} Students Participated
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-5 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                  Export PDF
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Student Identity</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Session Status</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Time Taken</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Performance</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {results.map((result) => (
                      <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center font-black text-xs">
                              {result.student_name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{result.student_name}</p>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{result.school_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            result.status === 'submitted' ? 'bg-emerald-100 text-emerald-600' :
                            result.status === 'terminated' ? 'bg-rose-100 text-rose-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              result.status === 'submitted' ? 'bg-emerald-600' :
                              result.status === 'terminated' ? 'bg-rose-600' :
                              'bg-blue-600 animate-pulse'
                            }`} />
                            {result.status}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Clock size={14} />
                            {Math.round(result.duration_taken_minutes)}m
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {result.approval_status === 'approved' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-indigo-600">{result.score}%</span>
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Pending Review</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          {result.approval_status !== 'approved' && result.status === 'submitted' ? (
                             <div className="flex items-center justify-end gap-2">
                               <input 
                                 type="number"
                                 placeholder="Score"
                                 className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold focus:ring-1 ring-indigo-500 outline-none"
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                     handleApprove(result.id, Number((e.target as HTMLInputElement).value));
                                   }
                                 }}
                               />
                               <button 
                                 onClick={(e) => {
                                   const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                   handleApprove(result.id, Number(input.value));
                                 }}
                                 className="p-2 bg-indigo-600 text-white rounded-lg hover:scale-105 transition-all"
                               >
                                 <CheckCircle2 size={14} />
                               </button>
                             </div>
                          ) : (
                            <button className="p-2 text-slate-300 hover:text-slate-600 transition-all">
                              <MoreVertical size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {editingExam ? 'Modify' : 'New'} <span className="text-indigo-600">Examination</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Session Configuration</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Exam Title</label>
                    <input 
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Grade 12 National Mock Examination 2025"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Subject / Course</label>
                    <select 
                      required
                      value={formData.subject_id}
                      onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 ring-indigo-500/20 outline-none appearance-none"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Target Section (Optional)</label>
                    <input 
                      type="text"
                      value={formData.section_id}
                      onChange={(e) => setFormData({...formData, section_id: e.target.value})}
                      placeholder="Leave empty for all sections"
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 ring-indigo-500/20 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Start Window</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="datetime-local"
                        value={formData.start_window}
                        onChange={(e) => setFormData({...formData, start_window: e.target.value})}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 ring-indigo-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Duration (Minutes)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 ring-indigo-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Save size={18} /> {editingExam ? 'Save Changes' : 'Initialize Exam'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfficialExamManagement;
