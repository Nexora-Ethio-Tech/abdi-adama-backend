
import { studentCurrentCourses, studentAcademicHistory } from '../data/mockData';
import { BookOpen, User, CheckCircle2, Circle, AlertCircle, Calendar, GraduationCap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const StudentCourses = () => {
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');
  const [selectedHistory, setSelectedHistory] = useState(studentAcademicHistory[0]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Grades & Courses</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium italic">Track your real-time academic performance across semesters.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-fit">
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'current'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Current Term
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'history'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Academic History
          </button>
        </div>
      </div>

      {viewMode === 'current' ? (
      <div className="grid grid-cols-1 gap-8">
        {studentCurrentCourses.map((course) => (
          <div key={course.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden group hover:border-blue-500/50 transition-all duration-500">
            <div className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{course.name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">{course.code}</span>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-bold">
                        <User size={14} className="text-slate-400" />
                        {course.teacher}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                   <div className="flex items-center justify-between w-full md:w-64 mb-1">
                      <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Course Progress</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{course.progress}%</span>
                   </div>
                   <div className="w-full md:w-64 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000"
                        style={{ width: `${course.progress}%` }}
                      />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <GradeCard title="Quizzes" items={course.grades.quizzes} />
                <GradeCard title="Tests" items={course.grades.tests} />
                <GradeCard title="Assignments" items={course.grades.assignments} />
                <GradeCard title="Midterm" item={course.grades.midterm} single />
                <GradeCard title="Final" item={course.grades.final} single />
              </div>
            </div>
          </div>
        ))}
      </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 dark:shadow-none">
                      <GraduationCap size={28} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">Historical Performance</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Archive of verified results</p>
                   </div>
                </div>

                <div className="relative group min-w-[280px]">
                   <label className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Select Session</label>
                   <select
                     value={studentAcademicHistory.indexOf(selectedHistory)}
                     onChange={(e) => setSelectedHistory(studentAcademicHistory[parseInt(e.target.value)])}
                     className="w-full appearance-none pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                   >
                     {studentAcademicHistory.map((h, i) => (
                        <option key={i} value={i}>
                           {h.year} • {h.semester}
                        </option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" size={20} />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                  { label: 'Academic Year', value: selectedHistory.year, icon: Calendar, color: 'text-blue-600' },
                  { label: 'Term/Semester', value: selectedHistory.semester, icon: BookOpen, color: 'text-purple-600' },
                  { label: 'Semester GPA', value: selectedHistory.gpa, icon: GraduationCap, color: 'text-emerald-600' },
                  { label: 'Verification', value: 'Verified', icon: CheckCircle2, color: 'text-blue-600' },
                ].map((stat, i) => (
                   <div key={i} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-3">
                         <stat.icon size={16} className={stat.color} />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <p className="text-xl font-black text-slate-800 dark:text-white">{stat.value}</p>
                   </div>
                ))}
             </div>

             <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                         <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Subject Name</th>
                         <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Numeric Score</th>
                         <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Letter Grade</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedHistory.courses.map((course, i) => (
                         <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-8 py-5">
                               <p className="font-bold text-slate-800 dark:text-white">{course.name}</p>
                            </td>
                            <td className="px-8 py-5 text-center">
                               <span className="inline-flex items-center px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-black">
                                  {course.score}%
                               </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <span className={`text-xl font-black ${
                                  course.grade.startsWith('A') ? 'text-emerald-600' :
                                  course.grade.startsWith('B') ? 'text-blue-600' : 'text-amber-600'
                               }`}>
                                  {course.grade}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GradeCard = ({ title, items, item, single }: { title: string, items?: any[], item?: any, single?: boolean }) => {
  return (
    <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4 hover:bg-white dark:hover:bg-slate-800 transition-colors duration-300">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      <div className="space-y-3">
        {single ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.score !== null ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-300" />}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
            </div>
            <span className={`text-xs font-black ${item.score !== null ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}>
              {item.score !== null ? `${item.score}/${item.total}` : '---'}
            </span>
          </div>
        ) : (
          items?.map((g, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {g.score !== null ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-300" />}
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{g.name}</span>
              </div>
              <span className={`text-xs font-black ${g.score !== null ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}>
                {g.score !== null ? `${g.score}/${g.total}` : '---'}
              </span>
            </div>
          ))
        )}
      </div>
      {(!single && items?.some(g => g.score === null)) || (single && item.score === null) ? (
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
           <AlertCircle size={10} className="text-amber-500" />
           <span className="text-[9px] font-bold text-amber-600/80 uppercase tracking-tighter">Awaiting Result</span>
        </div>
      ) : null}
    </div>
  );
};
