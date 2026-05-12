
import { studentCurrentCourses, studentAcademicHistory } from '../data/mockData';
import { BookOpen, User, CheckCircle2, Circle, AlertCircle, Calendar, GraduationCap, ChevronDown, Award, TrendingUp } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const StudentCourses = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'current' | 'history'>(
    searchParams.get('tab') === 'history' ? 'history' : 'current'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') setViewMode('history');
    else if (tab === 'current') setViewMode('current');
  }, [searchParams]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentSemester, setCurrentSemester] = useState('Semester 2');

  // History filters
  const availableYears = useMemo(() => Array.from(new Set(studentAcademicHistory.map(h => h.year))), []);
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);
  const [selectedSemester, setSelectedSemester] = useState('Semester 2');

  const selectedCourse = useMemo(() => 
    studentCurrentCourses.find(c => c.id === selectedCourseId), 
    [selectedCourseId]
  );

  const filteredHistory = useMemo(() => 
    studentAcademicHistory.find(h => h.year === selectedYear && h.semester === selectedSemester),
    [selectedYear, selectedSemester]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academic Records</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium italic">Your official performance and historical grades.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-fit shadow-sm">
          <button
            onClick={() => setViewMode('current')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'current'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Grades & Courses
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
        <div className="space-y-8">
          {/* Course Selection Dropdown */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Course performance</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Select a subject to view detailed marks</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="relative group min-w-[200px]">
                  <label className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Semester</label>
                  <select
                    value={currentSemester}
                    onChange={(e) => setCurrentSemester(e.target.value)}
                    className="w-full appearance-none pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>

                <div className="relative group min-w-[320px]">
                  <label className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Select Subject</label>
                  <select
                    value={selectedCourseId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCourseId(val || null);
                    }}
                    className="w-full appearance-none pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="">Please Select Course</option>
                    {studentCurrentCourses.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Course Details */}
          {selectedCourse ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 border-2 border-blue-100 dark:border-blue-800">
                           <Award size={40} />
                        </div>
                        <div>
                           <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedCourse.name}</h2>
                           <div className="flex flex-wrap items-center gap-4 mt-2">
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                                 <User size={16} className="text-blue-500" />
                                 Instructor: {selectedCourse.teacher}
                              </div>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:block" />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-400">{selectedCourse.code}</span>
                           </div>
                        </div>
                     </div>

                     <div className="w-full md:w-80 space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-xs font-black uppercase text-slate-400 tracking-tighter">Current Progress</span>
                           <span className="text-sm font-black text-blue-600 dark:text-blue-400">{selectedCourse.progress}%</span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800 p-1">
                           <div
                             className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 shadow-sm"
                             style={{ width: `${selectedCourse.progress}%` }}
                           />
                        </div>
                     </div>
                  </div>

                  {/* Marks Table */}
                  <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                     <table className="w-full text-left">
                        <thead className="bg-slate-100/50 dark:bg-slate-800/50">
                           <tr>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Assessment Type</th>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Weight</th>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {[
                             { id: 'quiz_1', label: 'Quiz 1', score: selectedCourse.grades.quiz_1, max: selectedCourse.grades.max_scores.quiz_1 },
                             { id: 'quiz_2', label: 'Quiz 2', score: selectedCourse.grades.quiz_2, max: selectedCourse.grades.max_scores.quiz_2 },
                             { id: 'test_1', label: 'Test 1', score: selectedCourse.grades.test_1, max: selectedCourse.grades.max_scores.test_1 },
                             { id: 'test_2', label: 'Test 2', score: selectedCourse.grades.test_2, max: selectedCourse.grades.max_scores.test_2 },
                             { id: 'participation', label: 'Class Participation', score: selectedCourse.grades.participation, max: selectedCourse.grades.max_scores.participation },
                             { id: 'mid_exam', label: 'Mid Exam', score: selectedCourse.grades.mid_exam, max: selectedCourse.grades.max_scores.mid_exam },
                             { id: 'final_exam', label: 'Final Exam', score: selectedCourse.grades.final_exam, max: selectedCourse.grades.max_scores.final_exam },
                           ].map((item) => (
                             <tr key={item.id} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                               <td className="px-8 py-5">
                                 <p className="font-bold text-slate-800 dark:text-white">{item.label}</p>
                               </td>
                               <td className="px-8 py-5 text-center">
                                 <span className="text-xs font-bold text-slate-500 italic">Pending Config</span>
                               </td>
                               <td className="px-8 py-5 text-center">
                                 {item.score !== null ? (
                                   <span className="text-base font-black text-slate-900 dark:text-white">{item.score} <span className="text-xs text-slate-400 font-bold">/ {item.max}</span></span>
                                 ) : (
                                   <span className="text-slate-300 dark:text-slate-700 font-black">---</span>
                                 )}
                               </td>
                               <td className="px-8 py-5 text-right">
                                 {item.score !== null ? (
                                   <div className="flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
                                     <CheckCircle2 size={16} />
                                     Recorded
                                   </div>
                                 ) : (
                                   <div className="flex items-center justify-end gap-2 text-amber-500 font-black text-xs uppercase tracking-widest">
                                     <Circle size={16} />
                                     Awaiting
                                   </div>
                                 )}
                               </td>
                             </tr>
                           ))}
                           {/* Total Row */}
                           <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t-2 border-blue-100 dark:border-blue-900/50">
                              <td className="px-8 py-6">
                                 <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total Performance</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <span className="text-xs font-black text-blue-400 dark:text-blue-600 uppercase tracking-widest">Aggregate</span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                                    {[
                                      selectedCourse.grades.quiz_1, selectedCourse.grades.quiz_2,
                                      selectedCourse.grades.test_1, selectedCourse.grades.test_2,
                                      selectedCourse.grades.participation, selectedCourse.grades.mid_exam,
                                      selectedCourse.grades.final_exam
                                    ].reduce((acc, curr) => acc + (curr || 0), 0)}
                                    <span className="text-xs ml-1 opacity-60">
                                       / {[
                                         selectedCourse.grades.max_scores.quiz_1, selectedCourse.grades.max_scores.quiz_2,
                                         selectedCourse.grades.max_scores.test_1, selectedCourse.grades.max_scores.test_2,
                                         selectedCourse.grades.max_scores.participation, selectedCourse.grades.max_scores.mid_exam,
                                         selectedCourse.grades.max_scores.final_exam
                                       ].reduce((acc, curr) => acc + (curr || 0), 0)}
                                    </span>
                                 </span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                 <div className="inline-flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none">
                                    Calculated
                                 </div>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-slate-100/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-center px-6">
               <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 shadow-sm">
                  <BookOpen size={40} />
               </div>
               <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600">Please select a course to view your grades</h3>
               <p className="text-sm text-slate-400 mt-2 max-w-sm">Use the dropdown above to filter by subject and see your real-time performance metrics.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 dark:shadow-none">
                      <GraduationCap size={28} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academic Archives</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Historical Grade breakdown</p>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                   <div className="relative group flex-1 sm:w-48">
                      <label className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Year</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full appearance-none pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                      >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                   </div>

                   <div className="relative group flex-1 sm:w-48">
                      <label className="absolute -top-2 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Semester</label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full appearance-none pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                      >
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                  { label: 'Academic Year', value: selectedYear, icon: Calendar, color: 'text-blue-600' },
                  { label: 'Term/Semester', value: selectedSemester, icon: BookOpen, color: 'text-purple-600' },
                  { label: 'Semester Percentage', value: filteredHistory?.average || 'N/A', icon: TrendingUp, color: 'text-emerald-600' },
                ].map((stat, i) => (
                   <div key={i} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-3">
                         <stat.icon size={16} className={stat.color} />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <p className="text-xl font-black text-slate-800 dark:text-white">{stat.value}</p>
                   </div>
                ))}
             </div>

             {filteredHistory ? (
               <div className="overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                           <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Subject Name</th>
                           <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Numeric Score</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredHistory.courses.map((course, i) => (
                           <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-8 py-5">
                                 <p className="font-bold text-slate-800 dark:text-white">{course.name}</p>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <span className="inline-flex items-center px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-black">
                                    {course.score}%
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             ) : (
               <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                  <p className="text-slate-400 font-bold">No records found for this year and semester.</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
