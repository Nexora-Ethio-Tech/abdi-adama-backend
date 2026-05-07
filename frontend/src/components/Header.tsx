
import { Bell, Search, User, LogOut, Moon, Sun, Menu, Calendar as CalendarIcon, X, ChevronDown, Shield, Building, BookOpen, CreditCard, BarChart3, GraduationCap, Users, Truck, Stethoscope } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useStore } from '../context/useStore';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '../pages/Calendar';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export const Header = ({ title, onMenuClick }: HeaderProps) => {
  const { user, logout, selectedBranch, role } = useUser();
  const { isExamLockedDown } = useStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showCalendar, setShowCalendar] = useState(false);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('abdi_adama_language', lng);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
    <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h1>
        {selectedBranch && role === 'super-admin' && (
          <span className="hidden sm:inline-block bg-school-primary/10 text-school-primary px-3 py-1 rounded-full text-xs font-bold border border-school-primary/20">
            Branch: {selectedBranch.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-6">
        <div className={cn("relative group hidden sm:block", isExamLockedDown && "opacity-50 pointer-events-none")}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder={t('header.search')}
            disabled={isExamLockedDown}
            className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none w-32 md:w-48 xl:w-64"
          />
        </div>

        <select
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isExamLockedDown}
          className={cn("bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:text-school-primary transition-colors", isExamLockedDown && "opacity-50 cursor-not-allowed")}
        >
          <option value="en">EN</option>
          <option value="am">AM</option>
          <option value="om">OM</option>
        </select>

        <button
          onClick={toggleTheme}
          disabled={isExamLockedDown}
          className={cn("p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button
          onClick={() => setShowCalendar(true)}
          disabled={isExamLockedDown}
          className={cn("p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
          title="Open Calendar"
        >
          <CalendarIcon size={20} />
        </button>

        <button
          disabled={isExamLockedDown}
          className={cn("relative p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
        >
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-school-secondary rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        <div className="flex items-center gap-1 md:gap-3 md:pl-6 md:border-l border-slate-200 dark:border-slate-800 relative group">
          <div className="flex items-center gap-1 md:gap-4 p-1 cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{user?.name || t('header.guest')}</p>
              <div className="flex items-center justify-end gap-1">
                <p className="text-[10px] font-bold text-school-primary uppercase tracking-widest">{role?.replace('-', ' ')}</p>
                <ChevronDown size={10} className="text-slate-400 group-hover:text-school-primary transition-colors" />
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-school-primary to-school-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-school-primary/20 group-hover:scale-110 transition-transform">
              <User size={20} />
            </div>
          </div>

          {/* Role Switcher Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50">
            <div className="px-4 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Switch Dashboard</p>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {[
                { r: 'super-admin', label: 'Super Admin', icon: <Shield size={14} /> },
                { r: 'school-admin', label: 'School Admin', icon: <Building size={14} /> },
                { r: 'teacher', label: 'Teacher Portal', icon: <BookOpen size={14} /> },
                { r: 'finance-clerk', label: 'Finance Clerk', icon: <CreditCard size={14} /> },
                { r: 'auditor', label: 'Auditor Panel', icon: <BarChart3 size={14} /> },
                { r: 'student', label: 'Student Portal', icon: <GraduationCap size={14} /> },
                { r: 'parent', label: 'Parent Portal', icon: <Users size={14} /> },
                { r: 'driver', label: 'Driver Portal', icon: <Truck size={14} /> },
                { r: 'clinic-admin', label: 'Clinic Admin', icon: <Stethoscope size={14} /> },
              ].filter(item => {
                // Security: Super Admin can switch to anything. 
                // Others can switch to portal roles.
                // Admin roles require already having that role.
                if (item.r === 'super-admin' || item.r === 'school-admin') {
                  return user?.role === item.r;
                }
                return true; 
              }).map((item) => (
                <button
                  key={item.r}
                  onClick={() => {
                    switchRole(item.r as any);
                    navigate('/'); // Go to root to trigger redirect logic
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    role === item.r ? "text-school-primary bg-school-primary/5" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span className={cn(role === item.r ? "text-school-primary" : "text-slate-400")}>
                    {item.icon}
                  </span>
                  {item.label}
                  {role === item.r && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-school-primary" />}
                </button>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    {showCalendar && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300 border border-white/20">
          <button
            onClick={() => setShowCalendar(false)}
            className="absolute top-6 right-6 z-[110] p-3 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 rounded-2xl shadow-lg transition-all hover:scale-110 active:scale-95"
          >
            <X size={24} />
          </button>
          <div className="p-8 md:p-12">
            <Calendar />
          </div>
        </div>
      </div>
    )}
    </>
  );
};
