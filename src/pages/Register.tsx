
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { StudentRegistration } from '../components/StudentRegistration';
import logo from '../assets/logo.jpg';
import { ShootingStars } from '../components/Effects';
import { useUser } from '../context/UserContext';

export const Register = () => {
  const { schoolName } = useUser();
  const displaySchoolName = schoolName.english;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <ShootingStars />

      <div className="max-w-4xl mx-auto w-full space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-500 hover:text-school-primary font-bold transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>

          <div className="flex items-center gap-4">
            <div className="relative p-1 bg-white dark:bg-slate-900 rounded-2xl shadow-lg">
              <img src={logo} alt="School Logo" className="w-12 h-12 rounded-xl object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admission Portal</h1>
              <p className="text-sm text-slate-500">{displaySchoolName}</p>
            </div>
          </div>
        </div>

        <div className="card p-1 shadow-2xl overflow-hidden">
           <div className="p-6 md:p-10 bg-white/50 dark:bg-slate-900/50">
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white">New Student Registration</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                  Please provide your details and Digital National ID to apply for admission.
                  Our AI system will review your application immediately.
                </p>
              </div>

              <StudentRegistration isAdminView={false} />
           </div>
        </div>

        <p className="text-center text-slate-500 font-medium">
          Already part of our community? <Link to="/login" className="text-school-primary font-bold hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};
