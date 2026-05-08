
import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { mockStudents, mockClasses, mockGradingConfigs } from '../data/mockData';
import { Save, Lock, ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const GradeEntry = () => {
  const navigate = useNavigate();
  const { gradesLocked } = useUser();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Mocking teacher subjects - in real app this would come from user data
  const teacherSubjects = ['Mathematics', 'Physics'];

  const gradeLevel = selectedClass?.replace('Grade ', '');
  const studentsInClass = mockStudents.filter(s => s.grade === gradeLevel);
  const gradingMethods = mockGradingConfigs[gradeLevel || ''] || mockGradingConfigs['default'];

  const handleSave = () => {
    if (gradesLocked) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <Breadcrumbs />
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <h2 className="text-2xl font-bold text-slate-800">Grade Entry</h2>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Select a Class & Subject</h3>
          <p className="text-blue-700">Choose one of your assigned classes and the subject you want to enter grades for.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                  <Users size={24} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{cls.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{cls.students} Students Enrolled</p>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Select Subject</p>
                {teacherSubjects.map(subject => (
                  <button
                    key={subject}
                    onClick={() => {
                      setSelectedClass(cls.name);
                      setSelectedSubject(subject);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all text-sm font-medium"
                  >
                    {subject}
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => {
            setSelectedClass(null);
            setSelectedSubject(null);
          }}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Back to Class Selection
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800">{selectedClass}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
              {selectedSubject}
            </span>
          </div>
        </div>

        {!gradesLocked && (
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all"
          >
            <Save size={18} />
            <span>Save All Grades</span>
          </button>
        )}
      </div>

      {gradesLocked && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
          <Lock size={20} className="text-amber-600" />
          <div>
            <p className="font-bold">Grade Insertion is Currently Locked</p>
            <p className="text-sm">The administration has closed the window for grade entry. You can view scores but cannot modify them.</p>
          </div>
        </div>
      )}

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="bg-emerald-500 text-white p-1 rounded-full">
            <Save size={16} />
          </div>
          <span className="font-bold">Grades saved successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                {gradingMethods.map(method => (
                  <th key={method.id} className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-32">
                    {method.label} ({method.maxWeight})
                  </th>
                ))}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsInClass.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">ID: #{student.id.padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  {gradingMethods.map(method => (
                    <td key={method.id} className="px-4 py-4">
                      <input
                        disabled={gradesLocked}
                        type="number"
                        max={method.maxWeight}
                        placeholder="0"
                        className="w-full text-center p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-bold text-blue-600"
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-slate-400">/100</span>
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
