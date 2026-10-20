import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initI18n } from './i18n';
import App from './App.tsx';
import { applySaveDataPreference } from './app/saveData';

initI18n();
applySaveDataPreference();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
