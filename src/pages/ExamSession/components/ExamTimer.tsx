
import React, { useEffect, useState } from 'react';
import { Clock, EyeOff } from 'lucide-react';

interface ExamTimerProps {
  endTime: number;
  onTimeUp: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({ endTime, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState<number>(Math.max(0, endTime - Date.now()));
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeUp]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map(v => v < 10 ? '0' + v : v)
      .join(':');
  };

  const isLowTime = timeLeft < 300000; // 5 minutes

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'w-48' : 'w-12'}`}>
      <div className={`flex items-center gap-2 p-3 rounded-lg shadow-lg border ${
        isLowTime ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
      }`}>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          title={isVisible ? "Collapse Timer" : "Expand Timer"}
        >
          {isVisible ? <EyeOff size={18} /> : <Clock size={18} />}
        </button>

        {isVisible && (
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider opacity-70">Time Remaining</span>
            <span className="text-xl font-mono font-bold leading-none">{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
