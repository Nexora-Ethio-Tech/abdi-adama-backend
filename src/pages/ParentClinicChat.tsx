
import { useState, useEffect, useRef } from 'react';
import { Send, HeartPulse, User, Clock, ShieldAlert } from 'lucide-react';
import { ShootingStars } from '../components/Effects';

export const ParentClinicChat = () => {
  const [selectedChild, setSelectedChild] = useState('Abebe Bikila');
  const [messages, setMessages] = useState([
    { id: '1', role: 'clinic', child: 'Abebe Bikila', text: 'Hello! How can we help you today regarding Abebe\'s health?', timestamp: '09:00 AM' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const children = ['Abebe Bikila', 'Sara Kebede'];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now().toString(),
      role: 'parent',
      child: selectedChild,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, msg]);
    setNewMessage('');

    // Mock clinic response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'clinic',
        child: selectedChild,
        text: `Thank you for the information about ${selectedChild.split(' ')[0]}. The clinic administrator has been notified and will review your message shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
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
                  key={child}
                  onClick={() => setSelectedChild(child)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedChild === child ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {child.split(' ')[0]}
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
        {messages.filter(m => m.child === selectedChild).map((m) => (
          <div key={m.id} className={`flex items-start gap-3 ${m.role === 'parent' ? 'flex-row-reverse' : ''}`}>
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
                {m.role === 'parent' && <Clock size={8} className="text-slate-300" />}
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
            placeholder="Tell the clinic admin something important..."
            className="flex-1 px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm"
          />
          <button className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none group">
            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            <span className="hidden sm:inline">Send Message</span>
          </button>
        </form>
      </div>
    </div>
  );
};
