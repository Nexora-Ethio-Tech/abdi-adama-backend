
import { Building2, MapPin, Users, GraduationCap, ChevronRight, Plus, ArrowLeft } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useStore } from '../context/useStore';

interface Branch {
  id: string;
  name: string;
  location: string;
}

export const Branches = () => {
  const { branches, setSelectedBranch } = useUser();
  const { selectedBranchId, setSelectedBranchId } = useStore();
  const navigate = useNavigate();

  const handleEnterBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedBranchId(branch.id);
    navigate('/');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">School Branches</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage and monitor all school locations from one place.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base">
          <Plus size={20} />
          <span>Add New Branch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-none transition-all overflow-hidden group hover:-translate-y-1"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                  <Building2 size={24} />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${selectedBranchId === branch.id ? 'bg-blue-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                  {selectedBranchId === branch.id ? 'Selected' : 'Active'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{branch.name}</h3>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-6">
                <MapPin size={14} />
                <span>{branch.location}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center border border-transparent dark:border-slate-700/50">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Users size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">Students</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">320</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center border border-transparent dark:border-slate-700/50">
                  <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <GraduationCap size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">Teachers</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">24</p>
                </div>
              </div>

              <button
                onClick={() => handleEnterBranch(branch)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-slate-200/50 dark:shadow-none"
              >
                Enter Branch View
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
