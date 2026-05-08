
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { mockStudents } from '../data/mockData';
import { FileText, Download, ArrowLeft, Search, Filter, Printer, Calculator, Award, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const Transcripts = () => {
  const navigate = useNavigate();
  const { role } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [phase, setPhase] = useState<'Semester 1' | 'Final'>('Semester 1');
  const [calculatedRanks, setCalculatedRanks] = useState<Record<string, { avg: number, overallRank: number, sectionRank: number, totalInSection: number, totalInGrade: number }>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const canManage = role === 'vice-principal' || role === 'super-admin';

  if (!canManage) {
    return <div className="p-8 text-center font-bold text-rose-600">Access Denied</div>;
  }

  const filteredStudents = mockStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
    const matchesGrade = filterGrade === 'all' || s.grade === filterGrade;
    return matchesSearch && matchesGrade;
  });

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const newRanks: Record<string, any> = {};
      
      const studentAvgs = mockStudents.map(s => ({ ...s, avg: +(Math.random() * (99 - 65) + 65).toFixed(1) }));
      
      studentAvgs.forEach(student => {
        const baseGrade = student.grade.replace(/[^0-9]/g, '');
        const section = student.grade;
        
        const gradePeers = studentAvgs.filter(s => s.grade.replace(/[^0-9]/g, '') === baseGrade).sort((a, b) => b.avg - a.avg);
        const sectionPeers = studentAvgs.filter(s => s.grade === section).sort((a, b) => b.avg - a.avg);

        const overallRank = gradePeers.findIndex(s => s.id === student.id) + 1;
        const sectionRank = sectionPeers.findIndex(s => s.id === student.id) + 1;

        newRanks[student.id] = {
          avg: student.avg,
          overallRank,
          sectionRank,
          totalInGrade: gradePeers.length,
          totalInSection: sectionPeers.length
        };
      });

      setCalculatedRanks(newRanks);
      setIsCalculating(false);
    }, 1500);
  };

  const exportCSV = () => {
    if (Object.keys(calculatedRanks).length === 0) {
      alert("Please calculate grades first.");
      return;
    }
    
    const headers = ['Student ID', 'Name', 'Grade', 'Average', 'Section Rank', 'Overall Rank'];
    const rows = filteredStudents.map(s => {
      const data = calculatedRanks[s.id];
      if (!data) return [s.id, s.name, s.grade, 'N/A', 'N/A', 'N/A'];
      return [s.id, s.name, s.grade, `${data.avg}%`, `${data.sectionRank}/${data.totalInSection}`, `${data.overallRank}/${data.totalInGrade}`];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Grade_Report_${filterGrade}_${phase}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">Transcript Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Generate and manage student academic transcripts.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            onClick={() => setPhase('Semester 1')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${phase === 'Semester 1' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            Semester 1
          </button>
          <button
            onClick={() => setPhase('Final')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${phase === 'Final' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            Final Year-End
          </button>
        </div>
      </div>

      {canManage && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">School Closing Process</h3>
              <p className="text-[10px] text-slate-500 font-medium">Compute end-of-year statistics, averages, and generate ranks for students.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {isCalculating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              Calculate Ranks
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 active:scale-95"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm"
          />
        </div>
        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none font-bold text-sm"
          >
            <option value="all">All Grades</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden transition-all duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Information</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Academic Performance</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Batch Rank</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Verification</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">{student.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Grade {student.grade} • ID: {student.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {calculatedRanks[student.id] ? `${calculatedRanks[student.id].avg}%` : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {calculatedRanks[student.id] ? (
                      <div className="flex flex-col gap-1 items-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 uppercase tracking-widest border border-blue-200/50 dark:border-blue-800/30">
                          Sec Rank: #{calculatedRanks[student.id].sectionRank} / {calculatedRanks[student.id].totalInSection}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-widest border border-amber-200/50 dark:border-amber-800/30">
                          OVR Rank: #{calculatedRanks[student.id].overallRank} / {calculatedRanks[student.id].totalInGrade}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not Computed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 ${calculatedRanks[student.id] ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700/50'} text-[10px] font-black uppercase rounded-lg border tracking-widest`}>
                      {calculatedRanks[student.id] ? 'Validated' : 'Awaiting'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl transition-all hover:scale-110" title="Print Certificate">
                        <Award size={16} />
                      </button>
                      <button className="p-2 text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all hover:scale-110" title="Print Transcript">
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => alert(`Generating ${phase} Transcript for ${student.name}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                      >
                        <FileText size={14} />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
