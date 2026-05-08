
import { CreditCard, ArrowUpRight, ArrowDownRight, Search, FileText, Users, Plus, X, Check, AlertCircle, Bell, History, ShieldCheck, Clock, Filter, ChevronDown, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockFinances, mockStudents } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { exportToCSV } from '../utils/exportUtils';
import { useTranslation } from 'react-i18next';
import { useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('abdi_adama_token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface PaymentLog {
  status: boolean;
  modifiedBy: string;
  approverName: string;
  timestamp: string;
}

interface AuditLogItem extends PaymentLog {
  studentName: string;
  studentId: string;
  section: string;
  category: 'Fees' | 'Staff';
  direction: 'In' | 'Out';
  actionLabel: string;
}

type SummaryWithApproval = (typeof mockFinances.summaries)[number] & {
  approvedBy: string;
  timestamp: string;
};

type NetProfitSummary = {
  totalIn: number;
  totalOut: number;
  netProfit: number;
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toInputDateTimeValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const Finance = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, user } = useUser();
  const isAdmin = role === 'super-admin' || role === 'school-admin';
  const isSuperAdmin = role === 'super-admin';
  const isClerk = role === 'finance-clerk';
  const canCreateTransaction = isClerk;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

  const [showForm, setShowForm] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<{name: string, logs: PaymentLog[]} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDateTime, setFromDateTime] = useState(toInputDateTimeValue(startOfYear));
  const [toDateTime, setToDateTime] = useState(toInputDateTimeValue(now));
  const [netProfitSummary, setNetProfitSummary] = useState<NetProfitSummary | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [enrollmentQueue, setEnrollmentQueue] = useState([
    { id: 'ENR1', name: 'Dawit Abebe', grade: '8', amount: 7700, email: 'abebe.k@gmail.com', confirmed: false, failed: false },
    { id: 'ENR2', name: 'Hanna Mekonnen', grade: '9', amount: 8200, email: 'mekonnen.t@gmail.com', confirmed: false, failed: false },
  ]);

  const [paymentStatus, setPaymentStatus] = useState<Record<string, PaymentLog[]>>({
    '1': [{ status: true, modifiedBy: 'Ato Bekele', approverName: 'W/ro Almaz', timestamp: '2026-04-01T09:00:00' }],
    '2': [{ status: false, modifiedBy: 'Ato Bekele', approverName: 'W/ro Almaz', timestamp: '2026-04-01T09:00:00' }],
    '3': [{ status: false, modifiedBy: 'Ato Bekele', approverName: 'W/ro Almaz', timestamp: '2026-04-01T09:00:00' }],
    '6': [{ status: false, modifiedBy: 'Ato Bekele', approverName: 'W/ro Almaz', timestamp: '2026-04-01T09:00:00' }],
  });

  const [activeView, setActiveView] = useState<'main' | 'audit'>('main');
  const [dbSummary, setDbSummary] = useState<any>(null);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [txCategory, setTxCategory] = useState('Student Fee');
  const [customCategory, setCustomCategory] = useState('');
  const [auditFilter, setAuditFilter] = useState<'In' | 'Out'>('In');
  const [auditCategory, setAuditCategory] = useState<'Fees' | 'Staff'>('Fees');
  const [auditSection, setAuditSection] = useState('all');
  const [auditPage, setAuditPage] = useState(0);
  const [auditActionType, setAuditActionType] = useState('all');
  const [auditUserRole, setAuditUserRole] = useState('all');
  const [auditMinAmount, setAuditMinAmount] = useState('');
  const [auditMaxAmount, setAuditMaxAmount] = useState('');
  const AUDIT_PAGE_SIZE = 10;

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, txRes] = await Promise.all([
        fetch(`${API}/api/finance/summary`, { headers: authHeaders() }),
        fetch(`${API}/api/finance/transactions`, { headers: authHeaders() })
      ]);
      if (sumRes.ok) setDbSummary(await sumRes.json());
      if (txRes.ok) setDbTransactions(await txRes.json());
    } catch (err) {
      console.error('Failed to fetch finance data', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const matchesRange = (timestamp: string) => {
    const current = new Date(timestamp);
    const from = new Date(fromDateTime);
    const to = new Date(toDateTime);
    if (Number.isNaN(current.getTime()) || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return true;
    }
    return current >= from && current <= to;
  };

  const summaryApprovers: Record<string, string> = {
    S1: 'W/ro Selam (Finance Clerk)',
    S2: 'Ato Mekonnen (School Admin)',
    S3: 'W/ro Hana (Procurement Officer)'
  };

  const summariesWithApproval: SummaryWithApproval[] = mockFinances.summaries.map((summary) => ({
    ...summary,
    approvedBy: summaryApprovers[summary.id] ?? 'Finance Office',
    timestamp: `${summary.date}T12:00:00`
  }));

  const feeAuditLogs: AuditLogItem[] = Object.entries(paymentStatus).flatMap(([id, logs]) => {
    const student = mockStudents.find(s => s.id === id);
    return logs.map(log => ({
      ...log,
      studentName: student?.name || 'Unknown Student',
      studentId: id,
      section: student?.grade || 'N/A',
      category: 'Fees' as const,
      direction: log.status ? 'In' as const : 'Out' as const,
      actionLabel: log.status ? 'Fee Payment Approved' : 'Fee Status Reversed'
    }));
  });

  const opsAuditLogs: AuditLogItem[] = summariesWithApproval
    .filter((summary) => summary.category !== 'Student Fees')
    .map((summary) => ({
      status: summary.type === 'Income',
      modifiedBy: 'Ato Girma',
      approverName: summary.approvedBy,
      timestamp: summary.timestamp,
      studentName: summary.description,
      studentId: summary.id,
      section: 'N/A',
      category: 'Staff',
      direction: summary.type === 'Income' ? 'In' : 'Out',
      actionLabel: summary.type === 'Income' ? 'Income Recorded' : 'Expense Recorded'
    }));

  const allAuditLogs = [...feeAuditLogs, ...opsAuditLogs].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const sectionOptions = Array.from(new Set(allAuditLogs.map(log => log.section))).sort();

  const filteredAuditLogs = allAuditLogs.filter((log) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.modifiedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.approverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSectionFilter = auditSection === 'all' || log.section === auditSection;
    return (
      log.direction === auditFilter &&
      log.category === auditCategory &&
      matchesSectionFilter &&
      matchesRange(log.timestamp) &&
      matchesSearch
    );
  });

  const filteredSummaries = summariesWithApproval.filter((summary) => {
    const matchesSearch =
      summary.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.approvedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRange(summary.timestamp) && matchesSearch;
  });



  const calculateNetProfit = () => {
    const totalIn = filteredSummaries
      .filter(summary => summary.type === 'Income')
      .reduce((sum, summary) => sum + summary.amount, 0);
    const totalOut = filteredSummaries
      .filter(summary => summary.type === 'Expense')
      .reduce((sum, summary) => sum + summary.amount, 0);

    setNetProfitSummary({
      totalIn,
      totalOut,
      netProfit: totalIn - totalOut
    });
  };

  const handleExport = () => {
    const dataToExport = activeView === 'audit' 
      ? filteredAuditLogs.map(log => ({
          Target: log.studentName,
          ID: log.studentId,
          Action: log.actionLabel,
          ProcessedBy: log.approverName,
          Timestamp: log.timestamp,
          Amount: log.direction === 'In' ? 'Income' : 'Expense'
        }))
      : filteredSummaries.map(s => ({
          Category: s.category,
          Description: s.description,
          ApprovedBy: s.approvedBy,
          Date: s.date,
          Type: s.type,
          Amount: s.amount
        }));

    exportToCSV(dataToExport, activeView === 'audit' ? 'Finance_Audit_Log' : 'Finance_Ledger');
  };

  const togglePayment = (id: string) => {
    const currentLogs = paymentStatus[id] || [];
    const lastStatus = currentLogs.length > 0 ? currentLogs[0].status : false;

    const newLog: PaymentLog = {
      status: !lastStatus,
      modifiedBy: user?.name || 'Unknown Officer',
      approverName: user?.name || 'Unknown Officer',
      timestamp: new Date().toISOString()
    };

    setPaymentStatus(prev => ({
      ...prev,
      [id]: [newLog, ...currentLogs]
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          {t('finance.back')}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.totalRevenue')}</p>
            <h3 className="text-4xl font-black tracking-tight">{(dbSummary?.total_revenue || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
            <div className="mt-8 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-white/5 w-fit px-3 py-1 rounded-full">
              <ArrowUpRight size={14} />
              <span>+12% {t('finance.trend')}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CreditCard size={140} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.pendingFees')}</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.pending_fees || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
          <div className="mt-8 flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowDownRight size={14} />
            <span>5.2% {t('finance.attention')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 group hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{t('finance.registrationFees')}</p>
          <h3 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">{(dbSummary?.monthly_revenue || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></h3>
          <div className="mt-8 flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1 rounded-full">
            <ArrowUpRight size={14} />
            <span>{t('finance.monthlyTarget')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
            <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveView('main')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'main' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                {isAdmin ? t('finance.summaries') : t('finance.transactions')}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveView('audit')}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'audit' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                  {t('finance.systemAudit')}
                </button>
              )}
            </div>
            {canCreateTransaction && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
              >
                <Plus size={16} />
                <span>New TX</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
              <input
                type="text"
                placeholder={t('finance.searchLedger')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none w-full sm:w-64 transition-all focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <button 
              onClick={handleExport}
              className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-2 whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-800"
            >
              <FileText size={16} />
              <span>{t('finance.export')}</span>
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{t('finance.from')}</label>
              <input
                type="datetime-local"
                value={fromDateTime}
                onChange={(e) => setFromDateTime(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
              <input
                type="datetime-local"
                value={toDateTime}
                onChange={(e) => setToDateTime(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {isAdmin && activeView === 'main' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:ml-auto">
              <button
                onClick={calculateNetProfit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Net Profit Calculator
              </button>
              {netProfitSummary && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] font-bold text-emerald-700">
                    IN: {netProfitSummary.totalIn.toLocaleString()} ETB
                  </div>
                  <div className="px-3 py-2 bg-rose-50 rounded-lg border border-rose-100 text-[10px] font-bold text-rose-700">
                    OUT: {netProfitSummary.totalOut.toLocaleString()} ETB
                  </div>
                  <div className={`px-3 py-2 rounded-lg border text-[10px] font-bold ${netProfitSummary.netProfit >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    PROFIT: {netProfitSummary.netProfit.toLocaleString()} ETB
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
          {activeView === 'audit' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                {/* Filter Header */}
                <div className="px-5 py-3 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center gap-2">
                  <Filter size={14} className="text-blue-300" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Audit Filters</span>
                  <span className="ml-auto text-[10px] font-bold text-slate-300">{filteredAuditLogs.length} results</span>
                </div>

                {/* Filter Body */}
                <div className="p-5 space-y-4">
                  {/* Row 1: Direction + Category */}
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.direction')}</label>
                      <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                        <button
                          onClick={() => { setAuditFilter('In'); setAuditPage(0); }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${auditFilter === 'In' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          💰 Money In
                        </button>
                        <button
                          onClick={() => { setAuditFilter('Out'); setAuditPage(0); }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${auditFilter === 'Out' ? 'bg-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-none' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          📤 Money Out
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.category')}</label>
                      <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                        <button
                          onClick={() => { setAuditCategory('Fees'); setAuditPage(0); }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${auditCategory === 'Fees' ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          🎓 Fees
                        </button>
                        <button
                          onClick={() => { setAuditCategory('Staff'); setAuditPage(0); }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${auditCategory === 'Staff' ? 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          👤 Staff
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Dropdowns + Amount Range */}
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section</label>
                      <div className="relative">
                        <select
                          value={auditSection}
                          onChange={(e) => { setAuditSection(e.target.value); setAuditPage(0); }}
                          className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
                        >
                          <option value="all">{t('finance.all')} Sections</option>
                          {sectionOptions.map((section) => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</label>
                      <div className="relative">
                        <select
                          value={auditActionType}
                          onChange={(e) => { setAuditActionType(e.target.value); setAuditPage(0); }}
                          className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
                        >
                          <option value="all">All Actions</option>
                          <option value="Created">Created</option>
                          <option value="Updated">Updated</option>
                          <option value="Deleted">Deleted</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                      <div className="relative">
                        <select
                          value={auditUserRole}
                          onChange={(e) => { setAuditUserRole(e.target.value); setAuditPage(0); }}
                          className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
                        >
                          <option value="all">All Roles</option>
                          <option value="Admin">Admin</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Vice Principal">Vice Principal</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Range</label>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <input
                          type="number"
                          placeholder="Min"
                          value={auditMinAmount}
                          onChange={(e) => { setAuditMinAmount(e.target.value); setAuditPage(0); }}
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                        />
                        <span className="text-slate-300 dark:text-slate-500 font-black text-xs">→</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={auditMaxAmount}
                          onChange={(e) => { setAuditMaxAmount(e.target.value); setAuditPage(0); }}
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-black">ETB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {(() => {
                const pagedAuditLogs = filteredAuditLogs.slice(auditPage * AUDIT_PAGE_SIZE, (auditPage + 1) * AUDIT_PAGE_SIZE);
                const totalPages = Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE);
                const startRow = auditPage * AUDIT_PAGE_SIZE + 1;
                const endRow = Math.min((auditPage + 1) * AUDIT_PAGE_SIZE, filteredAuditLogs.length);
                return (
                  <>
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('finance.transactionTarget')}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t('finance.actionTaken')}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('finance.processedBy')}</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">{t('finance.timestamp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {pagedAuditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors border-l-4 border-transparent hover:border-blue-600">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-600">{log.studentName}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({log.studentId})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          log.direction === 'In' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {log.actionLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {log.approverName[0]}
                          </div>
                          <span className="font-bold text-blue-700">{log.approverName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 font-mono text-[10px]">{formatDateTime(log.timestamp)}</td>
                    </tr>
                  ))}
                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
                        No audit transactions found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredAuditLogs.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    {startRow}–{endRow} of {filteredAuditLogs.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                      disabled={auditPage === 0}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-slate-600">
                      Page {auditPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setAuditPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={auditPage >= totalPages - 1}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ) : isClerk ? (
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Information</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Settlement Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Alerts & Penalties</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {mockStudents.map((student) => {
                  const logs = paymentStatus[student.id] || [];
                  const isPaid = logs.length > 0 ? logs[0].status : false;
                  const scholarship = (student as any).isScholarship;
                  const busUser = (student as any).isBusUser;
                  const penalty = (student as any).penaltyFee || 0;
                  const monthly = (student as any).monthlyFee || 0;
                  const bus = (student as any).busFee || 0;
                  const totalExpected = (scholarship ? 0 : monthly) + (busUser ? bus : 0) + penalty;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-700 font-black shadow-sm group-hover/row:scale-110 transition-transform duration-300">
                            {student.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-2">
                              Grade {student.grade}
                              {scholarship && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Scholarship</span>
                              )}
                              {busUser && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">Bus User</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => !scholarship && !isSuperAdmin && togglePayment(student.id)}
                              disabled={scholarship || isSuperAdmin}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                scholarship
                                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-200/50 hover:-translate-y-0.5'
                                  : isPaid
                                    ? 'bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                              }`}
                            >
                              {scholarship ? (
                                <Check size={14} />
                              ) : isPaid ? (
                                <Check size={14} />
                              ) : (
                                <div className="w-3.5" />
                              )}
                              <span>{scholarship ? 'COVERED' : isPaid ? 'PAID' : 'PENDING'}</span>
                            </button>

                            {logs.length > 0 && (
                              <button
                                onClick={() => setSelectedHistory({ name: student.name, logs })}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Audit Trail"
                              >
                                <History size={16} />
                              </button>
                            )}
                          </div>

                          {!scholarship && !isPaid && totalExpected > 0 && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Total: {totalExpected.toLocaleString()} ETB
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!scholarship && !isPaid && (
                          <div className="flex flex-col items-center gap-1">
                            {penalty > 0 && (
                              <div className="flex items-center gap-1 text-rose-500 font-bold text-[10px] animate-pulse">
                                <AlertCircle size={12} />
                                <span>+{penalty} ETB Penalty</span>
                              </div>
                            )}
                            {busUser && (
                              <div className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">
                                Incl. {bus} ETB Bus Fee
                              </div>
                            )}
                          </div>
                        )}
                        {scholarship && (
                          <div className="text-center text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                            Full Coverage
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isPaid && (
                          <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto">
                            <Bell size={14} />
                            Notify Parent
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Ledger Category' : 'Transaction ID'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Description' : 'Student Name'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {isAdmin ? 'Meta Details' : 'Payment Type'}
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified By</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {isAdmin ? (
                  dbTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm group-hover/row:scale-110 transition-transform duration-300 ${
                            tx.type === 'Income' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {tx.type === 'Income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <span className="font-medium text-slate-800">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{tx.student_name}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">
                          Branch: {tx.branch_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{tx.verified_by}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(tx.date)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'Expense' && '-'}
                        {tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                ) : (
                  dbTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-all duration-200 group/row border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shadow-sm group-hover/row:scale-110 transition-transform duration-300 ${
                            tx.type === 'Income' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {tx.type === 'Income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <span className="font-medium text-slate-800">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{tx.student_name}</td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">{tx.verified_by}</td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(tx.date)}</td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        tx.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'Expense' && '-'}
                        {tx.amount.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                )}
                {dbTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-slate-400">
                      No transactions found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">Payment Audit Trail</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedHistory.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {selectedHistory.logs.map((log, index) => (
                  <div key={index} className="relative flex items-center gap-6">
                    <div className={`relative z-10 w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-md ${
                      log.status ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {log.status ? <Check size={18} /> : <X size={18} />}
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                          log.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.status ? 'Paid' : 'Marked Pending'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <Clock size={12} />
                          {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        Modified by: <span className="text-blue-600">{log.modifiedBy}</span>
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mt-1">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Approved by: <span className="text-emerald-600">{log.approverName}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 italic font-medium">Verified by Anti-Corruption Integrity Filter</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-center">
               <p className="text-xs text-slate-400 font-medium">Transparency increases accountability. All actions are immutable and logged.</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">Submit New Transaction</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-6 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const data = {
                student_name: f.get('desc'),
                amount: Number(f.get('amount')),
                type: f.get('type'),
                date: new Date().toISOString(),
                verified_by: user?.name || 'Unknown',
                branch_id: (user as any).branch_id || 'B001',
                student_id: null
              };
              try {
                const res = await fetch(`${API}/api/finance/transactions`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify(data)
                });
                if (res.ok) {
                   setSuccessMsg('Transaction recorded successfully!');
                   fetchData();
                   setShowForm(false);
                }
              } catch (err) {
                console.error(err);
              }
            }}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <select
                  name="category"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="Student Fee">Student Fee</option>
                  <option value="Materials Bought">Materials Bought</option>
                  <option value="Teachers Payment">Teachers Payment</option>
                  <option value="Custom">Custom / Other</option>
                </select>
              </div>

              {txCategory === 'Custom' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Category Name</label>
                  <input
                    required
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Name / Description</label>
                <input
                  required
                  name="desc"
                  type="text"
                  placeholder="e.g. Electricity Bill, Stationery Purchase"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
                  <select name="type" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="Income">Money In (Income)</option>
                    <option value="Expense">Money Out (Expense)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (ETB)</label>
                  <input
                    required
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Confirm Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Enrollment Payments - Finance Clerk */}
      {role === 'finance-clerk' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Pending Enrollment Payments</h3>
                <p className="text-[10px] text-slate-500 font-medium">Students approved for admission awaiting fee payment confirmation</p>
              </div>
            </div>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black">
              {enrollmentQueue.filter(s => !s.confirmed && !s.failed).length} Pending
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {enrollmentQueue.map(student => (
              <div key={student.id} className={`p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${student.confirmed ? 'bg-emerald-50/50 dark:bg-emerald-900/5' : student.failed ? 'bg-rose-50/50 dark:bg-rose-900/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm ${student.confirmed ? 'bg-emerald-500' : student.failed ? 'bg-rose-500' : 'bg-purple-500'}`}>
                    {student.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Grade {student.grade} • {student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Amount Due</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{student.amount.toLocaleString()} ETB</p>
                  </div>
                  {student.confirmed ? (
                    <span className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black flex items-center gap-1.5">
                      <Check size={14} /> Passed
                    </span>
                  ) : student.failed ? (
                    <span className="px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-black flex items-center gap-1.5">
                      <X size={14} /> Failed
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEnrollmentQueue(prev => prev.map(s => s.id === student.id ? { ...s, confirmed: true } : s));
                          setSuccessMsg(`✅ ${student.name} marked as Passed (Paid)!`);
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-1.5"
                      >
                        <Check size={14} /> Pass
                      </button>
                      <button
                        onClick={() => {
                          setEnrollmentQueue(prev => prev.map(s => s.id === student.id ? { ...s, failed: true } : s));
                          setSuccessMsg(`❌ ${student.name} marked as Failed (Unpaid)!`);
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none flex items-center gap-1.5"
                      >
                        <X size={14} /> Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {enrollmentQueue.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">No pending enrollment payments.</div>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-6 right-6 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-right-8 max-w-md">
          {successMsg}
        </div>
      )}
    </div>
  );
};
