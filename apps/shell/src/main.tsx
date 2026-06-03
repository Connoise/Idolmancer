import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { persistSelection, persistSettings } from '@idolmancer/storage';
import App from './App';
import './index.css';

// Hydrate the shared selection and settings from app storage and keep them persisted.
persistSelection();
persistSettings();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
