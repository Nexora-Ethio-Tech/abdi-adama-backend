import { Plus, Trash2, BookOpen, Users, Search, Save, X, Settings2, LayoutGrid, ArrowLeft, ChevronDown, ChevronRight, GraduationCap, Eye } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockTeachers } from '../data/mockData';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface CourseFrequency { id: string; subject: string; sessions: string; }
interface CourseAssignment { course: string; teacherPerSection: Record<string, string>; }
interface GradeConfig { id: string; gradeNumber: string; sections: string[]; courses: CourseAssignment[]; }

const ALL_SUBJECTS = ['Mathematics','English','Amharic','Afan Oromo','Biology','Chemistry','Physics','History','Geography','Economics','IT','PE','Civics'];

export const ScheduleBuilder = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [frequencies, setFrequencies] = useState<CourseFrequency[]>([{ id: '1', subject: 'Mathematics', sessions: '5 sessions/week' }]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('15:30');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, number[]>>({});
  const [grades, setGrades] = useState<GradeConfig[]>([
    { id: '1', gradeNumber: '9', sections: ['A','B'], courses: [{ course: 'Mathematics', teacherPerSection: {} },{ course: 'English', teacherPerSection: {} }]},
    { id: '2', gradeNumber: '10', sections: ['A','B'], courses: [{ course: 'Mathematics', teacherPerSection: {} },{ course: 'English', teacherPerSection: {} },{ course: 'Physics', teacherPerSection: {} }]},
  ]);
  const [expandedGrade, setExpandedGrade] = useState<string | null>('1');
  const [configView, setConfigView] = useState<'edit' | 'summary'>('edit');
  const [showGeneratedSchedule, setShowGeneratedSchedule] = useState(false);
  const [addCourseDropdown, setAddCourseDropdown] = useState<string | null>(null);
  const [showAcademicConfig, setShowAcademicConfig] = useState(false);
  const [showTeacherConstraints, setShowTeacherConstraints] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const filteredTeachers = mockTeachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleUnavailability = (day: string, period: number) => {
    if (!selectedTeacher) return;
    const key = `${selectedTeacher.id}-${day}`;
    const current = teacherConstraints[key] || [];
    const updated = current.includes(period) ? current.filter(p => p !== period) : [...current, period];
    setTeacherConstraints({ ...teacherConstraints, [key]: updated });
  };

  const addFrequency = () => setFrequencies([...frequencies, { id: Date.now().toString(), subject: '', sessions: '5 sessions/week' }]);
  const removeFrequency = (id: string) => setFrequencies(frequencies.filter(f => f.id !== id));

  const addGrade = () => {
    const used = grades.map(g => g.gradeNumber);
    const next = ['9','10','11','12','KG','1','2','3','4','5','6','7','8'].find(n => !used.includes(n)) || String(grades.length+1);
    const newG: GradeConfig = { id: Date.now().toString(), gradeNumber: next, sections: ['A'], courses: [] };
    setGrades([...grades, newG]); setExpandedGrade(newG.id);
  };
  const removeGrade = (id: string) => setGrades(grades.filter(g => g.id !== id));
  const addSection = (gId: string) => {
    setGrades(grades.map(g => g.id !== gId ? g : { ...g, sections: [...g.sections, String.fromCharCode(65 + g.sections.length)] }));
  };
  const removeSection = (gId: string, sec: string) => {
    setGrades(grades.map(g => {
      if (g.id !== gId) return g;
      return { ...g, sections: g.sections.filter(s => s !== sec), courses: g.courses.map(c => { const tps = { ...c.teacherPerSection }; delete tps[sec]; return { ...c, teacherPerSection: tps }; }) };
    }));
  };
  const addCourseToGrade = (gId: string, course: string) => {
    setGrades(grades.map(g => { if (g.id !== gId || g.courses.some(c => c.course === course)) return g; return { ...g, courses: [...g.courses, { course, teacherPerSection: {} }] }; }));
    setAddCourseDropdown(null);
  };
  const removeCourseFromGrade = (gId: string, course: string) => {
    setGrades(grades.map(g => g.id !== gId ? g : { ...g, courses: g.courses.filter(c => c.course !== course) }));
  };
  const assignTeacher = (gId: string, course: string, section: string, teacherId: string) => {
    setGrades(grades.map(g => { if (g.id !== gId) return g; return { ...g, courses: g.courses.map(c => c.course !== course ? c : { ...c, teacherPerSection: { ...c.teacherPerSection, [section]: teacherId } }) }; }));
  };

  const getAllSectionCourses = () => {
    const result: { label: string; courses: { course: string; teacherId?: string }[] }[] = [];
    grades.forEach(g => g.sections.forEach(sec => {
      result.push({ label: `${g.gradeNumber}${sec}`, courses: g.courses.map(c => ({ course: c.course, teacherId: c.teacherPerSection[sec] })) });
    }));
    return result;
  };

  const totalSections = grades.reduce((s, g) => s + g.sections.length, 0);
  const totalCourseSlots = grades.reduce((s, g) => s + g.courses.length * g.sections.length, 0);
  const assignedCount = grades.reduce((s, g) => s + g.courses.reduce((s2, c) => s2 + Object.keys(c.teacherPerSection).length, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={14} /> {t('registration.back')}
        </button>
      </div>

    <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b dark:border-slate-800 pb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('schedule.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 uppercase font-bold tracking-widest">{t('schedule.subtitle')}</p>
        </div>
        <button onClick={() => setShowGeneratedSchedule(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95">
          {t('schedule.generateBtn')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">{t('schedule.startTime')}</label>
          <input type="time" className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">{t('schedule.endTime')}</label>
          <input type="time" className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">{t('schedule.periodsPerDay')}</label>
          <input type="number" min="1" max="12" className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={periodsPerDay} onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 8)} />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1 text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] font-black text-blue-600/60 dark:text-blue-400 uppercase tracking-tighter">{t('schedule.stats.sections')}</p>
            <p className="text-lg font-black text-blue-700 dark:text-blue-300">{totalSections}</p>
          </div>
          <div className="flex-[2] text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[10px] font-black text-emerald-600/60 dark:text-emerald-400 uppercase tracking-tighter">{t('schedule.stats.teachersAssigned')}</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{assignedCount}/{totalCourseSlots}</p>
          </div>
        </div>
      </div>

      {/* ═══════ ACADEMIC CONFIGURATION ═══════ */}
      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 overflow-hidden transition-all">
        <button onClick={() => setShowAcademicConfig(!showAcademicConfig)} className="w-full flex items-center justify-between p-8 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl"><GraduationCap size={22} /></div>
            <div className="text-left">
              <p className="font-black text-slate-800 dark:text-white text-lg">{t('schedule.academicStructure')}</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest">{grades.length} {t('schedule.grade')} • {totalSections} {t('schedule.sections')} • {assignedCount}/{totalCourseSlots} {t('schedule.stats.teachersAssigned')}</p>
            </div>
          </div>
          {showAcademicConfig ? <ChevronDown size={20} className="text-indigo-400" /> : <ChevronRight size={20} className="text-indigo-400" />}
        </button>
        {showAcademicConfig && <div className="px-8 pb-8 space-y-6 border-t border-indigo-100 dark:border-indigo-900/30 pt-6">
        <div className="flex items-center justify-end gap-2">
            <button onClick={() => setConfigView(configView === 'edit' ? 'summary' : 'edit')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
              <Eye size={14} /> {configView === 'edit' ? t('schedule.viewSummary') : t('schedule.backToEdit')}
            </button>
            <button onClick={addGrade} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase shadow-lg shadow-indigo-500/20">
              <Plus size={16} /> {t('schedule.addGrade')}
            </button>
          </div>

        {configView === 'edit' ? (
          <div className="space-y-3">
            {grades.map(g => {
              const isExpanded = expandedGrade === g.id;
              const availableSubjects = ALL_SUBJECTS.filter(s => !g.courses.some(c => c.course === s));
              return (
                <div key={g.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button onClick={() => setExpandedGrade(isExpanded ? null : g.id)} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">{g.gradeNumber}</div>
                      <div className="text-left">
                        <h4 className="font-black text-slate-800 dark:text-white">{t('schedule.grade')} {g.gradeNumber}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.sections.length} {t('schedule.sections')} • {g.courses.length} {t('schedule.courses')}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={20} className="text-slate-300" /> : <ChevronRight size={20} className="text-slate-300" />}
                  </button>

                  {isExpanded && (
                    <div className="p-8 border-t border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('schedule.sections')} :</span>
                        {g.sections.map(sec => (
                          <div key={sec} className="group relative">
                            <div className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-sm shadow-sm">{g.gradeNumber}{sec}</div>
                            <button onClick={() => removeSection(g.id, sec)} className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X size={10} /></button>
                          </div>
                        ))}
                        <button onClick={() => addSection(g.id)} className="p-2 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 rounded-xl transition-all"><Plus size={16} /></button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">{t('schedule.teacherAssignment')}</h5>
                          <div className="relative">
                            <button onClick={() => setAddCourseDropdown(addCourseDropdown === g.id ? null : g.id)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-xs uppercase hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-900/30"><Plus size={14} /> {t('schedule.addCourse')}</button>
                            {addCourseDropdown === g.id && (
                              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-30 py-2 max-h-60 overflow-y-auto">
                                {availableSubjects.map(s => <button key={s} onClick={() => addCourseToGrade(g.id, s)} className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white">{s}</button>)}
                              </div>
                            )}
                          </div>
                        </div>
                        {g.courses.length === 0 ? (
                          <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl"><p className="text-xs font-bold text-slate-400 uppercase">{t('schedule.noCourses')}</p></div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left text-xs">
                              <thead><tr className="bg-slate-50 dark:bg-slate-800/80"><th className="px-4 py-3 font-black text-slate-400 uppercase">{t('schedule.subject')}</th>{g.sections.map(s => <th key={s} className="px-4 py-3 font-black text-slate-400 uppercase text-center">{g.gradeNumber}{s}</th>)}<th className="w-10" /></tr></thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {g.courses.map(c => (
                                  <tr key={c.course} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{c.course}</td>
                                    {g.sections.map(sec => (
                                      <td key={sec} className="px-3 py-2">
                                        <select value={c.teacherPerSection[sec] || ''} onChange={e => assignTeacher(g.id, c.course, sec, e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-[11px] font-bold outline-none dark:text-white">
                                          <option value="">-- {t('schedule.unassigned')} --</option>
                                          {mockTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                      </td>
                                    ))}
                                    <td className="px-2 py-2">
                                      <button onClick={() => removeCourseFromGrade(g.id, c.course)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button onClick={() => removeGrade(g.id)} className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-xs font-black uppercase transition-all"><Trash2 size={14} /> {t('schedule.removeGrade')} {g.gradeNumber}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {grades.length === 0 && <div className="text-center py-12 text-slate-400 font-bold">{t('schedule.noGrades')}</div>}
          </div>
        ) : (
          /* ═══ SUMMARY VIEW ═══ */
          <div className="space-y-4">
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">{t('schedule.summary.review')}</p>
            {grades.map(g => (
              <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white flex items-center gap-3">
                  <span className="font-black text-lg">{t('schedule.grade')} {g.gradeNumber}</span>
                  <span className="text-indigo-200 text-xs font-bold">({g.sections.map(s => g.gradeNumber + s).join(', ')})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-4 py-2 text-left font-black text-slate-400 uppercase">{t('schedule.subject')}</th>
                      {g.sections.map(s => <th key={s} className="px-4 py-2 text-center font-black text-slate-400 uppercase">{g.gradeNumber}{s}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {g.courses.map(c => (
                        <tr key={c.course}>
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{c.course}</td>
                          {g.sections.map(sec => {
                            const tStr = mockTeachers.find(t => t.id === c.teacherPerSection[sec]);
                            return <td key={sec} className="px-4 py-2 text-center">
                              {tStr ? <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold">{tStr.name}</span> : <span className="text-rose-400 text-[10px] font-bold">{t('schedule.unassigned')}</span>}
                            </td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>}
      </div>

      {/* Teacher Unavailability Section */}
      <div className="bg-rose-50/30 dark:bg-rose-900/10 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 overflow-hidden transition-all">
        <button onClick={() => setShowTeacherConstraints(!showTeacherConstraints)} className="w-full flex items-center justify-between p-8 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl"><Users size={22} /></div>
            <div className="text-left">
              <p className="font-black text-slate-800 dark:text-white text-lg">{t('schedule.constraints.title')}</p>
              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-widest">{t('schedule.constraints.subtitle')} • {mockTeachers.length} {t('nav.teachers')}</p>
            </div>
          </div>
          {showTeacherConstraints ? <ChevronDown size={20} className="text-rose-400" /> : <ChevronRight size={20} className="text-rose-400" />}
        </button>
        {showTeacherConstraints && <div className="px-8 pb-8 space-y-8 border-t border-rose-100 dark:border-rose-900/30 pt-6">
          <div className="flex justify-end">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder={t('schedule.constraints.searchPlaceholder')} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 relative z-10">
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-3xl border border-white dark:border-slate-700 p-2 max-h-[400px] overflow-y-auto">
            {filteredTeachers.map(teacher => (
              <button key={teacher.id} onClick={() => setSelectedTeacher(teacher)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedTeacher?.id === teacher.id ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedTeacher?.id === teacher.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-900'}`}>{teacher.name.charAt(0)}</div>
                <div className="text-left">
                  <p className="font-bold text-sm">{teacher.name}</p>
                  <p className={`text-[10px] uppercase tracking-tighter font-black ${selectedTeacher?.id === teacher.id ? 'text-blue-100' : 'text-slate-400'}`}>{teacher.subjects.join(' • ')}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="xl:col-span-3">
            {selectedTeacher ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-rose-100 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><LayoutGrid size={24} /></div>
                    <div>
                      <h4 className="font-black text-xl text-slate-800 dark:text-white">{selectedTeacher.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('schedule.constraints.weeklyBlocking')}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all"><Save size={16} /> {t('schedule.save') || 'Save'}</button>
                </div>
                <div className="overflow-x-auto">
                  <div className={`min-w-[600px] grid grid-cols-[100px_repeat(${periodsPerDay},1fr)] gap-2`}>
                    <div />
                    {Array.from({length: periodsPerDay}, (_,i) => i+1).map(p => <div key={p} className="text-center text-[10px] font-black text-slate-400 uppercase pb-2">P{p}</div>)}
                    {days.map(day => (
                      <>{/* eslint-disable-next-line react/jsx-key */}
                        <div className="flex items-center text-xs font-black text-slate-600 dark:text-slate-400 uppercase">{day}</div>
                        {Array.from({length: periodsPerDay}, (_,i) => i+1).map(period => {
                          const isBlocked = teacherConstraints[`${selectedTeacher.id}-${day}`]?.includes(period);
                          return <button key={`${day}-${period}`} onClick={() => toggleUnavailability(day, period)} className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center font-black text-sm ${isBlocked ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-blue-400'}`}>{isBlocked ? <X size={16} /> : period}</button>;
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-4 border-dashed border-rose-100 dark:border-rose-900/20 rounded-3xl p-12 text-center bg-white/30 dark:bg-slate-900/30">
                <Users className="text-rose-200 dark:text-rose-900/30 mb-4" size={64} />
                <h4 className="text-xl font-black text-slate-400">{t('schedule.constraints.noTeacher')}</h4>
                <p className="text-sm text-slate-400 max-w-xs mt-2 font-medium">{t('schedule.constraints.noTeacherDesc')}</p>
              </div>
            )}
          </div>
        </div>
        </div>}
      </div>

      {/* Pedagogical + Frequencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-amber-50/50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30 space-y-6">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-widest"><Settings2 size={18} /><span>{t('schedule.constraints.pedagogical')}</span></div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
              <div><p className="font-black text-slate-800 dark:text-white text-sm">{t('schedule.constraints.maxConsecutive')}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{t('schedule.constraints.preventsFatigue')}</p></div>
              <select className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl font-black text-sm border-none dark:text-white outline-none"><option>2 Periods</option><option>3 Periods</option><option>4 Periods</option></select>
            </div>
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
              <div><p className="font-black text-slate-800 dark:text-white text-sm">{t('schedule.constraints.subjectDistribution')}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{t('schedule.constraints.evenSpread')}</p></div>
              <div className="flex h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded-full p-1 relative"><div className="absolute right-1 w-6 h-6 bg-amber-500 rounded-full shadow-md" /></div>
            </div>
          </div>
        </div>
        <div className="p-8 bg-purple-50/50 dark:bg-purple-900/10 rounded-[2.5rem] border border-purple-100 dark:border-purple-900/30 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-widest"><BookOpen size={18} /><span>{t('schedule.constraints.frequencies')}</span></div>
            <button onClick={addFrequency} className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl hover:scale-110 transition-transform"><Plus size={16} /></button>
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
            {frequencies.map(f => (
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

      {/* Generated Schedule Modal */}
      {showGeneratedSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="max-w-full min-h-screen flex items-start justify-center pt-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-7xl">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-[2.5rem]">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('schedule.modal.title')}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{getAllSectionCourses().length} {t('schedule.sections')} • {periodsPerDay} {t('schedule.modal.period')}</p>
                </div>
                <button onClick={() => setShowGeneratedSchedule(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-12 max-h-[80vh] overflow-y-auto">
                {getAllSectionCourses().map(({ label, courses: sectionCourses }) => (
                  <div key={label} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b-2 border-indigo-100 dark:border-indigo-900/30">
                      <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-lg shadow-lg">{t('schedule.grade').toUpperCase()} {label}</div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sectionCourses.length} {t('schedule.courses')}</span>
                    </div>
                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-center text-sm border-collapse">
                        <thead><tr className="bg-slate-50 dark:bg-slate-800/80">
                          <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest border-r border-slate-100 dark:border-slate-800">{t('schedule.modal.period')}</th>
                          {days.map(day => <th key={day} className="px-6 py-4 font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">{day}</th>)}
                        </tr></thead>
                        <tbody>
                          {Array.from({ length: periodsPerDay }).map((_, pIdx) => {
                            const cc = sectionCourses.length;
                            return (
                              <tr key={pIdx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-500 text-xs border-r border-slate-100 dark:border-slate-800 bg-slate-50/30">P{pIdx + 1}</td>
                                {days.map(day => {
                                  if (cc === 0) return <td key={day} className="px-4 py-3"><div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" /></td>;
                                  const idx = (pIdx + day.length + label.charCodeAt(0)) % cc;
                                  const sc = sectionCourses[idx];
                                  const teacher = mockTeachers.find(t => t.id === sc.teacherId);
                                  const colors = ['bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100','bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100','bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100','bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100','bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100'];
                                  return (
                                    <td key={day} className="px-2 py-2">
                                      <div className={`${colors[idx % colors.length]} p-3 rounded-2xl border flex flex-col items-center justify-center min-h-[70px] shadow-sm transition-transform hover:scale-[1.02]`}>
                                        <div className="font-black text-[10px] uppercase tracking-tight leading-tight mb-1">{sc.course}</div>
                                        <div className="text-[9px] font-bold opacity-60 flex items-center gap-1"><Users size={10} />{teacher ? teacher.name : t('schedule.unassigned')}</div>
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
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 rounded-b-[2.5rem] flex gap-3 justify-end">
                <button onClick={() => setShowGeneratedSchedule(false)} className="px-8 py-3 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs uppercase border border-slate-200 dark:border-slate-600 transition-all">{t('login.backToHome')}</button>
                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">{t('schedule.modal.export')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};