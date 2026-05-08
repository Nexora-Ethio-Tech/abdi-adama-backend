
import React from 'react';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<string, string>;
  flaggedQuestions: Set<string>;
  questionIds: string[];
  onSelectIndex: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  flaggedQuestions,
  questionIds,
  onSelectIndex,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        Question Palette
      </h3>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const isCurrent = index === currentIndex;
          const isAnswered = !!answers[questionIds[index]];
          const isFlagged = flaggedQuestions.has(questionIds[index]);

          return (
            <button
              key={index}
              onClick={() => onSelectIndex(index)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all relative
                ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                ${isCurrent
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isAnswered
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                }
                ${isFlagged && !isCurrent ? 'border-rose-400 dark:border-rose-600' : ''}
              `}
            >
              {index + 1}
              {isFlagged && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 rounded-full bg-rose-500 border border-white" />
          <span>Flagged</span>
        </div>
      </div>
    </div>
  );
};
