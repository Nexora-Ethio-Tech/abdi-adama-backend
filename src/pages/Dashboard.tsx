
import { Users, GraduationCap, Clock, TrendingUp, Lock, Unlock, Megaphone, Plus, X, Bell, Book, BookOpen, AlertTriangle, ShieldAlert, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { mockStudents } from '../data/mockData';
import { Link } from 'react-router-dom';
import { useStore } from '../context/useStore';
import { useTranslation } from 'react-i18next';

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`${color} p-2 md:p-3 rounded-lg text-white`}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      {trend && (
        <span className="text-emerald-500 text-sm font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-bold md:font-medium uppercase md:normal-case tracking-wider md:tracking-normal">{label}</h3>
    <p className="text-xl md:text-2xl font-black md:font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
  </div>
);

export const Dashboard = () => {
  const { role, gradesLocked, setGradesLocked, branches, setSelectedBranch } = useUser();
  const { selectedBranchId, setSelectedBranchId, notices, addNotice, deleteNotice } = useStore();
  const { t } = useTranslation();
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [watchlistExpanded, setWatchlistExpanded] = useState(true);
  const isSuperAdmin = role === 'super-admin';

  const isAdmin = role === 'super-admin' || role === 'school-admin';
  const isVP = role === 'vice-principal';
  const selectedBranch = selectedBranchId ? branches.find((branch) => branch.id === selectedBranchId) || null : null;

  if (role === 'super-admin') {
    const branchHealth = branches.map((branch, index) => ({
      ...branch,
      students: 300 + index * 18,
      teachers: 22 + index,
      attendance: (92.1 + index * 0.7).toFixed(1),
      finance: index % 2 === 0 ? 'Stable' : 'Attention',
      risk: index === 3 ? 'Infrastructure' : index === 1 ? 'Attendance' : 'Normal'
    }));


    if (!selectedBranch) {
      return (
        <div className="space-y-8">
          <section className="bg-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-slate-200/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">{t('dashboard.networkOverview')}</p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{t('dashboard.aggregateTitle')}</h1>
                <p className="text-slate-300 max-w-2xl text-sm md:text-base">
                  {t('dashboard.aggregateDesc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                   <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('dashboard.selectedBranch')}</p>
                   <p className="font-black text-white text-sm">{t('dashboard.none')}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedBranchId(branches[0]?.id || null);
                    setSelectedBranch(branches[0] || null);
                  }}
                  className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
                >
                  {t('dashboard.drillBranch')}
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard icon={Users} label={t('dashboard.totalStudents')} value="1,388" trend="+4.3%" color="bg-blue-600" />
            <StatCard icon={GraduationCap} label={t('dashboard.totalTeachers')} value="104" color="bg-purple-600" />
            <StatCard icon={Clock} label={t('dashboard.networkAttendance')} value="94.6%" trend="+1.1%" color="bg-orange-500" />
            <StatCard icon={TrendingUp} label={t('dashboard.monthlyRevenue')} value="1.8M ETB" color="bg-emerald-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.branchHealth')}</h3>
                  <p className="text-sm text-slate-500">{t('dashboard.aggregateSnapshot')}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{t('dashboard.aggregateOnly')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[780px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('dashboard.branch')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.students')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.teachers')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.attendance')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">{t('dashboard.finance')}</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">{t('dashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchHealth.map((branch) => (
                      <tr key={branch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">{branch.name[0]}</div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{branch.name}</p>
                              <p className="text-xs text-slate-500">{branch.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{branch.students}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{branch.teachers}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{branch.attendance}%</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{branch.finance}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedBranchId(branch.id);
                              setSelectedBranch(branch);
                            }}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${branch.risk === 'Normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {branch.risk}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <section className="bg-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-slate-200/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.24),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-300">{t('dashboard.branchControl')}</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{selectedBranch.name}</h1>
              <p className="text-slate-300 max-w-2xl text-sm md:text-base">
                {t('dashboard.branchDesc')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('dashboard.currentBranch')}</p>
                <p className="font-black text-white text-sm">{selectedBranch.location}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedBranchId(null);
                  setSelectedBranch(null);
                }}
                className="px-4 py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                {t('dashboard.backNetwork')}
              </button>
            </div>
          </div>
        </section>

        {/* Power of Three: Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Users size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.students')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">318</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">+2.1% this term</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl"><GraduationCap size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.teachers')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">24</p>
            <p className="text-xs text-slate-500 font-bold mt-1">6 on exam duty</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Clock size={20} /></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.attendance')}</span>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100">93.8%</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">+0.7% vs last week</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Pending Actions */}
          <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.pendingActions')}</h3>
                <p className="text-xs text-slate-500">{t('dashboard.attentionItems')}</p>
              </div>
              <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black">5 {t('dashboard.items')}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { label: 'VP attendance queue items', count: '4', color: 'bg-rose-500', action: 'Review' },
                { label: 'Finance clerk fee exception', count: '1', color: 'bg-amber-500', action: 'Approve' },
                { label: 'Compliance risks escalated', count: '2', color: 'bg-amber-500', action: 'Inspect' },
                { label: 'Exam unveil requests', count: '3', color: 'bg-blue-500', action: 'Decide' },
                { label: 'Bus route update pending', count: '1', color: 'bg-orange-500', action: 'Confirm' },
              ].map((item) => (
                <div key={item.label} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{item.count}</span>
                  </div>
                  <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Snapshot with Traffic Lights */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.healthCheck')}</h3>
            {[
              { label: 'Finance', value: 'On Track', status: 'green' },
              { label: 'Attendance', value: '93.8%', status: 'green' },
              { label: 'Facilities', value: 'All Green', status: 'green' },
              { label: 'Exams', value: '3 Locked', status: 'yellow' },
              { label: 'Compliance', value: '2 Risks', status: 'yellow' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{item.value}</span>
                  <div className={`w-3 h-3 rounded-full ${item.status === 'green' ? 'bg-emerald-500' : item.status === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Switch Branch</h4>
              <div className="space-y-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setSelectedBranchId(branch.id);
                      setSelectedBranch(branch);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all ${branch.id === selectedBranch.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 border border-transparent hover:border-slate-200'}`}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(role === 'school-admin' || isVP || isSuperAdmin) && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300 ${
          gradesLocked
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              gradesLocked ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
            }`}>
              {gradesLocked ? <Lock size={24} /> : <Unlock size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Grade Insertion is {gradesLocked ? 'LOCKED' : 'OPEN'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {gradesLocked
                  ? 'System is currently performing averages and ranking.'
                  : 'Teachers can currently enter and modify student grades.'}
                {isSuperAdmin && ' (Super Admin: Read-only access)'}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {isVP && (
              <button
                onClick={() => {
                  alert('Calculating Student Ranks for all sections...');
                }}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200 dark:shadow-none"
              >
                <TrendingUp size={18} />
                Calculate Ranks
              </button>
            )}
            {(role === 'school-admin' || isSuperAdmin) && (
              <button
                disabled={isSuperAdmin}
                onClick={() => setGradesLocked(!gradesLocked)}
                className={`w-full sm:w-auto px-6 py-2 rounded-lg font-bold transition-colors ${
                  gradesLocked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {gradesLocked ? 'Open Insertion' : 'Close Insertion'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {role === 'librarian' ? (
          <>
            <StatCard
              icon={Book}
              label="Total Books"
              value="2,450"
              color="bg-blue-600"
            />
            <StatCard
              icon={BookOpen}
              label="Active Loans"
              value="184"
              trend="+12%"
              color="bg-purple-600"
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue Books"
              value="12"
              color="bg-rose-500"
            />
            <StatCard
              icon={Users}
              label="Visitors Today"
              value="42"
              color="bg-emerald-500"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Users}
              label="Total Students"
              value="1,284"
              trend="+4.3%"
              color="bg-blue-600"
            />
            <StatCard
              icon={GraduationCap}
              label="Total Teachers"
              value="76"
              color="bg-purple-600"
            />
            {(isSuperAdmin || role === 'school-admin' || role === 'teacher') && (
              <StatCard
                icon={Clock}
                label="Daily Attendance"
                value="94.2%"
                trend="+1.2%"
                color="bg-orange-500"
              />
            )}
            {(isSuperAdmin || role === 'school-admin' || role === 'finance-clerk') && (
              <StatCard
                icon={TrendingUp}
                label="Monthly Revenue"
                value="450,000 ETB"
                color="bg-emerald-500"
              />
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">School Notice Board</h3>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNoticeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
            >
              <Plus size={14} className="md:w-4 md:h-4" />
              <span className="hidden xs:inline">Post Notice</span>
              <span className="xs:hidden">Post</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {notices.filter(n => !role || !n.audience || n.audience.includes(role)).map((notice) => (
            <div key={notice.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    notice.category === 'Logistics' ? 'bg-amber-100 text-amber-700' :
                    notice.category === 'Finance' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {notice.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    notice.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {notice.priority}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{notice.time}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => deleteNotice(notice.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {notice.expiresAt && <span className="text-[10px] text-rose-400 italic font-medium">Expires: {notice.expiresAt}</span>}
                </div>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{notice.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {notice.content}
              </p>
              {notice.category === 'Logistics' && (notice as any).driverName && (
                <p className="text-[10px] font-bold text-amber-600 mt-2">Posted by: {(notice as any).driverName}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setWatchlistExpanded(!watchlistExpanded)}
                className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 hover:opacity-70 transition-opacity"
              >
                <ShieldAlert size={20} className="text-rose-600" />
                Priority Watchlist
                <div className={`transition-transform duration-300 ${watchlistExpanded ? 'rotate-90' : ''}`}>
                   <ArrowRight size={18} className="text-slate-400" />
                </div>
              </button>
              <Link to="/analytics" className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest">
                Full Report
              </Link>
            </div>
            {watchlistExpanded && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                {mockStudents.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium').slice(0, 4).map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${student.riskLevel === 'High' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">Grade {student.grade} • {student.riskLevel} Risk</p>
                      </div>
                    </div>
                    <Link to={`/students/${student.id}`} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {[
              { text: 'Annual Sports Day event created', time: '2 hours ago', office: 'Admin Office' },
              { text: 'Monthly newsletter sent to parents', time: '5 hours ago', office: 'Communications' },
              { text: 'Staff meeting agenda updated', time: 'Yesterday', office: 'Academic Office' },
              { text: 'Quarterly financial report finalized', time: '2 days ago', office: 'Finance Dept' },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{activity.text}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activity.time} • {activity.office}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Upcoming Events</h3>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">15</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Apr</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Teacher-Parent Conference</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">09:00 AM - 12:00 PM • Main Hall</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNoticeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Post New Notice</h3>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addNotice({
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                priority: formData.get('priority') as any,
                category: formData.get('category') as any,
                expiresAt: formData.get('expiresAt') as string,
                audience: ['super-admin', 'school-admin', 'vice-principal', 'teacher', 'student', 'parent']
              });
              setShowNoticeModal(false);
            }}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Notice Title</label>
                <input name="title" required type="text" placeholder="e.g. Public Holiday Announcement" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                  <select name="category" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Academic">Academic</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Priority</label>
                  <select name="priority" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Content</label>
                <textarea name="content" required rows={4} placeholder="Write the details of the notice here..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                <input name="expiresAt" type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2">
                  <Bell size={18} />
                  <span>Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
