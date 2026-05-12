import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

/**
 * ExamContext — global lockdown state.
 * When examLockdown is true the App shell MUST hide the sidebar and header
 * to prevent navigation during an official exam session.
 */

interface ExamContextValue {
  examLockdown: boolean;
  activateExamLockdown: () => void;
  releaseExamLockdown: () => void;
}

const ExamContext = createContext<ExamContextValue | null>(null);

export const ExamProvider = ({ children }: { children: ReactNode }) => {
  const [examLockdown, setExamLockdown] = useState(false);

  const activateExamLockdown = useCallback(() => setExamLockdown(true), []);
  const releaseExamLockdown  = useCallback(() => setExamLockdown(false), []);

  return (
    <ExamContext.Provider value={{ examLockdown, activateExamLockdown, releaseExamLockdown }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = (): ExamContextValue => {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used inside ExamProvider');
  return ctx;
};
