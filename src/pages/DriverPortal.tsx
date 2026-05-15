
import { Megaphone, Plus, X, Bus, Users, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../utils/apiClient';
import { toast } from '../components/Toast';

interface ManifestItem {
  student_name: string;
  digital_id: string;
  grade: string;
  route_name: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  time: string;
  driverName: string;
  category: string;
  is_pending?: boolean;
}

export const DriverPortal = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'notices' | 'manifest'>('manifest');
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ bus_number?: string; route_name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [stations, setStations] = useState('');

  const fetchManifest = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/driver/manifest');
      const data = await res.json();
      if (res.ok) {
        setRouteInfo({ bus_number: data.data?.bus_number, route_name: data.data?.route_name });
        setManifest(data.data?.manifest || []);
      } else {
        setManifest([]);
      }
    } catch {
      toast.error('Network error — could not reach the transport server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const res = await apiFetch('/api/driver/notices');
      const data = await res.json();
      if (res.ok) {
        // Map backend 'time' to string
        const mapped = (data.data || []).map((n: any) => ({
          ...n,
          time: n.time ? new Date(n.time).toLocaleDateString() : 'Today'
        }));
        setNotices(mapped);
      }
    } catch {
      toast.error('Failed to fetch notices.');
    } finally {
      setNoticesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'manifest') fetchManifest();
    if (activeTab === 'notices') fetchNotices();
  }, [activeTab]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/driver/notice', {
        method: 'POST',
        body: JSON.stringify({ title, content, stations })
      });
      if (res.ok) {
        toast.success('Notice broadcasted successfully.');
        setTitle('');
        setContent('');
        setStations('');
        setShowForm(false);
        fetchNotices();
      } else {
        toast.error('Failed to post notice.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      const res = await apiFetch(`/api/driver/notice/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Notice deleted successfully.');
        fetchNotices();
      } else {
        toast.error('Failed to delete notice.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-[2rem] p-6 md:p-8 text-white overflow-hidden shadow-2xl shadow-orange-200/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_50%)]" />
        <div className="absolute -bottom-8 -right-8 opacity-10">
          <Bus size={160} />
        </div>
        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
              <Bus size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">{t('driverPortal.title')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {t('driverPortal.greeting', { name: user?.name || t('driverPortal.defaultName') })}
          </h1>
          <p className="text-white/70 text-sm max-w-md">
            Manage your route and students effectively.
          </p>
        </div>
      </div>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        <button 
          onClick={() => setActiveTab('manifest')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'manifest' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Users size={18} />
          Route Manifest
        </button>
        <button 
          onClick={() => setActiveTab('notices')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'notices' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Megaphone size={18} />
          Notices
        </button>
      </div>

      {activeTab === 'manifest' ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Students on your route</h3>
              {routeInfo && (
                <p className="text-[11px] font-bold text-orange-500 mt-0.5">
                  Bus {routeInfo.bus_number} · {routeInfo.route_name}
                </p>
              )}
            </div>
            <button onClick={fetchManifest} className="text-orange-600 hover:rotate-180 transition-transform duration-500">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={3} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" /></td></tr>
                  ) : manifest.length > 0 ? manifest.map((student, i) => (
                    <tr key={i} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            {student.student_name[0]}
                          </div>
                          <span className="text-sm font-bold dark:text-slate-200">{student.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{student.digital_id}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {student.grade}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                        No students assigned to your route yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-lg uppercase tracking-wider shadow-xl shadow-orange-200/50 transition-all hover:scale-[1.02]"
          >
            <Plus size={24} className="inline-block mr-2" />
            {t('driverPortal.postUpdate')}
          </button>

          <div className="space-y-3">
            {noticesLoading ? (
               <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500 mt-8" />
            ) : notices.map((notice, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full">Logistics</span>
                    <span className="text-[10px] text-slate-400 font-bold">{notice.time}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(notice.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Notice"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{notice.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{notice.content}</p>
                <p className="text-[9px] text-slate-400 mt-2 italic">Broadcast by {notice.driverName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-orange-50 dark:bg-orange-900/20">
               <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">New Logistics Update</h3>
               <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form className="p-6 space-y-4" onSubmit={handlePost}>
              <input 
                required 
                placeholder="Title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-bold focus:ring-2 ring-orange-500 outline-none transition-all"
              />
              <textarea 
                required 
                placeholder="Details..." 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm h-24 resize-none focus:ring-2 ring-orange-500 outline-none transition-all"
              />
              <input 
                placeholder="Stations (comma separated)" 
                value={stations} 
                onChange={e => setStations(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:ring-2 ring-orange-500 outline-none transition-all"
              />
              <button type="submit" className="w-full py-4 bg-orange-500 text-white font-black text-sm uppercase rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-colors">Broadcast Update</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
