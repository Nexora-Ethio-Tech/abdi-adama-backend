
import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SubmitOverlayProps {
  status: 'submitting' | 'success' | 'error' | null;
  onRetry?: () => void;
  onClose?: () => void;
}

export const SubmitOverlay: React.FC<SubmitOverlayProps> = ({ status, onRetry, onClose }) => {
  if (!status) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
        {status === 'submitting' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submitting Exam</h3>
            <p className="text-slate-500 dark:text-slate-400">Please wait while we secure your responses...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submission Successful</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Your exam has been safely recorded.</p>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Return to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submission Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">We couldn't submit your exam. Don't worry, your progress is saved locally.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={onRetry}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
