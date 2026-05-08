
import { UserPlus, Calendar, Search, Filter, MoreVertical, DoorOpen, DoorClosed, Award, X, Check, Mail, Phone, MapPin, Briefcase, GraduationCap, BookOpen, Trophy, Medal } from 'lucide-react';
import { mockTeachers, mockSchedules, mockClasses } from '../data/mockData';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { ArrowLeft } from 'lucide-react';

export const Teachers = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const isAdmin = role === 'school-admin' || role === 'super-admin';
  const isVP = role === 'vice-principal';
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [viewingSchedule, setViewingSchedule] = useState<string | null>(null);
  const [promotingTeacher, setPromotingTeacher] = useState<any | null>(null);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'directory' | 'leaderboard'>('directory');
  const [credentials, setCredentials] = useState<any>(null);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getToken = () => localStorage.getItem('abdi_adama_token') || '';

  const fetchData = async () => {
    try {
      const res = await fetch(`${API}/api/teachers`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setTeachers(await res.json());
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const [sections, setSections] = useState<any[]>([]);

  useState(() => { 
    fetchData(); 
    fetchSections();
  });

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API}/api/academic/sections`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setSections(await res.json());
    } catch (err) {
      console.error('Fetch sections error:', err);
    }
  };


  if (viewingSchedule) {
    const teacher = mockTeachers.find(t => t.id === viewingSchedule);
    const schedule = mockSchedules[viewingSchedule as keyof typeof mockSchedules] || [];

    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewingSchedule(null)}
          className="text-blue-600 hover:underline font-medium"
        >
          ← Back to Teachers List
        </button>
        <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-6">Schedule for {teacher?.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.length > 0 ? (
              schedule.map((slot, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <p className="text-blue-600 font-bold text-sm mb-1">{slot.day}</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{slot.time}</p>
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-slate-500">Class: {slot.class}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{slot.subject}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic">No schedule set for this teacher yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const toggleInClass = (id: string) => {
    setTeachers(prev => prev.map(t =>
      t.id === id ? { ...t, isInClass: !t.isInClass } : t
    ));
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingTeacher) return;
    
    try {
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}` 
      };

      // 1. Assign Room Teacher
      if (promotingTeacher.isRoomTeacher && promotingTeacher.assignedRoomSectionId) {
        await fetch(`${API}/api/teachers/${promotingTeacher.id}/assign-room`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ section_id: promotingTeacher.assignedRoomSectionId })
        });
      }

      // 2. Assign Examiner
      if (promotingTeacher.isExaminer) {
        await fetch(`${API}/api/teachers/${promotingTeacher.id}/assign-examiner`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            exam_title: promotingTeacher.examTitle,
            exam_date: promotingTeacher.examDate,
            assigned_class: promotingTeacher.assignedExamClass
          })
        });
      }

      // 3. Assign Department Head
      if (promotingTeacher.isDeptHead) {
        await fetch(`${API}/api/teachers/${promotingTeacher.id}/assign-dept-head`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ department_name: promotingTeacher.deptSubject })
        });
      }

      setPromotingTeacher(null);
      fetchData();
      alert('Teacher roles updated successfully');
    } catch (err: any) {
      alert('Failed to update teacher roles');
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const payload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      branch_id: formData.get('branch_id') as string,
      subjects: (formData.get('subjects') as string).split(',').map(s => s.trim()),
      department: formData.get('department') as string,
      experience: formData.get('experience') as string,
      bio: formData.get('bio') as string,
      age: formData.get('age') as string,
      sex: formData.get('sex') as string,
      emergency_contact: formData.get('emergency_contact') as string,
      background_details: formData.get('background_details') as string
    };

    try {
      const res = await fetch(`${API}/api/teachers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCredentials(data.credentials);
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create teacher');
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 w-full md:w-fit text-sm md:text-base shadow-lg shadow-blue-200 dark:shadow-none"
        >
          <UserPlus size={20} />
          <span>Register New Teacher</span>
        </button>

        <div className="flex items-center gap-3">
          {(isVP || isAdmin) && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner mr-2">
              <button
                onClick={() => setViewMode('directory')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'directory' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Directory
              </button>
              <button
                onClick={() => setViewMode('leaderboard')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'leaderboard' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                Leaderboard
              </button>
            </div>
          )}
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search teachers..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
            <Filter size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {viewMode === 'directory' ? (
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Teacher Information</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Specializations</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Schedule</th>
                {!isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Live Status</th>}
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-300">
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      if (isAdmin || isVP) {
                        setViewingProfile({ ...teacher });
                      }
                    }}
                    className={`flex items-center gap-3 text-left group/profile ${(isAdmin || isVP) ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center text-purple-700 dark:text-purple-400 font-black text-lg shadow-inner transition-all group-hover/profile:scale-110 group-hover/profile:rotate-3`}>
                      {teacher.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                    </div>
                    <div>
                      <p className={`text-sm font-black text-slate-800 dark:text-white transition-colors group-hover/profile:text-blue-600 dark:group-hover/profile:text-blue-400`}>{teacher.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{teacher.digital_id}</p>
                        {teacher.is_room_teacher && (
                          <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-emerald-200/50 dark:border-emerald-800/50">Room Teacher ({teacher.room_grade_level} {teacher.room_section_name})</span>
                        )}
                        {teacher.is_examiner && (
                          <span className="text-[8px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-blue-200/50 dark:border-blue-800/50">Examiner</span>
                        )}
                      </div>
                    </div>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjects.map((s: string) => (
                      <span key={s} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wide border border-slate-200 dark:border-slate-700/50">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setViewingSchedule(teacher.id)}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 group/btn"
                  >
                    <Calendar size={14} className="group-hover:scale-110 transition-transform" />
                    Full Schedule
                  </button>
                </td>
                {!isAdmin && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleInClass(teacher.id)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        teacher.isInClass
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {teacher.isInClass ? <DoorOpen size={14} /> : <DoorClosed size={14} />}
                      <span>{teacher.isInClass ? 'IN CLASS' : 'OUT'}</span>
                    </button>
                  </td>
                )}

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setPromotingTeacher({ ...teacher })}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
                        title="Promote Teacher"
                      >
                        <Award size={14} />
                        <span className="hidden sm:inline">Promote</span>
                      </button>
                    )}
                    <button className="p-2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Teacher Leaderboard</h2>
                <p className="text-amber-100 font-medium">Monthly performance and reward points tracking.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                <Trophy size={32} className="text-amber-200" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Current Top Scorer</p>
                  <p className="text-lg font-bold">
                    {teachers.slice().sort((a, b) => (b.points || 0) - (a.points || 0))[0]?.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none">
              <Award size={250} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Rank</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Teacher</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {teachers.slice().sort((a, b) => (b.points || 0) - (a.points || 0)).map((teacher, index) => (
                  <tr key={teacher.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-300">
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {index === 0 && <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black border border-amber-200"><Trophy size={14} /></div>}
                        {index === 1 && <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black border border-slate-200"><Medal size={14} /></div>}
                        {index === 2 && <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black border border-orange-200"><Medal size={14} /></div>}
                        {index > 2 && <span className="text-slate-400 font-black text-lg">#{index + 1}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-xl flex items-center justify-center text-purple-700 dark:text-purple-400 font-black text-sm">
                          {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{teacher.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                      {teacher.department}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-black border border-emerald-100 dark:border-emerald-800/50">
                        {teacher.points ? teacher.points.toLocaleString() : 0} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {promotingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Teacher Promotion</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{promotingTeacher.name}</p>
                </div>
              </div>
              <button onClick={() => setPromotingTeacher(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-6 overflow-y-auto custom-scrollbar" onSubmit={handlePromote}>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Room Teacher</p>
                      <p className="text-[10px] text-slate-500">Assign as a primary class manager</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromotingTeacher({ ...promotingTeacher, isRoomTeacher: !promotingTeacher.isRoomTeacher })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${promotingTeacher.isRoomTeacher ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${promotingTeacher.isRoomTeacher ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {promotingTeacher.isRoomTeacher && (
                    <div className="space-y-1 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Class (Section)</label>
                      <select
                        required
                        value={promotingTeacher.assignedRoomSectionId || ''}
                        onChange={(e) => setPromotingTeacher({ ...promotingTeacher, assignedRoomSectionId: e.target.value })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      >
                        <option value="">Select a section...</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.grade_level} - {s.section_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Examiner Status</p>
                      <p className="text-[10px] text-slate-500">Designate as an official examiner</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromotingTeacher({ ...promotingTeacher, isExaminer: !promotingTeacher.isExaminer })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${promotingTeacher.isExaminer ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${promotingTeacher.isExaminer ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {promotingTeacher.isExaminer && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Exam Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mid-term Exam"
                          value={promotingTeacher.examTitle || ''}
                          onChange={(e) => setPromotingTeacher({ ...promotingTeacher, examTitle: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Exam Date</label>
                        <input
                          type="date"
                          required
                          value={promotingTeacher.examDate || ''}
                          onChange={(e) => setPromotingTeacher({ ...promotingTeacher, examDate: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Exam Class</label>
                        <select
                          required
                          value={promotingTeacher.assignedExamClass || ''}
                          onChange={(e) => setPromotingTeacher({ ...promotingTeacher, assignedExamClass: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Select a class...</option>
                          {mockClasses.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Department Head</p>
                      <p className="text-[10px] text-slate-500">Lead academic departments</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromotingTeacher({ ...promotingTeacher, isDeptHead: !promotingTeacher.isDeptHead })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${promotingTeacher.isDeptHead ? 'bg-purple-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${promotingTeacher.isDeptHead ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {promotingTeacher.isDeptHead && (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Department Subject</label>
                        <select
                          required
                          value={promotingTeacher.deptSubject || ''}
                          onChange={(e) => setPromotingTeacher({ ...promotingTeacher, deptSubject: e.target.value })}
                          className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        >
                          <option value="">Select a subject...</option>
                          {Array.from(new Set(mockTeachers.flatMap(t => t.subjects))).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Grade Levels</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(grade => (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => {
                                const current = promotingTeacher.assignedGrades || [];
                                const next = current.includes(grade)
                                  ? current.filter((g: string) => g !== grade)
                                  : [...current, grade];
                                setPromotingTeacher({ ...promotingTeacher, assignedGrades: next });
                              }}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                (promotingTeacher.assignedGrades || []).includes(grade)
                                  ? 'bg-purple-600 border-purple-600 text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Teaching Load</p>
                      <p className="text-[10px] text-slate-500">Assign specific grades, sections, and subjects</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const current = promotingTeacher.teachingLoads || [];
                        setPromotingTeacher({ ...promotingTeacher, teachingLoads: [...current, { grade: '', section: '', subject: '' }] });
                      }}
                      className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(promotingTeacher.teachingLoads || []).map((load: any, index: number) => (
                      <div key={index} className="grid grid-cols-3 gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Grade</label>
                          <select
                            required
                            value={load.grade}
                            onChange={(e) => {
                              const next = [...promotingTeacher.teachingLoads];
                              next[index].grade = e.target.value;
                              setPromotingTeacher({ ...promotingTeacher, teachingLoads: next });
                            }}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                          >
                            <option value="">Grade...</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                              <option key={g} value={`Grade ${g}`}>Grade {g}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Section</label>
                          <select
                            required
                            value={load.section}
                            onChange={(e) => {
                              const next = [...promotingTeacher.teachingLoads];
                              next[index].section = e.target.value;
                              setPromotingTeacher({ ...promotingTeacher, teachingLoads: next });
                            }}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                          >
                            <option value="">Sec...</option>
                            {['A', 'B', 'C', 'D'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 relative">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Subject</label>
                          <div className="flex items-center gap-1">
                            <select
                              required
                              value={load.subject}
                              onChange={(e) => {
                                const next = [...promotingTeacher.teachingLoads];
                                next[index].subject = e.target.value;
                                setPromotingTeacher({ ...promotingTeacher, teachingLoads: next });
                              }}
                              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                            >
                              <option value="">Subj...</option>
                              {promotingTeacher.subjects.map((s: string) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const next = promotingTeacher.teachingLoads.filter((_: any, i: number) => i !== index);
                                setPromotingTeacher({ ...promotingTeacher, teachingLoads: next });
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(promotingTeacher.teachingLoads || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">No teaching loads assigned yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPromotingTeacher(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  <span>Confirm Promotion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingProfile && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-2xl h-screen bg-white dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-200">
                  {viewingProfile.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    Teacher Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{viewingProfile.digital_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingProfile(null)}
                  className="p-3 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 rounded-2xl shadow-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input
                      type="text"
                      readOnly
                      value={viewingProfile.name}
                      className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-transparent border-transparent cursor-default"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                    <input
                      type="text"
                      readOnly
                      value={viewingProfile.department}
                      className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-transparent border-transparent cursor-default"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hire Date</label>
                    <input
                      type="date"
                      readOnly
                      value={viewingProfile.hireDate}
                      className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-transparent border-transparent cursor-default"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experience</label>
                    <input
                      type="text"
                      readOnly
                      value={viewingProfile.experience}
                      className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-transparent border-transparent cursor-default"
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap size={16} />
                    Academic Specializations
                 </h4>
                 <div className="flex flex-wrap gap-2">
                    {viewingProfile.subjects.map((s: string, i: number) => (
                       <span key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                          {s}
                       </span>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <BookOpen size={16} />
                     Current Role & Assignments
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {viewingProfile.is_room_teacher && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                           <div>
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Room Teacher</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{viewingProfile.room_grade_level} - {viewingProfile.room_section_name}</p>
                           </div>
                           <DoorOpen size={14} className="text-emerald-500" />
                        </div>
                     )}
                     {viewingProfile.is_examiner && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                           <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Examiner</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Active Status</p>
                           </div>
                           <Medal size={14} className="text-blue-500" />
                        </div>
                     )}
                     {(viewingProfile.exam_assignments || []).map((exam: any, i: number) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 flex justify-between items-center">
                           <div>
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Exam: {exam.exam_title}</p>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{exam.assigned_class} • {new Date(exam.exam_date).toLocaleDateString()}</p>
                           </div>
                           <Calendar size={14} className="text-amber-500" />
                        </div>
                     ))}
                  </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={16} />
                    Background & History
                 </h4>
                 <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingProfile.age || 'N/A'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingProfile.sex || 'N/A'}</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Emergency Contact</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingProfile.emergency_contact || 'No emergency contact provided'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Professional History</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{viewingProfile.background_details || 'No detailed history available'}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={16} />
                    Professional Summary
                 </h4>
                 <textarea
                   readOnly
                   value={viewingProfile.bio}
                   rows={4}
                   className="w-full px-6 py-4 rounded-3xl text-sm font-medium leading-relaxed outline-none bg-slate-50 dark:bg-slate-900/50 border-transparent italic text-slate-600"
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-4">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 shadow-sm">
                       <Mail size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{viewingProfile.email || 'N/A'}</p>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-4">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 shadow-sm">
                       <Phone size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</p>
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-200">+251 911 22 33 44</p>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-4 md:col-span-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 shadow-sm">
                       <MapPin size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Campus</p>
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{viewingProfile.branch} Branch - Ethiopia</p>
                    </div>
                 </div>
              </div>
            </div>


          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Register New Teacher</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4 overflow-y-auto max-h-[70vh]" onSubmit={handleAddTeacher}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input name="name" required type="text" placeholder="e.g. Ato Bekele" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                  <input name="email" type="email" placeholder="email@example.com" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Branch Assignment</label>
                <select name="branch_id" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="a1352e40-f603-45c8-81a8-556bd9a6f9ff">Main Branch</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                  <input name="department" required type="text" placeholder="e.g. STEM" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Degree / Experience</label>
                  <input name="experience" required type="text" placeholder="e.g. Masters in Physics" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subjects (comma separated)</label>
                <input name="subjects" required type="text" placeholder="e.g. Mathematics, Physics" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age</label>
                  <input name="age" type="number" placeholder="e.g. 35" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sex</label>
                  <select name="sex" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Contact</label>
                <input name="emergency_contact" type="text" placeholder="e.g. Spouse: +251..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Background Details (History)</label>
                <textarea name="background_details" rows={2} placeholder="Previous school history, achievements..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Teacher Biography (Short)</label>
                <textarea name="bio" rows={3} placeholder="Tell us about the teacher's background..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed uppercase tracking-tighter">
                  <strong>Digital ID Notice:</strong> A unique Teacher ID and random 6-digit password will be generated automatically.
                </p>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                  <Check size={18} />
                  <span>Finalize Teacher Registration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/40 -rotate-3">
                <Award size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Teacher Registered!</h3>
                <p className="text-slate-500 font-medium">New professional credentials generated.</p>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Official Teacher ID</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-widest">{credentials.teacherUsername}</p>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Temporary Password</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{credentials.tempPassword}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                Please provide these credentials to the teacher. They will be prompted to change their password upon first login.
              </p>

              <button 
                onClick={() => setCredentials(null)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
