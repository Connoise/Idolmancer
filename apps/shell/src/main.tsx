import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { persistSelection } from '@idolmancer/storage';
import App from './App';
import './index.css';

// Hydrate the shared selection from app storage and keep it persisted.
persistSelection();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
