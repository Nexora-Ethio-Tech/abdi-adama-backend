
import React from 'react';
import { Flag } from 'lucide-react';
import type { Question } from '../../../data/examData';

interface QuestionCardProps {
  question: Question;
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
  index: number;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  index,
  isFlagged,
  onToggleFlag
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm">
            {index + 1}
          </span>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 pt-0.5">
            {question.text}
          </h2>
        </div>
        <button
          onClick={onToggleFlag}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all font-bold text-xs ${
            isFlagged
              ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600'
          }`}
        >
          <Flag size={14} className={isFlagged ? 'fill-current' : ''} />
          {isFlagged ? 'Flagged' : 'Flag Error'}
        </button>
      </div>

      <div className="grid gap-4">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              selectedOptionId === option.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/10'
                : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedOptionId === option.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}>
              {selectedOptionId === option.id && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span className={`text-lg ${
              selectedOptionId === option.id
                ? 'text-blue-900 dark:text-blue-100 font-medium'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {option.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
