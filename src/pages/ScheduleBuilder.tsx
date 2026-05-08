
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

export const ScheduleBuilder = () => {
  const navigate = useNavigate();
  const [numClasses, setNumClasses] = useState(12);
  const [frequencies, setFrequencies] = useState<CourseFrequency[]>([
    { id: '1', subject: 'Mathematics', sessions: '5 sessions/week' }
  ]);

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('15:30');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, number[]>>({});

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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
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
              <div className="flex gap-2">
                {[7, 8, 9].map(n => (
                  <button key={n} className={`flex-1 p-3 rounded-xl font-bold text-sm border transition-all ${n === 8 ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {n}
                  </button>
                ))}
              </div>
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
              <span>Timetable Structure</span>
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
    </div>
    </div>
  );
};
