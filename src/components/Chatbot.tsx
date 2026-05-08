
import { useState } from 'react';
import { MessageSquare, X, Send, MinusCircle, Maximize2 } from 'lucide-react';

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am the Abdi-Adama Smart Assistant. I can help you with school policies, schedules, and academic reports. How can I assist you today?' }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages([...messages, { role: 'user', text: message }]);
    setMessage('');

    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I am currently in training mode. Soon I will be able to answer all your questions about our school!'
      }]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-50 flex items-center gap-2 group"
      >
        <MessageSquare size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold text-sm whitespace-nowrap">
          Ask Assistant
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed right-6 z-50 transition-all duration-300 ${isMinimized ? 'bottom-6 w-64' : 'bottom-6 w-80 md:w-96 h-[500px]'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">Abdi-Adama Smart Assistant</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <p className="text-[10px] text-blue-100">Semantic Search Active</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              {isMinimized ? <Maximize2 size={16} /> : <MinusCircle size={16} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your question..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
