
import { studentAcademicHistory } from '../data/mockData';
import { Award, Calendar, ChevronRight, TrendingUp } from 'lucide-react';

export const AcademicHistory = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Academic History</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Review your previous courses, semesters, and overall GPA trends.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
              <TrendingUp className="text-emerald-600" size={24} />
              <div>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cumulative GPA</p>
                 <p className="text-xl font-black text-emerald-900 dark:text-emerald-100">3.74</p>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-12">
        {studentAcademicHistory.map((session, sIdx) => (
          <div key={sIdx} className="relative">
            {sIdx !== studentAcademicHistory.length - 1 && (
              <div className="absolute left-[31px] top-20 bottom-0 w-1 bg-gradient-to-b from-blue-100 to-transparent dark:from-slate-800 -z-10" />
            )}

            <div className="flex items-start gap-8">
               <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-none shrink-0 outline outline-4 outline-white dark:outline-slate-950">
                  <Calendar size={28} />
               </div>

               <div className="flex-1 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{session.year}</h2>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">{session.semester}</span>
                     </div>
                     <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-slate-700 dark:text-slate-200">
                        <Award size={18} className="text-amber-500" />
                        GPA: {session.gpa}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {session.courses.map((course, cIdx) => (
                      <div key={cIdx} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              < Award size={20} />
                           </div>
                           <span className={`text-lg font-black ${
                              course.grade.startsWith('A') ? 'text-emerald-500' : 'text-blue-500'
                           }`}>{course.grade}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight">{course.name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Score: {course.score}%</p>

                        <button className="mt-4 w-full flex items-center justify-between text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                           View Details
                           <ChevronRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
