
import { TrendingUp, Users, GraduationCap, Clock, ShieldCheck, FileText, BarChart3, Bell, CheckCircle2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useState } from 'react';

const SummaryCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none group">
    <div className="flex items-center justify-between mb-4">
      <div className={`${color} p-3 rounded-2xl text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-emerald-500 text-xs font-black bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase tracking-widest">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest">{label}</h3>
    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">{value}</p>
  </div>
);

export const VicePrincipalDashboard = () => {
  const { user } = useUser();
  const [calculating, setCalculating] = useState(false);

  const handleCalculateRanks = () => {
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      alert('Ranking calculation completed successfully across all grades.');
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.15),_transparent_40%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Executive Control Panel</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">VP {user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-lg max-w-2xl font-medium leading-relaxed">
              Your oversight ensures the academic excellence of Abdi Adama. Monitor student progression, validate rankings, and oversee terminal assessments.
            </p>
          </div>
          <div className="flex flex-col gap-3">
             <button
              onClick={handleCalculateRanks}
              disabled={calculating}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group"
            >
              <TrendingUp size={20} className={calculating ? 'animate-spin' : 'group-hover:translate-y-[-2px] transition-transform'} />
              {calculating ? 'Processing Ranks...' : 'Generate Term Rankings'}
            </button>
            <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest">Last Calculation: Today, 09:14 AM</p>
          </div>
        </div>
      </section>

      {/* Academic Integrity Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard icon={GraduationCap} label="Academic Performance" value="84.2%" trend="+2.4%" color="bg-indigo-600" />
        <SummaryCard icon={Users} label="Total Enrollment" value="1,284" color="bg-blue-600" />
        <SummaryCard icon={Clock} label="Avg. Attendance" value="96.1%" trend="+0.8%" color="bg-emerald-600" />
        <SummaryCard icon={ShieldCheck} label="Exam Integrity" value="Verified" color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Vice Principal Tasks */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Academic Oversight</h3>
              <p className="text-sm text-slate-500 font-medium">Critical items requiring VP validation</p>
            </div>
            <BarChart3 size={24} className="text-slate-300" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { title: 'Finalize Grade 10 National Exam Mock Results', status: 'Pending', priority: 'High', color: 'rose' },
              { title: 'Teacher Performance Review - Q3', status: 'In Progress', priority: 'Medium', color: 'indigo' },
              { title: 'Disciplinary Appeals Queue', status: '3 Cases', priority: 'High', color: 'rose' },
              { title: 'Academic Calendar 2026/27 Approval', status: 'Reviewing', priority: 'Low', color: 'emerald' },
            ].map((task, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${task.color}-100 dark:bg-${task.color}-900/20 text-${task.color}-600 dark:text-${task.color}-400 flex items-center justify-center font-black transition-transform group-hover:scale-110`}>
                    {task.priority[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{task.title}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{task.status}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                  <FileText size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-2">
              View All Academic Tasks <TrendingUp size={14} />
            </button>
          </div>
        </div>

        {/* System Health / Activity */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Recent Activity</h3>
            <div className="space-y-6">
              {[
                { action: 'Grades locked by School Admin', time: '12m ago', icon: ShieldCheck, color: 'emerald' },
                { action: 'Exam schedule updated', time: '1h ago', icon: Clock, color: 'blue' },
                { action: 'Teacher notice published', time: '3h ago', icon: Bell, color: 'indigo' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-${activity.color}-100 dark:bg-${activity.color}-900/20 text-${activity.color}-600 flex items-center justify-center shrink-0`}>
                    <activity.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{activity.action}</p>
                    <p className="text-xs text-slate-500 font-medium">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-500/30">
            <h3 className="text-lg font-black mb-4">Academic Motto</h3>
            <p className="text-indigo-100 text-sm italic font-medium leading-relaxed">
              "Excellence is not an act, but a habit. Our mission is to nurture the leaders of tomorrow through rigorous standards and compassionate guidance."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">VP Integrity Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
