
import { Building, Palette, Save, HelpCircle, CreditCard, GraduationCap, Plus, Trash2, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useAppearance, type UIStyle } from '../context/AppearanceContext';
import { mockGradingConfigs } from '../data/mockData';
import { useUser } from '../context/UserContext';

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('General');
  const { style, setStyle, autoDarkMode, setAutoDarkMode } = useAppearance();
  const { schoolName, setSchoolName, schoolMotto, setSchoolMotto, role, branches, gradesLocked, setGradesLocked, registrationOpen, setRegistrationOpen } = useUser();

  const tabs = [
    { id: 'General', icon: Building },
    { id: 'Financial Policy', icon: CreditCard },
    ...(role !== 'super-admin' ? [{ id: 'Grading System', icon: GraduationCap }] : []),
    { id: 'Appearance', icon: Palette },
  ];

  const [selectedGrade, setSelectedGrade] = useState('10');
  const [gradeConfigs, setGradeConfigs] = useState(mockGradingConfigs);
  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newMethodWeight, setNewMethodWeight] = useState(10);
  const [profitTargetMonth, setProfitTargetMonth] = useState('1');
  const [profitTargetAmount, setProfitTargetAmount] = useState('500000');

  const ethiopianMonths = [
    { id: '1', ge: 'Meskerem', am: 'መስከረም', mockActual: 420000 },
    { id: '2', ge: 'Tikimt', am: 'ጥቅምት', mockActual: 480000 },
    { id: '3', ge: 'Hidar', am: 'ኅዳር', mockActual: 510000 },
    { id: '4', ge: 'Tahisas', am: 'ታኅሣሥ', mockActual: 390000 },
    { id: '5', ge: 'Tir', am: 'ጥር', mockActual: 530000 },
    { id: '6', ge: 'Yekatit', am: 'የካቲት', mockActual: 475000 },
    { id: '7', ge: 'Megabit', am: 'መጋቢት', mockActual: 560000 },
    { id: '8', ge: 'Miyazya', am: 'ሚያዝያ', mockActual: 440000 },
    { id: '9', ge: 'Ginbot', am: 'ግንቦት', mockActual: 500000 },
    { id: '10', ge: 'Sene', am: 'ሰኔ', mockActual: 410000 },
    { id: '11', ge: 'Hamle', am: 'ሐምሌ', mockActual: 350000 },
    { id: '12', ge: 'Nehase', am: 'ነሐሴ', mockActual: 380000 },
    { id: '13', ge: 'Pagumē', am: 'ጳጉሜን', mockActual: 90000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">System Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your school preferences and system configuration.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-72 flex overflow-x-auto lg:flex-col no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 gap-3 lg:space-y-2 pb-4 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-white/10 translate-x-1'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/30 lg:bg-transparent border border-transparent'
              }`}
            >
              <tab.icon size={18} />
              <span className="whitespace-nowrap">{tab.id}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none overflow-hidden transition-all duration-500">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{activeTab} Configuration</h3>
            <button className="text-blue-600 dark:text-blue-400 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:underline bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl">
              <HelpCircle size={16} />
              <span>Need help?</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {activeTab === 'General' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">School Name (Official)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Oromic</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={schoolName.oromic}
                          onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, oromic: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Amharic</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={schoolName.amharic}
                          onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, amharic: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">English</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          value={schoolName.english}
                          onChange={(e) => role === 'super-admin' && setSchoolName({ ...schoolName, english: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">School Motto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Oromic</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                          value={schoolMotto.oromic}
                          onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, oromic: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Amharic</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                          value={schoolMotto.amharic}
                          onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, amharic: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">English</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
                          value={schoolMotto.english}
                          onChange={(e) => role === 'super-admin' && setSchoolMotto({ ...schoolMotto, english: e.target.value })}
                          disabled={role !== 'super-admin'}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">System Email</label>
                    <input type="email" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" defaultValue="admin@abdiadama.edu" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                    <input type="text" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" defaultValue="+251 911 22 33 44" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Academic Year</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      <option>2025/2026 (Current)</option>
                      <option>2026/2027 (Upcoming)</option>
                    </select>
                  </div>
                </div>

                {role === 'super-admin' && (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global System Controls</h4>
                    <div
                      onClick={() => setGradesLocked(!gradesLocked)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        gradesLocked
                          ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${gradesLocked ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
                          {gradesLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-tight">Grade Entry {gradesLocked ? 'Locked' : 'Open'}</p>
                          <p className="text-[10px] font-medium opacity-80">
                            {gradesLocked ? 'Teachers cannot modify marks.' : 'Teachers can submit and edit student marks.'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${gradesLocked ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${gradesLocked ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>

                    <div
                      onClick={() => setRegistrationOpen(!registrationOpen)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        !registrationOpen
                          ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${!registrationOpen ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
                          {registrationOpen ? <Unlock size={18} /> : <Lock size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-tight">Public Registration {!registrationOpen ? 'Closed' : 'Open'}</p>
                          <p className="text-[10px] font-medium opacity-80">
                            {registrationOpen ? 'New students can apply online.' : 'Online applications are currently disabled.'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${!registrationOpen ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${!registrationOpen ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">School Address</label>
                  <textarea rows={3} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" defaultValue="Bole Sub-city, Woreda 03, House No 1234, Addis Ababa, Ethiopia" />
                </div>
              </div>
            )}

            {activeTab === 'Financial Policy' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Monthly Late Penalty (ETB)</label>
                    <input type="number" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" defaultValue="150" />
                    <p className="text-[10px] text-slate-400">Applied automatically when payment exceeds the deadline.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Deadline (Day of Month)</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" defaultValue={10}>
                      {[5, 10, 15, 20, 25, 30].map(day => (
                        <option key={day} value={day}>Day {day}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {role === 'super-admin' && (
                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Fee Structure Management</h4>
                      <p className="text-xs text-slate-500 font-medium">Configure school fees per branch and grade level.</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                        <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                        <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500">
                          {['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Fee</label>
                        <input type="number" placeholder="5000" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration</label>
                        <input type="number" placeholder="2500" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bus Fee</label>
                        <input type="number" placeholder="1200" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex items-end lg:col-span-5">
                        <button className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 sm:py-3 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none">
                          <Plus size={16} />
                          <span>Apply Fee Configuration</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0 sm:rounded-[2rem] border-y sm:border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-[10px] sm:text-xs min-w-[600px]">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Branch</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade Level</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Registration</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bus Fee</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-medium">Main Branch</td>
                            <td className="px-4 py-3 font-bold text-blue-600">Grade 10</td>
                            <td className="px-4 py-3 font-bold">5,000 ETB</td>
                            <td className="px-4 py-3 font-bold">2,500 ETB</td>
                            <td className="px-4 py-3 font-bold">1,200 ETB</td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-rose-500 hover:text-rose-700 p-1"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-medium">Bole Branch</td>
                            <td className="px-4 py-3 font-bold text-blue-600">Grade 9</td>
                            <td className="px-4 py-3 font-bold">4,800 ETB</td>
                            <td className="px-4 py-3 font-bold">2,200 ETB</td>
                            <td className="px-4 py-3 font-bold">1,000 ETB</td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-rose-500 hover:text-rose-700 p-1"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Monthly Net Profit Target */}
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Monthly Net Profit Target</h4>
                        <p className="text-xs text-slate-500 font-medium">Set the expected profit for each Ethiopian month. Compare with actual collections.</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ethiopian Month</label>
                            <select
                              value={profitTargetMonth}
                              onChange={(e) => setProfitTargetMonth(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              {ethiopianMonths.map((m) => (
                                <option key={m.id} value={m.id}>{m.ge} — {m.am}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Profit (ETB)</label>
                            <input
                              type="number"
                              placeholder="e.g. 500000"
                              value={profitTargetAmount}
                              onChange={(e) => setProfitTargetAmount(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <button className="w-full bg-slate-900 dark:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2">
                              <Save size={14} />
                              Set Target
                            </button>
                          </div>
                        </div>

                        {/* Comparison View */}
                        {(() => {
                          const currentMonth = ethiopianMonths.find(m => m.id === profitTargetMonth);
                          const target = profitTargetAmount ? parseInt(profitTargetAmount) : 0;
                          const actual = currentMonth?.mockActual || 0;
                          const percent = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
                          const status = percent >= 100 ? 'Exceeded' : percent >= 80 ? 'On Track' : percent >= 50 ? 'Behind' : 'Critical';
                          const statusColor = percent >= 100 ? 'text-emerald-600 bg-emerald-50' : percent >= 80 ? 'text-blue-600 bg-blue-50' : percent >= 50 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
                          const barColor = percent >= 100 ? 'bg-emerald-500' : percent >= 80 ? 'bg-blue-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500';

                          return target > 0 ? (
                            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentMonth?.ge} ({currentMonth?.am})</p>
                                  <p className="text-lg font-black text-slate-800 dark:text-white mt-1">
                                    {actual.toLocaleString()} <span className="text-sm text-slate-400 font-bold">/ {target.toLocaleString()} ETB</span>
                                  </p>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                                  {status} — {percent}%
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                  <span>0 ETB</span>
                                  <span>{target.toLocaleString()} ETB (Target)</span>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Grading System' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Select Grade Level</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configurations are batch-specific</p>
                  </div>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                  >
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Assessment Methods</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        (gradeConfigs[selectedGrade] || gradeConfigs['default']).reduce((acc, m) => acc + m.maxWeight, 0) === 100
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700 animate-pulse'
                      }`}>
                        Total Weight: {(gradeConfigs[selectedGrade] || gradeConfigs['default']).reduce((acc, m) => acc + m.maxWeight, 0)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {(gradeConfigs[selectedGrade] || gradeConfigs['default']).map((method, idx) => (
                      <div key={method.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:border-blue-200">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={method.label}
                            onChange={(e) => {
                              const newConfigs = { ...gradeConfigs };
                              const methods = [...(newConfigs[selectedGrade] || gradeConfigs['default'])];
                              methods[idx].label = e.target.value;
                              newConfigs[selectedGrade] = methods;
                              setGradeConfigs(newConfigs);
                            }}
                            className="bg-transparent font-bold text-slate-800 dark:text-white outline-none w-full"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input
                              type="number"
                              value={method.maxWeight}
                              onChange={(e) => {
                                const newConfigs = { ...gradeConfigs };
                                const methods = [...(newConfigs[selectedGrade] || gradeConfigs['default'])];
                                methods[idx].maxWeight = parseInt(e.target.value) || 0;
                                newConfigs[selectedGrade] = methods;
                                setGradeConfigs(newConfigs);
                              }}
                              className="bg-transparent font-black text-blue-600 w-12 text-center outline-none"
                            />
                            <span className="text-[10px] font-black text-slate-400">PTS</span>
                          </div>
                          <button
                            onClick={() => {
                              const newConfigs = { ...gradeConfigs };
                              const methods = (newConfigs[selectedGrade] || gradeConfigs['default']).filter((_, i) => i !== idx);
                              newConfigs[selectedGrade] = methods;
                              setGradeConfigs(newConfigs);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add New Assessment Method</h5>
                   <div className="flex flex-col md:flex-row gap-4">
                      <input
                        type="text"
                        placeholder="e.g. Class Activity, Project"
                        value={newMethodLabel}
                        onChange={(e) => setNewMethodLabel(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Weight</span>
                           <input
                             type="number"
                             value={newMethodWeight}
                             onChange={(e) => setNewMethodWeight(parseInt(e.target.value) || 0)}
                             className="w-12 bg-transparent font-bold text-center outline-none"
                           />
                           <span className="text-xs font-bold text-slate-400">%</span>
                        </div>
                        <button
                          onClick={() => {
                            if (!newMethodLabel) return;
                            const newConfigs = { ...gradeConfigs };
                            const methods = [...(newConfigs[selectedGrade] || gradeConfigs['default'])];
                            methods.push({
                              id: newMethodLabel.toLowerCase().replace(/\s+/g, '-'),
                              label: newMethodLabel,
                              maxWeight: newMethodWeight
                            });
                            newConfigs[selectedGrade] = methods;
                            setGradeConfigs(newConfigs);
                            setNewMethodLabel('');
                          }}
                          className="bg-slate-800 dark:bg-blue-600 text-white p-2.5 rounded-xl hover:bg-slate-700 dark:hover:bg-blue-700 transition-all shadow-md"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                   </div>
                </div>

                {(gradeConfigs[selectedGrade] || gradeConfigs['default']).reduce((acc, m) => acc + m.maxWeight, 0) !== 100 && (
                  <div className="flex gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800/50 text-rose-600">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-xs font-medium">Warning: The total weight for Grade {selectedGrade} is currently <strong>{(gradeConfigs[selectedGrade] || gradeConfigs['default']).reduce((acc, m) => acc + m.maxWeight, 0)}%</strong>. It should equal 100% for proper calculations.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Appearance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['Standard', 'Modern', 'Compact', 'Classic'] as UIStyle[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setStyle(t)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${style === t ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                      <p className="font-bold text-sm">{t}</p>
                    </button>
                  ))}
                </div>
                <div
                  onClick={() => setAutoDarkMode(!autoDarkMode)}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Automatic Dark Mode</p>
                    <p className="text-xs text-slate-500">Switch theme based on system preferences.</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${autoDarkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoDarkMode ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Grading System' && role === 'super-admin' && (
               <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  READ-ONLY: Grading configurations are managed at the School Admin level.
               </div>
            )}
            {role !== 'super-admin' && activeTab === 'General' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-500 text-[10px] font-bold flex items-center gap-2">
                 <Lock size={14} />
                 Some global branding settings are restricted to Super Admins.
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 dark:shadow-none">
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
