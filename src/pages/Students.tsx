import { Search, Filter, MoreVertical, Download, ChevronRight, ArrowLeft, UserPlus, X, Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { exportToCSV } from '../utils/exportUtils';

export const Students = () => {
  const navigate = useNavigate();
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [phonePrefix] = useState('+251 ');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getToken = () => localStorage.getItem('abdi_adama_token') || '';

  const fetchData = async () => {
    try {
      const gRes = await fetch(`${API}/api/academic/grades/with-sections`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (gRes.ok) setGrades(await gRes.json());

      const sRes = await fetch(`${API}/api/students`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (sRes.ok) {
        const data = await sRes.json();
        // AUTOMATED SORTING: Alphabetical by name
        const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setAllStudents(sorted);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useState(() => { fetchData(); });

  const handleExport = (data = allStudents, filename = 'Students_List') => {
    const dataToExport = data.map(s => ({
      ID: s.id,
      Name: s.name,
      Grade: s.grade,
      Status: s.status,
      ParentName: s.parentName,
      ParentPhone: s.parentPhone
    }));
    exportToCSV(dataToExport, filename);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    const payload = {
      name: formData.get('name'),
      grade: formData.get('grade'),
      section_id: formData.get('section'),
      parentName: formData.get('parentName'),
      parentPhone: phonePrefix + formData.get('parentPhone'),
      branch_id: grades[0]?.branch_id // Default to same branch as grades
    };

    try {
      const res = await fetch(`${API}/api/students`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowAddModal(false);
        fetchData(); // Refresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (selectedGrade) {
    const filteredStudents = allStudents.filter(s => s.grade === selectedGrade);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedGrade(null)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">Students in {selectedGrade}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Detailed roster for the current academic session.</p>
          </div>
          <button 
            onClick={() => handleExport(filteredStudents, `Students_Grade_${selectedGrade}`)}
            className="ml-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-bold"
          >
            <Download size={20} />
            <span>Export</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl dark:shadow-none shadow-slate-200/40 border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-500">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Information</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Guardian Contact</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-4">
                    <Link
                      to={`/students/${student.id}`}
                      className="flex items-center gap-3 group/profile cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xs transition-all group-hover/profile:scale-110">
                        {student.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-white group-hover/profile:text-blue-600 dark:group-hover/profile:text-blue-400 transition-colors">{student.name}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{student.parentName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{student.parentPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      student.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-800/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-600">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigate('/registration')}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-200 dark:shadow-none text-sm font-bold"
          >
            <UserPlus size={20} />
            <span>Register New Student</span>
          </button>
          <button 
            onClick={() => handleExport()}
            className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-bold"
          >
            <Download size={20} />
            <span>Export</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 font-medium"
            />
          </div>
          <button className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {grades.map((grade) => (
          <button
            key={grade.grade_id}
            onClick={() => setSelectedGrade(grade.grade_level)}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1 transition-all group text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">G-{grade.grade_level}</span>
              <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {allStudents.filter(s => s.grade_level === grade.grade_level).length} Students
            </p>
          </button>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Register New Student</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleAddStudent}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Student Full Name</label>
                <input name="name" required type="text" placeholder="e.g. Abdi Tolosa" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Grade Level</label>
                  <select name="grade" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    {grades.map(g => <option key={g.grade_id} value={g.grade_level}>{g.grade_level}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Section</label>
                  <select name="section" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    {grades.flatMap(g => g.sections || []).map(s => (
                      <option key={s.id} value={s.id}>{s.section_name} (Avail: {s.available})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Parent/Guardian Name</label>
                <input name="parentName" required type="text" placeholder="e.g. Tolosa Bekele" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Guardian Phone Number</label>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500">
                    {phonePrefix}
                  </div>
                  <input name="parentPhone" required type="tel" placeholder="912345678" className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50">
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                  <strong>Student Login:</strong> Students log in using their <strong>Digital ID</strong> (e.g., ST1714...). This ID will be generated upon registration.
                </p>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2">
                  <Check size={18} />
                  <span>Register Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
