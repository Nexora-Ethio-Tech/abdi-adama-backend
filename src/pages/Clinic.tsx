
import { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  User,
  History,
  HeartPulse
} from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  stock: number;
  unit: string;
}

interface VisitLog {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  reason: string;
  treatment: string;
  status: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  blood_group: string;
  allergies: string;
}

export const Clinic = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'visits' | 'chat'>('directory');
  const [students, setStudents] = useState<Student[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newVisit, setNewVisit] = useState({ reason: '', treatment: '', selectedMeds: [] as {id: string, quantity: number}[] });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('abdi_adama_token');
    try {
      const [studentsRes, medRes, visitsRes] = await Promise.all([
        fetch(`${API_URL}/api/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/clinic/medicine`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/clinic/visits`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (medRes.ok) setMedicines(await medRes.json());
      if (visitsRes.ok) setVisitLogs(await visitsRes.json());
    } catch (err) {
      console.error('Clinic data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const token = localStorage.getItem('abdi_adama_token');
    try {
      const res = await fetch(`${API_URL}/api/clinic/visit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          student_name: selectedStudent.name,
          reason: newVisit.reason,
          treatment: newVisit.treatment,
          medicines: newVisit.selectedMeds
        })
      });
      if (res.ok) {
        setShowLogModal(false);
        setNewVisit({ reason: '', treatment: '', selectedMeds: [] });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to log visit');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <HeartPulse className="text-rose-500" size={32} />
            School Clinic Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitor student health and manage clinical visits</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button onClick={() => setActiveTab('directory')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'directory' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>Directory</button>
          <button onClick={() => setActiveTab('visits')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'visits' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>Visits</button>
        </div>
      </div>

      {activeTab === 'directory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none"
                />
              </div>
              <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${selectedStudent?.id === student.id ? 'bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold">
                      {student.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold dark:text-slate-100">{student.name}</p>
                      <p className="text-[10px] text-slate-500">Grade: {student.grade}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedStudent ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                        <User size={40} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black dark:text-white">{selectedStudent.name}</h2>
                        <p className="text-slate-500 font-bold">Grade {selectedStudent.grade}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-md">Allergy: {selectedStudent.allergies || 'None'}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-md">Blood: {selectedStudent.blood_group || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowLogModal(true)}
                      className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-200"
                    >
                      Log New Visit
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <History size={20} className="text-rose-500" />
                    Visit History
                  </h3>
                  <div className="space-y-4">
                    {visitLogs.filter(v => v.student_id === selectedStudent.id).map(v => (
                      <div key={v.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between">
                        <div>
                          <p className="text-sm font-bold dark:text-slate-100">{v.reason}</p>
                          <p className="text-xs text-slate-500">{v.date} • {v.time}</p>
                          <p className="text-xs mt-2 text-slate-600 dark:text-slate-400"><strong>Treatment:</strong> {v.treatment}</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase">Logged</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
                <HeartPulse size={48} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Select a Student</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Student</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Date/Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Reason</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visitLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 text-sm font-bold dark:text-slate-200">{log.student_name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{log.date} {log.time}</td>
                  <td className="px-6 py-4 text-sm font-bold">{log.reason}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.treatment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-black text-rose-600 flex items-center gap-2 mb-4">
              <Stethoscope size={24} />
              Log Clinical Visit
            </h3>
            <form onSubmit={handleLogVisit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Reason</label>
                <textarea
                  required
                  value={newVisit.reason}
                  onChange={(e) => setNewVisit({...newVisit, reason: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Treatment</label>
                <textarea
                  required
                  value={newVisit.treatment}
                  onChange={(e) => setNewVisit({...newVisit, treatment: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Medicines Administered</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                   {medicines.map(med => (
                     <div key={med.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                       <span className="text-xs font-bold">{med.name} (Stock: {med.stock})</span>
                       <input 
                         type="number" 
                         min="0" 
                         max={med.stock}
                         placeholder="Qty"
                         className="w-16 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-900"
                         onChange={(e) => {
                           const qty = parseInt(e.target.value) || 0;
                           const existing = newVisit.selectedMeds.find(m => m.id === med.id);
                           if (existing) {
                             setNewVisit({
                               ...newVisit,
                               selectedMeds: newVisit.selectedMeds.map(m => m.id === med.id ? {...m, quantity: qty} : m)
                             });
                           } else if (qty > 0) {
                             setNewVisit({
                               ...newVisit,
                               selectedMeds: [...newVisit.selectedMeds, {id: med.id, quantity: qty}]
                             });
                           }
                         }}
                       />
                     </div>
                   ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-200">Log & Deduct Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
