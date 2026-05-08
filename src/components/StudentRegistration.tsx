
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, RefreshCw, Upload, Search, CheckCircle, AlertCircle, FileText, Info, Check, X, HeartPulse, Mail, Clock, MapPin, BookOpen, Shield } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';

type RegistrationTab = 'new' | 'existing';
type PipelineFilter = 'pending' | 'exam-queue' | 'awaiting-finance' | 'completed';
type AppStatus = 'pending' | 'declined' | 'approved' | 'exam-pending' | 'exam-passed' | 'exam-failed' | 'awaiting-payment' | 'payment-confirmed';

interface PendingApp {
  id: string; name: string; dob: string; parentName: string; phone: string; email: string;
  previousSchool: string; lastGrade: string; date: string; status: AppStatus;
  examDetails?: { date: string; time: string; location: string; subjects: string; notes: string };
}

interface StudentRegistrationProps {
  isAdminView?: boolean;
}

const initialPendingApplications: PendingApp[] = [
  { id: 'APP1', name: 'Zekarias Teshome', dob: '2012-08-20', parentName: 'Teshome G/Mariam', phone: '+251911445566', email: 'teshome@gmail.com', previousSchool: 'St. Joseph School', lastGrade: '7', date: '2026-04-12', status: 'pending' },
  { id: 'APP2', name: 'Liyu Solomon', dob: '2013-05-10', parentName: 'Solomon Ayele', phone: '+251911778899', email: 'solomon.a@gmail.com', previousSchool: 'Future Talent Academy', lastGrade: '6', date: '2026-04-13', status: 'pending' },
  { id: 'APP3', name: 'Hanna Mekonnen', dob: '2012-11-03', parentName: 'Mekonnen Tadesse', phone: '+251922334455', email: 'mekonnen.t@gmail.com', previousSchool: 'Bright Future Academy', lastGrade: '8', date: '2026-04-10', status: 'exam-pending', examDetails: { date: '2026-05-01', time: '9:00 AM', location: 'Main Campus Hall B', subjects: 'Math, English', notes: 'Bring pencils and eraser.' } },
  { id: 'APP4', name: 'Dawit Abebe', dob: '2013-02-15', parentName: 'Abebe Kebede', phone: '+251933556677', email: 'abebe.k@gmail.com', previousSchool: 'Unity School', lastGrade: '7', date: '2026-04-08', status: 'awaiting-payment' },
];

export const StudentRegistration = ({ isAdminView = true }: StudentRegistrationProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role } = useUser();
  const isFinance = role === 'finance-clerk' || role === 'super-admin';
  
  const [activeTab, setActiveTab] = useState<RegistrationTab>('new');
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>(isFinance ? 'awaiting-finance' : 'pending');
  const [registrationStep, setRegistrationStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingApps, setPendingApps] = useState<PendingApp[]>(initialPendingApplications);
  const [viewingTranscript, setViewingTranscript] = useState<any>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024/2025');
  const [selectedSemester, setSelectedSemester] = useState('Semester 2');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [showExamConfig, setShowExamConfig] = useState(false);
  const [emailToast, setEmailToast] = useState<string | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedAppForFee, setSelectedAppForFee] = useState<PendingApp | null>(null);
  const [examConfig, setExamConfig] = useState({
    date: '',
    time: '',
    location: '',
    subjects: 'Mathematics, English, General Knowledge',
    notes: ''
  });
  const [customFees, setCustomFees] = useState({
    monthly_fee: 4500,
    bus_fee: 1500,
    penalty_fee: 0,
    fee_status: 'standard' as 'standard' | 'reduced',
    fee_notes: ''
  });

  const transcriptHistory = {
    '2024/2025': {
      'Semester 1': [
        { s: 'Mathematics', g: 'B+' },
        { s: 'Physics', g: 'B' },
        { s: 'English', g: 'A-' },
        { s: 'Chemistry', g: 'B+' },
      ],
      'Semester 2': [
        { s: 'Mathematics', g: 'A' },
        { s: 'Physics', g: 'A-' },
        { s: 'English', g: 'B+' },
        { s: 'Chemistry', g: 'A' },
        { s: 'Biology', g: 'A-' },
        { s: 'History', g: 'B+' },
        { s: 'Civics', g: 'A' },
      ]
    },
    '2023/2024': {
      'Semester 1': [
        { s: 'Mathematics', g: 'B' },
        { s: 'English', g: 'B+' },
        { s: 'Biology', g: 'A-' },
      ],
      'Semester 2': [
        { s: 'Mathematics', g: 'B+' },
        { s: 'English', g: 'A-' },
        { s: 'Biology', g: 'A' },
      ]
    }
  } as const;

  const nextStep = () => setRegistrationStep(prev => Math.min(3, prev + 1));
  const prevStep = () => setRegistrationStep(prev => Math.max(1, prev - 1));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFileError('File size must be less than 2MB');
        setFileName(null);
      } else {
        setFileError(null);
        setFileName(file.name);
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(isAdminView ? 'Student registered successfully!' : 'Your application has been submitted successfully! We will contact you soon.');
    if (!isAdminView) {
      setTimeout(() => {
        setSuccessMessage(null);
        navigate('/');
      }, 3000);
    } else {
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handlePromote = () => {
    setSuccessMessage(`${selectedStudent.name} has been promoted!`);
    setSelectedStudent(null);
    setSearchQuery('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showEmailToast = (to: string, subject: string) => {
    setEmailToast(`📧 Email sent to ${to}: "${subject}"`);
    setTimeout(() => setEmailToast(null), 4000);
  };

  const handleDecline = (appId: string) => {
    const app = pendingApps.find(a => a.id === appId);
    setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
    setSuccessMessage(`Application ${appId} has been declined.`);
    if (app) showEmailToast(app.email, 'Application Update: Not Accepted');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePass = (appId: string) => {
    const app = pendingApps.find(a => a.id === appId);
    setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'awaiting-payment' as AppStatus } : a));
    setSuccessMessage(`${app?.name} accepted! Forwarded to finance.`);
    if (app) showEmailToast(app.email, 'Congratulations! Proceed to Finance');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePassAfterExam = (appId: string) => {
    const app = pendingApps.find(a => a.id === appId);
    setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'exam-pending' as AppStatus, examDetails: { ...examConfig } } : a));
    setSuccessMessage(`${app?.name} added to exam queue.`);
    if (app) showEmailToast(app.email, 'Entrance Exam Required — Details Inside');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExamResult = (appId: string, passed: boolean) => {
    const app = pendingApps.find(a => a.id === appId);
    if (passed) {
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'awaiting-payment' as AppStatus } : a));
      setSuccessMessage(`${app?.name} passed the exam! Forwarded to finance.`);
      if (app) showEmailToast(app.email, 'Exam Passed! Proceed to Finance');
    } else {
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'exam-failed' as AppStatus } : a));
      setSuccessMessage(`${app?.name} did not pass the exam.`);
      if (app) showEmailToast(app.email, 'Exam Result: Not Passed');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePaymentResult = (appId: string, paid: boolean, fees?: typeof customFees) => {
    const app = pendingApps.find(a => a.id === appId);
    if (paid) {
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'payment-confirmed' as AppStatus } : a));
      setSuccessMessage(`${app?.name} marked as Passed (Paid)!${fees?.fee_status === 'reduced' ? ' Pending auditor approval.' : ''}`);
      if (app) showEmailToast(app.email, 'Payment Confirmed! Officially Enrolled');
    } else {
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
      setSuccessMessage(`${app?.name} marked as Failed (Unpaid)!`);
      if (app) showEmailToast(app.email, 'Application Closed: Payment Not Received');
    }
    setShowFeeModal(false);
    setSelectedAppForFee(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const filteredPipelineApps = pendingApps.filter(app => {
    if (pipelineFilter === 'pending') return app.status === 'pending';
    if (pipelineFilter === 'exam-queue') return app.status === 'exam-pending';
    if (pipelineFilter === 'awaiting-finance') return app.status === 'awaiting-payment';
    if (pipelineFilter === 'completed') return ['declined', 'exam-failed', 'payment-confirmed'].includes(app.status);
    return false;
  });

  const pipelineCounts = {
    pending: pendingApps.filter(a => a.status === 'pending').length,
    'exam-queue': pendingApps.filter(a => a.status === 'exam-pending').length,
    'awaiting-finance': pendingApps.filter(a => a.status === 'awaiting-payment').length,
    completed: pendingApps.filter(a => ['declined', 'exam-failed', 'payment-confirmed'].includes(a.status)).length,
  };

  return (
    <div className="space-y-6">
      {emailToast && (
        <div className="fixed top-6 right-6 z-[300] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 text-sm font-bold max-w-md">
          <Mail size={18} className="text-blue-400 flex-shrink-0" />
          <span>{emailToast}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-emerald-500/5">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}

      {isAdminView && (
        <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'new'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t('registration.newAdmissions')}
          </button>
          {(!isFinance ? false : true) && (
            <button
              onClick={() => setActiveTab('existing')}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'existing'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t('registration.reEnrollment')}
            </button>
          )}
        </div>
      )}

      {activeTab === 'new' ? (
        isAdminView ? (
          <div className="space-y-5">
            {/* Registration Window Toggle */}
            {!isFinance && (
              <div
                onClick={() => setRegistrationOpen(!registrationOpen)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  registrationOpen ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${registrationOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Registration {registrationOpen ? 'Open' : 'Closed'}
                    </p>
                    <p className={`text-[10px] font-medium ${registrationOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {registrationOpen ? 'New applications are being accepted.' : 'Public registration form is disabled.'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${registrationOpen ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            )}

            {/* Global Exam Configuration */}
            {!isFinance && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/30 overflow-hidden">
              <button
                onClick={() => setShowExamConfig(!showExamConfig)}
                className="w-full p-4 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-900/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                    <BookOpen size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">Entrance Exam Configuration</p>
                    <p className="text-[10px] text-amber-600/70 font-medium">
                      {examConfig.date ? `${examConfig.date} at ${examConfig.time} — ${examConfig.location}` : 'Not configured yet'}
                    </p>
                  </div>
                </div>
                <Clock size={16} className={`text-amber-400 transition-transform ${showExamConfig ? 'rotate-180' : ''}`} />
              </button>
              {showExamConfig && (
                <div className="p-4 pt-0 space-y-4 border-t border-amber-100 dark:border-amber-800/30">
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exam Date</label>
                      <input type="date" value={examConfig.date} onChange={e => setExamConfig({...examConfig, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</label>
                      <input type="time" value={examConfig.time} onChange={e => setExamConfig({...examConfig, time: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                    <input type="text" value={examConfig.location} onChange={e => setExamConfig({...examConfig, location: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subjects</label>
                    <input type="text" value={examConfig.subjects} onChange={e => setExamConfig({...examConfig, subjects: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instructions for Students</label>
                    <textarea rows={2} value={examConfig.notes} onChange={e => setExamConfig({...examConfig, notes: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium">💡 These details are sent to every applicant you assign to "Pass After Exam".</p>
                </div>
              )}
            </div>
            )}

            {/* Pipeline Filter Tabs */}
            <div className="flex flex-wrap gap-3">
              {([
                { key: 'pending' as PipelineFilter, label: 'Pending', color: 'blue' },
                { key: 'exam-queue' as PipelineFilter, label: 'Exam Queue', color: 'amber' },
                { key: 'awaiting-finance' as PipelineFilter, label: 'Awaiting Finance', color: 'purple' },
                { key: 'completed' as PipelineFilter, label: 'Completed', color: 'slate' },
              ]).filter(tab => !isFinance || tab.key === 'awaiting-finance' || tab.key === 'completed').map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPipelineFilter(tab.key)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                    pipelineFilter === tab.key
                      ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-500/20`
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    pipelineFilter === tab.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {pipelineCounts[tab.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Application Cards */}
            <div className="grid grid-cols-1 gap-6">
              {filteredPipelineApps.map(app => (
                <div key={app.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 space-y-6 group">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <UserPlus size={32} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white">{app.name}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Grade {app.lastGrade} • {app.date} • {app.email}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      app.status === 'pending' ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' :
                      app.status === 'exam-pending' ? 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' :
                      app.status === 'awaiting-payment' ? 'bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' :
                      app.status === 'declined' || app.status === 'exam-failed' ? 'bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' :
                      'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    }`}>
                      {app.status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Parent</p><p className="font-bold dark:text-slate-200">{app.parentName}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p><p className="font-bold dark:text-slate-200">{app.phone}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Prev School</p><p className="font-bold dark:text-slate-200">{app.previousSchool}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-bold dark:text-slate-200">{app.email}</p></div>
                  </div>

                  {/* Exam Details (if exam-pending) */}
                  {app.status === 'exam-pending' && app.examDetails && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2"><Clock size={12} /> Exam Scheduled</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-[10px] text-amber-500 font-bold">Date:</span> <span className="font-bold text-amber-800 dark:text-amber-200">{app.examDetails.date}</span></div>
                        <div><span className="text-[10px] text-amber-500 font-bold">Time:</span> <span className="font-bold text-amber-800 dark:text-amber-200">{app.examDetails.time}</span></div>
                        <div><span className="text-[10px] text-amber-500 font-bold">Location:</span> <span className="font-bold text-amber-800 dark:text-amber-200">{app.examDetails.location}</span></div>
                        <div><span className="text-[10px] text-amber-500 font-bold">Subjects:</span> <span className="font-bold text-amber-800 dark:text-amber-200">{app.examDetails.subjects}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons per Status */}
                  <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => setViewingTranscript(app)} className="px-5 py-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><FileText size={16} /> Transcript</button>
                        <button onClick={() => handleDecline(app.id)} className="px-5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><X size={16} /> Decline</button>
                        <button onClick={() => handlePass(app.id)} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} /> Pass</button>
                        <button onClick={() => handlePassAfterExam(app.id)} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"><BookOpen size={16} /> Pass After Exam</button>
                      </>
                    )}
                    {app.status === 'exam-pending' && (
                      <>
                        <button onClick={() => handleExamResult(app.id, true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"><Check size={14} /> Exam Passed</button>
                        <button onClick={() => handleExamResult(app.id, false)} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"><X size={14} /> Exam Failed</button>
                      </>
                    )}
                     {app.status === 'awaiting-payment' && (
                       isFinance ? (
                         <>
                           <button onClick={() => {
                             setSelectedAppForFee(app);
                             setShowFeeModal(true);
                           }} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} /> Pass (Paid)</button>
                           <button onClick={() => handlePaymentResult(app.id, false)} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20 active:scale-95"><X size={16} /> Fail (Unpaid)</button>
                         </>
                       ) : (
                         <span className="text-xs font-bold text-purple-600 flex items-center gap-1.5"><MapPin size={14} /> Waiting for finance clerk to confirm payment</span>
                       )
                     )}
                    {(app.status === 'declined' || app.status === 'exam-failed') && (
                      <span className="text-xs font-bold text-rose-500">Application closed</span>
                    )}
                    {app.status === 'payment-confirmed' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle size={14} /> Officially enrolled</span>
                    )}
                  </div>
                </div>
              ))}
              {filteredPipelineApps.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center space-y-3">
                   <CheckCircle size={48} className="mx-auto text-slate-200" />
                   <p className="text-slate-500 font-medium">No applications in this category.</p>
                </div>
              )}
            </div>
          </div>
        ) : !registrationOpen ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Registration is Currently Closed</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">The school is not accepting new applications at this time. Please check back later or contact the administration office.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" />
                  Admission Form (New Student)
                </h3>
                  <div className="flex items-center gap-1 md:gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all ${
                        registrationStep === step ? 'bg-blue-600 text-white' :
                        registrationStep > step ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                          {registrationStep > step ? <Check size={14} className="w-3 h-3 md:w-4 md:h-4" /> : step}
                      </div>
                        {step < 3 && <div className={`w-4 md:w-8 h-0.5 ${registrationStep > step ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-6">
              {registrationStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                      <input required type="text" placeholder="Enter student full name" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Fayda Alias Number (FAN)</label>
                      <input required type="text" placeholder="e.g. FAN-12345678" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-[10px] text-slate-400 pl-1">Alias number from the Ethiopia Digital ID (Fayda) card</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Date of Birth</label>
                      <input required type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                      <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Clinic Required Fields */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                     <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <HeartPulse size={16} />
                        Confidential Medical Details (Clinic Required)
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Blood Group</label>
                          <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option>O+</option>
                            <option>O-</option>
                            <option>A+</option>
                            <option>A-</option>
                            <option>B+</option>
                            <option>B-</option>
                            <option>AB+</option>
                            <option>AB-</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Known Allergies</label>
                          <input type="text" placeholder="e.g. Peanuts, Dust, None" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Chronic Conditions</label>
                          <input type="text" placeholder="e.g. Asthma, Diabetes, None" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-1 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Current Home Medications</label>
                          <input type="text" placeholder="List any medications taken at home..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {registrationStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Parent/Guardian Name</label>
                      <input required type="text" placeholder="Enter parent name" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Parent Phone</label>
                      <input required type="tel" placeholder="+251..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Address</label>
                      <input required type="text" placeholder="City, Sub-city, Woreda" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {registrationStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Previous School</label>
                      <input type="text" placeholder="Name of previous school" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Last Grade Completed</label>
                      <input type="text" placeholder="e.g. Grade 9" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Registration Fee Status</label>
                      <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Paid</option>
                        <option>Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Last Transcript (Max 2MB)</label>
                    <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${
                      fileError ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className={`p-4 rounded-full ${fileError ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                        {fileName ? <FileText size={32} /> : <Upload size={32} />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {fileName || 'Click to upload transcript'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG (Max 2MB)</p>
                      </div>
                    </div>
                    {fileError && (
                      <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                        <AlertCircle size={14} />
                        <span>{fileError}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={registrationStep === 1}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:hidden"
                >
                  Previous
                </button>
                {registrationStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg"
                  >
                    Submit Application
                  </button>
                )}
              </div>
            </form>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search existing student by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>

            {searchQuery && (
              <div className="mt-4 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {pendingApps.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  pendingApps.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedStudent?.id === student.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 font-bold">
                          {student.name[0]}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                          <p className="text-xs text-slate-500 uppercase font-medium">ID: {student.id} • Grade: {student.lastGrade}</p>
                        </div>
                      </div>
                      <CheckCircle size={20} className={selectedStudent?.id === student.id ? 'text-blue-600' : 'text-slate-200'} />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm italic">
                    No students found matching your search.
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw size={20} className="text-blue-600" />
                  Promotion
                </h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedStudent.id === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  Fee Status: {selectedStudent.id === '1' ? 'Paid' : 'Pending'}
                </span>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info size={16} />
                        <span className="text-xs font-bold uppercase">Current Record</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Current Grade</p>
                          <p className="text-sm font-bold dark:text-white">{selectedStudent.grade}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Academic Status</p>
                          <p className="text-sm font-bold text-emerald-600">Cleared</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Promote To Grade</label>
                      <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Grade 9</option>
                        <option>Grade 10</option>
                        <option>Grade 11</option>
                        <option>Grade 12</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle size={20} />
                      <h4 className="font-bold text-sm uppercase">Verification Check</h4>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Before promoting <strong>{selectedStudent.name}</strong>, ensure all outstanding fees from the previous academic year are cleared and the student has passed the minimum academic requirements.
                    </p>
                    {selectedStudent.id !== '1' && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                        <AlertCircle size={14} />
                        Outstanding Balance Found: 2,500 ETB
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromote}
                    disabled={selectedStudent.id !== '1'}
                    className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                      selectedStudent.id === '1'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Confirm Promotion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewingTranscript && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transcript Verification</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Student: {viewingTranscript.name}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingTranscript(null)}
                className="p-3 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 rounded-2xl shadow-lg transition-all hover:scale-110 active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Academic Year</label>
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(transcriptHistory).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Semester</label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.keys(transcriptHistory[selectedAcademicYear as keyof typeof transcriptHistory]).map((semester) => (
                        <option key={semester} value={semester}>{semester}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  <div className="text-center p-12">
                    <FileText size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mock Transcript Viewer</p>
                    <p className="text-[10px] text-slate-500 mt-2">Document ID: {viewingTranscript.id}_TRANSCRIPT_2025.pdf</p>
                  </div>
                  {/* Mock content rendering */}
                  <div className="absolute inset-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col p-8 bg-white dark:bg-slate-950/50 backdrop-blur-sm shadow-inner">
                    <div className="flex justify-between mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                       <div className="font-black text-xs">OFFICIAL ACADEMIC RECORD</div>
                       <div className="font-bold text-[10px] text-slate-400">PAGE 1 OF 1</div>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          {transcriptHistory[selectedAcademicYear as keyof typeof transcriptHistory][selectedSemester as keyof (typeof transcriptHistory)[keyof typeof transcriptHistory]].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                               <span className="text-[10px] font-bold text-slate-600 uppercase">{item.s}</span>
                               <span className="text-xs font-black text-blue-600">{item.g}</span>
                            </div>
                          ))}
                       </div>
                       <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">Cumulative GPA</p>
                          <p className="text-2xl font-black text-emerald-600">3.85 / 4.00</p>
                       </div>
                    </div>
                    <div className="mt-8 flex justify-between items-end">
                       <div className="space-y-1">
                          <div className="w-24 h-0.5 bg-slate-300"></div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Principal's Signature</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified Academic History</p>
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">ABDI ADAMA SMART SCHOOL</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Verification Checklist</h4>
                  <div className="space-y-3">
                    {[
                      'Document Authenticity Check',
                      'Grade Requirements Met',
                      'Behavioral Clearance Verified',
                      'Registration Fee Confirmed'
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <Check size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{check}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-3xl">
                   <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">Academic Counselor Note:</p>
                   <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed italic">
                     "Student shows exceptional performance in STEM subjects. Recommended for Advanced Track in Grade {viewingTranscript.lastGrade}."
                   </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => { handlePass(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Pass — Accept
                  </button>
                  <button
                    onClick={() => { handlePassAfterExam(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen size={18} />
                    Pass After Exam
                  </button>
                  <button
                    onClick={() => { handleDecline(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 py-4 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Fee Configuration Modal */}
      {showFeeModal && selectedAppForFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Configure Student Fees</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Enrollment Finalization — {selectedAppForFee.name}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Tuition (ETB)</label>
                  <input 
                    type="number" 
                    value={customFees.monthly_fee} 
                    onChange={(e) => setCustomFees({...customFees, monthly_fee: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transport Fee (ETB)</label>
                  <input 
                    type="number" 
                    value={customFees.bus_fee} 
                    onChange={(e) => setCustomFees({...customFees, bus_fee: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee Status</label>
                <select 
                  value={customFees.fee_status} 
                  onChange={(e) => setCustomFees({...customFees, fee_status: e.target.value as any})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                >
                  <option value="standard">Standard Fee</option>
                  <option value="reduced">Reduced / Special Fee</option>
                </select>
              </div>
              {customFees.fee_status === 'reduced' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Reduction</label>
                  <textarea 
                    value={customFees.fee_notes}
                    onChange={(e) => setCustomFees({...customFees, fee_notes: e.target.value})}
                    placeholder="Explain why this student has a reduced fee..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none min-h-[100px] resize-none"
                  />
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl mt-2">
                     <AlertCircle size={14} className="text-amber-600" />
                     <p className="text-[10px] text-amber-700 font-medium">Reduced fees will be marked for Auditor approval.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowFeeModal(false)} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">Cancel</button>
              <button 
                onClick={() => handlePaymentResult(selectedAppForFee.id, true, customFees)} 
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                Confirm & Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
