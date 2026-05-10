
import { Plus, Trash2, Clock, BookOpen, Users, Search, Save, X, Settings2, LayoutGrid, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockTeachers } from '../data/mockData';
import { Breadcrumbs } from '../components/Breadcrumbs';


interface CourseFrequency {
  id: string;
  subject: string;
  sessions: string;
}

interface GradeCourse {
  id: string;
  grade: string;
  course: string;
  teacher?: string;
  color: string;
}

export const ScheduleBuilder = () => {
  const navigate = useNavigate();
  const [numClasses, setNumClasses] = useState(12);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [frequencies, setFrequencies] = useState<CourseFrequency[]>([
    { id: '1', subject: 'Mathematics', sessions: '5 sessions/week' }
  ]);

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('15:30');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, number[]>>({});
  const [gradeCourses, setGradeCourses] = useState<GradeCourse[]>([
    { id: '1', grade: '10A', course: 'Mathematics', color: 'bg-blue-100' },
    { id: '2', grade: '10A', course: 'English', color: 'bg-purple-100' },
    { id: '3', grade: '9B', course: 'Mathematics', color: 'bg-blue-100' },
    { id: '4', grade: '9B', course: 'Science', color: 'bg-green-100' },
  ]);
  const [showGeneratedSchedule, setShowGeneratedSchedule] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const filteredTeachers = mockTeachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUnavailability = (day: string, period: number) => {
    if (!selectedTeacher) return;
    const key = `${selectedTeacher.id}-${day}`;
    const current = teacherConstraints[key] || [];
    const updated = current.includes(period)
      ? current.filter(p => p !== period)
      : [...current, period];
    setTeacherConstraints({ ...teacherConstraints, [key]: updated });
  };


  const addFrequency = () => {
    setFrequencies([...frequencies, { id: Date.now().toString(), subject: '', sessions: '5 sessions/week' }]);
  };

  const removeFrequency = (id: string) => {
    setFrequencies(frequencies.filter(f => f.id !== id));
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

    <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b dark:border-slate-800 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Schedule Architect</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 uppercase font-bold tracking-widest">Ethiopian High School Standards</p>
        </div>
        <button 
          onClick={() => setShowGeneratedSchedule(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
          Generate Timetable
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Global Capacity */}
        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30 space-y-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
            <LayoutGrid size={18} />
            <span>School Capacity</span>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Total Classes / Sections</label>
            <input
              type="number"
              className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/50 rounded-2xl text-xl font-black outline-none focus:ring-4 focus:ring-blue-500/20 dark:text-white"
              value={numClasses}
              onChange={(e) => setNumClasses(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* School Hours */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest">
            <Clock size={18} />
            <span>School Day Parameters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">Start Time</label>
              <input
                type="time"
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase">End Time</label>
              <input
                type="time"
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase">Periods per Day</label>
              <input
                type="number"
                min="1"
                max="12"
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={periodsPerDay}
                onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 8)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Unavailability Section */}
      <div className="p-8 bg-rose-50/30 dark:bg-rose-900/10 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 space-y-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest">
              <Users size={18} />
              <span>Teacher Constraints</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Individual Unavailability</h3>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search teacher..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 relative z-10">
          {/* Teacher List */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-3xl border border-white dark:border-slate-700 p-2 max-h-[400px] overflow-y-auto">
            {filteredTeachers.map(teacher => (
              <button
                key={teacher.id}
                onClick={() => setSelectedTeacher(teacher)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedTeacher?.id === teacher.id ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedTeacher?.id === teacher.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-900'}`}>
                  {teacher.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{teacher.name}</p>
                  <p className={`text-[10px] uppercase tracking-tighter font-black ${selectedTeacher?.id === teacher.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {teacher.subjects.join(' • ')}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Unavailability Grid */}
          <div className="xl:col-span-3">
            {selectedTeacher ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-rose-100 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-slate-800 dark:text-white">{selectedTeacher.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Weekly Session Blocking</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all">
                    <Save size={16} /> Save Constraints
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[600px] grid grid-cols-[100px_repeat(8,1fr)] gap-2">
                    <div />
                    {periods.map(p => (
                      <div key={p} className="text-center text-[10px] font-black text-slate-400 uppercase pb-2">Period {p}</div>
                    ))}

                    {days.map(day => (
                      <>
                        <div key={day} className="flex items-center text-xs font-black text-slate-600 dark:text-slate-400 uppercase">{day}</div>
                        {periods.map(period => {
                          const isBlocked = teacherConstraints[`${selectedTeacher.id}-${day}`]?.includes(period);
                          return (
                            <button
                              key={`${day}-${period}`}
                              onClick={() => toggleUnavailability(day, period)}
                              className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center font-black text-sm ${
                                isBlocked
                                ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-blue-400'
                              }`}
                            >
                              {isBlocked ? <X size={16} /> : period}
                            </button>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-4 border-dashed border-rose-100 dark:border-rose-900/20 rounded-3xl p-12 text-center bg-white/30 dark:bg-slate-900/30">
                <Users className="text-rose-200 dark:text-rose-900/30 mb-4" size={64} />
                <h4 className="text-xl font-black text-slate-400">No Teacher Selected</h4>
                <p className="text-sm text-slate-400 max-w-xs mt-2 font-medium">Choose a teacher from the list to configure their weekly unavailability sessions.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grade Courses Configuration */}
      <div className="p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 dark:indigo-400 font-black text-xs uppercase tracking-widest">
            <BookOpen size={18} />
            <span>Academic Configuration (Grade-Course Mapping)</span>
          </div>
          <button onClick={() => {
            const newId = Date.now().toString();
            setGradeCourses([...gradeCourses, { id: newId, grade: '10A', course: 'Mathematics', color: 'bg-blue-100' }]);
          }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase shadow-lg shadow-indigo-500/20">
            <Plus size={16} />
            Add Mapping
          </button>
        </div>
        <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mb-4">Current Assignments</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {gradeCourses.map((gc) => (
              <div key={gc.id} className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:border-indigo-300 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {gc.grade || 'No Grade'}
                  </span>
                  <button onClick={() => setGradeCourses(gradeCourses.filter(g => g.id !== gc.id))} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Grade/Section</label>
                    <select 
                      value={gc.grade}
                      onChange={(e) => setGradeCourses(gradeCourses.map(g => g.id === gc.id ? {...g, grade: e.target.value} : g))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none dark:text-white"
                    >
                      {['9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'].map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Course Subject</label>
                    <select 
                      value={gc.course}
                      onChange={(e) => setGradeCourses(gradeCourses.map(g => g.id === gc.id ? {...g, course: e.target.value} : g))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none dark:text-white"
                    >
                      {['Mathematics', 'English', 'Amharic', 'Oromic', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'Economics', 'IT', 'PE'].map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Assigned Teacher</label>
                  <select
                    value={gc.teacher || ''}
                    onChange={(e) => setGradeCourses(gradeCourses.map(g => g.id === gc.id ? {...g, teacher: e.target.value} : g))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold outline-none dark:text-white"
                  >
                    <option value="">Select Teacher</option>
                    {mockTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ethiopian Specific Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-amber-50/50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30 space-y-6">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest">
            <Settings2 size={18} />
            <span>Pedagogical Logic</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
              <div>
                <p className="font-black text-slate-800 dark:text-white text-sm">Max Consecutive Periods</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Prevents teacher fatigue</p>
              </div>
              <select className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl font-black text-sm border-none dark:text-white outline-none">
                <option>2 Periods</option>
                <option>3 Periods</option>
                <option>4 Periods</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
              <div>
                <p className="font-black text-slate-800 dark:text-white text-sm">Subject Distribution</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Even spread across week</p>
              </div>
              <div className="flex h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded-full p-1 relative">
                <div className="absolute right-1 w-6 h-6 bg-amber-500 rounded-full shadow-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Breaks & Frequencies */}
        <div className="p-8 bg-purple-50/50 dark:bg-purple-900/10 rounded-[2.5rem] border border-purple-100 dark:border-purple-900/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest">
              <BookOpen size={18} />
              <span>Standard Session Frequencies</span>
            </div>
            <button onClick={addFrequency} className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl hover:scale-110 transition-transform">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
            {frequencies.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/30 rounded-2xl shadow-sm">
                <input type="text" className="bg-transparent text-sm font-black outline-none w-1/2 dark:text-white" defaultValue={f.subject} />
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{f.sessions}</span>
                  <button onClick={() => removeFrequency(f.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Schedule Display */}
      {showGeneratedSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="max-w-full min-h-screen flex items-start justify-center pt-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-7xl">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-[2.5rem]">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Generated Timetable Schedule</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Ethiopian High School Standard Format</p>
                </div>
                <button
                  onClick={() => setShowGeneratedSchedule(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-12 max-h-[80vh] overflow-y-auto">
                {/* Dynamically get distinct grades from gradeCourses */}
                {Array.from(new Set(gradeCourses.map(gc => gc.grade))).map((gradeId) => (
                  <div key={gradeId} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-indigo-100 dark:border-indigo-900/30">
                      <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg">
                        GRADE {gradeId}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Section Timetable</span>
                    </div>
                    
                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-center text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80">
                            <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest border-r border-slate-100 dark:border-slate-800">Period</th>
                            {days.map(day => (
                              <th key={day} className="px-6 py-4 font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: periodsPerDay }).map((_, periodIdx) => {
                            // Filter courses assigned to this grade
                            const assignedGradeCourses = gradeCourses.filter(gc => gc.grade === gradeId);
                            
                            return (
                              <tr key={periodIdx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 text-xs border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
                                  P{periodIdx + 1}
                                </td>
                                {days.map((day) => {
                                  // Pick a course for this slot (deterministic dummy logic)
                                  const courseCount = assignedGradeCourses.length;
                                  if (courseCount === 0) return <td key={day} className="px-4 py-3"><div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" /></td>;
                                  
                                  const gcIdx = (periodIdx + day.length + gradeId.charCodeAt(0)) % courseCount;
                                  const assignedGC = assignedGradeCourses[gcIdx];
                                  const assignedTeacher = mockTeachers.find(t => t.id === assignedGC.teacher);
                                  
                                  const colors = [
                                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/50',
                                    'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50',
                                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/50',
                                    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/50',
                                    'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800/50'
                                  ];
                                  const colorClass = colors[gcIdx % colors.length];

                                  return (
                                    <td key={day} className="px-2 py-2">
                                      <div className={`${colorClass} p-3 rounded-2xl border flex flex-col items-center justify-center min-h-[70px] shadow-sm transition-transform hover:scale-[1.02]`}>
                                        <div className="font-black text-[10px] uppercase tracking-tight leading-tight mb-1">{assignedGC.course}</div>
                                        <div className="text-[9px] font-bold opacity-60 flex items-center gap-1">
                                          <Users size={10} />
                                          {assignedTeacher ? assignedTeacher.name : 'Unassigned'}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 rounded-b-[2.5rem] flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    <span>Mathematics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span>Science</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
                    <span>Humanities</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGeneratedSchedule(false)}
                    className="px-8 py-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-600 transition-all"
                  >
                    Close
                  </button>
                  <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                    Export Official PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
