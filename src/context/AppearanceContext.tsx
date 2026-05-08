
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type UIStyle = 'Standard' | 'Modern' | 'Compact' | 'Classic';

interface AppearanceContextType {
  style: UIStyle;
  setStyle: (style: UIStyle) => void;
  autoDarkMode: boolean;
  setAutoDarkMode: (auto: boolean) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const AppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [style, setStyle] = useState<UIStyle>(() => {
    const saved = localStorage.getItem('ui-style');
    return (saved as UIStyle) || 'Standard';
  });

  const [autoDarkMode, setAutoDarkMode] = useState(() => {
    const saved = localStorage.getItem('auto-dark-mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ui-style', style);
    document.documentElement.setAttribute('data-ui-style', style.toLowerCase());
  }, [style]);

  useEffect(() => {
    localStorage.setItem('auto-dark-mode', String(autoDarkMode));
    if (autoDarkMode) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };

      // Initial check
      if (mediaQuery.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [autoDarkMode]);

  return (
    <AppearanceContext.Provider value={{ style, setStyle, autoDarkMode, setAutoDarkMode }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};
