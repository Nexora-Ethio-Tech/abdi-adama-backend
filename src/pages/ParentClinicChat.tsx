
import { useState, useEffect, useRef } from 'react';
import { Send, HeartPulse, User, ShieldAlert, Loader2, CheckCheck } from 'lucide-react';
import { ShootingStars } from '../components/Effects';
import { apiFetch } from '../utils/apiClient';
import { useUser } from '../context/UserContext';
import { toast } from '../components/Toast';

import { useSearchParams } from 'react-router-dom';

export const ParentClinicChat = () => {
  const [searchParams] = useSearchParams();
  const targetStudentId = searchParams.get('student_id');
  const { user: _user } = useUser();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await apiFetch('/api/parent/dashboard');
        if (res.ok) {
          const data = await res.json();
          const payload = data.data || data;
          const mapped = (payload.children || []).map((c: any) => ({
            id: c.identity_id || c.id,
            name: c.fullName || c.full_name || 'Unnamed Student'
          }));
          setChildren(mapped);
          
          // Auto-select child if student_id is in URL
          if (targetStudentId && mapped.length > 0) {
            const match = mapped.find((c: any) => c.id === targetStudentId);
            if (match) {
              setSelectedChild(match);
            } else {
              setSelectedChild(mapped[0]);
            }
          } else if (mapped.length > 0) {
            setSelectedChild(mapped[0]);
          }
        }
      } catch (err) {
        toast.error('Failed to load child directory.');
      }
    };
    fetchChildren();
  }, [targetStudentId]);

  // Fetch messages for selected child
  useEffect(() => {
    if (!selectedChild) return;
    
    // Clear previous child's messages immediately to avoid confusion
    setMessages([]);
    setLoading(true);

    const fetchMessages = async () => {
      try {
        const res = await apiFetch(`/api/clinic/chat?childId=${selectedChild.id}`);
        if (res.ok) {
          const json = await res.json();
          setMessages(json.data || []);
        }
      } catch (err) {
        toast.error('Failed to load chat history.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [selectedChild?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChild || sending) return;

    setSending(true);
    try {
      const res = await apiFetch('/api/clinic/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: newMessage,
          childId: selectedChild.id
        })
      });

      if (res.ok) {
        const json = await res.json();
        setMessages([...messages, json.data]);
        setNewMessage('');
      } else {
        toast.error('Failed to send message.');
      }
    } catch (err) {
      toast.error('Network error. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
      <ShootingStars />

      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
            <HeartPulse size={24} />
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Clinic Support</h2>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Direct Channel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Child</span>
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedChild?.id === child.id ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {child.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
           <ShieldAlert size={14} className="text-amber-500" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Private & Encrypted</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
        {loading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-12">
             <HeartPulse size={48} className="mb-4 opacity-20" />
             <p className="text-sm font-bold uppercase tracking-widest">No conversation history found for {selectedChild?.name}.</p>
             <p className="text-xs mt-2">Start the conversation by sending a message below.</p>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'parent' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
              m.role === 'parent' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {m.role === 'parent' ? <User size={14} /> : <HeartPulse size={14} />}
            </div>
            <div className={`max-w-[75%] space-y-1 ${m.role === 'parent' ? 'text-right' : ''}`}>
              <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                m.role === 'parent'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
              }`}>
                {m.text}
              </div>
              <div className="flex items-center gap-2 justify-end px-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase">{m.timestamp}</span>
                {m.role === 'parent' && <CheckCheck size={10} className="text-blue-400" />}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 z-10">
        <form onSubmit={handleSend} className="flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            placeholder="Tell the clinic admin something important..."
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm disabled:opacity-50"
          />
          <button 
            disabled={sending || !newMessage.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none group disabled:opacity-50"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
            <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
