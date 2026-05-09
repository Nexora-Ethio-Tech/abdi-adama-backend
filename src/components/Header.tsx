
import {
  Bell, Search, User, LogOut, Moon, Sun, Menu,
  Calendar as CalendarIcon, X, ChevronDown,
  Shield, Building, BookOpen, CreditCard,
  BarChart3, GraduationCap, Users, Truck,
  Stethoscope, LayoutDashboard
} from 'lucide-react';
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


const PORTAL_ROLES = [
  { r: 'finance-clerk',  label: 'Finance Clerk',   icon: <CreditCard size={16} /> },
  { r: 'auditor',        label: 'Auditor Panel',    icon: <BarChart3 size={16} /> },
  { r: 'teacher',        label: 'Teacher Portal',   icon: <BookOpen size={16} /> },
  { r: 'student',        label: 'Student Portal',   icon: <GraduationCap size={16} /> },
  { r: 'parent',         label: 'Parent Portal',    icon: <Users size={16} /> },
  { r: 'driver',         label: 'Driver Portal',    icon: <Truck size={16} /> },
  { r: 'clinic-admin',   label: 'Clinic Portal',    icon: <Stethoscope size={16} /> },
  { r: 'vice-principal', label: 'Vice Principal',   icon: <LayoutDashboard size={16} /> },
  { r: 'librarian',      label: 'Librarian',        icon: <BookOpen size={16} /> },
  { r: 'super-admin',    label: 'Super Admin',      icon: <Shield size={16} /> },
  { r: 'school-admin',   label: 'School Admin',     icon: <Building size={16} /> },
];

export const Header = ({ title, onMenuClick }: HeaderProps) => {
  const { user, logout, selectedBranch, role, primaryRole, switchRole } = useUser();
  const { isExamLockedDown } = useStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('abdi_adama_language', lng);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRoleSwitch = async (newRole: string) => {
    setIsMenuOpen(false);
    const redirect = await switchRole(newRole as any);
    if (redirect) {
      navigate(redirect);
    }
  };

  // Only show the switcher for Super Admin.
  // Other roles like School Admin should have a "clean" header.
  const canSwitchRoles = primaryRole === 'super-admin';
  const visibleRoles = canSwitchRoles ? PORTAL_ROLES : [];

  return (
    <>
      <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-colors duration-300">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
            {title}
          </h1>
          {selectedBranch && role === 'super-admin' && (
            <span className="hidden sm:inline-block bg-school-primary/10 text-school-primary px-3 py-1 rounded-full text-xs font-bold border border-school-primary/20">
              Branch: {selectedBranch.name}
            </span>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Search */}
          <div className={cn("relative group hidden sm:block", isExamLockedDown && "opacity-50 pointer-events-none")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder={t('header.search')}
              disabled={isExamLockedDown}
              className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-100 border-none rounded-full text-xs focus:ring-2 focus:ring-blue-500 outline-none w-32 md:w-48 xl:w-64"
            />
          </div>

          {/* Language */}
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

          {/* Theme */}
          <button
            onClick={toggleTheme}
            disabled={isExamLockedDown}
            className={cn("p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Calendar */}
          <button
            onClick={() => setShowCalendar(true)}
            disabled={isExamLockedDown}
            className={cn("p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
            title="Open Calendar"
          >
            <CalendarIcon size={20} />
          </button>

          {/* Notifications */}
          <button
            disabled={isExamLockedDown}
            className={cn("relative p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all", isExamLockedDown && "opacity-50 cursor-not-allowed")}
          >
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-school-secondary rounded-full border-2 border-white dark:border-slate-900" />
          </button>

          {/* User Profile + Role Switcher */}
          <div className="relative pl-3 border-l border-slate-200 dark:border-slate-800">
            {/* Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 md:gap-3 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {user?.name || t('header.guest')}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <p className="text-[10px] font-bold text-school-primary uppercase tracking-widest">
                    {role?.replace(/-/g, ' ')}
                  </p>
                  <ChevronDown
                    size={10}
                    className={cn("text-slate-400 transition-transform duration-200", isMenuOpen && "rotate-180")}
                  />
                </div>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-school-primary to-school-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-school-primary/20">
                <User size={18} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden z-50">
                  {/* Header info */}
                  <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-school-primary/5 to-school-accent/5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-school-primary/10 text-school-primary rounded-full text-[10px] font-bold uppercase tracking-wide">
                      {role?.replace(/-/g, ' ')}
                    </span>
                  </div>

                  {/* Role Switcher List - Only for Super Admin */}
                  {canSwitchRoles && visibleRoles.length > 0 && (
                    <div className="py-2 px-2 max-h-[300px] overflow-y-auto border-b border-slate-100 dark:border-slate-800">
                      <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Switch Dashboard
                        {IS_DEV && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[8px] font-black tracking-tight border border-amber-200 dark:border-amber-800/50">
                            🔧 DEV
                          </span>
                        )}
                      </p>
                      {visibleRoles.map((item) => (
                        <button
                          key={item.r}
                          onClick={() => handleRoleSwitch(item.r)}
                          className={cn(
                            "w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-sm font-semibold transition-all",
                            role === item.r
                              ? "bg-school-primary text-white"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                            role === item.r ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}>
                            {item.icon}
                          </span>
                          {item.label}
                          {role === item.r && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sign Out */}
                  <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all"
                    >
                      <span className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
                        <LogOut size={15} />
                      </span>
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Calendar Modal */}
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
