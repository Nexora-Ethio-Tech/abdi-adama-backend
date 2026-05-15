import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import { toast } from '../components/Toast';
import { HeartPulse, Search, History, User, CheckCheck, Stethoscope, Loader2 } from 'lucide-react';

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
  school_id: string;
}

export const Clinic = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'visits' | 'chat'>('directory');
  const [students, setStudents] = useState<Student[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLog[]>([]);
  const [chatInboxes, setChatInboxes] = useState<any[]>([]);
  const [selectedChatParent, setSelectedChatParent] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVisit, setNewVisit] = useState({ reason: '', treatment: '', selectedMeds: [] as {id: string, quantity: number}[] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = searchQuery.trim().length > 0 
        ? `/api/clinic/students?search=${encodeURIComponent(searchQuery)}`
        : '/api/clinic/students';

      const [studentsRes, visitsRes] = await Promise.all([
        apiFetch(url),
        apiFetch('/api/clinic/visits/history'),
      ]);

      if (studentsRes.ok) {
        const studentsJson = await studentsRes.json();
        setStudents(studentsJson.data?.students || studentsJson.students || studentsJson.data || []);
      } else {
        toast.error('Failed to load student directory.');
      }

      if (visitsRes.ok) {
        const visitsJson = await visitsRes.json();
        setVisitLogs(visitsJson.data || visitsJson);
      }

      const medRes = await apiFetch('/api/clinic/medicine');
      if (medRes.ok) {
        const medJson = await medRes.json();
        setMedicines(medJson.data || medJson);
      } else {
        setMedicines([]);
      }
    } catch {
      toast.error('Network error — could not reach the clinic server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatInboxes = async () => {
    try {
      const res = await apiFetch('/api/clinic/chat');
      if (res.ok) {
        const json = await res.json();
        setChatInboxes(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch chat inboxes', err);
    }
  };

  const fetchChatMessages = async (parentId: string) => {
    try {
      const res = await apiFetch(`/api/clinic/chat?otherUserId=${parentId}`);
      if (res.ok) {
        const json = await res.json();
        setChatMessages(json.data || []);
      }
    } catch (err) {
      toast.error('Failed to load conversation.');
    }
  };

  const fetchStudentChat = async (studentId: string) => {
    try {
      const res = await apiFetch(`/api/clinic/chat?childId=${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setChatMessages(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load student chat');
    }
  };

  useEffect(() => {
    fetchData();
    fetchChatInboxes();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'chat') {
        fetchChatInboxes();
        if (selectedChatParent) fetchChatMessages(selectedChatParent.sender_id);
      } else if (activeTab === 'directory' && selectedStudent) {
        fetchStudentChat(selectedStudent.id);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, selectedChatParent?.sender_id, selectedStudent?.id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedChatParent) return;

    try {
      const res = await apiFetch('/api/clinic/chat', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedChatParent.sender_id,
          childId: selectedChatParent.student_id,
          message: replyMessage
        })
      });

      if (res.ok) {
        const json = await res.json();
        setChatMessages([...chatMessages, json.data]);
        setReplyMessage('');
      }
    } catch (err) {
      toast.error('Failed to send reply.');
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSaving(true);
    try {
      const visitRes = await apiFetch('/api/clinic/visits', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudent.id,
          reason: newVisit.reason,
          treatment: newVisit.treatment,
        })
      });

      if (!visitRes.ok) {
        const errorData = await visitRes.json();
        throw new Error(errorData.message || 'Failed to log visit.');
      }

      if (newVisit.selectedMeds.length > 0) {
        await Promise.all(
          newVisit.selectedMeds.map(med => 
            apiFetch('/api/clinic/medicine/deduct', {
              method: 'POST',
              body: JSON.stringify({
                medicine_id: med.id,
                quantity: med.quantity
              })
            })
          )
        );
      }

      toast.success(`Visit logged and stock updated for ${selectedStudent.name}.`);
      setShowLogModal(false);
      setNewVisit({ reason: '', treatment: '', selectedMeds: [] });
      fetchData(); 
    } catch (err: any) {
      toast.error(err.message || 'Failed to log clinical visit.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students;

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
          <button onClick={() => setActiveTab('chat')} className={`px-6 py-2 rounded-lg text-sm font-bold ${activeTab === 'chat' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}>Chat</button>
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
              <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      fetchStudentChat(student.id);
                    }}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${selectedStudent?.id === student.id ? 'bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold">
                      {student.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold dark:text-slate-100">{student.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ID: {student.school_id}</p>
                    </div>
                  </button>
                )) : (
                  <div className="p-8 text-center text-slate-400 italic text-sm">No clinical history or parent messages for any student yet.</div>
                )}
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
                        <p className="text-rose-600 font-black text-xs bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-lg w-fit mt-2 uppercase tracking-widest">{selectedStudent.grade}</p>
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
                  <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
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
                    {visitLogs.filter(v => v.student_id === selectedStudent.id).length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-sm italic">No visit logs for this student.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[400px]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <HeartPulse size={20} className="text-rose-500" />
                    Parent Communication
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 custom-scrollbar pr-2">
                    {chatMessages.length > 0 ? chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                          msg.role === 'clinic' 
                            ? 'bg-rose-600 text-white rounded-tr-none' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                        }`}>
                          {msg.text}
                          <div className={`text-[8px] mt-1 font-bold ${msg.role === 'clinic' ? 'text-rose-200' : 'text-slate-400'}`}>
                            {msg.timestamp}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No messages found for this student.</div>
                    )}
                  </div>
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!replyMessage.trim() || !selectedStudent) return;
                      try {
                        const res = await apiFetch('/api/clinic/chat', {
                          method: 'POST',
                          body: JSON.stringify({
                            childId: selectedStudent.id,
                            message: replyMessage
                          })
                        });
                        if (res.ok) {
                          const json = await res.json();
                          setChatMessages([...chatMessages, json.data]);
                          setReplyMessage('');
                        }
                      } catch (err) { toast.error('Failed to send message.'); }
                    }} 
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Send update to parent..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm">Send</button>
                  </form>
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
      ) : activeTab === 'visits' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden overflow-x-auto">
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
      ) : (
        /* CHAT TAB */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Inbox</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chatInboxes.length > 0 ? chatInboxes.map(inbox => (
                <button
                  key={inbox.sender_id}
                  onClick={() => {
                    setSelectedChatParent(inbox);
                    fetchChatMessages(inbox.sender_id);
                  }}
                  className={`w-full p-4 flex flex-col gap-1 border-b border-slate-50 dark:border-slate-800 transition-all ${selectedChatParent?.sender_id === inbox.sender_id ? 'bg-rose-50 dark:bg-rose-900/10 border-l-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-black dark:text-white">{inbox.sender_name}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{inbox.last_time.split(' ')[1]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded">RE: {inbox.student_name || 'General Inquiry'}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 text-left">{inbox.last_message}</p>
                </button>
              )) : (
                <div className="p-8 text-center text-slate-400 italic text-sm">No active conversations.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
            {selectedChatParent ? (
              <>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 font-bold text-xs">
                        {selectedChatParent.sender_name[0]}
                      </div>
                      <span className="font-bold dark:text-white">{selectedChatParent.sender_name}</span>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                         msg.role === 'clinic' 
                           ? 'bg-rose-600 text-white rounded-tr-none' 
                           : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                       }`}>
                         {msg.text}
                         <div className={`text-[8px] mt-1 font-bold flex items-center justify-end gap-1 ${msg.role === 'clinic' ? 'text-rose-100' : 'text-slate-400'}`}>
                           {msg.timestamp}
                           {msg.role === 'clinic' && <CheckCheck size={10} className="text-blue-300" />}
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-transform active:scale-95">Reply</button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <HeartPulse size={48} className="opacity-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Select a conversation to reply</p>
              </div>
            )}
          </div>
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
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSaving ? 'Saving...' : 'Log & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
