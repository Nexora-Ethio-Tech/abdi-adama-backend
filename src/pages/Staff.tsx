import { Shield, ShieldAlert, Award, UserCheck, Settings, X, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { useUser, type UserRole } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const mockStaff = [
  { id: 'STF001', name: 'Abebe Kebede', role: 'finance-clerk', branch: 'Main', email: 'abebe@school.com', isBranchAuditor: false },
  { id: 'STF002', name: 'Almaz Tadesse', role: 'teacher', branch: 'Bole', email: 'almaz@school.com' },
  { id: 'STF003', name: 'Daniel Bekele', role: 'auditor', branch: 'All', email: 'daniel@school.com' },
  { id: 'STF004', name: 'Hirut Alemu', role: 'vice-principal', branch: 'Adama', email: 'hirut@school.com' },
];

export const Staff = () => {
  const navigate = useNavigate();
  const { role: currentUserRole } = useUser();
  const [staffList, setStaffList] = useState(mockStaff);
  const [managingStaff, setManagingStaff] = useState<any | null>(null);

  if (currentUserRole !== 'super-admin') {
    return (
      <div className="p-8 text-center text-rose-500">
        <ShieldAlert className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p>You do not have permission to view staff management.</p>
      </div>
    );
  }

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingStaff) return;
    setStaffList(prev => prev.map(s => s.id === managingStaff.id ? managingStaff : s));
    setManagingStaff(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Staff Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Assign system roles and global permissions.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search staff..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <Filter size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Role</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Special Flags</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {staff.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                    {staff.branch}
                  </td>
                  <td className="px-6 py-4">
                    {staff.isBranchAuditor && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-200">
                        Branch Auditor
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setManagingStaff({ ...staff })}
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-700 ml-auto text-xs font-bold"
                    >
                      <Settings size={14} />
                      Manage Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {managingStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">System Privileges</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{managingStaff.name}</p>
                </div>
              </div>
              <button onClick={() => setManagingStaff(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form className="p-6 space-y-6" onSubmit={handleUpdateRole}>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Role</label>
                <select
                  value={managingStaff.role}
                  onChange={(e) => setManagingStaff({ ...managingStaff, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="super-admin">Super Admin</option>
                  <option value="school-admin">School Admin</option>
                  <option value="vice-principal">Vice Principal</option>
                  <option value="finance-clerk">Finance Clerk</option>
                  <option value="auditor">Global Auditor</option>
                  <option value="teacher">Teacher</option>
                  <option value="librarian">Librarian</option>
                  <option value="clinic-admin">Clinic Admin</option>
                  <option value="driver">Driver</option>
                </select>
                {managingStaff.role === 'auditor' && (
                  <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <Award size={14} className="inline mr-1" />
                    Global Auditor has network-wide access to financial reports and special students.
                  </p>
                )}
              </div>

              {managingStaff.role === 'finance-clerk' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Branch Auditor Delegation</p>
                      <p className="text-[10px] text-slate-500">Allow this clerk to manage special students at their branch</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManagingStaff({ ...managingStaff, isBranchAuditor: !managingStaff.isBranchAuditor })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${managingStaff.isBranchAuditor ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${managingStaff.isBranchAuditor ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setManagingStaff(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 dark:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                  <UserCheck size={18} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
