
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { useUser, type UserRole } from './context/UserContext';
import { Suspense, lazy, type ReactNode } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Students = lazy(() => import('./pages/Students').then((m) => ({ default: m.Students })));
const Teachers = lazy(() => import('./pages/Teachers').then((m) => ({ default: m.Teachers })));
const Staff = lazy(() => import('./pages/Staff').then((m) => ({ default: m.Staff })));
const Finance = lazy(() => import('./pages/Finance').then((m) => ({ default: m.Finance })));
const Branches = lazy(() => import('./pages/Branches').then((m) => ({ default: m.Branches })));
const StudentProfile = lazy(() => import('./pages/StudentProfile').then((m) => ({ default: m.StudentProfile })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const StudentPortal = lazy(() => import('./pages/StudentPortal').then((m) => ({ default: m.StudentPortal })));
const StudentCourses = lazy(() => import('./pages/StudentCourses').then((m) => ({ default: m.StudentCourses })));
const AcademicHistory = lazy(() => import('./pages/AcademicHistory').then((m) => ({ default: m.AcademicHistory })));
const ParentPortal = lazy(() => import('./pages/ParentPortal').then((m) => ({ default: m.ParentPortal })));
const TeacherPortal = lazy(() => import('./pages/TeacherPortal').then((m) => ({ default: m.TeacherPortal })));
const TeacherAttendance = lazy(() => import('./pages/TeacherAttendance').then((m) => ({ default: m.TeacherAttendance })));
const TeacherSchedule = lazy(() => import('./pages/TeacherSchedule').then((m) => ({ default: m.TeacherSchedule })));
const GradeEntry = lazy(() => import('./pages/GradeEntry').then((m) => ({ default: m.GradeEntry })));
const ScheduleBuilder = lazy(() => import('./pages/ScheduleBuilder').then((m) => ({ default: m.ScheduleBuilder })));
const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })));
const Library = lazy(() => import('./pages/Library').then((m) => ({ default: m.Library })));
const Registration = lazy(() => import('./pages/Registration').then((m) => ({ default: m.Registration })));
const Attendance = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const ExamSession = lazy(() => import('./pages/ExamSession').then((m) => ({ default: m.ExamSession })));
const Transcripts = lazy(() => import('./pages/Transcripts').then((m) => ({ default: m.Transcripts })));
const Exams = lazy(() => import('./pages/Exams'));
const Clinic = lazy(() => import('./pages/Clinic').then((m) => ({ default: m.Clinic })));
const ParentClinicChat = lazy(() => import('./pages/ParentClinicChat').then((m) => ({ default: m.ParentClinicChat })));
const DriverPortal = lazy(() => import('./pages/DriverPortal').then((m) => ({ default: m.DriverPortal })));
const WebsitePosts = lazy(() => import('./pages/WebsitePosts').then((m) => ({ default: m.WebsitePosts })));
const AuditorDashboard = lazy(() => import('./pages/AuditorDashboard').then((m) => ({ default: m.AuditorDashboard })));
const AcademicManagement = lazy(() => import('./pages/AcademicManagement').then((m) => ({ default: m.AcademicManagement })));
const VicePrincipalDashboard = lazy(() => import('./pages/VicePrincipalDashboard').then((m) => ({ default: m.VicePrincipalDashboard })));

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-sm font-bold text-slate-500">Loading page...</div>
  </div>
);

const getDashboardRoute = (role: string | null) => {
  switch (role) {
    case 'super-admin': return '/dashboard/super-admin';
    case 'school-admin': return '/dashboard/school-admin';
    case 'teacher': return '/dashboard/teacher';
    case 'student': return '/dashboard/student';
    case 'parent': return '/dashboard/parent';
    case 'finance-clerk': return '/dashboard/finance';
    case 'vice-principal': return '/dashboard/vice-principal';
    case 'driver': return '/dashboard/driver';
    case 'librarian': return '/dashboard/librarian';
    case 'clinic-admin': return '/dashboard/clinic-admin';
    case 'auditor': return '/auditor-dashboard';
    default: return '/login';
  }
};

const ProtectedRoute = ({
  children,
  allowedRoles
}: {
  children: ReactNode;
  allowedRoles?: UserRole[]
}) => {
  const { user, role } = useUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role as UserRole)) {
    // Kick them back to their own dashboard instead of the generic root
    return <Navigate to={getDashboardRoute(role)} replace />;
  }

  return children;
};

function App() {
  const { user, role, loading } = useUser();

  // ─── Block ALL rendering until token verification completes ────────────────
  // Without this, ProtectedRoute would see user=null briefly and redirect to /login
  // even for legitimate users refreshing the page.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {!user ? (
          <>
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to={getDashboardRoute(role)} replace />} />

            {/* Explicit Dashboard Routes */}
            <Route path="dashboard/super-admin" element={<ProtectedRoute allowedRoles={['super-admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="dashboard/school-admin" element={<ProtectedRoute allowedRoles={['school-admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="dashboard/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherPortal /></ProtectedRoute>} />
            <Route path="dashboard/student" element={<ProtectedRoute allowedRoles={['student']}><StudentPortal /></ProtectedRoute>} />
            <Route path="dashboard/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentPortal /></ProtectedRoute>} />
            <Route path="dashboard/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverPortal /></ProtectedRoute>} />
            <Route path="dashboard/finance" element={<ProtectedRoute allowedRoles={['finance-clerk']}><Finance /></ProtectedRoute>} />
            <Route path="dashboard/vice-principal" element={<ProtectedRoute allowedRoles={['vice-principal']}><VicePrincipalDashboard /></ProtectedRoute>} />
            <Route path="dashboard/librarian" element={<ProtectedRoute allowedRoles={['librarian']}><Library /></ProtectedRoute>} />
            <Route path="dashboard/clinic-admin" element={<ProtectedRoute allowedRoles={['clinic-admin']}><Clinic /></ProtectedRoute>} />
            <Route path="auditor-dashboard" element={<ProtectedRoute allowedRoles={['auditor']}><AuditorDashboard /></ProtectedRoute>} />

            {/* Role specific routes */}
            <Route path="branches" element={
              <ProtectedRoute allowedRoles={['super-admin']}>
                <Branches />
              </ProtectedRoute>
            } />

            <Route path="analytics" element={
              <ProtectedRoute allowedRoles={['super-admin']}>
                <Analytics />
              </ProtectedRoute>
            } />

            <Route path="staff" element={
              <ProtectedRoute allowedRoles={['super-admin']}>
                <Staff />
              </ProtectedRoute>
            } />

            <Route path="students" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'parent', 'vice-principal']}>
                <Students />
              </ProtectedRoute>
            } />

            <Route path="students/:id" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'vice-principal']}>
                <StudentProfile />
              </ProtectedRoute>
            } />

            <Route path="teachers" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'vice-principal']}>
                <Teachers />
              </ProtectedRoute>
            } />

            <Route path="attendance" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'teacher', 'student', 'vice-principal']}>
                {role === 'teacher' ? <TeacherAttendance /> :
                 role === 'student' ? <AcademicHistory /> :
                 <Attendance />}
              </ProtectedRoute>
            } />
            <Route path="schedule-builder" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin']}>
                <ScheduleBuilder />
              </ProtectedRoute>
            } />

            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin']}>
                <Inventory />
              </ProtectedRoute>
            } />

            <Route path="library" element={
              <ProtectedRoute allowedRoles={['librarian', 'super-admin']}>
                <Library />
              </ProtectedRoute>
            } />

            <Route path="website-posts" element={
              <ProtectedRoute allowedRoles={['super-admin']}>
                <WebsitePosts />
              </ProtectedRoute>
            } />

            <Route path="clinic" element={
              <ProtectedRoute allowedRoles={['clinic-admin', 'super-admin']}>
                <Clinic />
              </ProtectedRoute>
            } />

            <Route path="clinic-chat" element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentClinicChat />
              </ProtectedRoute>
            } />

            <Route path="courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourses />
              </ProtectedRoute>
            } />

            <Route path="schedule" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherSchedule />
              </ProtectedRoute>
            } />

            <Route path="grades" element={
              <ProtectedRoute allowedRoles={['teacher', 'vice-principal', 'school-admin']}>
                <GradeEntry />
              </ProtectedRoute>
            } />

            <Route path="transcripts" element={
              <ProtectedRoute allowedRoles={['vice-principal', 'super-admin']}>
                <Transcripts />
              </ProtectedRoute>
            } />

            <Route path="registration" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin', 'finance-clerk']}>
                <Registration />
              </ProtectedRoute>
            } />

            <Route path="special-students" element={
              <ProtectedRoute allowedRoles={['auditor', 'finance-clerk', 'super-admin']}>
                <AuditorDashboard />
              </ProtectedRoute>
            } />

            <Route path="academic-management" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin']}>
                <AcademicManagement />
              </ProtectedRoute>
            } />

            <Route path="admissions-dashboard" element={
              <ProtectedRoute allowedRoles={['school-admin', 'super-admin']}>
                <div className="flex items-center justify-center min-h-screen text-slate-400 text-lg font-semibold">
                  🚧 Admissions Dashboard — Coming Next!
                </div>
              </ProtectedRoute>
            } />

            <Route path="finance" element={<Finance />} />
            <Route path="exams" element={
              <ProtectedRoute allowedRoles={['teacher', 'school-admin', 'vice-principal', 'student', 'parent']}>
                <Exams />
              </ProtectedRoute>
            } />
            <Route path="settings" element={<Settings />} />
            <Route path="exam/:examId" element={<ExamSession />} />

            {/* Catch-all within layout */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
