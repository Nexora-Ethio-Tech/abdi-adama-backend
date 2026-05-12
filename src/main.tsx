import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppearanceProvider } from './context/AppearanceContext';
import { ToastProvider } from './components/Toast';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <AppearanceProvider>
          <App />
          <ToastProvider />
        </AppearanceProvider>
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
);
