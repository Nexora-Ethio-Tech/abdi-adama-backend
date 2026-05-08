
import { ChevronLeft, ChevronRight, Plus, Tag } from 'lucide-react';
import { mockEvents } from '../data/mockData';
import { useState } from 'react';

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth(year, month) }, (_, i) => i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockEvents.filter(e => e.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Academic Calendar</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Stay updated with school events, exams, and holidays.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm">
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{monthName} {year}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {emptyDays.map(i => (
                <div key={`empty-${i}`} className="h-24 md:h-32 border-b border-r border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10"></div>
              ))}
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div key={day} className="h-24 md:h-32 border-b border-r border-slate-100 dark:border-slate-800 p-2 group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors">{day}</span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate ${
                            event.type === 'Academic' ? 'bg-blue-100 text-blue-700' :
                            event.type === 'Meeting' ? 'bg-purple-100 text-purple-700' :
                            event.type === 'Event' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Upcoming This Month</h3>
            <div className="space-y-4">
              {mockEvents.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2, '0')}`)).map(event => (
                <div key={event.id} className="flex gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{event.date.split('-')[2]}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{monthName.slice(0, 3)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag size={12} className="text-slate-400" />
                      <span className="text-[10px] font-medium text-slate-500">{event.type}</span>
                    </div>
                  </div>
                </div>
              ))}
              {mockEvents.length === 0 && <p className="text-xs text-slate-400 italic">No events scheduled yet.</p>}
            </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <h4 className="font-bold mb-2">Did you know?</h4>
            <p className="text-sm text-blue-100 leading-relaxed">
              You can sync this calendar with your personal Google or Outlook account from the settings page.
            </p>
            <button className="mt-4 text-xs font-bold bg-white text-blue-600 px-4 py-2 rounded-lg">
              Sync Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
