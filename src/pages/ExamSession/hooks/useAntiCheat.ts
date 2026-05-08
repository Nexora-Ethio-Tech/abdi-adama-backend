
import { useEffect, useState, useCallback, useRef } from 'react';

interface AntiCheatOptions {
  onViolation: (type: string) => void;
  maxWarnings: number;
  autoSubmit: () => void;
}

export const useAntiCheat = ({ onViolation, maxWarnings, autoSubmit }: AntiCheatOptions) => {
  const [warningCount, setWarningCount] = useState(0);
  const lastViolationTimeRef = useRef(0);

  const handleViolation = useCallback((type: string) => {
    const now = Date.now();
    // Consolidate violations that happen within 1.5 seconds (e.g., blur + visibilitychange)
    if (now - lastViolationTimeRef.current < 1500) return;

    lastViolationTimeRef.current = now;
    setWarningCount((prev) => {
      const newCount = prev + 1;
      onViolation(type);
      if (newCount >= maxWarnings) {
        autoSubmit();
      }
      return newCount;
    });
  }, [onViolation, maxWarnings, autoSubmit]);

  useEffect(() => {
    // 1. Fullscreen enforcement
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('fullscreen-exit');
      }
    };

    // 2. Visibility / Tab change detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab-switch');
      }
    };

    const handleBlur = () => {
      handleViolation('window-blur');
    };

    // 3. Keyboard lock
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+P, PrintScreen
      // Also Cmd on Mac
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        handleViolation('restricted-key');
      }

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleViolation('print-screen');
      }
    };

    // 4. Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleViolation]);

  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  }, []);

  return { warningCount, requestFullscreen };
};
