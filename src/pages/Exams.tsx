
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  ClipboardList,
  Clock,
  ChevronRight,
  Plus,
  BookOpen,
  User,
  Filter,
  Trash2,
  Save,
  X,
  FileText,
  Upload,
  AlignLeft,
  CheckSquare,
  Layers,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { mockExams } from '../data/examData';
import type { Exam, ExamCategory } from '../data/examData';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const Exams = () => {
  const { role, user } = useUser();
  const navigate = useNavigate();
  const { examControls, ensureExamControl, examinerTeacherIds } = useStore();
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [adminAuthModal, setAdminAuthModal] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationType, setCreationType] = useState<'Exam' | 'Assignment'>('Exam');
  const [filterCategory, setFilterCategory] = useState<ExamCategory | 'All'>('All');

  // School Admin and Teacher views
  const isSchoolAdmin = role === 'school-admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const activeTeacherId = 'T1';

  const canCreateOfficialExam = isTeacher && examinerTeacherIds.includes(activeTeacherId);

  useEffect(() => {
    exams.forEach((exam) => ensureExamControl(exam.id));
  }, [exams, ensureExamControl]);

  const categories: ExamCategory[] = ['Mid-term', 'Final'];

  const filteredExams = exams.filter(exam => {
    const isOfficial = exam.category === 'Mid-term' || exam.category === 'Final';
    if (!isOfficial) return false;

    const categoryMatch = filterCategory === 'All' || exam.category === filterCategory;
    const control = examControls[exam.id];
    const hidden = control ? control.isHidden : true;

    if ((isStudent || role === 'parent' || role === 'vice-principal') && hidden) {
      return false;
    }

    if (isTeacher) return categoryMatch && exam.teacherId === 't1';
    return categoryMatch;
  });

  if (showCreateForm && isTeacher) {
    return <ExamCreator
      type={creationType}
      onCancel={() => setShowCreateForm(false)}
      onSave={(newExam) => {
        setExams([...exams, newExam]);
        setShowCreateForm(false);
      }}
    />;
  }

  const handleAdminStart = (examId: string) => {
    const control = examControls[examId];
    const requiredPassword = control?.principalPassword || 'principal123';

    if (adminPassword === requiredPassword) {
      navigate(`/exam/${examId}`);
      setAdminAuthModal(null);
      setAdminPassword('');
    } else {
      alert('Invalid Principal Password');
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Official Examinations</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isTeacher && "Manage official mid-term and final examinations for your courses."}
            {isStudent && "Access and attempt your scheduled mid-term and final examinations."}
          </p>
        </div>
        {isTeacher && (
          <div className="flex gap-2">
            <button
              onClick={() => { if (canCreateOfficialExam) { setCreationType('Exam'); setShowCreateForm(true); } }}
              disabled={!canCreateOfficialExam}
              className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${canCreateOfficialExam ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
            >
              <Plus size={20} />
              New Examination
            </button>
          </div>
        )}
      </div>
      {isTeacher && !canCreateOfficialExam && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
          You are currently not assigned as an official examiner. Ask School Admin to promote you as examiner for Mid/Final exams.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilterCategory('All')}
          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterCategory === 'All'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterCategory === cat
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Exam Categories for School Admin */}
      {isSchoolAdmin && filterCategory === 'All' ? (
        <div className="space-y-8">
          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Filter size={20} className="text-blue-600" />
                {cat}s
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.filter(e => e.category === cat).map(exam => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    role={role}
                    actorId={user?.id || 'unknown-user'}
                    onStart={() => {
                      if (isSchoolAdmin) {
                        setAdminAuthModal(exam.id);
                      } else {
                        navigate(`/exam/${exam.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              role={role}
              actorId={user?.id || 'unknown-user'}
              onStart={() => {
                if (isSchoolAdmin) {
                  setAdminAuthModal(exam.id);
                } else {
                  navigate(`/exam/${exam.id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {adminAuthModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-8 border-4 border-blue-500 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tighter">Principal Authorization</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">
              You are accessing an official examination as a School Admin. Please enter the Principal-set password to proceed.
            </p>
            <div className="space-y-4">
               <input
                 type="password"
                 placeholder="Enter Principal Password"
                 autoFocus
                 className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition-all text-center font-bold tracking-widest dark:text-white"
                 value={adminPassword}
                 onChange={(e) => setAdminPassword(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAdminStart(adminAuthModal)}
               />
               <div className="flex gap-3">
                  <button
                    onClick={() => { setAdminAuthModal(null); setAdminPassword(''); }}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black transition-all hover:bg-slate-200"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => handleAdminStart(adminAuthModal)}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                  >
                    AUTHORIZE
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExamCard = ({ exam, role, actorId, onStart }: { exam: Exam, role: string | null, actorId: string, onStart: () => void }) => {
  const { lockExam, unlockExam, setExamHidden, setPrincipalPassword, examControls, ensureExamControl } = useStore();
  const [lockPassword, setLockPassword] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showPrincipalModal, setShowPrincipalModal] = useState(false);
  const [principalPasswordInput, setPrincipalPasswordInput] = useState('');

  useEffect(() => {
    ensureExamControl(exam.id);
  }, [exam.id, ensureExamControl]);

  const control = useMemo(() => examControls[exam.id], [examControls, exam.id]);

  const isLocked = control ? control.isLocked : false;
  const isHidden = control ? control.isHidden : true;
  const isLockOwner = control?.lockOwnerId === actorId;

  const handleLockClick = () => {
    if (isLocked) {
      setShowUnlockModal(true);
    } else {
      setShowLockModal(true);
    }
  };

  const handleLockSave = () => {
    if (lockPassword.trim()) {
      lockExam(exam.id, actorId, lockPassword);
      setLockPassword('');
      setShowLockModal(false);
    } else {
      alert('Please enter a password to lock the exam');
    }
  };

  const handleUnlock = () => {
    const unlocked = unlockExam(exam.id, actorId, unlockPassword);
    if (unlocked) {
      setUnlockPassword('');
      setShowUnlockModal(false);
    } else {
      alert('Unlock denied. Only the user who locked this exam can unlock it with the same password.');
    }
  };

  const handleHideToggle = () => {
    setExamHidden(exam.id, !isHidden);
  };

  const handlePrincipalPasswordSave = () => {
    if (!principalPasswordInput.trim()) {
      alert('Enter a principal password.');
      return;
    }
    setPrincipalPassword(exam.id, principalPasswordInput.trim());
    setPrincipalPasswordInput('');
    setShowPrincipalModal(false);
  };

  if (isHidden && role !== 'teacher' && role !== 'school-admin') return null;

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group relative overflow-hidden ${isHidden ? 'opacity-60 grayscale' : ''}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-transparent rounded-bl-[5rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-700" />
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600">
            <ClipboardList size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
            {exam.category}
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">{exam.title}</h3>
        <div className="space-y-3 mb-8 relative z-10">
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><BookOpen size={14} className="text-blue-600" /></div>
            {exam.courseName}
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><User size={14} className="text-emerald-600" /></div>
            {exam.teacherName}
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><Clock size={14} className="text-amber-600" /></div>
            {exam.durationMinutes} mins • {exam.questions.length} Questions
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 dark:border-slate-800 relative z-10">
          {role === 'student' ? (
            <button
              disabled={isLocked}
              onClick={onStart}
              className={`w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all py-2 rounded-xl ${isLocked ? 'text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-slate-800' : 'text-blue-600 dark:text-blue-400 hover:gap-4 bg-blue-50/50 dark:bg-blue-900/20'}`}
            >
              {isLocked ? (
                <>Locked with Code <Lock size={14} /></>
              ) : (
                <>Start Exam <ChevronRight size={16} /></>
              )}
            </button>
          ) : (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-3">
                <span className={exam.status === 'available' ? 'text-green-600 font-bold' : 'text-slate-400'}>
                  {exam.status === 'available' ? '• Active' : '• Draft'}
                </span>
                {(role === 'teacher' || role === 'school-admin') && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleLockClick}
                      className={`p-1 rounded ${isLocked ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:bg-slate-50'}`}
                      title={isLocked ? 'Unlock' : 'Lock with Code'}
                    >
                      <Lock size={14} />
                    </button>
                    <button
                      onClick={handleHideToggle}
                      className={`p-1 rounded ${isHidden ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:bg-slate-50'}`}
                      title={isHidden ? 'Unveil' : 'Hide'}
                    >
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {role === 'school-admin' && (
                      <button
                        onClick={() => setShowPrincipalModal(true)}
                        className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                        title="Set Principal Password"
                      >
                        <ShieldCheck size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="text-slate-400 hover:text-blue-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
                View Details
              </button>
            </div>
          )}
        </div>
      </div>

      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Lock Exam</h2>
              <button
                onClick={() => { setShowLockModal(false); setLockPassword(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Set a password for students to unlock this exam.</p>
            <input
              type="password"
              placeholder="Enter exam access password"
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowLockModal(false); setLockPassword(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLockSave}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
              >
                Lock Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Unlock Exam</h2>
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockPassword(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Enter the password to unlock this exam.</p>
            <input
              type="password"
              placeholder="Enter exam password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockPassword(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={!isLockOwner}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
              >
                Unlock Exam
              </button>
            </div>
            {isLocked && !isLockOwner && (
              <p className="text-xs text-rose-600 font-bold">You did not create this lock. Unlock is restricted to lock owner.</p>
            )}
          </div>
        </div>
      )}

      {showPrincipalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Principal Password</h2>
              <button
                onClick={() => { setShowPrincipalModal(false); setPrincipalPasswordInput(''); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-600">Set the password required for School Admin authorization to start this official exam.</p>
            <input
              type="password"
              placeholder="Enter principal password"
              value={principalPasswordInput}
              onChange={(e) => setPrincipalPasswordInput(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPrincipalModal(false); setPrincipalPasswordInput(''); }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrincipalPasswordSave}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface FlexibleQuestion {
  id: string;
  text: string;
  type: 'explain' | 'options' | 'group';
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  subQuestions?: FlexibleQuestion[];
}

const ExamCreator = ({ type, onCancel, onSave }: { type: 'Exam' | 'Assignment', onCancel: () => void, onSave: (exam: Exam) => void }) => {
  const [examData, setExamData] = useState<Partial<Exam>>({
    title: '',
    category: 'Mid-term',
    durationMinutes: 60,
    courseName: '',
    questions: []
  });

  const [assignmentDetails, setAssignmentDetails] = useState({
    description: '',
    dueDate: '',
    fileName: '',
    isDocumentOnly: false
  });

  const [questions, setQuestions] = useState<FlexibleQuestion[]>([
    { id: '1', text: '', type: 'options', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correctOptionId: 'a' }
  ]);

  const addQuestion = (parentId?: string) => {
    const newQuestion: FlexibleQuestion = {
      id: Date.now().toString(),
      text: '',
      type: 'explain'
    };

    if (parentId) {
      const updateSubQuestions = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
        return qs.map(q => {
          if (q.id === parentId) {
            return { ...q, subQuestions: [...(q.subQuestions || []), newQuestion] };
          }
          if (q.subQuestions) {
            return { ...q, subQuestions: updateSubQuestions(q.subQuestions) };
          }
          return q;
        });
      };
      setQuestions(updateSubQuestions(questions));
    } else {
      setQuestions([...questions, newQuestion]);
    }
  };

  const removeQuestion = (id: string) => {
    const filterQuestions = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.filter(q => q.id !== id).map(q => ({
        ...q,
        subQuestions: q.subQuestions ? filterQuestions(q.subQuestions) : undefined
      }));
    };
    setQuestions(filterQuestions(questions));
  };

  const updateQuestion = (id: string, updates: Partial<FlexibleQuestion>) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === id) {
          const newQ = { ...q, ...updates };
          if (updates.type === 'options' && !newQ.options) {
            newQ.options = [{ id: 'a', text: '' }, { id: 'b', text: '' }];
            newQ.correctOptionId = 'a';
          }
          if (updates.type === 'group' && !newQ.subQuestions) {
            newQ.subQuestions = [];
          }
          return newQ;
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const addOption = (qId: string) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === qId && q.options) {
          const nextId = String.fromCharCode(97 + q.options.length);
          return { ...q, options: [...q.options, { id: nextId, text: '' }] };
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const updateOption = (qId: string, oIdx: number, text: string) => {
    const updateQs = (qs: FlexibleQuestion[]): FlexibleQuestion[] => {
      return qs.map(q => {
        if (q.id === qId && q.options) {
          const newOptions = [...q.options];
          newOptions[oIdx] = { ...newOptions[oIdx], text };
          return { ...q, options: newOptions };
        }
        if (q.subQuestions) {
          return { ...q, subQuestions: updateQs(q.subQuestions) };
        }
        return q;
      });
    };
    setQuestions(updateQs(questions));
  };

  const handleSave = () => {
    const newExam: Exam = {
      id: Date.now().toString(),
      title: examData.title || `Untitled ${type}`,
      courseId: 'mock-course',
      courseName: examData.courseName || 'General Course',
      teacherId: 't1',
      teacherName: 'Current Teacher',
      category: examData.category as ExamCategory,
      durationMinutes: examData.durationMinutes || 60,
      questions: assignmentDetails.isDocumentOnly ? [] : questions as any,
      status: 'available'
    };
    onSave(newExam);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <X size={24} />
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Create New {type}</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Save size={20} />
            Publish {type}
          </button>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exam Title</label>
            <input
              type="text"
              placeholder="e.g. Mid-term Calculus"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
              value={examData.title}
              onChange={e => setExamData({...examData, title: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Course Name</label>
            <input
              type="text"
              placeholder="e.g. Mathematics"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
              value={examData.courseName}
              onChange={e => setExamData({...examData, courseName: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              value={examData.category}
              onChange={e => setExamData({...examData, category: e.target.value as ExamCategory})}
            >
              <option value="Mid-term" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Mid-term</option>
              <option value="Final" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Final</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (Minutes)</label>
            <input
              type="number"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
              value={examData.durationMinutes}
              onChange={e => setExamData({...examData, durationMinutes: parseInt(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* Type-Specific Form */}
      {type === 'Assignment' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              <h3 className="font-bold dark:text-white">Assignment Mode</h3>
            </div>
            <button
              onClick={() => setAssignmentDetails({...assignmentDetails, isDocumentOnly: !assignmentDetails.isDocumentOnly})}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                assignmentDetails.isDocumentOnly
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
              }`}
            >
              {assignmentDetails.isDocumentOnly ? 'DOCUMENT-ONLY MODE ACTIVE' : 'SWITCH TO DOCUMENT-ONLY'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignment Description</label>
              <textarea
                rows={4}
                placeholder="Provide clear instructions for the assignment..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                value={assignmentDetails.description}
                onChange={e => setAssignmentDetails({...assignmentDetails, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                  value={assignmentDetails.dueDate}
                  onChange={e => setAssignmentDetails({...assignmentDetails, dueDate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supporting Document (Max 2MB)</label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors group cursor-pointer h-full min-h-[80px]">
                  <div className="text-center">
                    <Upload className="mx-auto text-slate-400 group-hover:text-blue-500 mb-2" size={24} />
                    <p className="text-xs text-slate-500">{assignmentDetails.fileName || 'Click to upload PDF or DOCX'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Builder */}
      {(!assignmentDetails.isDocumentOnly || type === 'Exam') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold dark:text-white">Question Structure</h2>
            <button
              onClick={() => addQuestion()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 px-4 py-2 rounded-lg flex items-center gap-1 font-bold text-sm hover:shadow-sm transition-all"
            >
              <Plus size={18} /> New Root Question
            </button>
          </div>

          <div className="space-y-4 pb-20">
            {questions.map((q, idx) => (
              <QuestionNode
                key={q.id}
                q={q}
                index={idx}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
                onAddSub={addQuestion}
                onAddOption={addOption}
                onUpdateOption={updateOption}
              />
            ))}
            {questions.length === 0 && (
              <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <Plus className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No questions added yet.</p>
                <button
                  onClick={() => addQuestion()}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Add your first question
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionNode = ({
  q,
  level = 0,
  index,
  onUpdate,
  onRemove,
  onAddSub,
  onAddOption,
  onUpdateOption
}: {
  q: FlexibleQuestion,
  level?: number,
  index?: number,
  onUpdate: (id: string, updates: Partial<FlexibleQuestion>) => void,
  onRemove: (id: string) => void,
  onAddSub: (parentId?: string) => void,
  onAddOption: (qId: string) => void,
  onUpdateOption: (qId: string, oIdx: number, text: string) => void
}) => (
  <div className={`bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 relative group ${level > 0 ? 'ml-4 md:ml-8 mt-4' : ''}`}>
    <div className="flex items-start gap-2 md:gap-4">
      <span className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-bold shrink-0 text-xs md:text-sm">
        {level === 0 ? (index !== undefined ? index + 1 : '•') : '•'}
      </span>
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <input
            type="text"
            placeholder="Enter question text..."
            className="flex-1 text-lg font-medium bg-transparent border-none focus:ring-0 dark:text-white outline-none"
            value={q.text}
            onChange={e => onUpdate(q.id, { text: e.target.value })}
          />
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-1 border dark:border-slate-700">
            <button
              onClick={() => onUpdate(q.id, { type: 'explain' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'explain' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Explain Question"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => onUpdate(q.id, { type: 'options' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'options' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Multiple Choice"
            >
              <CheckSquare size={16} />
            </button>
            <button
              onClick={() => onUpdate(q.id, { type: 'group' })}
              className={`p-1.5 rounded-md transition-all ${q.type === 'group' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}
              title="Question Group"
            >
              <Layers size={16} />
            </button>
          </div>
        </div>

        {q.type === 'options' && q.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
            {q.options.map((opt, oIdx) => (
              <div key={opt.id} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctOptionId === opt.id}
                  onChange={() => onUpdate(q.id, { correctOptionId: opt.id })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-400 font-medium uppercase">{opt.id}.</span>
                <input
                  type="text"
                  placeholder={`Option ${opt.id.toUpperCase()}`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 dark:text-white"
                  value={opt.text}
                  onChange={e => onUpdateOption(q.id, oIdx, e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={() => onAddOption(q.id)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Plus size={16} /> Add Option
            </button>
          </div>
        )}

        {q.type === 'group' && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            {q.subQuestions?.map(subQ => (
              <QuestionNode
                key={subQ.id}
                q={subQ}
                level={level + 1}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onAddSub={onAddSub}
                onAddOption={onAddOption}
                onUpdateOption={onUpdateOption}
              />
            ))}
            <button
              onClick={() => onAddSub(q.id)}
              className="flex items-center gap-2 text-sm text-blue-600 font-bold ml-8 hover:underline"
            >
              <Plus size={16} /> Add Sub-question
            </button>
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(q.id)}
        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={20} />
      </button>
    </div>
  </div>
);

export default Exams;
