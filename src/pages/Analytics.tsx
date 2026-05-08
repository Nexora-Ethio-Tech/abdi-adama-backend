
import {
  TrendingUp,
  Users,
  DollarSign,
  Building2,
  Filter,
  Download,
  AlertCircle,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/useStore';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { exportToCSV } from '../utils/exportUtils';

const trafficColor = (value: number) => {
  if (value >= 90) return { bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Healthy' };
  if (value >= 75) return { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Attention' };
  return { bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', label: 'Critical' };
};

export const Analytics = () => {
  const navigate = useNavigate();
  useStore();

  // Executive "Big Three" data
  const feeCollected = 4350000;
  const feeExpected = 4800000;
  const feePercent = Math.round((feeCollected / feeExpected) * 100);

  const studentAttendance = 94.2;
  const staffAttendance = 97.8;

  const currentStudents = 1284;
  const lastMonthStudents = 1256;
  const enrollmentGrowth = (((currentStudents - lastMonthStudents) / lastMonthStudents) * 100).toFixed(1);

  const feeColor = trafficColor(feePercent);
  const studentAttColor = trafficColor(studentAttendance);

  const branchPerformance = [
    { name: 'Main Branch', collected: '1.8M', expected: '2.0M', percent: 90, students: 450 },
    { name: 'Bole Branch', collected: '1.2M', expected: '1.3M', percent: 92, students: 320 },
    { name: 'Megenagna Branch', collected: '800K', expected: '950K', percent: 84, students: 280 },
    { name: 'Adama Branch', collected: '550K', expected: '850K', percent: 65, students: 234 },
  ];

  const handleExport = () => {
    const dataToExport: any[] = branchPerformance.map(b => ({
      Branch: b.name,
      Collected: b.collected,
      Expected: b.expected,
      Performance: `${b.percent}%`,
      Students: b.students
    }));

    // Add summary row
    dataToExport.push({
      Branch: 'Total Health Summary',
      Collected: `Fee Collected: ${feePercent}%`,
      Expected: `Student Att: ${studentAttendance}%`,
      Performance: `Staff Att: ${staffAttendance}%`,
      Students: `Total Students: ${currentStudents}`
    });

    exportToCSV(dataToExport, 'School_Analytics_Health');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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

      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">School Health at a Glance</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Assess in 10 seconds. Green = Good. Yellow = Attention. Red = Act Now.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest">
            <Filter size={16} />
            This Year
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest active:scale-95"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* The "Big Three" Traffic Light Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial Health */}
        <div className={`${feeColor.bg} ${feeColor.border} border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-xl group`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${feeColor.dot} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${feeColor.text}`}>{feeColor.label}</span>
            </div>
            <DollarSign size={24} className={`${feeColor.text} group-hover:scale-110 transition-transform`} />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Money In</p>
          <h3 className="text-4xl font-black text-slate-800 dark:text-white">{(feeCollected / 1000000).toFixed(1)}M <span className="text-base font-bold text-slate-400">ETB</span></h3>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">Collection Rate</span>
              <span className={feeColor.text}>{feePercent}%</span>
            </div>
            <div className="h-3 bg-white/50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${feePercent >= 90 ? 'bg-emerald-500' : feePercent >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${feePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic tracking-wide">Missing Payments: {((feeExpected - feeCollected) / 1000).toFixed(0)}K ETB</p>
          </div>
        </div>

        {/* Daily Pulse */}
        <div className={`${studentAttColor.bg} ${studentAttColor.border} border-2 rounded-[2.5rem] p-8 transition-all hover:shadow-xl group`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${studentAttColor.dot} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${studentAttColor.text}`}>{studentAttColor.label}</span>
            </div>
            <Users size={24} className={`${studentAttColor.text} group-hover:scale-110 transition-transform`} />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Daily Pulse</p>
          <div className="flex items-end gap-6 mt-2">
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Students</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white">{studentAttendance}<span className="text-lg text-slate-400">%</span></h3>
            </div>
            <div className="pb-1 border-l border-slate-200 dark:border-slate-800 pl-6">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-300">{staffAttendance}<span className="text-sm text-slate-400">%</span></h3>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <div className={`flex-1 h-2.5 rounded-full ${studentAttendance >= 90 ? 'bg-emerald-400' : studentAttendance >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`} />
            <div className={`flex-1 h-2.5 rounded-full ${staffAttendance >= 90 ? 'bg-emerald-400' : staffAttendance >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`} />
          </div>
        </div>

        {/* Enrollment */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-900/30 rounded-[2.5rem] p-8 transition-all hover:shadow-xl group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Tracking</span>
            </div>
            <Building2 size={24} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Enrollment</p>
          <h3 className="text-4xl font-black text-slate-800 dark:text-white">{currentStudents.toLocaleString()}</h3>
          <div className="mt-6 flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider ${Number(enrollmentGrowth) >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
              <TrendingUp size={12} />
              {Number(enrollmentGrowth) >= 0 ? '+' : ''}{enrollmentGrowth}%
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">vs last month ({lastMonthStudents})</span>
          </div>
        </div>
      </div>

      {/* Key Takeaways */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/30">
            <Zap size={18} />
          </div>
          <h3 className="font-black text-lg uppercase tracking-tight">Key Takeaway</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Finance Alert</span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              <span className="text-amber-400 font-black">15 students</span> are over 30 days late on payments totaling <span className="font-black">450K ETB</span>.
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Attendance</span>
            </div>
            <p className="text-sm font-medium text-slate-200">
              <span className="text-blue-400 font-black">Grade 11C</span> has the lowest attendance at <span className="font-black">83.3%</span> — requires follow-up.
            </p>
          </div>
        </div>
      </div>

      {/* Simplified Branch Performance */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 transition-all duration-500">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8">Branch Collection Status</h3>
        <div className="space-y-8">
          {branchPerformance.map((branch, i) => {
            const bColor = trafficColor(branch.percent);
            return (
              <div key={i} className="group space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${bColor.dot} shadow-lg ${bColor.dot.replace('bg-', 'shadow-')}`} />
                    <span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{branch.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md ml-2">{branch.students} Students</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{branch.collected} / {branch.expected}</span>
                    <span className={`text-xs font-black ${bColor.text}`}>{branch.percent}%</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${branch.percent >= 90 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : branch.percent >= 75 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'}`}
                    style={{ width: `${branch.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
