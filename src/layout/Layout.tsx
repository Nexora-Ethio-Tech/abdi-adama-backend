
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Chatbot } from '../components/Chatbot';
import { ShootingStars } from '../components/Effects';
import { useUser } from '../context/UserContext';
import { useState } from 'react';

export const Layout = () => {
  const location = useLocation();
  const { role, user, schoolName } = useUser();

  const displaySchoolName = schoolName.english;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const shouldShowStars = role === 'student' || role === 'parent' || !user;

  const getTitle = (path: string) => {
    if (role === 'student') {
      switch (path) {
        case '/': return 'Student Dashboard';
        case '/courses': return 'Grades & Courses';
        case '/attendance': return 'Academic History';
        case '/finance': return 'Fee Payments';
        default: return 'Student Portal';
      }
    }

    if (role === 'parent') {
      switch (path) {
        case '/': return 'Parental Dashboard';
        case '/students': return 'My Children';
        case '/finance': return 'Tuition & Fees';
        case '/clinic-chat': return 'Clinic Support';
        default: return 'Parent Portal';
      }
    }

    if (role === 'super-admin') {
      switch (path) {
        case '/': return 'Network Overview';
        case '/branches': return 'Branch Management';
        case '/analytics': return 'Global Analytics';
        case '/finance': return 'Group Financials';
        default: return 'Super Admin Console';
      }
    }

    if (role === 'teacher') {
      switch (path) {
        case '/': return 'Teacher Portal';
        case '/attendance': return 'Student Attendance';
        case '/schedule': return 'My Teaching Schedule';
        default: return 'Teacher Workstation';
      }
    }

    switch (path) {
      case '/': return 'Dashboard Overview';
      case '/students': return 'Student Information System';
      case '/teachers': return 'Teacher Workstation';
      case '/attendance': return 'Attendance Tracking';
      case '/finance': return 'Financial Auditing';
      case '/settings': return 'System Settings';
      default: return `${displaySchoolName} IMS`;
    }
  };

  const isExamPage = location.pathname.startsWith('/exam/');

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
      {shouldShowStars && <ShootingStars />}
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {role !== 'parent' && (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          title={getTitle(location.pathname)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className={`p-4 md:p-8 flex-1 w-full ${role === 'parent' ? 'max-w-7xl mx-auto' : ''}`}>
          <Outlet />
        </main>
        {!isExamPage && <Chatbot />}
      </div>
    </div>
  );
};
