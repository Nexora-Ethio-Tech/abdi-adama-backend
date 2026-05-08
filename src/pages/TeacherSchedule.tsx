
import { mockTeachers, mockSchedules } from '../data/mockData';
import { Calendar, Clock, MapPin, Users, Info } from 'lucide-react';

export const TeacherSchedule = () => {
  // Hardcoded to Ato Solomon (T1) for now, as we don't have a real auth system
  const teacherId = 'T1';
  const teacher = mockTeachers.find(t => t.id === teacherId);
  const schedule = mockSchedules[teacherId as keyof typeof mockSchedules] || [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calendar size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Teaching Schedule</h2>
            <p className="text-slate-500 dark:text-slate-400">Weekly classes and room assignments for {teacher?.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedule.length > 0 ? (
            schedule.map((slot, i) => (
              <div key={i} className="group p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-blue-900/5 border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800 rounded-2xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                    {slot.day}
                  </span>
                  <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Clock size={18} />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{slot.subject}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">{slot.time}</p>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Users size={16} />
                    <span>Class {slot.class}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin size={16} />
                    <span>Room 402</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 italic">No schedule assigned yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 p-6 rounded-2xl flex items-start gap-4">
        <div className="bg-amber-500 text-white p-2 rounded-lg shrink-0">
          <Info size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-400">Schedule Notice</h4>
          <p className="text-sm text-amber-800 dark:text-amber-500 mt-1">
            If you notice any conflicts in your schedule or need to request a change, please contact the School Administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
