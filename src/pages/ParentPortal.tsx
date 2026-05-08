
import { Calendar, BookOpen, Award, User, History, Megaphone, HeartPulse, Star, ChevronRight, ClipboardList, TrendingUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockCommunicationLogs, commFields, ratingLabels } from '../data/mockData';
import { useTranslation } from 'react-i18next';

export const ParentPortal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [activePortalTab, setActivePortalTab] = useState<'academic' | 'communication'>('academic');

  const academicYears = ['2015', '2016', '2017'];
  const historyData: Record<string, any[]> = {
    '2015': [
      { name: 'Mathematics', teacher: 'Ato Solomon', grades: { mid: '25/30', quiz: '8/10', assignment: '9/10', final: '42/50', total: '84%' } },
      { name: 'Amharic', teacher: 'W/ro Aster', grades: { mid: '28/30', quiz: '9/10', assignment: '10/10', final: '45/50', total: '92%' } },
    ],
    '2016': [
      { name: 'Physics', teacher: 'Ato Solomon', grades: { mid: '22/30', quiz: '7/10', assignment: '8/10', final: '40/50', total: '77%' } },
      { name: 'English', teacher: 'W/ro Aster', grades: { mid: '29/30', quiz: '10/10', assignment: '10/10', final: '48/50', total: '97%' } },
    ]
  };

  const [notices] = useState([
    { id: 1, title: 'Term 3 Exams Schedule', content: 'The final schedule for Term 3 exams has been posted in the academic office.', priority: 'High', time: '1 hour ago' },
    { id: 2, title: 'School Bus Maintenance', content: 'Route B buses will be undergoing maintenance this Friday. Please expect minor delays.', priority: 'Medium', time: 'Yesterday' }
  ]);

  const children = [
    {
      id: '1',
      name: 'Abebe Bikila',
      grade: '10A',
      attendance: '96%',
      performance: 'Excellent',
      courses: [
        { name: 'Mathematics', teacher: 'Ato Solomon', grades: { mid: '28/30', quiz: '9/10', assignment: '10/10', final: 'Not Yet' } },
        { name: 'Physics', teacher: 'Ato Solomon', grades: { mid: '25/30', quiz: '8/10', assignment: '9/10', final: 'Not Yet' } },
        { name: 'English', teacher: 'W/ro Aster', grades: { mid: '29/30', quiz: '10/10', assignment: '10/10', final: 'Not Yet' } },
      ]
    },
    {
      id: '2',
      name: 'Sara Bikila',
      grade: '7B',
      attendance: '94%',
      performance: 'Good',
      courses: [
        { name: 'Biology', teacher: 'W/ro Selam', grades: { mid: '24/30', quiz: '8/10', assignment: '8/10', final: 'Not Yet' } },
        { name: 'Amharic', teacher: 'W/ro Aster', grades: { mid: '27/30', quiz: '9/10', assignment: '10/10', final: 'Not Yet' } },
      ]
    },
  ];

  const CommunicationBook = ({ studentId }: { studentId: string }) => {
    const studentLogs = useMemo(() => {
      return mockCommunicationLogs.filter(log => log.studentId === studentId);
    }, [studentId]);

    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const currentLog = studentLogs[currentLogIndex];

    const getRatingColor = (rating: number) => {
      switch (rating) {
        case 3: return 'bg-emerald-500';
        case 2: return 'bg-blue-500';
        case 1: return 'bg-amber-500';
        case 0: return 'bg-rose-500';
        default: return 'bg-slate-200';
      }
    };

    if (studentLogs.length === 0) {
      return (
        <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
          <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="text-slate-400" size={32} />
          </div>
          <p className="text-slate-500">{t('parentPortal.noLogs')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Star className="text-amber-500" size={24} />
              {t('parentPortal.communicationBook')}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">{t('parentPortal.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl self-start md:self-auto shadow-inner">
            <button
              disabled={currentLogIndex === 0}
              onClick={() => setCurrentLogIndex(prev => prev - 1)}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
               <span className="text-[10px] uppercase font-black text-slate-400">{t('parentPortal.weekEnding')}</span>
               <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{currentLog.weekEnding}</span>
            </div>
            <button
              disabled={currentLogIndex === 0}
              onClick={() => setCurrentLogIndex(prev => prev - 1)}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {commFields.map(field => {
            const rating = (currentLog.ratings as any)[field.id];
            return (
              <div key={field.id} className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl ${getRatingColor(rating)} flex items-center justify-center text-white font-black text-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    {rating + 1}
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{field.label}</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mb-4 min-h-[20px]">{field.description}</p>
                  <span className={`w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${getRatingColor(rating)} text-white shadow-sm`}>
                    {ratingLabels[rating]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 relative overflow-hidden group">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2">
              <ClipboardList size={18} />
              {t('parentPortal.teacherObservation')}
            </h4>
            <p className="text-base text-blue-800 dark:text-blue-300 leading-relaxed italic font-medium relative z-10">
              "{currentLog.teacherNote || "Student has shown consistent engagement this week. Maintain current focus on home assignments for continued progress."}"
            </p>
            <Star size={100} className="absolute -bottom-10 -right-10 text-blue-600/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-2xl shadow-slate-200 dark:shadow-none">
            <div>
              <TrendingUp className="text-blue-400 mb-4" size={32} />
              <h4 className="text-xl font-bold mb-2">{t('parentPortal.progressInsight')}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Consistent "Excellent" ratings in Participation often correlate with higher academic performance in final exams.
              </p>
            </div>
            <button className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-bold text-xs transition-all">
              {t('parentPortal.downloadReport')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (selectedChild) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedChild(null);
              setShowHistory(false);
              setSelectedYear(null);
            }}
            className="text-blue-600 hover:underline flex items-center gap-2 font-medium"
          >
            ← {t('parentPortal.backToChildren')}
          </button>

          <div className="flex gap-2">
            {activePortalTab === 'academic' && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                <History size={18} />
                {showHistory ? t('parentPortal.activeCourses') : t('parentPortal.academicHistory')}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 mb-8">
            <button
              onClick={() => setActivePortalTab('academic')}
              className={`pb-4 px-2 text-sm font-bold transition-all relative ${activePortalTab === 'academic' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t('parentPortal.academicProfile')}
              {activePortalTab === 'academic' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActivePortalTab('communication')}
              className={`pb-4 px-2 text-sm font-bold transition-all relative ${activePortalTab === 'communication' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t('parentPortal.communicationBook')}
              {activePortalTab === 'communication' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 mb-8 text-center sm:text-left">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl md:text-3xl">
              {selectedChild.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{selectedChild.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg">Grade {selectedChild.grade} Student</p>
            </div>
          </div>

          {activePortalTab === 'academic' ? (
            !showHistory ? (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 md:gap-3 text-slate-500 dark:text-slate-400 mb-2">
                    <Calendar size={18} />
                    <span className="text-xs md:text-sm font-medium">{t('parentPortal.attendance')}</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-emerald-600">{selectedChild.attendance}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                    <BookOpen size={18} />
                    <span className="text-sm font-medium">{t('parentPortal.activeCourses')}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{selectedChild.courses.length}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                    <Award size={18} />
                    <span className="text-sm font-medium">{t('parentPortal.academicRank')}</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{selectedChild.performance}</p>
                </div>
              </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Course Progress & Grades</h3>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-sm min-w-[600px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Course</th>
                          <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Mid (30)</th>
                          <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Quiz (10)</th>
                          <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Assig. (10)</th>
                          <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Final (50)</th>
                          <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedChild.courses.map((course: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{course.name}</td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.mid}</td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.quiz}</td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.assignment}</td>
                            <td className="px-4 py-4">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${
                                course.grades.final === 'Not Yet'
                                  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {course.grades.final}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{course.teacher}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('parentPortal.academicHistory')}</h3>
                <div className="flex gap-4">
                  {academicYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-6 py-3 rounded-xl border transition-all ${
                        selectedYear === year
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                      }`}
                    >
                      EC {year}
                    </button>
                  ))}
                </div>

                {selectedYear && historyData[selectedYear] ? (
                  <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-sm min-w-[500px]">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Course</th>
                            <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Mid</th>
                            <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Quiz</th>
                            <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Assig.</th>
                            <th className="px-4 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase">Final</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {historyData[selectedYear].map((course: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{course.name}</td>
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.mid}</td>
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.quiz}</td>
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.assignment}</td>
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{course.grades.final}</td>
                              <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{course.grades.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : selectedYear ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-500">{t('parentPortal.noRecords', { year: selectedYear })}</p>
                  </div>
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="text-slate-400" size={32} />
                    </div>
                    <p className="text-slate-500">{t('parentPortal.selectYear')}</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <CommunicationBook studentId={selectedChild.id} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      {/* Hero Welcome Section - Enhanced Visuals */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 md:p-16 text-white shadow-2xl relative overflow-hidden border border-slate-700/30">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em]">
              {t('parentPortal.title')}
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
              {t('parentPortal.greeting', { name: 'Mr. Bikila' })}
            </h2>
            <p className="text-slate-300 text-lg max-w-lg leading-relaxed font-medium">
              {t('parentPortal.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-8 bg-white/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-6 transition-transform hover:rotate-0 duration-500">
              <User size={40} />
            </div>
            <div>
              <p className="text-lg font-black text-white">{t('parentPortal.familyId')}: #8824</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-xs text-blue-300 font-bold uppercase tracking-widest">{t('parentPortal.verified')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract Background Art */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] -ml-48 -mb-48" />
      </div>

      {/* Primary Navigation: My Children (Promoted to Top) */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
               <Award size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('parentPortal.myChildren')}</h3>
          </div>
          <span className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest">
            {children.length} {t('parentPortal.enrolled')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {children.map((child, i) => (
            <div
              key={i}
              onClick={() => {
                setSelectedChild(child);
                setActivePortalTab('academic');
              }}
              className="group relative cursor-pointer"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] sm:rounded-[3rem] blur-lg opacity-0 group-hover:opacity-20 transition duration-500" />
              <div className="relative bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-3xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{child.name}</h4>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Grade {child.grade}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('parentPortal.attendance')}</p>
                    <p className="text-2xl font-black text-emerald-600">{child.attendance}</p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('parentPortal.academicRank')}</p>
                    <p className="text-2xl font-black text-blue-600">{child.performance}</p>
                  </div>
                </div>

                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 group-hover:text-blue-600 transition-colors">
                  {t('parentPortal.clickToView')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* School Notices - Balanced Layout */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Megaphone className="text-blue-600 dark:text-blue-400" size={24} />
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('parentPortal.announcements')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {notices.map(notice => (
              <div key={notice.id} className="group bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${
                    notice.priority === 'High'
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {notice.priority}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{notice.time}</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-blue-600 transition-colors">{notice.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{notice.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clinic Support - Unified Card */}
        <div className="lg:col-span-4">
          <div
            className="h-full bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer border border-white/5"
            onClick={() => navigate('/clinic-chat')}
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-900/50 group-hover:scale-110 transition-transform">
                  <HeartPulse size={32} />
                </div>
                <h3 className="text-3xl font-black mb-4 leading-tight">{t('parentPortal.clinicSupport').split(' ')[0]}<br />{t('parentPortal.clinicSupport').split(' ')[1]}</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  {t('parentPortal.clinicDesc')}
                </p>
              </div>
              <div className="mt-12">
                <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                   {t('parentPortal.openMedicalChat')}
                </button>
              </div>
            </div>
            {/* Background Decoration */}
            <HeartPulse size={200} className="absolute -bottom-20 -right-20 text-white/5 rotate-12 opacity-50 group-hover:scale-110 group-hover:rotate-0 transition-all duration-1000" />
          </div>
        </div>
      </div>
    </div>
  );
};
