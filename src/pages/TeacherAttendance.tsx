
import { useState } from 'react';
import { mockStudents, mockClasses } from '../data/mockData';
import { Check, X, Users, ChevronRight, Save } from 'lucide-react';
import { useStore, type AbsenceQueueItem } from '../context/useStore';
import { useUser } from '../context/UserContext';

export const TeacherAttendance = () => {
  const { user } = useUser();
  const { enqueueAbsences } = useStore();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('Attendance submitted successfully!');

  const studentsInClass = mockStudents.filter(s => s.grade === selectedClass?.replace('Grade ', ''));

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, boolean> = {};
    studentsInClass.forEach(s => {
      newAttendance[s.id] = true;
    });
    setAttendance(newAttendance);
  };

  const handleSubmit = () => {
    const absentStudents = studentsInClass.filter((student) => !attendance[student.id]);
    const now = new Date();

    const escalationItems: AbsenceQueueItem[] = absentStudents.map((student) => ({
      id: `${now.getTime()}-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      reportedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reportedBy: user?.name || 'Teacher',
      reason: 'Unexcused absence - submitted by class teacher',
      date: now.toISOString().split('T')[0],
      status: 'pending',
    }));

    if (escalationItems.length > 0) {
      enqueueAbsences(escalationItems);
      setSubmitMessage(`Attendance submitted. ${escalationItems.length} absence(s) escalated to VP review queue.`);
    } else {
      setSubmitMessage('Attendance submitted successfully. No absences to escalate.');
    }

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Select a Class</h2>
          <p className="text-blue-700 dark:text-blue-300">Choose one of your assigned classes to begin taking attendance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClasses.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.name)}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users size={24} />
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{cls.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{cls.students} Students Enrolled</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setSelectedClass(null)}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium mb-1 block"
          >
            ← Change Class
          </button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance for {selectedClass}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllPresent}
            className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
          >
            Mark All Present
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all"
          >
            <Save size={18} />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {submitted && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="bg-emerald-500 text-white p-1 rounded-full">
            <Check size={16} />
          </div>
          <span className="font-bold">{submitMessage}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {studentsInClass.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{student.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{student.id.padStart(4, '0')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleAttendance(student.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        attendance[student.id]
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20 dark:ring-emerald-500/10'
                          : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20 dark:ring-rose-500/10'
                      }`}
                    >
                      {attendance[student.id] ? (
                        <>
                          <Check size={18} />
                          <span>PRESENT</span>
                        </>
                      ) : (
                        <>
                          <X size={18} />
                          <span>ABSENT</span>
                        </>
                      )}
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
};
